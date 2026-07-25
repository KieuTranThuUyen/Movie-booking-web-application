import { MovieCard } from '@/components/movie-card';
import { movies } from '@/lib/mock-data';

export default function MoviesPage() {
  return (
    <main className="page-shell py-12 lg:py-16">
      <div className="space-y-3">
        <p className="text-sm uppercase tracking-[0.35em] text-sky-300/80">Danh sách phim</p>
        <h1 className="text-4xl font-bold text-white">Phim đang chiếu và sắp chiếu</h1>
        <p className="max-w-2xl text-slate-300">
          Trang này có thể mở rộng thành tìm kiếm, lọc thể loại, phân loại theo rạp hoặc theo ngày như một website đặt vé thật.
        </p>
      </div>

      <div className="mt-10 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {movies.map((movie) => (
          <MovieCard key={movie.id} movie={movie} />
        ))}
      </div>
    </main>
  );
}