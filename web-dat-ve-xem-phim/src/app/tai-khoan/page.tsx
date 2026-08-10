import { getServerSession } from 'next-auth/next';
import { redirect } from 'next/navigation';

import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { AccountProfile } from '@/components/account-profile';

export default async function AccountPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect('/dang-nhap?callbackUrl=/tai-khoan');
  }

  const bookings = await prisma.booking.findMany({
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
          {/* =========================
              HỒ SƠ
              ========================= */}
          <AccountProfile
            name={session.user.name ?? ''}
            email={session.user.email ?? ''}
            phone={session.user.phone ?? ''}
            role={session.user.role}
          />

          {/* =========================
              LỊCH SỬ ĐẶT VÉ
              ========================= */}
          <section className="rounded-[28px] border border-white/10 bg-slate-950/70 p-6 shadow-glow backdrop-blur-xl">
            <div className="text-lg font-semibold text-white">
              Lịch sử đặt vé
            </div>

            <div className="mt-4 space-y-4">
              {bookings.length === 0 ? (
                <p className="rounded-3xl border border-white/10 bg-white/5 p-4 text-sm text-slate-400">
                  Chưa có đơn đặt vé nào.
                </p>
              ) : (
                bookings.map((booking) => (
                  <div
                    key={booking.id}
                    className="rounded-3xl border border-white/10 bg-white/5 p-4 text-sm text-slate-200"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-semibold text-white">
                        {booking.showtime.movie.title}
                      </span>

                      <span className="text-slate-400">
                        {booking.bookingCode}
                      </span>
                    </div>

                    <div className="mt-2 text-slate-400">
                      {booking.showtime.hall.cinema.name} ·{' '}
                      {booking.showtime.hall.name} ·{' '}
                      {new Date(
                        booking.showtime.startTime
                      ).toLocaleString('vi-VN')}
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2 text-xs">
                      <span className="rounded-full bg-sky-500/10 px-3 py-1 text-sky-300">
                        {booking.status}
                      </span>

                      <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-emerald-300">
                        {booking.paymentStatus}
                      </span>

                      <span className="rounded-full bg-white/10 px-3 py-1 text-slate-300">
                        Ghế:{' '}
                        {booking.tickets
                          .map((ticket) => ticket.seatCode)
                          .join(', ')}
                      </span>

                      <span className="rounded-full bg-white/10 px-3 py-1 text-slate-300">
                        {booking.totalPrice.toLocaleString('vi-VN')} đ
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}