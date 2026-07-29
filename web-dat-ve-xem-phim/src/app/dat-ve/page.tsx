import { SeatGrid } from '@/components/seat-grid';
import { prisma } from '@/lib/prisma';
import { ensureMoviesSeeded } from '@/lib/seed-movies';

type BookingPageProps = {
  searchParams: Promise<{ movie?: string; showtime?: string }>;
};

export default async function BookingPage({ searchParams }: BookingPageProps) {
  const resolvedSearchParams = await searchParams;
  await ensureMoviesSeeded();

  const movie =
    (resolvedSearchParams.movie
      ? await prisma.movie.findUnique({
          where: { slug: resolvedSearchParams.movie },
          include: {
            showtimes: {
              include: {
                hall: {
                  include: {
                    cinema: true
                  }
                }
              }
            }
          }
        })
      : null) ??
    (await prisma.movie.findFirst({
      orderBy: { createdAt: 'asc' },
      include: {
        showtimes: {
          include: {
            hall: {
              include: {
                cinema: true
              }
            }
          }
        }
      }
    }));

  const showtime =
    (resolvedSearchParams.showtime
      ? await prisma.showtime.findUnique({
          where: { id: resolvedSearchParams.showtime },
          include: {
            movie: true,
            hall: {
              include: {
                cinema: true
              }
            }
          }
        })
      : null) ?? movie?.showtimes[0] ?? null;

  if (!movie || !showtime) {
    return (
      <main className="page-shell py-12 lg:py-16">
        <div className="rounded-[28px] border border-white/10 bg-slate-950/70 p-6 text-slate-300 shadow-glow backdrop-blur-xl">
          Hiện chưa có dữ liệu suất chiếu để đặt vé.
        </div>
      </main>
    );
  }

  return (
    <main className="page-shell py-12 lg:py-16">
      <div className="space-y-3">
        <p className="text-sm uppercase tracking-[0.35em] text-sky-300/80">Đặt vé</p>
        <h1 className="text-4xl font-bold text-white">Chọn ghế cho suất chiếu</h1>
      </div>

      <div className="mt-10">
        <SeatGrid
          movieTitle={movie.title}
          cinemaName={showtime.hall.cinema.name}
          hallName={showtime.hall.name}
          startTime={showtime.startTime.toISOString()}
          basePrice={showtime.basePrice}
        />
      </div>
    </main>
  );
}