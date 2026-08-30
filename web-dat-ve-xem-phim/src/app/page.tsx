import Link from 'next/link';

import { MovieCard } from '@/components/movie/movie-card';
import {
  MovieSchedule,
  type ScheduleCinema,
  type ScheduleShowtime,
} from '@/components/movie/movie-schedule';
import { PosterBanner } from '@/components/movie/poster-banner';
import { prisma } from '@/lib/db/prisma';

function getTodayVietnam() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Ho_Chi_Minh',
  }).format(new Date());
}

export default async function HomePage() {
  const today = getTodayVietnam();
  const [y, m, d] = today.split('-').map(Number);
  const rangeEnd = new Date(Date.UTC(y, m - 1, d + 7, 17, 0, 0));
  const now = new Date();

  const [nowShowing, upcoming, bannerMovies, cinemasRaw, showtimesRaw] =
    await Promise.all([
      prisma.movie.findMany({
        where: { isNowShowing: true },
        orderBy: { releaseDate: 'desc' },
      }),

      prisma.movie.findMany({
        where: { isComingSoon: true },
        orderBy: { releaseDate: 'asc' },
      }),

      prisma.movie.findMany({
        where: {
          OR: [{ isNowShowing: true }, { isComingSoon: true }],
        },
        orderBy: { releaseDate: 'desc' },
        take: 12,
      }),

      prisma.cinema.findMany({
        orderBy: [{ city: 'asc' }, { name: 'asc' }],
        select: {
          id: true,
          name: true,
          city: true,
          address: true,
        },
      }),

      prisma.showtime.findMany({
        where: {
          startTime: {
            gte: now,
            lt: rangeEnd,
          },
        },
        orderBy: { startTime: 'asc' },
        include: {
          movie: {
            select: {
              id: true,
              title: true,
              slug: true,
              posterUrl: true,
              imageUrl: true,
              ageRating: true,
              genre: true,
            },
          },
          hall: {
            select: {
              name: true,
              cinema: {
                select: {
                  id: true,
                  name: true,
                  city: true,
                  address: true,
                },
              },
            },
          },
        },
      }),
    ]);

  const cinemas: ScheduleCinema[] = cinemasRaw;

  const showtimes: ScheduleShowtime[] = showtimesRaw.map((st) => ({
    id: st.id,
    startTime: st.startTime.toISOString(),
    format: st.format,
    language: st.language,
    movie: st.movie,
    hall: st.hall,
  }));

  const cities = Array.from(new Set(cinemas.map((c) => c.city)));

  return (
    <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      {/* BANNER */}
      <PosterBanner movies={bannerMovies} />

      {/* LỊCH CHIẾU – ngay dưới banner */}
      <MovieSchedule
        cinemas={cinemas}
        showtimes={showtimes}
        cities={cities}
      />

      {/* ĐANG CHIẾU */}
      <section className="mt-16 space-y-6">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-sm uppercase tracking-[0.35em] text-sky-300/80">
              Đang chiếu
            </p>
            <h2 className="mt-2 text-3xl font-semibold text-white">
              Phim đang chiếu
            </h2>
          </div>
          <Link
            href="/phim"
            className="text-sm font-semibold text-sky-200 transition hover:text-white"
          >
            Xem tất cả
          </Link>
        </div>

        {nowShowing.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-10 text-center text-slate-400">
            Hiện chưa có phim đang chiếu.
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {nowShowing.map((movie) => (
              <MovieCard key={movie.id} movie={movie} />
            ))}
          </div>
        )}
      </section>

      {/* SẮP CHIẾU */}
      <section className="mt-16 space-y-6">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-sm uppercase tracking-[0.35em] text-violet-300/80">
              Sắp chiếu
            </p>
            <h2 className="mt-2 text-3xl font-semibold text-white">
              Phim sắp chiếu
            </h2>
          </div>
          <Link
            href="/phim"
            className="text-sm font-semibold text-violet-200 transition hover:text-white"
          >
            Xem tất cả
          </Link>
        </div>

        {upcoming.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-10 text-center text-slate-400">
            Hiện chưa có phim sắp chiếu.
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {upcoming.map((movie) => (
              <MovieCard key={movie.id} movie={movie} />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}