import Link from 'next/link';
import { MovieCard } from '@/components/movie-card';
import { movies, showtimes } from '@/lib/mock-data';

export default function HomePage() {
  const nowShowing = movies.filter((movie) => movie.isNowShowing);
  const upcoming = movies.filter((movie) => movie.isComingSoon);

  return (
    <main className="page-shell py-12 lg:py-16">
      <section className="grid gap-10 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
        <div className="space-y-8">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-sky-200">
            Đồ án Next.js + PostgreSQL + Docker
          </div>
          <div className="space-y-5">
            <h1 className="max-w-3xl text-4xl font-bold tracking-tight text-white sm:text-5xl lg:text-6xl">
              Hệ thống đặt vé xem phim trực tuyến với luồng đặt chỗ hiện đại.
            </h1>
            <p className="max-w-2xl text-base leading-8 text-slate-300 sm:text-lg">
              Người dùng xem phim đang chiếu, chọn rạp, chọn suất chiếu, chọn ghế, đặt vé và thanh toán online.
              Quản trị viên quản lý phim, rạp, phòng chiếu, suất chiếu, vé và người dùng.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link href="/phim" className="rounded-full bg-white px-6 py-3 font-semibold text-slate-950 transition hover:bg-slate-100">
              Khám phá phim
            </Link>
            <Link href="/dang-ky" className="rounded-full border border-white/10 px-6 py-3 font-semibold text-white transition hover:bg-white/5">
              Tạo tài khoản
            </Link>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            {[
              { label: 'Phim đang chiếu', value: nowShowing.length },
              { label: 'Phim sắp chiếu', value: upcoming.length },
              { label: 'Suất chiếu mẫu', value: showtimes.length }
            ].map((item) => (
              <div key={item.label} className="rounded-[24px] border border-white/10 bg-white/5 p-5 shadow-glow">
                <div className="text-sm text-slate-400">{item.label}</div>
                <div className="mt-2 text-3xl font-semibold text-white">{item.value}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-[32px] border border-white/10 bg-white/5 p-5 shadow-glow">
          <img src={movies[0].posterUrl} alt={movies[0].title} className="h-[520px] w-full rounded-[28px] object-cover" />
        </div>
      </section>

      <section className="mt-16 space-y-6">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-sm uppercase tracking-[0.35em] text-sky-300/80">Đang chiếu</p>
            <h2 className="mt-2 text-3xl font-semibold text-white">Phim nổi bật</h2>
          </div>
          <Link href="/phim" className="text-sm font-semibold text-sky-200 transition hover:text-white">
            Xem tất cả
          </Link>
        </div>

        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {nowShowing.map((movie) => (
            <MovieCard key={movie.id} movie={movie} />
          ))}
        </div>
      </section>
    </main>
  );
}