import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth/next';

import { SeatGrid } from '@/components/seat-grid';
import { prisma } from '@/lib/prisma';
import { authOptions } from '@/lib/auth';

type BookingPageProps = {
  searchParams: Promise<{
    showtime?: string;
  }>;
};

export default async function BookingPage({
  searchParams,
}: BookingPageProps) {
  const params = await searchParams;
  const showtimeId = params.showtime?.trim();

  /*
   * Đặt vé luôn bắt đầu từ một suất chiếu cụ thể.
   * Không còn tự động chọn suất chiếu đầu tiên.
   */
  if (!showtimeId) {
    redirect('/suat-chieu');
  }

  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    const callbackUrl = `/dat-ve?showtime=${encodeURIComponent(showtimeId)}`;

    redirect(
      `/dang-nhap?callbackUrl=${encodeURIComponent(callbackUrl)}`
    );
  }

  const showtime = await prisma.showtime.findUnique({
    where: {
      id: showtimeId,
    },
    include: {
      movie: true,
      hall: {
        include: {
          cinema: true,
          seats: true,
        },
      },
    },
  });

  if (!showtime) {
    return (
      <main className="min-h-screen bg-slate-950 px-6 py-20 text-center text-slate-300">
        Không tìm thấy suất chiếu.
      </main>
    );
  }

  /*
   * Không cho phép đặt vé cho suất đã bắt đầu.
   */
  if (showtime.startTime <= new Date()) {
    return (
      <main className="min-h-screen bg-slate-950 px-6 py-20 text-center">
        <h1 className="text-2xl font-bold text-white">
          Suất chiếu đã kết thúc
        </h1>

        <p className="mt-2 text-slate-400">
          Vui lòng chọn một suất chiếu khác.
        </p>

        <Link
          href="/suat-chieu"
          className="mt-6 inline-flex rounded-full bg-white px-5 py-3 font-semibold text-slate-950"
        >
          Chọn suất chiếu khác
        </Link>
      </main>
    );
  }

  /*
   * Booking CANCELED không được tính là ghế đã bán.
   */
  const soldSeats = (
    await prisma.ticket.findMany({
      where: {
        booking: {
          showtimeId: showtime.id,
          status: {
            not: 'CANCELED',
          },
        },
      },
      select: {
        seatCode: true,
      },
    })
  ).map((ticket) => ticket.seatCode);

  /*
   * Xóa seat hold hết hạn.
   */
  const now = new Date();

  await prisma.seatHold.deleteMany({
    where: {
      showtimeId: showtime.id,
      expiresAt: {
        lte: now,
      },
    },
  });

  /*
   * Lấy các ghế đang được giữ.
   */
  const heldSeats = await prisma.seatHold.findMany({
    where: {
      showtimeId: showtime.id,
      expiresAt: {
        gt: now,
      },
    },
    select: {
      seatId: true,
      expiresAt: true,
      userId: true,
      seat: {
        select: {
          code: true,
          isActive: true,
        },
      },
    },
  });

  const activeHeldSeats = heldSeats
    .filter((hold) => hold.seat.isActive)
    .map((hold) => ({
      seatId: hold.seatId,
      seatCode: hold.seat.code,
      expiresAt: hold.expiresAt.toISOString(),
      userId: hold.userId,
      isMine: hold.userId === session.user.id,
    }));

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-10 text-white">
      <div className="mx-auto max-w-7xl">
        <div>
          <h1 className="text-3xl font-bold">
            Đặt vé
          </h1>

          <p className="mt-2 text-slate-300">
            Chọn ghế cho suất chiếu đã chọn
          </p>
        </div>

        <div className="mt-10">
          <SeatGrid
            movieSlug={showtime.movie.slug}
            showtimeId={showtime.id}
            movieTitle={showtime.movie.title}
            cinemaName={showtime.hall.cinema.name}
            hallName={showtime.hall.name}
            startTime={showtime.startTime.toISOString()}
            basePrice={showtime.basePrice}
            soldSeats={soldSeats}
            heldSeats={activeHeldSeats}
          />
        </div>
      </div>
    </main>
  );
}
