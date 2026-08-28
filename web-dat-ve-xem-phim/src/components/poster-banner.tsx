'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';

import type { Movie } from '@/lib/types';

type PosterBannerProps = {
  movies: Movie[];
};

export function PosterBanner({ movies }: PosterBannerProps) {
  const [current, setCurrent] = useState(0);

  const total = movies.length;

  const goNext = useCallback(() => {
    setCurrent((prev) => (prev + 1) % total);
  }, [total]);

  const goPrev = useCallback(() => {
    setCurrent((prev) => (prev - 1 + total) % total);
  }, [total]);

  // Tự động đổi poster mỗi 3 giây
  useEffect(() => {
    if (total <= 1) return;

    const timer = setInterval(goNext, 3000);
    return () => clearInterval(timer);
  }, [goNext, total]);

  if (!total) return null;

  return (
    <section className="relative mb-10 w-full overflow-hidden rounded-3xl border border-white/10 bg-black/40 shadow-glow">
      {/* Poster full ngang */}
      <div className="relative aspect-[21/9] w-full sm:aspect-[3/1]">
        {movies.map((m, index) => (
          <Link
            key={m.id}
            href={`/phim/${m.slug}`}
            className={`absolute inset-0 transition-opacity duration-700 ease-in-out ${
              index === current
                ? 'z-10 opacity-100'
                : 'z-0 opacity-0 pointer-events-none'
            }`}
            aria-hidden={index !== current}
            tabIndex={index === current ? 0 : -1}
          >
            <Image
              src={m.posterUrl}
              alt={m.title}
              fill
              unoptimized
              priority={index === 0}
              className="object-cover object-center"
              sizes="100vw"
            />
            {/* Overlay tối nhẹ + info */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 p-5 sm:p-8">
              <p className="text-xs uppercase tracking-[0.3em] text-sky-300/90">
                {m.isNowShowing ? 'Đang chiếu' : 'Sắp chiếu'}
              </p>
              <h2 className="mt-1 text-2xl font-semibold text-white sm:text-3xl md:text-4xl">
                {m.title}
              </h2>
              <p className="mt-1 line-clamp-1 text-sm text-slate-300 sm:text-base">
                {m.genre} · {m.duration} phút · {m.ageRating}
              </p>
            </div>
          </Link>
        ))}
      </div>

      {/* Nút Previous / Next */}
      {total > 1 && (
        <>
          <button
            type="button"
            onClick={goPrev}
            aria-label="Poster trước"
            className="absolute left-3 top-1/2 z-20 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-white/20 bg-black/50 text-xl text-white backdrop-blur-sm transition hover:bg-white/20 sm:left-5 sm:h-12 sm:w-12"
          >
            ‹
          </button>

          <button
            type="button"
            onClick={goNext}
            aria-label="Poster sau"
            className="absolute right-3 top-1/2 z-20 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-white/20 bg-black/50 text-xl text-white backdrop-blur-sm transition hover:bg-white/20 sm:right-5 sm:h-12 sm:w-12"
          >
            ›
          </button>

          {/* Dots chỉ báo */}
          <div className="absolute bottom-3 left-1/2 z-20 flex -translate-x-1/2 gap-2">
            {movies.map((_, index) => (
              <button
                key={index}
                type="button"
                onClick={() => setCurrent(index)}
                aria-label={`Poster ${index + 1}`}
                className={`h-2 rounded-full transition-all ${
                  index === current
                    ? 'w-6 bg-white'
                    : 'w-2 bg-white/40 hover:bg-white/70'
                }`}
              />
            ))}
          </div>
        </>
      )}
    </section>
  );
}
