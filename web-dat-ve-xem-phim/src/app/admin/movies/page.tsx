import { prisma } from '@/lib/db/prisma';
import { MovieManagementForm } from '@/components/forms/movie-management-form';

export default async function AdminMoviesPage() {
  const movies = await prisma.movie.findMany({
    orderBy: [{ isNowShowing: 'desc' }, { releaseDate: 'desc' }]
  });

  return (
    <section className="rounded-[28px] border border-white/10 bg-slate-950/70 p-6 shadow-glow backdrop-blur-xl">
      <h2 className="text-xl font-semibold text-white">Quản lý phim</h2>
      <p className="mt-3 text-sm leading-7 text-slate-300">Tạo, cập nhật và xóa phim trực tiếp từ cơ sở dữ liệu.</p>
      <div className="mt-6">
        <MovieManagementForm movies={movies} />
      </div>
    </section>
  );
}
