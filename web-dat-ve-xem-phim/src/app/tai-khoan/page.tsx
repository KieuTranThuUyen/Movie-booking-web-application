import { bookingHistory } from '@/lib/mock-data';

export default function AccountPage() {
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
            <div className="flex items-center justify-between"><span>Họ và tên</span><span>Nguyễn Văn A</span></div>
            <div className="flex items-center justify-between"><span>Email</span><span>user@example.com</span></div>
            <div className="flex items-center justify-between"><span>Số điện thoại</span><span>0912345678</span></div>
          </div>
        </section>

        <section className="rounded-[28px] border border-white/10 bg-slate-950/70 p-6 shadow-glow backdrop-blur-xl">
          <div className="text-lg font-semibold text-white">Lịch sử đặt vé</div>
          <div className="mt-4 space-y-4">
            {bookingHistory.map((booking) => (
              <div key={booking.code} className="rounded-3xl border border-white/10 bg-white/5 p-4 text-sm text-slate-200">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-semibold text-white">{booking.movieTitle}</span>
                  <span>{booking.code}</span>
                </div>
                <div className="mt-2 text-slate-400">{booking.cinemaName} · {booking.time}</div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}