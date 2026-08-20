import Image from 'next/image';
import Link from 'next/link';

import type { Movie } from '@/lib/types';

type MovieCardProps = {
  movie: Movie;
};

export function MovieCard({
  movie,
}: MovieCardProps) {
  return (
    <article className="overflow-hidden rounded-[28px] border border-white/10 bg-white/5 shadow-glow transition duration-300 hover:-translate-y-1 hover:border-white/20 hover:bg-white/8">
      <Image
        src={movie.posterUrl}
        alt={movie.title}
        width={600}
        height={900}
        unoptimized
        className="h-80 w-full object-cover"
      />

      <div className="space-y-4 p-5">
        <div className="flex items-center justify-between gap-4 text-xs uppercase tracking-[0.28em] text-sky-300/80">
          <span>{movie.genre}</span>
          <span>{movie.ageRating}</span>
        </div>

        <div>
          <h3 className="text-xl font-semibold text-white">
            {movie.title}
          </h3>

          <p className="mt-2 line-clamp-3 text-sm leading-6 text-slate-300">
            {movie.synopsis}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-200">
          <span className="rounded-full bg-white/10 px-3 py-1">
            {movie.duration} phút
          </span>

          <span className="rounded-full bg-white/10 px-3 py-1">
            {movie.isNowShowing
              ? 'Đang chiếu'
              : 'Sắp chiếu'}
          </span>
        </div>

        <div className="flex gap-3">
          <Link
            href={`/phim/${movie.slug}`}
            className="inline-flex flex-1 items-center justify-center rounded-full bg-white px-4 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-slate-100"
          >
            Xem chi tiết
          </Link>

          <Link
            href={`/suat-chieu?movie=${encodeURIComponent(
              movie.slug,
            )}`}
            className="inline-flex flex-1 items-center justify-center rounded-full border border-white/10 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white/5"
          >
            Đặt vé
          </Link>
        </div>
      </div>
    </article>
  );
}