import Link from 'next/link';
import { getServerSession } from 'next-auth/next';
import { redirect } from 'next/navigation';

import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db/prisma';
import { AccountProfile } from '@/components/booking/account-profile';
import { BookingHistoryList } from '@/components/booking/booking-history-list';

function getBookingStatusLabel(status: string) {
  switch (status) {
    case 'PENDING':
      return 'Chờ xử lý';

    case 'CONFIRMED':
      return 'Đã xác nhận';

    case 'CANCELED':
      return 'Đã hủy';

    default:
      return status;
  }
}

function getPaymentStatusLabel(status: string) {
  switch (status) {
    case 'UNPAID':
      return 'Chưa thanh toán';

    case 'PAID':
      return 'Đã thanh toán';

    case 'REFUNDED':
      return 'Đã hoàn tiền';

    default:
      return status;
  }
}

export default async function AccountPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect('/dang-nhap?callbackUrl=/tai-khoan');
  }

  const profile = await prisma.user.findUniqueOrThrow({
    where: { id: session.user.id },
    select: {
      name: true,
      email: true,
      phone: true,
      address: true,
      city: true,
      district: true,
      image: true,
      role: true,
    },
  });

  const rawBookings = await prisma.booking.findMany({
    where: {
      userId: session.user.id,
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

      payment: true,
    },
  });

  const bookings = rawBookings.map((booking) => ({
    id: booking.id,
    bookingCode: booking.bookingCode,
    status: booking.status,
    paymentStatus: booking.paymentStatus,
    totalPrice: booking.totalPrice,
    showtime: {
      startTime: booking.showtime.startTime.toISOString(),
      movie: { title: booking.showtime.movie.title },
      hall: {
        name: booking.showtime.hall.name,
        cinema: { name: booking.showtime.hall.cinema.name },
      },
    },
    tickets: booking.tickets.map((t) => ({ seatCode: t.seatCode })),
  }));

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-10 text-white sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div>
          <p className="text-sm uppercase tracking-[0.35em] text-sky-300/80">
            Tài khoản
          </p>

          <h1 className="mt-2 text-3xl font-bold sm:text-4xl">
            Thông tin thành viên
          </h1>

          <p className="mt-2 text-slate-400">
            Quản lý thông tin cá nhân và xem lịch sử đặt vé.
          </p>
        </div>

        <div className="mt-10 grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="space-y-6">
            <AccountProfile
              name={profile.name}
              email={profile.email}
              phone={profile.phone ?? ''}
              address={profile.address ?? ''}
              city={profile.city ?? ''}
              district={profile.district ?? ''}
              image={profile.image ?? ''}
              role={profile.role}
            />

            <Link
              href="/doi-mat-khau"
              className="inline-flex w-full items-center justify-center rounded-xl bg-sky-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-sky-400"
            >
              Đổi mật khẩu
            </Link>
          </div>

          <section className="rounded-[28px] border border-white/10 bg-slate-950/70 p-6 shadow-glow backdrop-blur-xl">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-lg font-semibold text-white">
                  Lịch sử đặt vé
                </div>

                <p className="mt-1 text-sm text-slate-400">
                  Theo dõi các đơn đặt vé của bạn.
                </p>
              </div>

              <Link
                href="/don-hang"
                className="inline-flex items-center justify-center rounded-xl bg-sky-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-sky-400"
              >
                Quản lý và tra cứu đơn đặt
              </Link>
            </div>

            <div className="mt-4">
              <BookingHistoryList bookings={bookings} />
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}

