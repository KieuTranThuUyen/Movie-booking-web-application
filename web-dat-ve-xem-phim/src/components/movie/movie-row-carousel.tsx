'use client';

import { useCallback, useMemo, useState } from 'react';

import { MovieCard } from '@/components/movie/movie-card';
import type { Movie } from '@/lib/types';

type MovieRowCarouselProps = {
  movies: Movie[];
  emptyMessage: string;
  pageSize?: number;
};

export function MovieRowCarousel({
  movies,
  emptyMessage,
  pageSize = 5,
}: MovieRowCarouselProps) {
  const [page, setPage] = useState(0);

  const totalPages = Math.max(
    1,
    Math.ceil(movies.length / pageSize),
  );

  const safePage = Math.min(page, totalPages - 1);

  const visible = useMemo(() => {
    const start = safePage * pageSize;

    return movies.slice(start, start + pageSize);
  }, [movies, safePage, pageSize]);

  const goPrev = useCallback(() => {
    setPage((currentPage) => {
      return (
        (currentPage - 1 + totalPages) %
        totalPages
      );
    });
  }, [totalPages]);

  const goNext = useCallback(() => {
    setPage((currentPage) => {
      return (currentPage + 1) % totalPages;
    });
  }, [totalPages]);

  if (movies.length === 0) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-10 text-center text-slate-400">
        {emptyMessage}
      </div>
    );
  }

  const showNav = movies.length > pageSize;

  return (
    <div className="relative px-1 sm:px-4">
      {/* Nút trái */}
      {showNav && (
        <button
          type="button"
          onClick={goPrev}
          aria-label="Phim trước"
          className="absolute -left-2 top-[40%] z-20 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-white/15 bg-slate-950/90 text-white shadow-xl backdrop-blur-md transition hover:scale-105 hover:bg-white/10 sm:-left-5 sm:h-11 sm:w-11"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            className="h-5 w-5"
            aria-hidden="true"
          >
            <path
              d="m15 18-6-6 6-6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      )}

      {/* Danh sách phim */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        {visible.map((movie) => (
          <MovieCard
            key={movie.id}
            movie={movie}
          />
        ))}
      </div>

      {/* Nút phải */}
      {showNav && (
        <button
          type="button"
          onClick={goNext}
          aria-label="Phim sau"
          className="absolute -right-2 top-[40%] z-20 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-white/15 bg-slate-950/90 text-white shadow-xl backdrop-blur-md transition hover:scale-105 hover:bg-white/10 sm:-right-5 sm:h-11 sm:w-11"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            className="h-5 w-5"
            aria-hidden="true"
          >
            <path
              d="m9 18 6-6-6-6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      )}

      {/* Dấu chấm phân trang */}
      {showNav && (
        <div className="mt-6 flex items-center justify-center gap-2">
          {Array.from({ length: totalPages }).map((_, index) => (
            <button
              key={index}
              type="button"
              onClick={() => setPage(index)}
              aria-label={`Trang phim ${index + 1}`}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                index === safePage
                  ? 'w-7 bg-white'
                  : 'w-1.5 bg-white/30 hover:bg-white/60'
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
