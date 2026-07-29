import Link from 'next/link';

const navItems = [
  { href: '/', label: 'Trang chủ' },
  { href: '/phim', label: 'Phim' },
  { href: '/dat-ve', label: 'Đặt vé' },
  { href: '/gio-hang', label: 'Giỏ vé' },
  { href: '/thanh-toan', label: 'Thanh toán' },
  { href: '/admin', label: 'Admin' }
];

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-slate-950/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-3 font-semibold tracking-wide text-white">
          <span className="grid h-10 w-10 place-items-center rounded-2xl bg-gradient-to-br from-rose-500 via-fuchsia-500 to-sky-500 text-sm shadow-glow">
            DVX
          </span>
          <div>
            <div className="text-sm uppercase tracking-[0.35em] text-sky-300/80">Cinema</div>
            <div className="text-lg">DatVeXemPhim</div>
          </div>
        </Link>

        <nav className="hidden items-center gap-5 text-sm text-slate-300 lg:flex">
          {navItems.map((item) => (
            <Link key={item.href} href={item.href} className="transition hover:text-white">
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-3 sm:flex">
          <Link
            href="/dang-nhap"
            className="rounded-full border border-white/10 px-4 py-2 text-sm text-slate-100 transition hover:border-white/20 hover:bg-white/5"
          >
            Đăng nhập
          </Link>
          <Link
            href="/dang-ky"
            className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-slate-100"
          >
            Đăng ký
          </Link>
        </div>
      </div>
    </header>
  );
}