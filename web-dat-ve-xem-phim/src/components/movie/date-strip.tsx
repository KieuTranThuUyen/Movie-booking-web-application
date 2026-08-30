'use client';

import Link from 'next/link';
import { useRef } from 'react';

export type DateOption = {
  value: string;
  day: number;
  month: string;
  weekday: string;
};

type DateStripProps = {
  dates: DateOption[];
  selected: string;
  movie?: string;
  city?: string;
  format?: string;
};

function buildHref(
  dateValue: string,
  movie?: string,
  city?: string,
  format?: string,
) {
  const q = new URLSearchParams();
  if (movie) q.set('movie', movie);
  if (dateValue) q.set('date', dateValue);
  if (city) q.set('city', city);
  if (format) q.set('format', format);
  const s = q.toString();
  return s ? `/suat-chieu?${s}` : '/suat-chieu';
}

function ChevronLeftIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.25"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <path d="M15 18l-6-6 6-6" />
    </svg>
  );
}

function ChevronRightIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.25"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <path d="M9 18l6-6-6-6" />
    </svg>
  );
}

export function DateStrip({
  dates,
  selected,
  movie,
  city,
  format,
}: DateStripProps) {
  const scrollerRef = useRef<HTMLDivElement>(null);

  const scrollBy = (dir: -1 | 1) => {
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * 280, behavior: 'smooth' });
  };

  return (
    <div className="relative flex items-center gap-2">
      {/* Nút trái */}
      <button
        type="button"
        onClick={() => scrollBy(-1)}
        aria-label="Ngày trước"
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/15 bg-white/5 text-white transition hover:border-white/25 hover:bg-white/15"
      >
        <ChevronLeftIcon className="h-5 w-5" />
      </button>

      {/* 1 hàng ngày – cuộn ngang */}
      <div
        ref={scrollerRef}
        className="flex flex-1 gap-2 overflow-x-auto scroll-smooth pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {dates.map((opt) => {
          const isSelected = opt.value === selected;
          return (
            <Link
              key={opt.value}
              href={buildHref(opt.value, movie, city, format)}
              className={`flex w-[4.25rem] shrink-0 flex-col items-center justify-center rounded-xl px-1 py-2.5 text-center transition sm:w-[4.75rem] sm:py-3 ${
                isSelected
                  ? 'border-2 border-sky-400 bg-sky-500/15 text-white'
                  : 'border border-transparent bg-white/5 text-slate-300 hover:bg-white/10'
              }`}
            >
              <span className="text-[10px] font-medium uppercase tracking-wide text-slate-400 sm:text-xs">
                {opt.weekday}
              </span>
              <span
                className={`mt-0.5 text-lg font-semibold sm:text-2xl ${
                  isSelected ? 'text-white' : 'text-slate-200'
                }`}
              >
                {String(opt.day).padStart(2, '0')}
              </span>
              <span className="text-[10px] text-slate-500 sm:text-xs">
                {opt.month}
              </span>
            </Link>
          );
        })}
      </div>

      {/* Nút phải */}
      <button
        type="button"
        onClick={() => scrollBy(1)}
        aria-label="Ngày sau"
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/15 bg-white/5 text-white transition hover:border-white/25 hover:bg-white/15"
      >
        <ChevronRightIcon className="h-5 w-5" />
      </button>
    </div>
  );
}
