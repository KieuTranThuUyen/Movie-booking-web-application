import Link from 'next/link';

import { MovieRowCarousel } from '@/components/movie/movie-row-carousel';
import {
  MovieSchedule,
  type ScheduleCinema,
  type ScheduleShowtime,
} from '@/components/movie/movie-schedule';
import { PosterBanner } from '@/components/movie/poster-banner';
import { prisma } from '@/lib/db/prisma';
import type { Movie } from '@/lib/types';

function getTodayVietnam() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Ho_Chi_Minh',
  }).format(new Date());
}

/** Chỉ lấy field cần cho UI – giảm payload & query */
const movieListSelect = {
  id: true,
  title: true,
  slug: true,
  genre: true,
  duration: true,
  ageRating: true,
  synopsis: true,
  posterUrl: true,
  imageUrl: true,
  trailerUrl: true,
  releaseDate: true,
  isNowShowing: true,
  isComingSoon: true,
} as const;

export default async function HomePage() {
  const today = getTodayVietnam();
  const [y, m, d] = today.split('-').map(Number);
  // Chỉ lấy suất trong 7 ngày tới (theo múi VN)
  const rangeEnd = new Date(Date.UTC(y, m - 1, d + 7, 17, 0, 0));
  const now = new Date();

  const [nowShowingRaw, upcomingRaw, bannerMoviesRaw, cinemasRaw, showtimesRaw] =
    await Promise.all([
      prisma.movie.findMany({
        where: { isNowShowing: true },
        orderBy: { releaseDate: 'desc' },
        select: movieListSelect,
        // Giới hạn hợp lý cho carousel (mỗi trang 3)
        take: 24,
      }),

      prisma.movie.findMany({
        where: { isComingSoon: true },
        orderBy: { releaseDate: 'asc' },
        select: movieListSelect,
        take: 24,
      }),

      prisma.movie.findMany({
        where: {
          OR: [{ isNowShowing: true }, { isComingSoon: true }],
        },
        orderBy: { releaseDate: 'desc' },
        select: movieListSelect,
        take: 8,
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
        select: {
          id: true,
          startTime: true,
          format: true,
          language: true,
          movie: {
            select: {
              id: true,
              title: true,
              slug: true,
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

  const toMovie = (m: (typeof nowShowingRaw)[number]): Movie => ({
    ...m,
    releaseDate: m.releaseDate,
  });

  const nowShowing = nowShowingRaw.map(toMovie);
  const upcoming = upcomingRaw.map(toMovie);
  const bannerMovies = bannerMoviesRaw.map(toMovie);

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

      {/* ĐANG CHIẾU – hiển thị 3 phim + mũi tên chuyển */}
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
            href="/phim?status=now"
            className="text-sm font-semibold text-sky-200 transition hover:text-white"
          >
            Xem tất cả
          </Link>
        </div>

        <MovieRowCarousel
          movies={nowShowing}
          emptyMessage="Hiện chưa có phim đang chiếu."
          pageSize={3}
        />
      </section>

      {/* SẮP CHIẾU – hiển thị 3 phim + mũi tên chuyển */}
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
            href="/phim?status=coming"
            className="text-sm font-semibold text-violet-200 transition hover:text-white"
          >
            Xem tất cả
          </Link>
        </div>

        <MovieRowCarousel
          movies={upcoming}
          emptyMessage="Hiện chưa có phim sắp chiếu."
          pageSize={3}
        />
      </section>
    </main>
  );
}