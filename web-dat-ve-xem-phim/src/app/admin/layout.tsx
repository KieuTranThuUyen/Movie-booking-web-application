import type { ReactNode } from 'react';
import Link from 'next/link';

const adminLinks = [
  { href: '/admin', label: 'Tổng quan' },
  { href: '/admin/movies', label: 'Quản lý phim' },
  { href: '/admin/cinemas', label: 'Quản lý rạp chiếu và sơ đồ ghế' },
  { href: '/admin/showtimes', label: 'Quản lý suất chiếu' },
  { href: '/admin/users', label: 'Quản lý người dùng' },
  { href: '/admin/bookings', label: 'Quản lý đặt vé' }
];

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <main className="page-shell py-12 lg:py-16">
      <div className="space-y-3">
        <p className="text-sm uppercase tracking-[0.35em] text-sky-300/80">Admin</p>
        <h1 className="text-4xl font-bold text-white">Bảng điều khiển quản trị</h1>
      </div>

      <nav className="mt-8 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {adminLinks.map((item) => (
          <Link key={item.href} href={item.href} className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-slate-200 transition hover:border-white/30 hover:bg-white/10">
            {item.label}
          </Link>
        ))}
      </nav>

      <div className="mt-8">{children}</div>
    </main>
  );
}
