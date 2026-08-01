import { getServerSession } from 'next-auth/next';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export default async function AccountPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect('/dang-nhap?callbackUrl=/tai-khoan');
  }

  const bookings = await prisma.booking.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: 'desc' },
    include: {
      showtime: {
        include: {
          movie: true,
          hall: {
            include: {
              cinema: true
            }
          }
        }
      },
      tickets: true,
      payment: true
    }
  });

  return (
    <main className="page-shell py-12 lg:py-16">
      <div className="space-y-3">
        <p className="text-sm uppercase tracking-[0.35em] text-sky-300/80">Tài khoản</p>
        <h1 className="text-4xl font-bold text-white">Thông tin thành viên</h1>
      </div>

      <div className="mt-10 grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <section className="rounded-[28px] border border-white/10 bg-slate-950/70 p-6 shadow-glow backdrop-blur-xl">
          <div className="text-lg font-semibold text-white">Hồ sơ</div>
          <div className="mt-4 space-y-3 text-sm text-slate-200">
            <div className="flex items-center justify-between"><span>Họ và tên</span><span>{session.user.name ?? 'Chưa cập nhật'}</span></div>
            <div className="flex items-center justify-between"><span>Email</span><span>{session.user.email ?? 'Chưa cập nhật'}</span></div>
            <div className="flex items-center justify-between"><span>Số điện thoại</span><span>{session.user.phone ?? 'Chưa cập nhật'}</span></div>
            <div className="flex items-center justify-between"><span>Vai trò</span><span>{session.user.role}</span></div>
          </div>
        </section>

        <section className="rounded-[28px] border border-white/10 bg-slate-950/70 p-6 shadow-glow backdrop-blur-xl">
          <div className="text-lg font-semibold text-white">Lịch sử đặt vé</div>
          <div className="mt-4 space-y-4">
            {bookings.length === 0 ? (
              <p className="rounded-3xl border border-white/10 bg-white/5 p-4 text-sm text-slate-400">Chưa có đơn đặt vé nào.</p>
            ) : (
              bookings.map((booking) => (
                <div key={booking.id} className="rounded-3xl border border-white/10 bg-white/5 p-4 text-sm text-slate-200">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-semibold text-white">{booking.showtime.movie.title}</span>
                    <span>{booking.bookingCode}</span>
                  </div>
                  <div className="mt-2 text-slate-400">
                    {booking.showtime.hall.cinema.name} · {booking.showtime.hall.name} · {new Date(booking.showtime.startTime).toLocaleString('vi-VN')}
                  </div>
                  <div className="mt-2 flex flex-wrap gap-3 text-xs uppercase tracking-[0.2em] text-sky-200/90">
                    <span>{booking.status}</span>
                    <span>{booking.paymentStatus}</span>
                    <span>{booking.tickets.map((ticket) => ticket.seatCode).join(', ')}</span>
                    <span>{booking.totalPrice.toLocaleString('vi-VN')} đ</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </main>
  );
}