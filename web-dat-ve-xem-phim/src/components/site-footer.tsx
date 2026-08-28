import Link from 'next/link';

const QUICK_LINKS = [
  { href: '/phim', label: 'Phim đang chiếu' },
  { href: '/suat-chieu', label: 'Suất chiếu' },
  { href: '/dang-nhap', label: 'Đăng nhập' },
  { href: '/dang-ky', label: 'Đăng ký' },
];

const FEATURES = [
  'Chọn phim, rạp và suất chiếu',
  'Giữ ghế realtime, thanh toán online',
  'Quản lý vé và lịch sử đặt chỗ',
];

const TECH = [
  'Next.js + TypeScript',
  'MySQL + Prisma ORM',
  'Docker + Docker Compose',
];

export function SiteFooter() {
  return (
    <footer className="mt-20 border-t border-white/10 bg-slate-950/95">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          {/* Brand */}
          <div className="sm:col-span-2 lg:col-span-1">
            <Link href="/" className="inline-flex items-center gap-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-500/20 text-sm font-bold text-sky-300">
                DV
              </span>
              <span className="text-lg font-semibold tracking-tight text-white">
                DatVeXemPhim
              </span>
            </Link>
            <p className="mt-4 max-w-xs text-sm leading-7 text-slate-400">
              Đặt vé xem phim nhanh, chọn ghế dễ dàng, thanh toán an toàn —
              trải nghiệm rạp chiếu ngay trên web.
            </p>
          </div>

          {/* Liên kết nhanh */}
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-300">
              Liên kết
            </h3>
            <ul className="mt-4 space-y-2.5">
              {QUICK_LINKS.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="text-sm text-slate-400 transition hover:text-sky-300"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Chức năng */}
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-300">
              Chức năng
            </h3>
            <ul className="mt-4 space-y-2.5">
              {FEATURES.map((item) => (
                <li
                  key={item}
                  className="flex items-start gap-2 text-sm text-slate-400"
                >
                  <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-sky-400/70" />
                  {item}
                </li>
              ))}
            </ul>
          </div>

          {/* Công nghệ */}
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-300">
              Công nghệ
            </h3>
            <ul className="mt-4 space-y-2.5">
              {TECH.map((item) => (
                <li
                  key={item}
                  className="flex items-start gap-2 text-sm text-slate-400"
                >
                  <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-emerald-400/70" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-12 flex flex-col items-start justify-between gap-3 border-t border-white/10 pt-6 text-xs text-slate-500 sm:flex-row sm:items-center">
          <p>© {new Date().getFullYear()} DatVeXemPhim. Đồ án Next.js + MySQL + Docker.</p>
          <p className="text-slate-600">Made for learning · Not a commercial product</p>
        </div>
      </div>
    </footer>
  );
}
