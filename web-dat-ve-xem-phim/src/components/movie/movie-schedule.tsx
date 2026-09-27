'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

export type ScheduleShowtime = {
  id: string;
  startTime: string; // ISO
  format: string;
  language: string;
  movie: {
    id: string;
    title: string;
    slug: string;
    imageUrl: string;
    ageRating: string;
    genre: string;
  };
  hall: {
    name: string;
    cinema: {
      id: string;
      name: string;
      city: string;
      address: string;
    };
  };
};

export type ScheduleCinema = {
  id: string;
  name: string;
  city: string;
  address: string;
};

type MovieScheduleProps = {
  cinemas: ScheduleCinema[];
  showtimes: ScheduleShowtime[];
  cities: string[];
};

const ALL_CITIES = '__ALL__';
const ALL_CINEMAS = '__ALL_CINEMAS__';
const MOVIES_PER_PAGE = 5;

const DAY_LABELS = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];

function toDateKey(iso: string) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Ho_Chi_Minh',
  }).format(new Date(iso));
}

function formatTime(iso: string) {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Ho_Chi_Minh',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(new Date(iso));
}

function buildDates(count = 7) {
  const todayStr = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Ho_Chi_Minh',
  }).format(new Date());
  const [y, m, d] = todayStr.split('-').map(Number);
  const list: {
    value: string;
    day: number;
    weekday: string;
    isToday: boolean;
  }[] = [];

  for (let i = 0; i < count; i++) {
    const date = new Date(Date.UTC(y, m - 1, d + i, 5, 0, 0));
    const value = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Ho_Chi_Minh',
    }).format(date);
    const wd = new Date(`${value}T12:00:00+07:00`).getUTCDay();
    list.push({
      value,
      day: Number(value.split('-')[2]),
      weekday: i === 0 ? 'Hôm nay' : DAY_LABELS[wd],
      isToday: i === 0,
    });
  }
  return list;
}

export function MovieSchedule({
  cinemas,
  showtimes,
  cities,
}: MovieScheduleProps) {
  const dates = useMemo(() => buildDates(7), []);
  const [city, setCity] = useState(ALL_CITIES);
  const [cinemaId, setCinemaId] = useState(ALL_CINEMAS);
  const [date, setDate] = useState(dates[0]?.value ?? '');
  const [page, setPage] = useState(1);

  const filteredCinemas = useMemo(
    () => (city === ALL_CITIES ? cinemas : cinemas.filter((c) => c.city === city)),
    [cinemas, city],
  );

  // Khi đổi city: giữ "Tất cả rạp" hoặc rạp đang chọn nếu còn trong list
  const activeCinemaId =
    cinemaId === ALL_CINEMAS
      ? ALL_CINEMAS
      : filteredCinemas.some((c) => c.id === cinemaId)
        ? cinemaId
        : ALL_CINEMAS;

  const selectedCinema =
    activeCinemaId === ALL_CINEMAS
      ? null
      : filteredCinemas.find((c) => c.id === activeCinemaId) ?? null;

  const isAllCinemas = activeCinemaId === ALL_CINEMAS;

  const moviesForView = useMemo(() => {
    const allowedCinemaIds = isAllCinemas
      ? new Set(filteredCinemas.map((c) => c.id))
      : new Set([activeCinemaId]);

    const map = new Map<
      string,
      {
        movie: ScheduleShowtime['movie'];
        formats: Set<string>;
        times: {
          id: string;
          time: string;
          format: string;
          cinemaName?: string;
        }[];
      }
    >();

    for (const st of showtimes) {
      if (!allowedCinemaIds.has(st.hall.cinema.id)) continue;
      if (toDateKey(st.startTime) !== date) continue;

      const key = st.movie.id;
      if (!map.has(key)) {
        map.set(key, {
          movie: st.movie,
          formats: new Set(),
          times: [],
        });
      }
      const entry = map.get(key)!;
      entry.formats.add(st.format);
      entry.times.push({
        id: st.id,
        time: formatTime(st.startTime),
        format: st.format,
        cinemaName: isAllCinemas ? st.hall.cinema.name : undefined,
      });
    }

    return Array.from(map.values()).map((e) => ({
      ...e,
      formats: Array.from(e.formats),
      times: e.times.sort((a, b) => a.time.localeCompare(b.time)),
    }));
  }, [showtimes, activeCinemaId, date, isAllCinemas, filteredCinemas]);

  // Reset về trang 1 khi đổi rạp / ngày / vị trí
  useEffect(() => {
    setPage(1);
  }, [activeCinemaId, date, city]);

  const totalPages = Math.max(
    1,
    Math.ceil(moviesForView.length / MOVIES_PER_PAGE),
  );
  const safePage = Math.min(page, totalPages);
  const pagedMovies = moviesForView.slice(
    (safePage - 1) * MOVIES_PER_PAGE,
    safePage * MOVIES_PER_PAGE,
  );

  if (!cinemas.length) {
    return (
      <section className="mt-16 rounded-3xl border border-white/10 bg-white/[0.03] p-10 text-center text-slate-400">
        Chưa có rạp chiếu trong hệ thống.
      </section>
    );
  }

  const locationTabs = [
    { key: ALL_CITIES, label: 'Tất cả' },
    ...cities.map((c) => ({ key: c, label: c })),
  ];

  return (
    <section className="mt-10">
      <div className="mb-6 text-center">
        <p className="text-sm uppercase tracking-[0.35em] text-sky-300/80">
          Lịch chiếu
        </p>
        <h2 className="mt-2 text-3xl font-semibold text-white sm:text-4xl">
          Lịch chiếu phim
        </h2>
      </div>

      <div className="overflow-hidden rounded-3xl border border-white/10 bg-white/[0.03] shadow-glow">
        {/* Vị trí – có tab Tất cả */}
        <div className="flex flex-wrap items-center gap-2 border-b border-white/10 px-4 py-3 sm:px-5">
          <span className="mr-1 text-sm text-slate-400">Vị trí</span>
          {locationTabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => {
                setCity(tab.key);
                // Đổi vị trí → mặc định về "Tất cả rạp"
                setCinemaId(ALL_CINEMAS);
              }}
              className={`rounded-full px-3.5 py-1.5 text-sm font-semibold transition ${
                city === tab.key
                  ? 'bg-white text-slate-950'
                  : 'border border-white/10 bg-white/5 text-slate-300 hover:bg-white/10'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="grid lg:grid-cols-[280px_1fr]">
          {/* Danh sách rạp */}
          <aside className="border-b border-white/10 lg:border-b-0 lg:border-r lg:border-white/10">
            <div className="max-h-[420px] overflow-y-auto p-2 sm:p-3">
              {/* Tất cả rạp */}
              <button
                type="button"
                onClick={() => setCinemaId(ALL_CINEMAS)}
                className={`mb-1 flex w-full items-center justify-between gap-2 rounded-xl px-3 py-3 text-left transition ${
                  isAllCinemas
                    ? 'bg-sky-500/15 text-white ring-1 ring-sky-400/40'
                    : 'text-slate-300 hover:bg-white/5'
                }`}
              >
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold">
                    Tất cả rạp
                  </span>
                  <span className="mt-0.5 block truncate text-xs text-slate-500">
                    {city === ALL_CITIES
                      ? `${cinemas.length} rạp`
                      : `${filteredCinemas.length} rạp`}
                  </span>
                </span>
                <svg
                  className="h-4 w-4 shrink-0 text-slate-500"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  aria-hidden
                >
                  <path
                    d="M9 18l6-6-6-6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>

              {filteredCinemas.length === 0 ? (
                <p className="p-4 text-sm text-slate-500">Không có rạp.</p>
              ) : (
                filteredCinemas.map((c) => {
                  const active = c.id === activeCinemaId;
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setCinemaId(c.id)}
                      className={`mb-1 flex w-full items-center justify-between gap-2 rounded-xl px-3 py-3 text-left transition ${
                        active
                          ? 'bg-sky-500/15 text-white ring-1 ring-sky-400/40'
                          : 'text-slate-300 hover:bg-white/5'
                      }`}
                    >
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-semibold">
                          {c.name}
                        </span>
                        <span className="mt-0.5 block truncate text-xs text-slate-500">
                          {c.city}
                        </span>
                      </span>
                      <svg
                        className="h-4 w-4 shrink-0 text-slate-500"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        aria-hidden
                      >
                        <path
                          d="M9 18l6-6-6-6"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </button>
                  );
                })
              )}
            </div>
          </aside>

          {/* Chi tiết lịch */}
          <div className="min-w-0 p-4 sm:p-5">
            {isAllCinemas || selectedCinema ? (
              <>
                <div className="mb-4">
                  <h3 className="text-lg font-semibold text-white">
                    {isAllCinemas
                      ? 'Tất cả rạp'
                      : selectedCinema!.name}
                  </h3>
                  <p className="mt-1 line-clamp-2 text-sm text-slate-400">
                    {isAllCinemas
                      ? city === ALL_CITIES
                        ? `Hiển thị suất chiếu từ ${cinemas.length} rạp`
                        : `Hiển thị suất chiếu từ ${filteredCinemas.length} rạp tại ${city}`
                      : selectedCinema!.address}
                  </p>
                </div>

                {/* Ngày */}
                <div className="mb-5 flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                  {dates.map((d) => {
                    const active = d.value === date;
                    return (
                      <button
                        key={d.value}
                        type="button"
                        onClick={() => setDate(d.value)}
                        className={`flex w-[4.5rem] shrink-0 flex-col items-center rounded-xl px-2 py-2.5 transition ${
                          active
                            ? 'border-2 border-sky-400 bg-sky-500/15 text-white'
                            : 'border border-white/10 bg-white/5 text-slate-300 hover:bg-white/10'
                        }`}
                      >
                        <span className="text-lg font-semibold">
                          {String(d.day).padStart(2, '0')}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {d.weekday}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* Phim + suất (phân trang 5 phim/trang) */}
                {moviesForView.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-white/10 py-12 text-center text-sm text-slate-500">
                    Không có suất chiếu
                    {isAllCinemas ? '' : ' tại rạp này'} trong ngày đã chọn.
                  </div>
                ) : (
                  <>
                    <div className="space-y-5">
                      {pagedMovies.map(({ movie, formats, times }) => (
                        <div
                          key={movie.id}
                          className="flex gap-4 border-b border-white/5 pb-5 last:border-0 last:pb-0"
                        >
                          <Link
                            href={`/phim/${movie.slug}`}
                            className="relative h-28 w-20 shrink-0 overflow-hidden rounded-xl"
                          >
                            <Image
                              src={movie.imageUrl}
                              alt={movie.title}
                              fill
                              unoptimized
                              className="object-cover"
                              sizes="80px"
                            />
                          </Link>

                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <Link
                                href={`/phim/${movie.slug}`}
                                className="font-semibold text-white transition hover:text-sky-300"
                              >
                                {movie.title}
                              </Link>
                              <span className="rounded bg-white/10 px-1.5 py-0.5 text-[10px] font-bold text-slate-300">
                                {movie.ageRating}
                              </span>
                            </div>
                            <p className="mt-1 text-xs text-slate-400">
                              {formats.join(' · ')} · {movie.genre}
                            </p>
                            <div className="mt-3 flex flex-wrap gap-2">
                              {times.map((t) => (
                                <Link
                                  key={t.id}
                                  href={`/dat-ve?showtime=${encodeURIComponent(t.id)}`}
                                  className="inline-flex flex-col items-center rounded-lg border border-sky-400/30 bg-sky-500/10 px-3 py-1.5 text-sky-200 transition hover:border-sky-400/60 hover:bg-sky-500/20"
                                  title={t.cinemaName}
                                >
                                  <span className="text-sm font-semibold">
                                    {t.time}
                                  </span>
                                  {t.cinemaName && (
                                    <span className="mt-0.5 max-w-[7rem] truncate text-[10px] text-sky-300/70">
                                      {t.cinemaName}
                                    </span>
                                  )}
                                </Link>
                              ))}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {totalPages > 1 && (
                      <div className="mt-6 flex items-center justify-center gap-2">
                        <button
                          type="button"
                          disabled={safePage <= 1}
                          onClick={() => setPage((p) => Math.max(1, p - 1))}
                          className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-slate-300 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
                          aria-label="Trang trước"
                        >
                          ‹
                        </button>
                        {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                          (n) => (
                            <button
                              key={n}
                              type="button"
                              onClick={() => setPage(n)}
                              className={`min-w-[2.25rem] rounded-lg px-3 py-1.5 text-sm font-semibold transition ${
                                n === safePage
                                  ? 'bg-sky-500 text-white'
                                  : 'border border-white/10 bg-white/5 text-slate-300 hover:bg-white/10'
                              }`}
                            >
                              {n}
                            </button>
                          ),
                        )}
                        <button
                          type="button"
                          disabled={safePage >= totalPages}
                          onClick={() =>
                            setPage((p) => Math.min(totalPages, p + 1))
                          }
                          className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-slate-300 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
                          aria-label="Trang sau"
                        >
                          ›
                        </button>
                      </div>
                    )}
                  </>
                )}
              </>
            ) : (
              <p className="py-10 text-center text-sm text-slate-500">
                Chọn một rạp để xem lịch chiếu.
              </p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}