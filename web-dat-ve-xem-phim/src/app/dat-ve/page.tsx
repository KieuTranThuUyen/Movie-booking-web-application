import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth/next';

import {
  BookingStatus,
} from '@prisma/client';

import { SeatGrid } from '@/components/booking/seat-grid';
import { prisma } from '@/lib/db/prisma';
import { authOptions } from '@/lib/auth';

type BookingPageProps = {
  searchParams: Promise<{
    showtime?: string;
  }>;
};

export default async function BookingPage({
  searchParams,
}: BookingPageProps) {
  const params =
    await searchParams;

  const showtimeId =
    params.showtime?.trim();

  /*
   * ============================================================
   * KIỂM TRA SUẤT CHIẾU
   * ============================================================
   */

  if (!showtimeId) {
    redirect('/suat-chieu');
  }

  /*
   * ============================================================
   * KIỂM TRA ĐĂNG NHẬP
   * ============================================================
   */

  const session =
    await getServerSession(
      authOptions,
    );

  if (!session?.user?.id) {
    const callbackUrl =
      `/dat-ve?showtime=${encodeURIComponent(
        showtimeId,
      )}`;

    redirect(
      `/dang-nhap?callbackUrl=${encodeURIComponent(
        callbackUrl,
      )}`,
    );
  }

  /*
   * ============================================================
   * LẤY SUẤT CHIẾU
   * ============================================================
   */

  const showtime =
    await prisma.showtime.findUnique({
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

  /*
   * ============================================================
   * KHÔNG TÌM THẤY SUẤT CHIẾU
   * ============================================================
   */

  if (!showtime) {
    return (
      <main className="min-h-screen bg-slate-950 px-6 py-20 text-center text-slate-300">
        <h1 className="text-2xl font-bold text-white">
          Không tìm thấy suất chiếu
        </h1>

        <p className="mt-2 text-slate-400">
          Suất chiếu bạn đang tìm kiếm
          không tồn tại.
        </p>

        <Link
          href="/suat-chieu"
          className="mt-6 inline-flex rounded-full bg-white px-5 py-3 font-semibold text-slate-950 transition hover:bg-slate-100"
        >
          Chọn suất chiếu khác
        </Link>
      </main>
    );
  }

  /*
   * ============================================================
   * KIỂM TRA SUẤT CHIẾU ĐÃ BẮT ĐẦU
   * ============================================================
   */

  if (
    showtime.startTime <=
    new Date()
  ) {
    return (
      <main className="min-h-screen bg-slate-950 px-6 py-20 text-center text-white">
        <h1 className="text-2xl font-bold">
          Suất chiếu đã bắt đầu
        </h1>

        <p className="mt-2 text-slate-400">
          Bạn không thể đặt vé cho suất
          chiếu đã bắt đầu.
        </p>

        <Link
          href="/suat-chieu"
          className="mt-6 inline-flex rounded-full bg-white px-5 py-3 font-semibold text-slate-950 transition hover:bg-slate-100"
        >
          Chọn suất chiếu khác
        </Link>
      </main>
    );
  }

  /*
   * ============================================================
   * THỜI GIAN HIỆN TẠI
   * ============================================================
   */

  const now =
    new Date();

  /*
   * ============================================================
   * XÓA HOLD HẾT HẠN
   *
   * Những SeatHold quá thời gian sẽ được giải phóng.
   * ============================================================
   */

  await prisma.seatHold.deleteMany({
    where: {
      showtimeId:
        showtime.id,

      expiresAt: {
        lte: now,
      },
    },
  });

  /*
   * ============================================================
   * LẤY GHẾ ĐÃ BÁN
   *
   * Booking CANCELED không chiếm ghế.
   * ============================================================
   */

  const soldTickets =
    await prisma.ticket.findMany({
      where: {
        booking: {
          showtimeId:
            showtime.id,

          status: {
            not:
              BookingStatus.CANCELED,
          },
        },
      },

      select: {
        seatCode: true,
      },
    });

  const soldSeats =
    soldTickets.map(
      (ticket) =>
        ticket.seatCode,
    );

  /*
   * ============================================================
   * LẤY GHẾ ĐANG ĐƯỢC GIỮ
   *
   * Chỉ tính:
   *
   * - SeatHold chưa gắn Booking
   * hoặc
   * - SeatHold đã gắn Booking nhưng Booking vẫn PENDING
   *
   * Booking CANCELED sẽ không được coi là đang giữ ghế.
   * ============================================================
   */

  const heldSeats =
    await prisma.seatHold.findMany({
      where: {
        showtimeId:
          showtime.id,

        expiresAt: {
          gt: now,
        },

        OR: [
          {
            bookingId: null,
          },

          {
            booking: {
              status:
                BookingStatus.PENDING,
            },
          },
        ],
      },

      select: {
        seatId: true,

        expiresAt: true,

        userId: true,

        bookingId: true,

        seat: {
          select: {
            code: true,
            isActive: true,
          },
        },
      },
    });

  /*
   * ============================================================
   * CHỈ LẤY GHẾ ACTIVE
   * ============================================================
   */

  const activeHeldSeats =
    heldSeats
      .filter(
        (hold) =>
          hold.seat.isActive,
      )
      .map(
        (hold) => ({
          seatId:
            hold.seatId,

          seatCode:
            hold.seat.code,

          expiresAt:
            hold.expiresAt.toISOString(),

          userId:
            hold.userId,

          isMine:
            hold.userId ===
            session.user.id,
        }),
      );

  /*
   * ============================================================
   * RENDER
   * ============================================================
   */

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-10 text-white">
      <div className="mx-auto max-w-7xl">

        {/* ======================================================
            HEADER
        ====================================================== */}

        <div>
          <p className="text-sm uppercase tracking-[0.35em] text-sky-300/80">
            Đặt vé xem phim
          </p>

          <h1 className="mt-2 text-3xl font-bold">
            Chọn ghế
          </h1>

          <p className="mt-2 text-slate-300">
            Chọn ghế yêu thích của bạn
            cho suất chiếu
          </p>
        </div>

        {/* ======================================================
            THÔNG TIN SUẤT CHIẾU
        ====================================================== */}

        <div className="mt-6 rounded-3xl border border-white/10 bg-white/5 p-5">
          <div className="grid gap-4 text-sm md:grid-cols-4">

            <div>
              <p className="text-slate-500">
                Phim
              </p>

              <p className="mt-1 font-semibold text-white">
                {showtime.movie.title}
              </p>
            </div>

            <div>
              <p className="text-slate-500">
                Rạp
              </p>

              <p className="mt-1 font-semibold text-white">
                {showtime.hall.cinema.name}
              </p>
            </div>

            <div>
              <p className="text-slate-500">
                Phòng
              </p>

              <p className="mt-1 font-semibold text-white">
                {showtime.hall.name}
              </p>
            </div>

            <div>
              <p className="text-slate-500">
                Suất chiếu
              </p>

              <p className="mt-1 font-semibold text-white">
                {new Date(
                  showtime.startTime,
                ).toLocaleString(
                  'vi-VN',
                )}
              </p>
            </div>

          </div>
        </div>

        {/* ======================================================
            BẢNG GIÁ SUẤT CHIẾU
        ====================================================== */}

        <div className="mt-6 rounded-3xl border border-white/10 bg-white/5 p-5">
          <p className="text-sm font-medium text-slate-300">
            Giá vé của suất chiếu này
          </p>

          <div className="mt-4 grid gap-3 sm:grid-cols-3">

            <div className="rounded-2xl border border-emerald-400/20 bg-emerald-500/5 p-4">
              <p className="text-sm text-slate-400">
                Ghế thường
              </p>

              <p className="mt-1 text-xl font-bold text-emerald-300">
                {showtime.standardPrice.toLocaleString(
                  'vi-VN',
                )}{' '}
                đ
              </p>
            </div>

            <div className="rounded-2xl border border-amber-400/20 bg-amber-500/5 p-4">
              <p className="text-sm text-slate-400">
                Ghế VIP
              </p>

              <p className="mt-1 text-xl font-bold text-amber-300">
                {showtime.vipPrice.toLocaleString(
                  'vi-VN',
                )}{' '}
                đ
              </p>
            </div>

            <div className="rounded-2xl border border-pink-400/20 bg-pink-500/5 p-4">
              <p className="text-sm text-slate-400">
                Ghế đôi
              </p>

              <p className="mt-1 text-xl font-bold text-pink-300">
                {showtime.couplePrice.toLocaleString(
                  'vi-VN',
                )}{' '}
                đ
              </p>
            </div>

          </div>
        </div>

        {/* ======================================================
            SƠ ĐỒ GHẾ
        ====================================================== */}

        <div className="mt-8">
          <SeatGrid
            movieSlug={
              showtime.movie.slug
            }
            showtimeId={
              showtime.id
            }
            movieTitle={
              showtime.movie.title
            }
            cinemaName={
              showtime.hall.cinema.name
            }
            hallName={
              showtime.hall.name
            }
            startTime={showtime.startTime.toISOString()}

            /*
             * Giá theo suất chiếu
             */
            standardPrice={
              showtime.standardPrice
            }

            vipPrice={
              showtime.vipPrice
            }

            couplePrice={
              showtime.couplePrice
            }

            /*
             * Trạng thái ghế
             */
            soldSeats={
              soldSeats
            }

            heldSeats={
              activeHeldSeats
            }
          />
        </div>

      </div>
    </main>
  );
}