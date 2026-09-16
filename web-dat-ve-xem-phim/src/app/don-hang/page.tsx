import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth/next';

import { OrdersBookingList } from '@/components/booking/orders-booking-list';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db/prisma';

type BookingSummary = {
  id: string;
  bookingCode: string;
  customerName: string;
  status: string;
  paymentStatus: string;
  totalPrice: number;
  refundedAmount: number;
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
    status: string;
  }[];
};

/* ============================================================
   BOOKING STATUS
   ============================================================ */

function getBookingStatusLabel(
  status: string,
) {
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

/* ============================================================
   PAYMENT STATUS
   ============================================================ */

function getPaymentStatusLabel(
  status: string,
) {
  switch (status) {
    case 'UNPAID':
      return 'Chưa thanh toán';

    case 'PAID':
      return 'Đã thanh toán';

    case 'PARTIALLY_REFUNDED':
      return 'Đã hoàn tiền một phần';

    case 'REFUNDED':
      return 'Đã hoàn tiền';

    default:
      return 'Không xác định';
  }
}

/* ============================================================
   BOOKING STATUS CLASS
   ============================================================ */

function getBookingStatusClass(
  status: string,
) {
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

/* ============================================================
   PAYMENT STATUS CLASS
   ============================================================ */

function getPaymentStatusClass(
  status: string,
) {
  switch (status) {
    case 'PAID':
      return 'bg-emerald-500/10 text-emerald-300';

    case 'PARTIALLY_REFUNDED':
      return 'bg-orange-500/10 text-orange-300';

    case 'REFUNDED':
      return 'bg-purple-500/10 text-purple-300';

    case 'UNPAID':
    default:
      return 'bg-amber-500/10 text-amber-300';
  }
}

/* ============================================================
   PAGE
   ============================================================ */

export default async function OrdersPage() {
  /* ==========================================================
     SESSION
     ========================================================== */

  const session =
    await getServerSession(
      authOptions,
    );

  if (!session?.user?.id) {
    redirect(
      '/dang-nhap?callbackUrl=/don-hang',
    );
  }

  const userId =
    session.user.id;

  /* ==========================================================
     BOOKINGS
     ========================================================== */

  const rawBookings = await prisma.booking.findMany({
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

      tickets: {
        orderBy: {
          seatCode: 'asc',
        },
      },
    },
  });

  const bookings = rawBookings.map((b) => ({
    id: b.id,
    bookingCode: b.bookingCode,
    customerName: b.customerName,
    status: b.status,
    paymentStatus: b.paymentStatus,
    totalPrice: b.totalPrice,
    refundedAmount: b.refundedAmount,
    showtime: {
      movie: { title: b.showtime.movie.title },
      hall: {
        cinema: { name: b.showtime.hall.cinema.name },
        name: b.showtime.hall.name,
      },
      startTime: b.showtime.startTime.toISOString(),
    },
    tickets: b.tickets.map((t) => ({
      id: t.id,
      seatCode: t.seatCode,
      status: t.status,
    })),
  }));

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
          Bạn chỉ có thể xem các đơn đặt
          vé của tài khoản hiện tại.
        </p>
      </div>

      {/* ========================================================
          DANH SÁCH ĐƠN
      ======================================================== */}

      <div className="mt-10">
        <OrdersBookingList bookings={bookings} />
      </div>
    </main>
  );
}