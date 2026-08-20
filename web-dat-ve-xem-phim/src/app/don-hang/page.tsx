import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth/next';

import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

type BookingSummary = {
  id: string;
  bookingCode: string;
  customerName: string;
  status: string;
  paymentStatus: string;
  totalPrice: number;
  showtime: {
    movie: {
      title: string;
    };
    hall: {
      cinema: {
        name: string;
      };
      name: string;
    };
    startTime: Date;
  };
  tickets: {
    id: string;
    seatCode: string;
  }[];
};

/**
 * Trạng thái đơn:
 * - PENDING    → Chờ thanh toán
 * - CONFIRMED  → Đã xác nhận
 * - CANCELED   → Đã hủy
 */
function getBookingStatusLabel(status: string) {
  switch (status) {
    case 'PENDING':
      return 'Chờ thanh toán';

    case 'CONFIRMED':
      return 'Đã xác nhận';

    case 'CANCELED':
      return 'Đã hủy';

    default:
      return 'Không xác định';
  }
}

/**
 * Trạng thái thanh toán:
 * - UNPAID    → Chưa thanh toán
 * - PAID      → Đã thanh toán
 * - REFUNDED  → Đã hoàn tiền
 */
function getPaymentStatusLabel(status: string) {
  switch (status) {
    case 'UNPAID':
      return 'Chưa thanh toán';

    case 'PAID':
      return 'Đã thanh toán';

    case 'REFUNDED':
      return 'Đã hoàn tiền';

    default:
      return 'Không xác định';
  }
}

function getBookingStatusClass(status: string) {
  switch (status) {
    case 'CONFIRMED':
      return 'border-emerald-400/20 bg-emerald-500/10 text-emerald-300';

    case 'CANCELED':
      return 'border-rose-400/20 bg-rose-500/10 text-rose-300';

    case 'PENDING':
    default:
      return 'border-amber-400/20 bg-amber-500/10 text-amber-300';
  }
}

function getPaymentStatusClass(status: string) {
  switch (status) {
    case 'PAID':
      return 'bg-emerald-500/10 text-emerald-300';

    case 'REFUNDED':
      return 'bg-rose-500/10 text-rose-300';

    case 'UNPAID':
    default:
      return 'bg-amber-500/10 text-amber-300';
  }
}

export default async function OrdersPage() {
  // ============================================================
  // KIỂM TRA ĐĂNG NHẬP
  // ============================================================

  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect('/dang-nhap?callbackUrl=/don-hang');
  }

  const userId = session.user.id;

  // ============================================================
  // CHỈ LẤY ĐƠN CỦA USER ĐANG ĐĂNG NHẬP
  // ============================================================

  const bookings = (await prisma.booking.findMany({
    where: {
      userId,
    },

    orderBy: {
      createdAt: 'desc',
    },

    include: {
      showtime: {
        include: {
          movie: true,

          hall: {
            include: {
              cinema: true,
            },
          },
        },
      },

      tickets: true,
    },
  })) as BookingSummary[];

  return (
    <main className="page-shell py-12 lg:py-16">
      {/* ========================================================
          HEADER
      ======================================================== */}

      <div className="space-y-3">
        <p className="text-sm uppercase tracking-[0.35em] text-sky-300/80">
          Đơn vé
        </p>

        <h1 className="text-4xl font-bold text-white">
          Quản lý và tra cứu đơn đặt
        </h1>

        <p className="text-sm text-slate-400">
          Bạn chỉ có thể xem các đơn đặt vé của tài khoản hiện tại.
        </p>
      </div>

      {/* ========================================================
          DANH SÁCH ĐƠN
      ======================================================== */}

      <div className="mt-10 grid gap-4">
        {bookings.length === 0 ? (
          <div className="rounded-[28px] border border-white/10 bg-slate-950/70 p-6 shadow-glow backdrop-blur-xl">
            <p className="text-sm text-slate-300">
              Bạn chưa có đơn đặt vé nào được ghi nhận.
            </p>

            <Link
              href="/suat-chieu"
              className="mt-4 inline-flex rounded-xl bg-sky-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky-400"
            >
              Đặt vé ngay
            </Link>
          </div>
        ) : (
          bookings.map((booking) => (
            <article
              key={booking.id}
              className="rounded-[28px] border border-white/10 bg-slate-950/70 p-6 shadow-glow backdrop-blur-xl"
            >
              {/* ==================================================
                  THÔNG TIN PHIM + TRẠNG THÁI ĐƠN
              =================================================== */}

              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-semibold text-white">
                    {booking.showtime.movie.title}
                  </h2>

                  <p className="mt-1 text-sm text-slate-400">
                    {booking.customerName} ·{' '}
                    {new Date(
                      booking.showtime.startTime,
                    ).toLocaleString('vi-VN')}
                  </p>
                </div>

                <div
                  className={`rounded-full border px-4 py-2 text-sm ${getBookingStatusClass(
                    booking.status,
                  )}`}
                >
                  {getBookingStatusLabel(booking.status)}
                </div>
              </div>

              {/* ==================================================
                  THÔNG TIN ĐƠN
              =================================================== */}

              <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-slate-300">
                <span className="rounded-full bg-white/5 px-3 py-1">
                  Mã đơn: {booking.bookingCode}
                </span>

                <span
                  className={`rounded-full px-3 py-1 ${getPaymentStatusClass(
                    booking.paymentStatus,
                  )}`}
                >
                  Thanh toán:{' '}
                  {getPaymentStatusLabel(
                    booking.paymentStatus,
                  )}
                </span>

                <span className="rounded-full bg-white/5 px-3 py-1">
                  Tổng tiền:{' '}
                  {booking.totalPrice.toLocaleString(
                    'vi-VN',
                  )}{' '}
                  đ
                </span>

                <span className="rounded-full bg-white/5 px-3 py-1">
                  Ghế:{' '}
                  {booking.tickets.length > 0
                    ? booking.tickets
                        .map(
                          (ticket) =>
                            ticket.seatCode,
                        )
                        .join(', ')
                    : 'Đang giữ ghế'}
                </span>
              </div>

              {/* ==================================================
                  ACTION
              =================================================== */}

              <div className="mt-5 flex flex-wrap gap-3">
                {booking.status === 'PENDING' &&
                booking.paymentStatus === 'UNPAID' ? (
                  <Link
                    href={`/thanh-toan/${booking.id}`}
                    className="inline-flex items-center justify-center rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-emerald-400"
                  >
                    Thanh toán
                  </Link>
                ) : null}

                {booking.status === 'CONFIRMED' &&
                booking.paymentStatus === 'PAID' ? (
                  <Link
                    href={`/ve/${booking.id}`}
                    className="inline-flex items-center justify-center rounded-xl bg-sky-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-sky-400"
                  >
                    Xem vé điện tử
                  </Link>
                ) : null}

                {booking.status === 'CANCELED' ? (
                  <span className="inline-flex items-center justify-center rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-slate-400">
                    Đơn đã hủy
                  </span>
                ) : null}
              </div>
            </article>
          ))
        )}
      </div>
    </main>
  );
}