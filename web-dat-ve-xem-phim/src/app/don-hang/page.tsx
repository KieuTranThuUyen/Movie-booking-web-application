import { bookingHistory } from '@/lib/mock-data';

export default function OrdersPage() {
  return (
    <main className="page-shell py-12 lg:py-16">
      <div className="space-y-3">
        <p className="text-sm uppercase tracking-[0.35em] text-sky-300/80">Đơn vé</p>
        <h1 className="text-4xl font-bold text-white">Quản lý và tra cứu đơn đặt</h1>
      </div>

      <div className="mt-10 grid gap-4">
        {bookingHistory.map((booking) => (
          <article key={booking.code} className="rounded-[28px] border border-white/10 bg-slate-950/70 p-6 shadow-glow backdrop-blur-xl">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold text-white">{booking.movieTitle}</h2>
                <p className="mt-1 text-sm text-slate-400">{booking.cinemaName} · {booking.time}</p>
              </div>
              <div className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-200">{booking.status}</div>
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-slate-300">
              <span className="rounded-full bg-white/5 px-3 py-1">Mã đơn: {booking.code}</span>
              <span className="rounded-full bg-white/5 px-3 py-1">Ghế: {booking.seats.join(', ')}</span>
              <span className="rounded-full bg-white/5 px-3 py-1">Tổng tiền: {booking.total.toLocaleString('vi-VN')} đ</span>
            </div>
          </article>
        ))}
      </div>
    </main>
  );
}