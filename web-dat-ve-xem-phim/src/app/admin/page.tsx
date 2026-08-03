import { BookingStatus, PaymentStatus } from '@prisma/client';
import { prisma } from '@/lib/prisma';

export default async function AdminPage() {
  const [bookingsCount, moviesCount, usersCount, showtimesCount, cinemasCount, hallsCount, pendingBookings, confirmedBookings, paidBookings] = await Promise.all([
    prisma.booking.count(),
    prisma.movie.count(),
    prisma.user.count(),
    prisma.showtime.count(),
    prisma.cinema.count(),
    prisma.hall.count(),
    prisma.booking.count({ where: { status: BookingStatus.PENDING } }),
    prisma.booking.count({ where: { status: BookingStatus.CONFIRMED } }),
    prisma.booking.count({ where: { paymentStatus: PaymentStatus.PAID } })
  ]);

  const completionRate = bookingsCount === 0 ? 0 : Math.round((confirmedBookings / bookingsCount) * 100);
  const paymentRate = bookingsCount === 0 ? 0 : Math.round((paidBookings / bookingsCount) * 100);

  const kpis = [
    {
      label: 'Tổng đơn đặt',
      value: bookingsCount,
      note: `${pendingBookings} đơn chờ xử lý`,
      tone: 'from-sky-500/25 to-cyan-500/5'
    },
    {
      label: 'Tỷ lệ xác nhận',
      value: `${completionRate}%`,
      note: `${confirmedBookings}/${bookingsCount || 0} đơn đã xác nhận`,
      tone: 'from-emerald-500/25 to-teal-500/5'
    },
    {
      label: 'Tỷ lệ thanh toán',
      value: `${paymentRate}%`,
      note: `${paidBookings}/${bookingsCount || 0} đơn đã thanh toán`,
      tone: 'from-amber-500/25 to-orange-500/5'
    },
    {
      label: 'Nội dung hệ thống',
      value: `${moviesCount} phim`,
      note: `${showtimesCount} suất chiếu`,
      tone: 'from-fuchsia-500/25 to-indigo-500/5'
    },
    {
      label: 'Người dùng',
      value: usersCount,
      note: 'Tài khoản đã đăng ký',
      tone: 'from-violet-500/25 to-blue-500/5'
    },
    {
      label: 'Hạ tầng rạp',
      value: `${cinemasCount} rạp`,
      note: `${hallsCount} phòng chiếu`,
      tone: 'from-rose-500/25 to-pink-500/5'
    }
  ];

  return (
    <section className="space-y-8">
      <div className="relative overflow-hidden rounded-[28px] border border-white/10 bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 p-6 shadow-glow">
        <div className="pointer-events-none absolute -right-14 -top-16 h-44 w-44 rounded-full bg-sky-500/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 left-20 h-56 w-56 rounded-full bg-fuchsia-500/15 blur-3xl" />
        <div className="relative grid gap-6 lg:grid-cols-[1.1fr_0.9fr] lg:items-end">
          <div>
            <p className="text-sm uppercase tracking-[0.28em] text-sky-300/80">Tổng quan vận hành</p>
            <h2 className="mt-3 text-3xl font-bold text-white lg:text-4xl">Bức tranh nhanh toàn bộ hệ thống đặt vé</h2>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-300">
              Theo dõi năng lực vận hành theo thời gian thực, ưu tiên xử lý đơn chờ xác nhận và cập nhật các khu vực quản trị quan trọng chỉ bằng một lần nhấp.
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur">
            <div className="text-xs uppercase tracking-[0.2em] text-slate-400">Cần ưu tiên hôm nay</div>
            <div className="mt-3 grid gap-3 text-sm">
              <div className="flex items-center justify-between rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2">
                <span className="text-slate-300">Đơn chờ xử lý</span>
                <span className="font-semibold text-amber-200">{pendingBookings}</span>
              </div>
              <div className="flex items-center justify-between rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2">
                <span className="text-slate-300">Đơn đã xác nhận</span>
                <span className="font-semibold text-emerald-200">{confirmedBookings}</span>
              </div>
              <div className="flex items-center justify-between rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2">
                <span className="text-slate-300">Đơn đã thanh toán</span>
                <span className="font-semibold text-sky-200">{paidBookings}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {kpis.map((item) => (
          <article key={item.label} className="relative overflow-hidden rounded-[24px] border border-white/10 bg-slate-950/75 p-5 shadow-glow backdrop-blur-xl">
            <div className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${item.tone}`} />
            <div className="relative">
              <p className="text-sm text-slate-300">{item.label}</p>
              <p className="mt-2 text-3xl font-semibold text-white">{item.value}</p>
              <p className="mt-2 text-xs uppercase tracking-[0.12em] text-slate-400">{item.note}</p>
            </div>
          </article>
        ))}
      </div>

      <div className="rounded-[24px] border border-white/10 bg-slate-950/70 p-5 shadow-glow backdrop-blur-xl">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-lg font-semibold text-white">Nhịp độ xử lý đơn</h3>
          <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-300">Từ dữ liệu hiện tại</span>
        </div>
        <div className="mt-4 space-y-4">
          <div>
            <div className="mb-2 flex items-center justify-between text-sm">
              <span className="text-slate-300">Xác nhận đơn</span>
              <span className="font-semibold text-emerald-200">{completionRate}%</span>
            </div>
            <div className="h-2 rounded-full bg-white/10">
              <div className="h-2 rounded-full bg-gradient-to-r from-emerald-400 to-teal-300" style={{ width: `${completionRate}%` }} />
            </div>
          </div>
          <div>
            <div className="mb-2 flex items-center justify-between text-sm">
              <span className="text-slate-300">Thanh toán thành công</span>
              <span className="font-semibold text-sky-200">{paymentRate}%</span>
            </div>
            <div className="h-2 rounded-full bg-white/10">
              <div className="h-2 rounded-full bg-gradient-to-r from-sky-400 to-indigo-300" style={{ width: `${paymentRate}%` }} />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}