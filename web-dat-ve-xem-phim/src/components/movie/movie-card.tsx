import Image from 'next/image';
import Link from 'next/link';

import type { Movie } from '@/lib/types';

type MovieCardProps = {
  movie: Movie;
};

export function MovieCard({ movie }: MovieCardProps) {
  const canBook = movie.isNowShowing && !movie.isComingSoon;

  const genres = movie.genre
    ? movie.genre
        .split(',')
        .map((genre) => genre.trim())
        .filter(Boolean)
        .slice(0, 2)
    : [];

  return (
    <article className="group overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] shadow-lg transition duration-300 hover:-translate-y-1 hover:border-white/20 hover:bg-white/[0.06]">
      {/* Ảnh phim */}
      <Link
        href={`/phim/${movie.slug}`}
        className="block"
        aria-label={`Xem chi tiết ${movie.title}`}
      >
        <div className="relative aspect-[3/4] overflow-hidden bg-slate-900">
          <Image
            src={movie.imageUrl}
            alt={movie.title}
            fill
            unoptimized
            sizes="(max-width: 640px) 45vw, (max-width: 1024px) 25vw, 20vw"
            className="object-cover transition duration-500 group-hover:scale-[1.02]"
          />

          {/* Lớp phủ để chữ dễ nhìn */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/10 to-black/20" />

          {/* Trạng thái phim */}
          <span
            className={`absolute left-2 top-2 rounded-full px-2 py-1 text-[9px] font-semibold backdrop-blur-md ${
              movie.isNowShowing
                ? 'border border-emerald-400/30 bg-emerald-500/20 text-emerald-200'
                : 'border border-violet-400/30 bg-violet-500/20 text-violet-200'
            }`}
          >
            {movie.isNowShowing ? 'Đang chiếu' : 'Sắp chiếu'}
          </span>

          {/* Độ tuổi - chỉ hiển thị 1 lần */}
          {movie.ageRating && (
            <span className="absolute right-2 top-2 rounded-md border border-white/30 bg-black/70 px-2 py-1 text-[10px] font-bold text-white backdrop-blur-md">
              {movie.ageRating}
            </span>
          )}

          {/* Thể loại + thời lượng */}
          <div className="absolute bottom-2 left-2 right-2 flex flex-wrap items-center gap-1.5">
            {genres.map((genre) => (
              <span
                key={genre}
                className="rounded-full border border-white/20 bg-black/65 px-2 py-1 text-[9px] font-medium text-white backdrop-blur-md"
              >
                {genre}
              </span>
            ))}

            {movie.duration && (
              <span className="rounded-full border border-white/20 bg-black/65 px-2 py-1 text-[9px] font-medium text-white backdrop-blur-md">
                {movie.duration} phút
              </span>
            )}
          </div>
        </div>
      </Link>

      {/* Tên phim + nút */}
      <div className="p-3">
        <Link
          href={`/phim/${movie.slug}`}
          className="block"
          aria-label={`Xem chi tiết ${movie.title}`}
        >
          <h3 className="line-clamp-2 min-h-[2.5rem] text-center text-sm font-bold leading-5 text-white transition hover:text-sky-200">
            {movie.title}
          </h3>
        </Link>

        {/* Nút sát tên phim */}
        <div className="mt-1.5 flex gap-2">
          <Link
            href={`/phim/${movie.slug}`}
            className={`inline-flex items-center justify-center rounded-lg bg-white px-2.5 py-2 text-[11px] font-semibold text-slate-950 transition hover:bg-slate-100 ${
              canBook ? 'flex-1' : 'w-full'
            }`}
          >
            Xem chi tiết
          </Link>

          {canBook && (
            <Link
              href={`/suat-chieu?movie=${encodeURIComponent(movie.slug)}`}
              className="inline-flex flex-1 items-center justify-center rounded-lg border border-white/10 bg-white/5 px-2.5 py-2 text-[11px] font-semibold text-white transition hover:border-sky-400/30 hover:bg-sky-400/10"
            >
              Đặt vé
            </Link>
          )}
        </div>
      </div>
    </article>
  );
}