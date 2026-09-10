'use client';

import { useCallback, useMemo, useState } from 'react';

import { MovieCard } from '@/components/movie/movie-card';
import type { Movie } from '@/lib/types';

type MovieRowCarouselProps = {
  movies: Movie[];
  emptyMessage: string;
  /** Số phim hiển thị mỗi trang */
  pageSize?: number;
};

export function MovieRowCarousel({
  movies,
  emptyMessage,
  pageSize = 3,
}: MovieRowCarouselProps) {
  const [page, setPage] = useState(0);

  const totalPages = Math.max(1, Math.ceil(movies.length / pageSize));

  // Clamp page khi movies thay đổi
  const safePage = Math.min(page, totalPages - 1);

  const visible = useMemo(() => {
    const start = safePage * pageSize;
    return movies.slice(start, start + pageSize);
  }, [movies, safePage, pageSize]);

  const goPrev = useCallback(() => {
    setPage((p) => (p - 1 + totalPages) % totalPages);
  }, [totalPages]);

  const goNext = useCallback(() => {
    setPage((p) => (p + 1) % totalPages);
  }, [totalPages]);

  if (movies.length === 0) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/5 p-10 text-center text-slate-400">
        {emptyMessage}
      </div>
    );
  }

  const showNav = movies.length > pageSize;

  return (
    <div className="relative">
      {showNav && (
        <>
          <button
            type="button"
            onClick={goPrev}
            aria-label="Phim trước"
            className="absolute -left-2 top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/20 bg-black/60 text-white shadow-lg backdrop-blur-sm transition hover:bg-white/20 sm:-left-4 sm:h-12 sm:w-12"
          >
            <svg
              className="h-5 w-5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              aria-hidden
            >
              <path
                d="M15 18l-6-6 6-6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
          <button
            type="button"
            onClick={goNext}
            aria-label="Phim sau"
            className="absolute -right-2 top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/20 bg-black/60 text-white shadow-lg backdrop-blur-sm transition hover:bg-white/20 sm:-right-4 sm:h-12 sm:w-12"
          >
            <svg
              className="h-5 w-5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              aria-hidden
            >
              <path
                d="M9 18l6-6-6-6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </>
      )}

      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {visible.map((movie) => (
          <MovieCard key={movie.id} movie={movie} />
        ))}
      </div>

      {showNav && (
        <div className="mt-5 flex items-center justify-center gap-2">
          {Array.from({ length: totalPages }).map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setPage(i)}
              aria-label={`Trang ${i + 1}`}
              className={`h-2 rounded-full transition-all ${
                i === safePage
                  ? 'w-6 bg-white'
                  : 'w-2 bg-white/40 hover:bg-white/70'
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}