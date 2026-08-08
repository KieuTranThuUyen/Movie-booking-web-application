import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth/next';

import { SeatGrid } from '@/components/seat-grid';
import { prisma } from '@/lib/prisma';
import { ensureMoviesSeeded } from '@/lib/seed-movies';
import { authOptions } from '@/lib/auth';

type BookingPageProps = {
  searchParams: Promise<{
    movie?: string;
    showtime?: string;
  }>;
};

export default async function BookingPage({
  searchParams,
}: BookingPageProps) {
  /*
   * ============================================================
   * BẮT BUỘC ĐĂNG NHẬP
   * ============================================================
   *
   * Nếu chưa đăng nhập:
   * /dat-ve
   *      ↓
   * /dang-nhap
   *
   * Sau khi đăng nhập sẽ quay lại trang đặt vé.
   */
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    const resolvedSearchParams = await searchParams;

    const movie = resolvedSearchParams.movie;
    const showtime = resolvedSearchParams.showtime;

    const callbackParams = new URLSearchParams();

    if (movie) {
      callbackParams.set('movie', movie);
    }

    if (showtime) {
      callbackParams.set('showtime', showtime);
    }

    const callbackUrl = `/dat-ve${
      callbackParams.toString()
        ? `?${callbackParams.toString()}`
        : ''
    }`;

    redirect(
      `/dang-nhap?callbackUrl=${encodeURIComponent(
        callbackUrl
      )}`
    );
  }

  /*
   * ============================================================
   * SEARCH PARAMS
   * ============================================================
   */

  const resolvedSearchParams = await searchParams;

  /*
   * ============================================================
   * SEED MOVIES
   * ============================================================
   */

  await ensureMoviesSeeded();

  /*
   * ============================================================
   * LẤY MOVIE
   * ============================================================
   */

  const movie =
    (resolvedSearchParams.movie
      ? await prisma.movie.findUnique({
          where: {
            slug: resolvedSearchParams.movie,
          },
          include: {
            showtimes: {
              include: {
                hall: {
                  include: {
                    cinema: true,
                  },
                },
              },
            },
          },
        })
      : null) ??
    (await prisma.movie.findFirst({
      orderBy: {
        createdAt: 'asc',
      },
      include: {
        showtimes: {
          include: {
            hall: {
              include: {
                cinema: true,
              },
            },
          },
        },
      },
    }));

  /*
   * ============================================================
   * LẤY SHOWTIME
   * ============================================================
   */

  const showtime =
    (resolvedSearchParams.showtime
      ? await prisma.showtime.findUnique({
          where: {
            id: resolvedSearchParams.showtime,
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
        })
      : null) ??
    movie?.showtimes[0] ??
    null;

  /*
   * ============================================================
   * KHÔNG CÓ DỮ LIỆU
   * ============================================================
   */

  if (!movie || !showtime) {
    return (
      <main className="min-h-screen bg-slate-950 px-6 py-20 text-center text-slate-300">
        Hiện chưa có dữ liệu suất chiếu để đặt vé.
      </main>
    );
  }

  /*
   * ============================================================
   * LẤY GHẾ ĐÃ BÁN
   * ============================================================
   *
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
   * ============================================================
   * XÓA SEAT HOLD HẾT HẠN
   * ============================================================
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
   * ============================================================
   * LẤY CÁC GHẾ ĐANG ĐƯỢC GIỮ
   * ============================================================
   */

  const heldSeats =
    await prisma.seatHold.findMany({
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

  /*
   * ============================================================
   * CHUYỂN DỮ LIỆU CHO SEAT GRID
   * ============================================================
   */

  const activeHeldSeats = heldSeats
    .filter((hold) => hold.seat.isActive)
    .map((hold) => ({
      seatId: hold.seatId,
      seatCode: hold.seat.code,
      expiresAt: hold.expiresAt.toISOString(),
      userId: hold.userId,
      isMine:
        hold.userId === session.user.id,
    }));

  /*
   * ============================================================
   * RENDER
   * ============================================================
   */

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-10 text-white">
      <div className="mx-auto max-w-7xl">
        <div>
          <h1 className="text-3xl font-bold">
            Đặt vé
          </h1>

          <p className="mt-2 text-slate-300">
            Chọn ghế cho suất chiếu
          </p>
        </div>

        <div className="mt-10">
          <SeatGrid
            movieSlug={movie.slug}
            showtimeId={showtime.id}
            movieTitle={movie.title}
            cinemaName={
              showtime.hall.cinema.name
            }
            hallName={
              showtime.hall.name
            }
            startTime={showtime.startTime.toISOString()}
            basePrice={
              showtime.basePrice
            }
            soldSeats={soldSeats}
            heldSeats={activeHeldSeats}
          />
        </div>
      </div>
    </main>
  );
}