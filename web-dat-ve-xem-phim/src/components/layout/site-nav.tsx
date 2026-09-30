'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';

type Props = {
  genres: string[];
};

type MenuId = 'phim' | 'theloai' | null;

function Item({
  href,
  children,
  onNavigate,
}: {
  href: string;
  children: React.ReactNode;
  onNavigate: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onNavigate}
      className="block px-4 py-2 text-sm text-slate-300 transition hover:bg-white/10 hover:text-white"
    >
      {children}
    </Link>
  );
}

export function SiteNav({ genres }: Props) {
  const [open, setOpen] = useState<MenuId>(null);
  const ref = useRef<HTMLElement>(null);

  // Click ra ngoài → đóng hết
  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!ref.current?.contains(e.target as Node)) setOpen(null);
    }
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  function toggle(id: MenuId) {
    setOpen((cur) => (cur === id ? null : id));
  }

  function openOnly(id: MenuId) {
    setOpen(id);
  }

  return (
    <nav
      ref={ref}
      className="hidden items-center gap-1 md:flex"
      aria-label="Menu chính"
    >
      {/* ===== Phim ===== */}
      <div
        className="relative"
        onMouseEnter={() => openOnly('phim')}
      >
        <button
          type="button"
          onClick={() => toggle('phim')}
          className="flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-medium text-slate-200 transition hover:bg-white/10 hover:text-white"
          aria-expanded={open === 'phim'}
        >
          Phim
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className={`h-3.5 w-3.5 transition ${open === 'phim' ? 'rotate-180' : ''}`}
          >
            <path d="m6 9 6 6 6-6" />
          </svg>
        </button>

        {open === 'phim' && (
          <div className="absolute left-0 top-full z-50 mt-1 min-w-[180px] rounded-xl border border-white/10 bg-slate-950/95 py-1.5 shadow-xl backdrop-blur-xl">
            <Item href="/phim?status=now" onNavigate={() => setOpen(null)}>
              Đang chiếu
            </Item>
            <Item href="/phim?status=coming" onNavigate={() => setOpen(null)}>
              Sắp chiếu
            </Item>
            <Item href="/phim" onNavigate={() => setOpen(null)}>
              Tất cả phim
            </Item>
          </div>
        )}
      </div>

      {/* ===== Thể loại ===== */}
      <div
        className="relative"
        onMouseEnter={() => openOnly('theloai')}
      >
        <button
          type="button"
          onClick={() => toggle('theloai')}
          className="flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-medium text-slate-200 transition hover:bg-white/10 hover:text-white"
          aria-expanded={open === 'theloai'}
        >
          Thể loại
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className={`h-3.5 w-3.5 transition ${open === 'theloai' ? 'rotate-180' : ''}`}
          >
            <path d="m6 9 6 6 6-6" />
          </svg>
        </button>

        {open === 'theloai' && (
          <div className="absolute left-0 top-full z-50 mt-1 max-h-[70vh] min-w-[200px] overflow-y-auto rounded-xl border border-white/10 bg-slate-950/95 py-1.5 shadow-xl backdrop-blur-xl [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
            {genres.length === 0 ? (
              <span className="block px-4 py-2 text-sm text-slate-500">
                Chưa có thể loại
              </span>
            ) : (
              genres.map((g) => (
                <Item
                  key={g}
                  href={`/phim?search=${encodeURIComponent(g)}`}
                  onNavigate={() => setOpen(null)}
                >
                  {g}
                </Item>
              ))
            )}
          </div>
        )}
      </div>
    </nav>
  );
}
