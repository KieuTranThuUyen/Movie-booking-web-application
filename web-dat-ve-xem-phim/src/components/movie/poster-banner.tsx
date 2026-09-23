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
    if (total <= 1) return;

    setCurrent((prev) => (prev + 1) % total);
  }, [total]);

  const goPrev = useCallback(() => {
    if (total <= 1) return;

    setCurrent((prev) => (prev - 1 + total) % total);
  }, [total]);

  // Tự động đổi ảnh mỗi 3 giây
  useEffect(() => {
    if (total <= 1) return;

    const timer = setInterval(goNext, 3000);

    return () => clearInterval(timer);
  }, [goNext, total]);

  if (!total) return null;

  return (
    <section className="relative mb-10 w-full overflow-hidden border border-white/10 bg-black shadow-xl">
      {/* Banner - giữ nguyên kích thước */}
      <div className="relative aspect-[21/9] w-full sm:aspect-[3/1]">
        {movies.map((movie, index) => (
          <Link
            key={movie.id}
            href={`/phim/${movie.slug}`}
            className={`absolute inset-0 transition-opacity duration-700 ease-in-out ${
              index === current
                ? 'z-10 opacity-100'
                : 'pointer-events-none z-0 opacity-0'
            }`}
            aria-hidden={index !== current}
            tabIndex={index === current ? 0 : -1}
          >
            <Image
              src={movie.posterUrl}
              alt={movie.title}
              fill
              unoptimized
              priority={index === 0}
              quality={100}
              sizes="100vw"
              className="object-cover object-center"
            />

            {/* Overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent" />

            {/* Thông tin phim */}
            <div className="absolute bottom-0 left-0 right-0 p-5 sm:p-8">
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-sky-300 sm:text-sm">
                {movie.isNowShowing ? 'Đang chiếu' : 'Sắp chiếu'}
              </p>

              <h2 className="mt-1 text-2xl font-bold text-white drop-shadow-lg sm:text-3xl md:text-4xl">
                {movie.title}
              </h2>

              <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-slate-200 sm:text-base">
                {movie.genre && (
                  <span>{movie.genre}</span>
                )}

                {movie.genre && movie.duration && (
                  <span className="text-white/50">•</span>
                )}

                {movie.duration && (
                  <span>{movie.duration} phút</span>
                )}

                {movie.ageRating && (
                  <>
                    <span className="text-white/50">•</span>

                    <span className="rounded-md border border-white/30 bg-black/50 px-2 py-0.5 text-xs font-bold text-white backdrop-blur-sm">
                      {movie.ageRating}
                    </span>
                  </>
                )}
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Nút Previous / Next */}
      {total > 1 && (
        <>
          {/* Previous */}
          <button
            type="button"
            onClick={goPrev}
            aria-label="Phim trước"
            className="absolute left-3 top-1/2 z-30 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-white/20 bg-black/45 text-white shadow-lg backdrop-blur-md transition hover:scale-105 hover:bg-black/65 sm:left-5 sm:h-12 sm:w-12"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              className="h-5 w-5 sm:h-6 sm:w-6"
              aria-hidden="true"
            >
              <path
                d="m15 18-6-6 6-6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>

          {/* Next */}
          <button
            type="button"
            onClick={goNext}
            aria-label="Phim sau"
            className="absolute right-3 top-1/2 z-30 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-white/20 bg-black/45 text-white shadow-lg backdrop-blur-md transition hover:scale-105 hover:bg-black/65 sm:right-5 sm:h-12 sm:w-12"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              className="h-5 w-5 sm:h-6 sm:w-6"
              aria-hidden="true"
            >
              <path
                d="m9 18 6-6-6-6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>

          {/* Dots */}
          <div className="absolute bottom-3 left-1/2 z-30 flex -translate-x-1/2 gap-2">
            {movies.map((movie, index) => (
              <button
                key={movie.id}
                type="button"
                onClick={() => setCurrent(index)}
                aria-label={`Chuyển đến phim ${index + 1}`}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  index === current
                    ? 'w-7 bg-white'
                    : 'w-1.5 bg-white/40 hover:bg-white/70'
                }`}
              />
            ))}
          </div>
        </>
      )}
    </section>
  );
}