import Link from 'next/link';
import type { Prisma } from '@prisma/client';

import { prisma } from '@/lib/prisma';
import { ensureMoviesSeeded } from '@/lib/seed-movies';

type ShowtimesPageProps = {
  searchParams: Promise<{
    movie?: string;
    date?: string;
    city?: string;
    format?: string;
    time?: string;
  }>;
};

const TIME_RANGES: Record<
  string,
  { label: string; from: number; to: number }
> = {
  early: {
    label: '00:00 - 06:00',
    from: 0,
    to: 6,
  },
  morning: {
    label: '06:00 - 12:00',
    from: 6,
    to: 12,
  },
  afternoon: {
    label: '12:00 - 17:00',
    from: 12,
    to: 17,
  },
  evening: {
    label: '17:00 - 22:00',
    from: 17,
    to: 22,
  },
  night: {
    label: '22:00 - 24:00',
    from: 22,
    to: 24,
  },
};

function getVietnamHour(date: Date) {
  return Number(
    new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Asia/Ho_Chi_Minh',
      hour: '2-digit',
      hourCycle: 'h23',
    }).format(date),
  );
}

function formatDateTime(date: Date) {
  return new Intl.DateTimeFormat('vi-VN', {
    timeZone: 'Asia/Ho_Chi_Minh',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(date);
}

function getTodayVietnam() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Ho_Chi_Minh',
  }).format(new Date());
}

function getDateRange(date: string) {
  const start = new Date(`${date}T00:00:00+07:00`);

  const end = new Date(`${date}T00:00:00+07:00`);
  end.setUTCDate(end.getUTCDate() + 1);

  return {
    start,
    end,
  };
}

export default async function ShowtimesPage({
  searchParams,
}: ShowtimesPageProps) {
  await ensureMoviesSeeded();

  const params = await searchParams;

  const movieSlug = params.movie?.trim() ?? '';
  const date = params.date?.trim() ?? '';
  const city = params.city?.trim() ?? '';
  const format = params.format?.trim() ?? '';
  const time = params.time?.trim() ?? '';

  const now = new Date();
  const today = getTodayVietnam();

  const where: Prisma.ShowtimeWhereInput = {
    startTime: {
      gte: now,
    },
  };

  // Lọc theo phim
  if (movieSlug) {
    where.movie = {
      slug: movieSlug,
    };
  }

  // Lọc theo thành phố
  if (city) {
    where.hall = {
      cinema: {
        city,
      },
    };
  }

  // Lọc theo định dạng
  if (format) {
    where.format = format;
  }

  // Lọc theo ngày
  if (date) {
    const { start, end } = getDateRange(date);

    where.startTime = {
      gte: date === today ? now : start,
      lt: end,
    };
  }

  const [showtimes, cities, movie] = await Promise.all([
    prisma.showtime.findMany({
      where,
      orderBy: {
        startTime: 'asc',
      },
      include: {
        movie: true,
        hall: {
          include: {
            cinema: true,
          },
        },
      },
    }),

    prisma.cinema.findMany({
      select: {
        city: true,
      },
      distinct: ['city'],
      orderBy: {
        city: 'asc',
      },
    }),

    movieSlug
      ? prisma.movie.findUnique({
          where: {
            slug: movieSlug,
          },
          select: {
            title: true,
          },
        })
      : Promise.resolve(null),
  ]);

  // Lọc theo khung giờ
  const timeFilteredShowtimes =
    time && TIME_RANGES[time]
      ? showtimes.filter((showtime) => {
          const hour = getVietnamHour(showtime.startTime);
          const range = TIME_RANGES[time];

          return hour >= range.from && hour < range.to;
        })
      : showtimes;

  const hasFilter =
    Boolean(date) ||
    Boolean(city) ||
    Boolean(format) ||
    Boolean(time);

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-10 text-white sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        {/* HEADER */}
        <div>
          <p className="text-sm uppercase tracking-[0.35em] text-sky-300/80">
            Đặt vé
          </p>

          <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold sm:text-4xl">
                Chọn suất chiếu
              </h1>

              <p className="mt-2 text-slate-400">
                {movie
                  ? `Các suất chiếu của phim "${movie.title}"`
                  : 'Lọc suất chiếu theo ngày, thành phố, định dạng và thời gian'}
              </p>
            </div>

            {movieSlug ? (
              <Link
                href="/suat-chieu"
                className="rounded-full border border-white/10 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:bg-white/5"
              >
                Xem tất cả suất chiếu
              </Link>
            ) : null}
          </div>
        </div>

        {/* BỘ LỌC */}
        <form
          method="GET"
          className="mt-8 rounded-[28px] border border-white/10 bg-white/5 p-5 shadow-glow"
        >
          {/* Giữ phim hiện tại khi lọc */}
          {movieSlug ? (
            <input
              type="hidden"
              name="movie"
              value={movieSlug}
            />
          ) : null}

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
            {/* NGÀY */}
            <label className="space-y-2">
              <span className="text-sm font-medium text-slate-300">
                Ngày
              </span>

              <input
                type="date"
                name="date"
                defaultValue={date}
                min={today}
                className="w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-white outline-none transition focus:border-sky-400"
              />
            </label>

            {/* THÀNH PHỐ */}
            <label className="space-y-2">
              <span className="text-sm font-medium text-slate-300">
                Thành phố
              </span>

              <select
                name="city"
                defaultValue={city}
                className="w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-white outline-none transition focus:border-sky-400"
              >
                <option value="">Tất cả thành phố</option>

                {cities.map((item) => (
                  <option
                    key={item.city}
                    value={item.city}
                  >
                    {item.city}
                  </option>
                ))}
              </select>
            </label>

            {/* ĐỊNH DẠNG */}
            <label className="space-y-2">
              <span className="text-sm font-medium text-slate-300">
                Định dạng
              </span>

              <select
                name="format"
                defaultValue={format}
                className="w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-white outline-none transition focus:border-sky-400"
              >
                <option value="">Tất cả</option>
                <option value="2D">2D</option>
                <option value="3D">3D</option>
                <option value="IMAX">IMAX</option>
              </select>
            </label>

            {/* THỜI GIAN */}
            <label className="space-y-2">
              <span className="text-sm font-medium text-slate-300">
                Thời gian
              </span>

              <select
                name="time"
                defaultValue={time}
                className="w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-white outline-none transition focus:border-sky-400"
              >
                <option value="">
                  Tất cả khung giờ
                </option>

                {Object.entries(TIME_RANGES).map(
                  ([value, item]) => (
                    <option
                      key={value}
                      value={value}
                    >
                      {item.label}
                    </option>
                  ),
                )}
              </select>
            </label>

            {/* BUTTON */}
            <div className="flex items-end gap-2">
              <button
                type="submit"
                className="flex-1 rounded-2xl bg-white px-4 py-3 font-semibold text-slate-950 transition hover:bg-slate-100"
              >
                Lọc suất chiếu
              </button>

              <Link
                href={
                  movieSlug
                    ? `/suat-chieu?movie=${encodeURIComponent(
                        movieSlug,
                      )}`
                    : '/suat-chieu'
                }
                className="rounded-2xl border border-white/10 px-4 py-3 font-semibold text-slate-200 transition hover:bg-white/5"
              >
                Xóa
              </Link>
            </div>
          </div>
        </form>

        {/* KẾT QUẢ */}
        <div className="mt-8 flex items-center justify-between gap-4">
          <h2 className="text-xl font-semibold">
            {timeFilteredShowtimes.length} suất chiếu
          </h2>

          {hasFilter ? (
            <p className="text-sm text-slate-400">
              Đang áp dụng bộ lọc
            </p>
          ) : null}
        </div>

        {/* KHÔNG CÓ SUẤT */}
        {timeFilteredShowtimes.length === 0 ? (
          <div className="mt-5 rounded-[28px] border border-white/10 bg-white/5 p-10 text-center">
            <p className="text-lg font-semibold text-white">
              Không có suất chiếu phù hợp
            </p>

            <p className="mt-2 text-sm text-slate-400">
              Hãy thử chọn ngày, thành phố hoặc khung giờ khác.
            </p>

            <Link
              href={
                movieSlug
                  ? `/suat-chieu?movie=${encodeURIComponent(
                      movieSlug,
                    )}`
                  : '/suat-chieu'
              }
              className="mt-5 inline-flex rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-slate-100"
            >
              Xóa bộ lọc
            </Link>
          </div>
        ) : (
          /* DANH SÁCH SUẤT CHIẾU */
          <div className="mt-5 grid gap-4">
            {timeFilteredShowtimes.map((showtime) => (
              <article
                key={showtime.id}
                className="overflow-hidden rounded-[28px] border border-white/10 bg-white/5 shadow-glow transition hover:border-white/20"
              >
                <div className="flex flex-col gap-5 p-5 md:flex-row md:items-center">
                  {/* POSTER */}
                  <img
                    src={showtime.movie.posterUrl}
                    alt={showtime.movie.title}
                    className="h-28 w-20 rounded-2xl object-cover md:h-32 md:w-24"
                  />

                  {/* THÔNG TIN */}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-xl font-semibold text-white">
                        {showtime.movie.title}
                      </h3>

                      <span className="rounded-full bg-sky-500/10 px-3 py-1 text-xs font-semibold text-sky-300">
                        {showtime.format}
                      </span>
                    </div>

                    <div className="mt-3 grid gap-2 text-sm text-slate-300 sm:grid-cols-2 lg:grid-cols-3">
                      {/* RẠP */}
                      <div>
                        <span className="text-slate-500">
                          Rạp:{' '}
                        </span>
                        {showtime.hall.cinema.name}
                      </div>

                      {/* THÀNH PHỐ */}
                      <div>
                        <span className="text-slate-500">
                          Thành phố:{' '}
                        </span>
                        {showtime.hall.cinema.city}
                      </div>

                      {/* PHÒNG */}
                      <div>
                        <span className="text-slate-500">
                          Phòng:{' '}
                        </span>
                        {showtime.hall.name}
                      </div>

                      {/* NGÔN NGỮ */}
                      <div>
                        <span className="text-slate-500">
                          Ngôn ngữ:{' '}
                        </span>
                        {showtime.language}
                      </div>

                      {/* THỜI GIAN */}
                      <div>
                        <span className="text-slate-500">
                          Thời gian:{' '}
                        </span>
                        {formatDateTime(
                          showtime.startTime,
                        )}
                      </div>

                      {/* GIÁ */}
                      <div>
                        <span className="text-slate-500">
                          Giá:{' '}
                        </span>
                        {showtime.basePrice.toLocaleString(
                          'vi-VN',
                        )}{' '}
                        đ
                      </div>
                    </div>
                  </div>

                  {/* CHỌN SUẤT */}
                  <Link
                    href={`/dat-ve?showtime=${encodeURIComponent(
                      showtime.id,
                    )}`}
                    className="inline-flex shrink-0 items-center justify-center rounded-full bg-white px-6 py-3 font-semibold text-slate-950 transition hover:bg-slate-100"
                  >
                    Chọn suất này
                  </Link>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}