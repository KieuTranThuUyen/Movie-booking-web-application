import Link from 'next/link';

import { getServerSession } from 'next-auth/next';

import {
  BookingStatus,
} from '@prisma/client';

import {
  prisma,
} from '@/lib/db/prisma';

import {
  formatSeatType,
} from '@/lib/booking/seat-pricing';

import {
  authOptions,
} from '@/lib/auth';

import {
  CartCombos,
} from '@/components/booking/cart-combos';

type CartPageProps = {
  searchParams: Promise<{
    movie?: string;
    showtime?: string;
    seats?: string;
  }>;
};

export default async function CartPage({
  searchParams,
}: CartPageProps) {
  const params =
    await searchParams;

  /*
   * ============================================================
   * LOGIN
   * ============================================================
   */

  const session =
    await getServerSession(
      authOptions,
    );

  const userId =
    session?.user?.id ??
    null;

  /*
   * ============================================================
   * SHOWTIME
   * ============================================================
   */

  const showtimeId =
    params.showtime?.trim();

  if (!showtimeId) {
    return (
      <main className="page-shell py-12 lg:py-16">
        <div className="rounded-[28px] border border-white/10 bg-slate-950/70 p-8 text-center shadow-glow">
          <h1 className="text-2xl font-bold text-white">
            Không tìm thấy suất chiếu
          </h1>

          <p className="mt-3 text-slate-400">
            Vui lòng quay lại chọn suất chiếu.
          </p>

          <Link
            href="/suat-chieu"
            className="mt-6 inline-flex rounded-2xl bg-white px-5 py-3 font-semibold text-slate-950"
          >
            Chọn suất chiếu
          </Link>
        </div>
      </main>
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

  if (!showtime) {
    return (
      <main className="page-shell py-12 lg:py-16">
        <div className="rounded-[28px] border border-white/10 bg-slate-950/70 p-8 text-center shadow-glow">
          <h1 className="text-2xl font-bold text-white">
            Không tìm thấy suất chiếu
          </h1>
        </div>
      </main>
    );
  }

  /*
   * ============================================================
   * URL SEATS
   * ============================================================
   */

  const requestedSeats = [
    ...new Set(
      (params.seats ?? '')
        .split(',')
        .map((seat) =>
          seat.trim(),
        )
        .filter(Boolean),
    ),
  ];

  /*
   * ============================================================
   * KIỂM TRA ĐĂNG NHẬP
   * ============================================================
   */

  if (!userId) {
    const callbackUrl =
      `/gio-hang?showtime=${encodeURIComponent(
        showtimeId,
      )}&seats=${encodeURIComponent(
        requestedSeats.join(','),
      )}`;

    return (
      <main className="page-shell py-12 lg:py-16">
        <div className="rounded-[28px] border border-white/10 bg-slate-950/70 p-8 text-center shadow-glow">
          <h1 className="text-2xl font-bold text-white">
            Bạn cần đăng nhập
          </h1>

          <p className="mt-3 text-slate-400">
            Vui lòng đăng nhập để tiếp tục đặt vé.
          </p>

          <Link
            href={`/dang-nhap?callbackUrl=${encodeURIComponent(
              callbackUrl,
            )}`}
            className="mt-6 inline-flex rounded-2xl bg-white px-5 py-3 font-semibold text-slate-950"
          >
            Đăng nhập
          </Link>
        </div>
      </main>
    );
  }

  const now =
    new Date();

  /*
   * ============================================================
   * XÓA SEAT HOLD HẾT HẠN
   * ============================================================
   */

  await prisma.seatHold.deleteMany({
    where: {
      showtimeId,

      expiresAt: {
        lte: now,
      },
    },
  });

  /*
   * ============================================================
   * XÓA SEAT HOLD CỦA BOOKING ĐÃ CANCELED
   * ============================================================
   */

  await prisma.seatHold.deleteMany({
    where: {
      showtimeId,

      booking: {
        status:
          BookingStatus.CANCELED,
      },
    },
  });

  /*
   * ============================================================
   * LẤY HOLD CỦA USER
   * ============================================================
   */

  const myHolds =
    await prisma.seatHold.findMany({
      where: {
        showtimeId,

        userId,

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
   * GHẾ USER ĐANG GIỮ
   * ============================================================
   */

  const myHeldCodes =
    myHolds
      .filter(
        (hold) =>
          hold.seat.isActive,
      )
      .map(
        (hold) =>
          hold.seat.code,
      );

  /*
   * ============================================================
   * GHẾ HỢP LỆ
   * ============================================================
   */

  const validSelectedSeats =
    requestedSeats.filter(
      (seatCode) =>
        myHeldCodes.includes(
          seatCode,
        ),
    );

  /*
   * ============================================================
   * GHẾ KHÔNG CÒN GIỮ
   * ============================================================
   */

  const missingSeats =
    requestedSeats.filter(
      (seatCode) =>
        !myHeldCodes.includes(
          seatCode,
        ),
    );

  /*
   * ============================================================
   * CHI TIẾT GHẾ
   * ============================================================
   */

  const seatDetails =
    showtime.hall.seats
      .filter(
        (seat) =>
          validSelectedSeats.includes(
            seat.code,
          ),
      )
      .map(
        (seat) => {
          const type =
            formatSeatType(
              seat.type,
            );

          let price =
            showtime.standardPrice;

          switch (type) {
            case 'VIP':
              price =
                showtime.vipPrice;
              break;

            case 'COUPLE':
              price =
                showtime.couplePrice;
              break;

            default:
              price =
                showtime.standardPrice;
          }

          return {
            code:
              seat.code,

            type,

            price,
          };
        },
      );

  /*
   * ============================================================
   * TỔNG TIỀN VÉ
   * ============================================================
   */

  const subtotal =
    seatDetails.reduce(
      (
        total,
        seat,
      ) =>
        total +
        seat.price,

      0,
    );

  /*
   * ============================================================
   * LẤY COMBO
   * ============================================================
   */

  const combos =
    await prisma.combo.findMany({
      where: {
        isActive: true,

        stock: {
          gt: 0,
        },
      },

      orderBy: {
        createdAt: 'asc',
      },
    });

  /*
   * ============================================================
   * RENDER
   * ============================================================
   */

  return (
    <main className="page-shell py-12 lg:py-16">
      {/* ======================================================
          HEADER
         ====================================================== */}

      <div className="space-y-3">
        <p className="text-sm uppercase tracking-[0.35em] text-sky-300/80">
          Giỏ vé
        </p>

        <h1 className="text-4xl font-bold text-white">
          Thông tin vé đã chọn
        </h1>

        <p className="text-slate-400">
          Hệ thống đã kiểm tra lại ghế trước khi thanh toán.
        </p>
      </div>

      {/* ======================================================
          GHẾ KHÔNG CÒN ĐƯỢC GIỮ
         ====================================================== */}

      {missingSeats.length > 0 && (
        <div className="mt-6 rounded-2xl border border-amber-400/20 bg-amber-500/5 p-4">
          <p className="text-sm font-semibold text-amber-300">
            Một số ghế không còn được giữ
          </p>

          <p className="mt-1 text-sm text-slate-400">
            Ghế{' '}
            {missingSeats.join(
              ', ',
            )}{' '}
            đã được loại khỏi giỏ.
          </p>
        </div>
      )}

      {/* ======================================================
          CART COMPONENT
         ====================================================== */}

      <div className="mt-10">
        <CartCombos
          movieTitle={
            showtime.movie.title
          }
          cinemaName={
            showtime.hall.cinema.name
          }
          hallName={
            showtime.hall.name
          }
          startTime={
            showtime.startTime
          }
          combos={combos.map(
            (combo) => ({
              id: combo.id,

              name: combo.name,

              description:
                combo.description,

              imageUrl:
                combo.imageUrl,

              price: Number(
                combo.price,
              ),

              stock:
                combo.stock,
            }),
          )}
          showtimeId={
            showtime.id
          }
          seats={
            validSelectedSeats
          }
          seatDetails={
            seatDetails
          }
          seatSubtotal={
            subtotal
          }
        />
      </div>
    </main>
  );
}