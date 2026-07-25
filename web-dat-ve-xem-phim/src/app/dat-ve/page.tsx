import { SeatGrid } from '@/components/seat-grid';
import { movies, showtimes } from '@/lib/mock-data';

type BookingPageProps = {
  searchParams: Promise<{ movie?: string; showtime?: string }>;
};

export default async function BookingPage({ searchParams }: BookingPageProps) {
  const resolvedSearchParams = await searchParams;
  const movie = movies.find((item) => item.slug === resolvedSearchParams.movie) ?? movies[0];
  const showtime = showtimes.find((item) => item.id === resolvedSearchParams.showtime) ?? showtimes[0];

  return (
    <main className="page-shell py-12 lg:py-16">
      <div className="space-y-3">
        <p className="text-sm uppercase tracking-[0.35em] text-sky-300/80">Đặt vé</p>
        <h1 className="text-4xl font-bold text-white">Chọn ghế cho suất chiếu</h1>
      </div>

      <div className="mt-10">
        <SeatGrid
          movieTitle={movie.title}
          cinemaName={showtime.cinemaName}
          hallName={showtime.hallName}
          startTime={showtime.startTime}
          basePrice={showtime.basePrice}
        />
      </div>
    </main>
  );
}