import Image from 'next/image';
import Link from 'next/link';

import { MovieCard } from '@/components/movie-card';
import { prisma } from '@/lib/prisma';

export default async function HomePage() {
  const [
    nowShowing,
    upcoming,
    showtimes,
    heroMovie,
  ] = await Promise.all([
    prisma.movie.findMany({
      where: {
        isNowShowing: true,
      },
      orderBy: {
        releaseDate: 'desc',
      },
    }),

    prisma.movie.findMany({
      where: {
        isComingSoon: true,
      },
      orderBy: {
        releaseDate: 'desc',
      },
    }),

    prisma.showtime.count(),

    prisma.movie.findFirst({
      where: {
        isNowShowing: true,
      },
      orderBy: {
        createdAt: 'asc',
      },
    }),
  ]);

  return (
    <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      {/* HERO */}
      <section className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
        <div className="space-y-8">
          <div>
            <p className="text-sm uppercase tracking-[0.35em] text-sky-300/80">
              Đồ án Next.js + MySQL + Docker
            </p>

            <h1 className="mt-4 text-4xl font-semibold tracking-tight text-white sm:text-5xl">
              Hệ thống đặt vé xem phim trực tuyến với luồng đặt chỗ hiện đại.
            </h1>

            <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-300">
              Người dùng xem phim đang chiếu, chọn rạp, chọn suất chiếu,
              chọn ghế, đặt vé và thanh toán online.
              Quản trị viên quản lý phim, rạp, phòng chiếu,
              suất chiếu, vé và người dùng.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/phim"
              className="rounded-full bg-white px-6 py-3 font-semibold text-slate-950 transition hover:bg-slate-100"
            >
              Khám phá phim
            </Link>

            <Link
              href="/dang-ky"
              className="rounded-full border border-white/10 px-6 py-3 font-semibold text-white transition hover:bg-white/5"
            >
              Tạo tài khoản
            </Link>
          </div>

          {/* THỐNG KÊ */}
          <div className="grid gap-4 sm:grid-cols-3">
            {[
              {
                label: 'Phim đang chiếu',
                value: nowShowing.length,
              },
              {
                label: 'Phim sắp chiếu',
                value: upcoming.length,
              },
              {
                label: 'Suất chiếu',
                value: showtimes,
              },
            ].map((item) => (
              <div
                key={item.label}
                className="rounded-[24px] border border-white/10 bg-white/5 p-5 shadow-glow"
              >
                <div className="text-sm text-slate-400">
                  {item.label}
                </div>

                <div className="mt-2 text-3xl font-semibold text-white">
                  {item.value}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* PHIM NỔI BẬT */}
        <div className="rounded-[32px] border border-white/10 bg-white/5 p-5 shadow-glow">
          {heroMovie ? (
            <Image
              src={heroMovie.posterUrl}
              alt={heroMovie.title}
              width={800}
              height={1040}
              unoptimized
              priority
              className="h-[520px] w-full rounded-[28px] object-cover"
            />
          ) : (
            <div className="flex h-[520px] items-center justify-center rounded-[28px] border border-dashed border-white/10 text-slate-400">
              Chưa có phim đang chiếu
            </div>
          )}
        </div>
      </section>

      {/* PHIM ĐANG CHIẾU */}
      <section className="mt-16 space-y-6">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-sm uppercase tracking-[0.35em] text-sky-300/80">
              Đang chiếu
            </p>

            <h2 className="mt-2 text-3xl font-semibold text-white">
              Phim nổi bật
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
              <MovieCard
                key={movie.id}
                movie={movie}
              />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}