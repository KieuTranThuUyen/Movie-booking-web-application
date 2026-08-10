'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useState } from 'react';

const adminLinks = [
  {
    href: '/admin',
    label: 'Tổng quan',
  },
  {
    href: '/admin/movies',
    label: 'Quản lý phim',
  },
  {
    href: '/admin/cinemas',
    label: 'Quản lý rạp chiếu và sơ đồ ghế',
  },
  {
    href: '/admin/showtimes',
    label: 'Quản lý suất chiếu',
  },
  {
    href: '/admin/users',
    label: 'Quản lý người dùng',
  },
  {
    href: '/admin/bookings',
    label: 'Quản lý đặt vé',
  },
];

export function AdminSidebar() {
  const pathname = usePathname();
  const { data: session, status } = useSession();
  const [open, setOpen] = useState(false);

  // Chưa đăng nhập hoặc không phải Admin
  if (
    status === 'loading' ||
    !session?.user ||
    session.user.role !== 'ADMIN'
  ) {
    return null;
  }

  return (
    <>
      {/* =========================
          NÚT 3 GẠCH
          ========================= */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Mở menu quản trị"
        className="fixed left-5 top-5 z-50 flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-slate-950/90 shadow-lg backdrop-blur-xl transition hover:border-sky-400/30 hover:bg-slate-800"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className="h-6 w-6 text-slate-200"
        >
          <path
            strokeLinecap="round"
            d="M4 6h16"
          />
          <path
            strokeLinecap="round"
            d="M4 12h16"
          />
          <path
            strokeLinecap="round"
            d="M4 18h16"
          />
        </svg>
      </button>

      {/* =========================
          LỚP NỀN
          ========================= */}
      {open && (
        <button
          type="button"
          aria-label="Đóng menu"
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
        />
      )}

      {/* =========================
          SIDEBAR
          ========================= */}
      <aside
        className={`fixed left-0 top-0 z-50 flex h-screen w-[310px] flex-col border-r border-white/10 bg-slate-950 p-5 shadow-2xl backdrop-blur-xl transition-transform duration-300 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-5">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-sky-300">
              Admin
            </p>

            <h2 className="mt-1 text-xl font-bold text-white">
              Bảng điều khiển
            </h2>
          </div>

          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Đóng menu"
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 text-2xl leading-none text-slate-300 transition hover:bg-white/10 hover:text-white"
          >
            ×
          </button>
        </div>

        {/* Menu */}
        <nav className="mt-6 flex-1 space-y-2 overflow-y-auto">
          {adminLinks.map((item) => {
            const isActive =
              item.href === '/admin'
                ? pathname === '/admin'
                : pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={`block rounded-2xl border px-4 py-3 text-sm font-semibold transition ${
                  isActive
                    ? 'border-sky-400/30 bg-sky-500/15 text-white'
                    : 'border-white/10 bg-white/5 text-slate-300 hover:border-white/20 hover:bg-white/10 hover:text-white'
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Tài khoản + Trang chủ */}
        <div className="mt-5 space-y-2 border-t border-white/10 pt-5">
          <Link
            href="/tai-khoan"
            onClick={() => setOpen(false)}
            className={`group flex items-center gap-3 rounded-2xl border px-4 py-3 text-sm font-semibold transition-all ${
              pathname === '/tai-khoan'
                ? 'border-sky-400/30 bg-sky-500/15 text-white'
                : 'border-white/10 bg-white/5 text-slate-300 hover:border-sky-400/30 hover:bg-sky-500/10 hover:text-sky-300'
            }`}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              className="h-5 w-5"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15.75 6.75a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0Z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M4.5 20.25a7.5 7.5 0 0 1 15 0"
              />
            </svg>

            <span>Tài khoản</span>
          </Link>

          <Link
            href="/"
            onClick={() => setOpen(false)}
            className="group flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-slate-300 transition-all hover:border-sky-400/30 hover:bg-sky-500/10 hover:text-sky-300"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              className="h-5 w-5"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="m3 10.5 9-7.5 9 7.5"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M5.25 9.75v9a1.5 1.5 0 0 0 1.5 1.5h10.5a1.5 1.5 0 0 0 1.5-1.5v-9"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 20.25v-5.25h6v5.25"
              />
            </svg>

            <span>Trang chủ</span>
          </Link>
        </div>
      </aside>
    </>
  );
}