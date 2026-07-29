import { prisma } from '@/lib/prisma';

export default async function OrdersPage() {
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
      startTime: Date;
    };
  };

  const bookings = await prisma.booking.findMany({
    orderBy: { createdAt: 'desc' },
    include: { showtime: { include: { movie: true } } }
  }) as BookingSummary[];

  return (
    <main className="page-shell py-12 lg:py-16">
      <div className="space-y-3">
        <p className="text-sm uppercase tracking-[0.35em] text-sky-300/80">Đơn vé</p>
        <h1 className="text-4xl font-bold text-white">Quản lý và tra cứu đơn đặt</h1>
      </div>

      <div className="mt-10 grid gap-4">
        {bookings.length === 0 ? (
          <p className="rounded-[28px] border border-white/10 bg-slate-950/70 p-6 text-sm text-slate-300">Chưa có đơn đặt vé nào được ghi nhận.</p>
        ) : bookings.map((booking) => (
          <article key={booking.id} className="rounded-[28px] border border-white/10 bg-slate-950/70 p-6 shadow-glow backdrop-blur-xl">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold text-white">{booking.showtime.movie.title}</h2>
                <p className="mt-1 text-sm text-slate-400">{booking.customerName} · {new Date(booking.showtime.startTime).toLocaleString('vi-VN')}</p>
              </div>
              <div className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-200">{booking.status}</div>
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-slate-300">
              <span className="rounded-full bg-white/5 px-3 py-1">Mã đơn: {booking.bookingCode}</span>
              <span className="rounded-full bg-white/5 px-3 py-1">Thanh toán: {booking.paymentStatus}</span>
              <span className="rounded-full bg-white/5 px-3 py-1">Tổng tiền: {booking.totalPrice.toLocaleString('vi-VN')} đ</span>
            </div>
          </article>
        ))}
      </div>
    </main>
  );
}