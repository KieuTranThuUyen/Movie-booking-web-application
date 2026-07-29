import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { ensureMoviesSeeded } from '@/lib/seed-movies';

type MovieDetailPageProps = {
  params: Promise<{ slug: string }>;
};

export default async function MovieDetailPage({ params }: MovieDetailPageProps) {
  const resolvedParams = await params;
  await ensureMoviesSeeded();

  const movie = await prisma.movie.findUnique({
    where: { slug: resolvedParams.slug },
    include: {
      showtimes: {
        orderBy: { startTime: 'asc' },
        include: {
          hall: {
            include: {
              cinema: true
            }
          }
        }
      }
    }
  });

  if (!movie) {
    notFound();
  }

  return (
    <main className="page-shell py-12 lg:py-16">
      <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
        <img src={movie.posterUrl} alt={movie.title} className="w-full rounded-[32px] object-cover shadow-glow" />

        <div className="space-y-6">
          <div className="space-y-3">
            <p className="text-sm uppercase tracking-[0.35em] text-sky-300/80">Chi tiết phim</p>
            <h1 className="text-4xl font-bold text-white">{movie.title}</h1>
            <p className="text-slate-300">{movie.synopsis}</p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {[
              ['Thể loại', movie.genre],
              ['Thời lượng', `${movie.duration} phút`],
              ['Phân loại', movie.ageRating],
              ['Khởi chiếu', new Date(movie.releaseDate).toLocaleDateString('vi-VN')]
            ].map(([label, value]) => (
              <div key={label} className="rounded-[24px] border border-white/10 bg-white/5 p-4">
                <div className="text-sm text-slate-400">{label}</div>
                <div className="mt-2 text-lg font-semibold text-white">{value}</div>
              </div>
            ))}
          </div>

          <div className="rounded-[24px] border border-white/10 bg-white/5 p-5">
            <div className="text-base font-semibold text-white">Suất chiếu</div>
            <div className="mt-4 grid gap-3">
              {movie.showtimes.length === 0 ? (
                <p className="text-sm text-slate-400">Phim này hiện chưa có suất chiếu.</p>
              ) : movie.showtimes.map((showtime) => (
                <div key={showtime.id} className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-slate-950/60 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="font-semibold text-white">{showtime.hall.cinema.name}</div>
                    <div className="mt-1 text-sm text-slate-400">
                      {showtime.hall.name} · {showtime.format} · {showtime.language}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-slate-300">{new Date(showtime.startTime).toLocaleString('vi-VN')}</span>
                    <Link href={`/dat-ve?movie=${movie.slug}&showtime=${showtime.id}`} className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-slate-100">
                      Đặt vé
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}