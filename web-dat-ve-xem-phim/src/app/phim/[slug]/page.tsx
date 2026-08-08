import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { ensureMoviesSeeded } from '@/lib/seed-movies';
import { MovieTrailer } from '@/components/movie-trailer';

type MovieDetailPageProps = {
  params: Promise<{ slug: string }>;
};

export default async function MovieDetailPage({
  params,
}: MovieDetailPageProps) {
  const resolvedParams = await params;

  await ensureMoviesSeeded();

  const movie = await prisma.movie.findUnique({
    where: {
      slug: resolvedParams.slug,
    },
    include: {
      showtimes: {
        orderBy: {
          startTime: 'asc',
        },
        include: {
          hall: {
            include: {
              cinema: true,
            },
          },
        },
      },
    },
  });

  if (!movie) {
    notFound();
  }

  // =========================
  // TRẠNG THÁI PHIM
  // =========================
  const now = new Date();
  const releaseDate = new Date(movie.releaseDate);

  const hasUpcomingShowtime = movie.showtimes.some(
    (showtime) => new Date(showtime.startTime) >= now
  );

  let movieStatus: 'Sắp chiếu' | 'Đang chiếu' | 'Đã kết thúc';

  if (releaseDate > now) {
    movieStatus = 'Sắp chiếu';
  } else if (hasUpcomingShowtime) {
    movieStatus = 'Đang chiếu';
  } else {
    movieStatus = 'Đã kết thúc';
  }

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-10">
      <div className="mx-auto max-w-7xl">
        <div className="grid gap-10 lg:grid-cols-[480px_1fr]">

          {/* =========================
              BÊN TRÁI - POSTER / TRAILER
             ========================= */}
          <div className="lg:sticky lg:top-24 lg:self-start">
            <MovieTrailer
              posterUrl={movie.posterUrl}
              trailerUrl={movie.trailerUrl}
              title={movie.title}
            />
          </div>

          {/* =========================
              BÊN PHẢI - THÔNG TIN PHIM
             ========================= */}
          <div className="space-y-6">

            {/* Tiêu đề + trạng thái + mô tả */}
            <div className="space-y-3">
              <p className="text-sm uppercase tracking-[0.35em] text-sky-300/80">
                Chi tiết phim
              </p>

              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-4xl font-bold text-white sm:text-5xl">
                  {movie.title}
                </h1>

                {/* TRẠNG THÁI */}
                <span
                  className={`rounded-full px-4 py-1.5 text-sm font-semibold ${
                    movieStatus === 'Đang chiếu'
                      ? 'bg-green-500/15 text-green-300'
                      : movieStatus === 'Sắp chiếu'
                        ? 'bg-yellow-500/15 text-yellow-300'
                        : 'bg-slate-500/15 text-slate-300'
                  }`}
                >
                  {movieStatus}
                </span>
              </div>

              <p className="text-lg leading-8 text-slate-300">
                {movie.synopsis}
              </p>
            </div>

            {/* =========================
                THÔNG TIN PHIM
               ========================= */}
            <div className="grid gap-4 sm:grid-cols-2">
              {[
                {
                  label: 'Thể loại',
                  value: movie.genre,
                },
                {
                  label: 'Thời lượng',
                  value: `${movie.duration} phút`,
                },
                {
                  label: 'Phân loại',
                  value: movie.ageRating,
                },
                {
                  label: 'Khởi chiếu',
                  value: new Date(
                    movie.releaseDate
                  ).toLocaleDateString('vi-VN'),
                },
              ].map((item) => (
                <div
                  key={item.label}
                  className="rounded-[24px] border border-white/10 bg-white/5 p-5"
                >
                  <div className="text-sm text-slate-400">
                    {item.label}
                  </div>

                  <div className="mt-3 text-lg font-semibold text-white">
                    {item.value}
                  </div>
                </div>
              ))}
            </div>

            {/* =========================
                SUẤT CHIẾU
               ========================= */}
            <div className="rounded-[24px] border border-white/10 bg-white/5 p-5">
              <div className="text-base font-semibold text-white">
                Suất chiếu
              </div>

              <div className="mt-4 grid gap-3">
                {movie.showtimes.length === 0 ? (
                  <p className="text-sm text-slate-400">
                    Phim này hiện chưa có suất chiếu.
                  </p>
                ) : (
                  movie.showtimes.map((showtime) => {
                    const isPast =
                      new Date(showtime.startTime) < now;

                    return (
                      <div
                        key={showtime.id}
                        className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-slate-950/60 p-4 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div>
                          <div className="font-semibold text-white">
                            {showtime.hall.cinema.name}
                          </div>

                          <div className="mt-1 text-sm text-slate-400">
                            {showtime.hall.name} ·{' '}
                            {showtime.format} ·{' '}
                            {showtime.language}
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <span
                            className={`text-sm ${
                              isPast
                                ? 'text-slate-500'
                                : 'text-slate-300'
                            }`}
                          >
                            {new Date(
                              showtime.startTime
                            ).toLocaleString('vi-VN')}
                          </span>

                          {isPast ? (
                            <span className="rounded-full bg-slate-500/10 px-4 py-2 text-sm font-semibold text-slate-500">
                              Đã chiếu
                            </span>
                          ) : (
                            <Link
                              href={`/dat-ve?movie=${movie.slug}&showtime=${showtime.id}`}
                              className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-slate-100"
                            >
                              Đặt vé
                            </Link>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

          </div>
        </div>
      </div>
    </main>
  );
}

