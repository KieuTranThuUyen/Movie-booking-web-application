import Link from 'next/link';
import type { Prisma } from '@prisma/client';

import { DateStrip } from '@/components/date-strip';
import { prisma } from '@/lib/prisma';
import { ensureMoviesSeeded } from '@/lib/seed-movies';

type ShowtimesPageProps = {
  searchParams: Promise<{
    movie?: string;
    date?: string;
    city?: string;
    format?: string;
  }>;
};

const DAY_LABELS = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];

function getTodayVietnam() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Ho_Chi_Minh',
  }).format(new Date());
}

function getDateRange(date: string) {
  const start = new Date(`${date}T00:00:00+07:00`);
  const end = new Date(`${date}T00:00:00+07:00`);
  end.setUTCDate(end.getUTCDate() + 1);
  return { start, end };
}

/** Tạo danh sách ngày từ hôm nay (mặc định 30 ngày) */
function buildDateOptions(count = 30) {
  const todayStr = getTodayVietnam();
  const [y, m, d] = todayStr.split('-').map(Number);
  const options: {
    value: string;
    day: number;
    month: string;
    weekday: string;
  }[] = [];

  for (let i = 0; i < count; i++) {
    const date = new Date(Date.UTC(y, m - 1, d + i, 5, 0, 0));
    const value = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Ho_Chi_Minh',
    }).format(date);

    const wd = new Date(`${value}T12:00:00+07:00`).getUTCDay();
    const dayNum = Number(value.split('-')[2]);
    const monthNum = value.split('-')[1];

    options.push({
      value,
      day: dayNum,
      month: monthNum,
      weekday: DAY_LABELS[wd],
    });
  }

  return options;
}

function formatTime(date: Date) {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Ho_Chi_Minh',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(date);
}

function buildQuery(base: {
  movie?: string;
  date?: string;
  city?: string;
  format?: string;
}) {
  const q = new URLSearchParams();
  if (base.movie) q.set('movie', base.movie);
  if (base.date) q.set('date', base.date);
  if (base.city) q.set('city', base.city);
  if (base.format) q.set('format', base.format);
  const s = q.toString();
  return s ? `/suat-chieu?${s}` : '/suat-chieu';
}

export default async function ShowtimesPage({
  searchParams,
}: ShowtimesPageProps) {
  await ensureMoviesSeeded();

  const params = await searchParams;
  const movieSlug = params.movie?.trim() ?? '';
  const today = getTodayVietnam();
  const date = params.date?.trim() || today;
  const city = params.city?.trim() ?? '';
  const format = params.format?.trim() ?? '';

  const now = new Date();
  const dateOptions = buildDateOptions(30);

  const where: Prisma.ShowtimeWhereInput = {};

  if (movieSlug) {
    where.movie = { slug: movieSlug };
  }

  if (city) {
    where.hall = {
      cinema: { city },
    };
  }

  if (format) {
    where.format = format;
  }

  const { start, end } = getDateRange(date);
  where.startTime = {
    gte: date === today ? now : start,
    lt: end,
  };

  const [showtimes, cities, formats, movie] = await Promise.all([
    prisma.showtime.findMany({
      where,
      orderBy: { startTime: 'asc' },
      include: {
        movie: true,
        hall: {
          include: { cinema: true },
        },
      },
    }),

    prisma.cinema.findMany({
      select: { city: true },
      distinct: ['city'],
      orderBy: { city: 'asc' },
    }),

    prisma.showtime.findMany({
      select: { format: true },
      distinct: ['format'],
      orderBy: { format: 'asc' },
    }),

    movieSlug
      ? prisma.movie.findUnique({
          where: { slug: movieSlug },
          select: { title: true },
        })
      : Promise.resolve(null),
  ]);

  type Group = {
    cinemaId: string;
    cinemaName: string;
    city: string;
    items: {
      id: string;
      hallName: string;
      format: string;
      language: string;
      time: string;
      price: number;
      movieTitle: string;
    }[];
  };

  const cinemaMap = new Map<string, Group>();

  for (const st of showtimes) {
    const key = st.hall.cinema.id;
    if (!cinemaMap.has(key)) {
      cinemaMap.set(key, {
        cinemaId: key,
        cinemaName: st.hall.cinema.name,
        city: st.hall.cinema.city,
        items: [],
      });
    }
    cinemaMap.get(key)!.items.push({
      id: st.id,
      hallName: st.hall.name,
      format: st.format,
      language: st.language,
      time: formatTime(st.startTime),
      price: st.standardPrice,
      movieTitle: st.movie.title,
    });
  }

  const grouped = Array.from(cinemaMap.values());

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-8 text-white sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        {/* HEADER */}
        <div className="mb-6">
          <p className="text-sm uppercase tracking-[0.35em] text-sky-300/80">
            Đặt vé
          </p>
          <div className="mt-2 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
                Chọn suất chiếu
              </h1>
              <p className="mt-1 text-slate-400">
                {movie
                  ? `Phim: ${movie.title}`
                  : 'Chọn ngày, thành phố và định dạng để xem suất chiếu'}
              </p>
            </div>
            {movieSlug ? (
              <Link
                href="/suat-chieu"
                className="rounded-full border border-white/10 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:bg-white/5"
              >
                Xem tất cả
              </Link>
            ) : null}
          </div>
        </div>

        {/* CARD BỘ LỌC */}
        <div className="overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-b from-white/[0.06] to-white/[0.02] shadow-glow">
          {/* 1. LỊCH NGÀY */}
          <div className="border-b border-white/10 p-4 sm:p-5">
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
              Ngày chiếu
            </p>
            <DateStrip
              dates={dateOptions}
              selected={date}
              movie={movieSlug || undefined}
              city={city || undefined}
              format={format || undefined}
            />
          </div>

          {/* 2. THÀNH PHỐ */}
          <div className="border-b border-white/10 p-4 sm:p-5">
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
              Thành phố
            </p>
            <div className="flex flex-wrap gap-2">
              <Link
                href={buildQuery({
                  movie: movieSlug || undefined,
                  date,
                  format: format || undefined,
                })}
                className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                  !city
                    ? 'bg-white text-slate-950 shadow-md shadow-white/10'
                    : 'border border-white/10 bg-white/5 text-slate-300 hover:border-white/20 hover:bg-white/10'
                }`}
              >
                Tất cả
              </Link>
              {cities.map((item) => {
                const selected = city === item.city;
                return (
                  <Link
                    key={item.city}
                    href={buildQuery({
                      movie: movieSlug || undefined,
                      date,
                      city: item.city,
                      format: format || undefined,
                    })}
                    className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                      selected
                        ? 'bg-white text-slate-950 shadow-md shadow-white/10'
                        : 'border border-white/10 bg-white/5 text-slate-300 hover:border-white/20 hover:bg-white/10'
                    }`}
                  >
                    {item.city}
                  </Link>
                );
              })}
            </div>
          </div>

          {/* 3. ĐỊNH DẠNG */}
          <div className="border-b border-white/10 p-4 sm:p-5">
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
              Định dạng
            </p>
            <div className="flex flex-wrap gap-2">
              <Link
                href={buildQuery({
                  movie: movieSlug || undefined,
                  date,
                  city: city || undefined,
                })}
                className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                  !format
                    ? 'bg-white text-slate-950 shadow-md shadow-white/10'
                    : 'border border-white/15 bg-transparent text-slate-300 hover:border-white/25 hover:bg-white/10'
                }`}
              >
                Tất cả
              </Link>
              {formats.map((item) => {
                const selected = format === item.format;
                return (
                  <Link
                    key={item.format}
                    href={buildQuery({
                      movie: movieSlug || undefined,
                      date,
                      city: city || undefined,
                      format: item.format,
                    })}
                    className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                      selected
                        ? 'bg-white text-slate-950 shadow-md shadow-white/10'
                        : 'border border-white/15 bg-transparent text-slate-300 hover:border-white/25 hover:bg-white/10'
                    }`}
                  >
                    {item.format}
                  </Link>
                );
              })}
            </div>
          </div>

          {/* 4. DANH SÁCH RẠP + GIỜ CHIẾU */}
          <div className="p-4 sm:p-6">
            <div className="mb-5 flex items-center justify-between gap-3">
              <p className="text-sm text-slate-400">
                <span className="font-semibold text-white">
                  {showtimes.length}
                </span>{' '}
                suất ·{' '}
                <span className="font-semibold text-white">
                  {grouped.length}
                </span>{' '}
                rạp
              </p>
            </div>

            {grouped.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] py-12 text-center">
                <p className="text-lg font-semibold text-white">
                  Không có suất chiếu phù hợp
                </p>
                <p className="mt-2 text-sm text-slate-400">
                  Thử chọn ngày hoặc thành phố khác.
                </p>
                <Link
                  href={
                    movieSlug
                      ? `/suat-chieu?movie=${encodeURIComponent(movieSlug)}`
                      : '/suat-chieu'
                  }
                  className="mt-5 inline-flex rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-slate-100"
                >
                  Xóa bộ lọc
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {grouped.map((group) => {
                  const subMap = new Map<
                    string,
                    {
                      label: string;
                      hallName: string;
                      times: { id: string; time: string; price: number }[];
                    }
                  >();

                  for (const item of group.items) {
                    const subKey = `${item.format}|${item.language}|${item.hallName}`;
                    if (!subMap.has(subKey)) {
                      subMap.set(subKey, {
                        label: `${item.format}${
                          item.language ? ` · ${item.language}` : ''
                        }`,
                        hallName: item.hallName,
                        times: [],
                      });
                    }
                    subMap.get(subKey)!.times.push({
                      id: item.id,
                      time: item.time,
                      price: item.price,
                    });
                  }

                  return (
                    <section
                      key={group.cinemaId}
                      className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 transition hover:border-white/15 hover:bg-white/[0.05] sm:p-5"
                    >
                      {/* Header rạp */}
                      <div className="flex flex-wrap items-start justify-between gap-2 border-b border-white/10 pb-3">
                        <div>
                          <h3 className="text-lg font-semibold tracking-tight text-white sm:text-xl">
                            {group.cinemaName}
                          </h3>
                          <p className="mt-0.5 flex items-center gap-1.5 text-sm text-slate-400">
                            <span className="inline-block h-1.5 w-1.5 rounded-full bg-sky-400/80" />
                            {group.city}
                          </p>
                        </div>
                      </div>

                      {/* Suất theo phòng / format */}
                      <div className="mt-4 space-y-5">
                        {Array.from(subMap.values()).map((sub, idx) => (
                          <div key={idx}>
                            <div className="mb-2.5 flex flex-wrap items-center gap-2">
                              <span className="text-sm font-medium text-slate-200">
                                {sub.hallName}
                              </span>
                              {sub.label ? (
                                <span className="rounded-full bg-sky-500/15 px-2.5 py-0.5 text-xs font-semibold text-sky-300">
                                  {sub.label}
                                </span>
                              ) : null}
                            </div>

                            <div className="flex flex-wrap gap-2">
                              {sub.times.map((t) => (
                                <Link
                                  key={t.id}
                                  href={`/dat-ve?showtime=${encodeURIComponent(t.id)}`}
                                  className="group/btn inline-flex min-w-[5.25rem] flex-col items-center justify-center rounded-xl border border-white/12 bg-white/[0.04] px-3 py-2.5 transition hover:border-sky-400/50 hover:bg-sky-500/15 hover:shadow-[0_0_20px_rgba(56,189,248,0.12)]"
                                >
                                  <span className="text-sm font-semibold text-white group-hover/btn:text-sky-100">
                                    {t.time}
                                  </span>
                                  <span className="mt-0.5 text-[10px] text-slate-500 group-hover/btn:text-slate-400">
                                    từ {t.price.toLocaleString('vi-VN')}đ
                                  </span>
                                </Link>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </section>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}