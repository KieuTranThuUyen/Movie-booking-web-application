'use client';
import Image from 'next/image';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { FavoriteButton } from '@/components/movie/favorite-button';
import type { Movie } from '@/lib/types';
type PosterBannerProps = {
    movies: Movie[];
};
const PLACEHOLDER_POSTER = 'data:image/svg+xml,' +
    encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="500" viewBox="0 0 1200 500">
      <rect fill="#0f172a" width="1200" height="500"/>
      <text
        x="50%"
        y="50%"
        fill="#94a3b8"
        font-family="system-ui,sans-serif"
        font-size="28"
        text-anchor="middle"
        dy=".3em"
      >
        Chưa có poster
      </text>
    </svg>`);
export function PosterBanner({ movies }: PosterBannerProps) {
    const [current, setCurrent] = useState(0);
    const bannerMovies = movies.filter((movie) => movie.isNowShowing !== false);
    const total = bannerMovies.length;
    const activeIndex = total > 0 ? current % total : 0;
    const goNext = useCallback(() => {
        if (total <= 1)
            return;
        setCurrent((prev) => (prev + 1) % total);
    }, [total]);
    const goPrev = useCallback(() => {
        if (total <= 1)
            return;
        setCurrent((prev) => (prev - 1 + total) % total);
    }, [total]);
    useEffect(() => {
        if (total <= 1)
            return;
        const timer = setInterval(goNext, 5000);
        return () => clearInterval(timer);
    }, [goNext, total]);
    if (total === 0)
        return null;
    return (<section aria-label="Banner phim đang chiếu" className="mb-10 flex w-full justify-center px-4 sm:px-6">
      {}
      <div className="relative aspect-[12/5] w-full max-w-5xl overflow-hidden rounded-xl border border-white/10 bg-black shadow-2xl">
        {bannerMovies.map((movie, index) => (<Link key={movie.id} href={`/phim/${movie.slug}`} aria-hidden={index !== activeIndex} tabIndex={index === activeIndex ? 0 : -1} className={`absolute inset-0 transition-opacity duration-700 ease-in-out ${index === activeIndex
                ? 'z-10 opacity-100'
                : 'pointer-events-none z-0 opacity-0'}`}>
            {}
            <Image src={movie.posterUrl?.trim()
                ? movie.posterUrl
                : PLACEHOLDER_POSTER} alt={movie.title} fill unoptimized priority={index === 0} quality={100} sizes="(max-width: 1024px) 100vw, 1024px" className="object-cover object-center"/>

            {}
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent"/>

            {}
            <div className="absolute inset-x-0 bottom-0 z-10 p-5 pb-11 sm:p-7 sm:pb-12">
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-sky-300 sm:text-sm">
                {movie.isNowShowing ? 'Đang chiếu' : 'Sắp chiếu'}
              </p>

              <h2 className="mt-1 max-w-3xl text-xl font-bold leading-tight text-white drop-shadow-lg sm:text-3xl md:text-4xl">
                {movie.title}
              </h2>

              <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-200 sm:text-sm">
                {movie.genre && <span>{movie.genre}</span>}

                {movie.genre && movie.duration && (<span className="text-white/50">•</span>)}

                {movie.duration != null && (<span>{movie.duration} phút</span>)}

                {movie.ageRating && (<>
                    <span className="text-white/50">•</span>

                    <span className="rounded-md border border-white/30 bg-black/50 px-2 py-0.5 text-xs font-bold text-white backdrop-blur-sm">
                      {movie.ageRating}
                    </span>
                  </>)}
              </div>
            </div>
          </Link>))}

        <FavoriteButton movieId={bannerMovies[activeIndex].id} className="absolute right-4 top-4 z-20"/>

        {}
        {total > 1 && (<>
            <button type="button" onClick={goPrev} aria-label="Phim trước" className="absolute left-3 top-1/2 z-30 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-white/20 bg-black/50 text-white shadow-lg backdrop-blur-md transition hover:scale-105 hover:bg-black/75 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 sm:left-5 sm:h-11 sm:w-11">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="h-5 w-5" aria-hidden="true">
                <path d="m15 18-6-6 6-6" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>

            <button type="button" onClick={goNext} aria-label="Phim sau" className="absolute right-3 top-1/2 z-30 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-white/20 bg-black/50 text-white shadow-lg backdrop-blur-md transition hover:scale-105 hover:bg-black/75 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 sm:right-5 sm:h-11 sm:w-11">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="h-5 w-5" aria-hidden="true">
                <path d="m9 18 6-6-6-6" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>

            {}
            <div className="absolute bottom-3 left-1/2 z-30 flex -translate-x-1/2 items-center gap-2">
              {bannerMovies.map((movie, index) => (<button key={movie.id} type="button" onClick={() => setCurrent(index)} aria-label={`Chuyển đến phim ${index + 1}: ${movie.title}`} aria-current={index === activeIndex ? 'true' : undefined} className={`h-1.5 rounded-full transition-all duration-300 ${index === activeIndex
                    ? 'w-6 bg-white'
                    : 'w-1.5 bg-white/40 hover:bg-white/80'}`}/>))}
            </div>
          </>)}
      </div>
    </section>);
}
