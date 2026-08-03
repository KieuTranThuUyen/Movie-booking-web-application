import { prisma } from '@/lib/prisma';
import { ShowtimeManagementForm } from '@/components/forms/showtime-management-form';

export default async function AdminShowtimesPage() {
  const [movies, cinemas, showtimes] = await Promise.all([
    prisma.movie.findMany({ orderBy: [{ isNowShowing: 'desc' }, { releaseDate: 'desc' }] }),
    prisma.cinema.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        halls: true
      }
    }),
    prisma.showtime.findMany({
      orderBy: { startTime: 'asc' },
      include: {
        movie: true,
        hall: {
          include: {
            cinema: true
          }
        }
      }
    })
  ]);

  return (
    <section className="rounded-[28px] border border-white/10 bg-slate-950/70 p-6 shadow-glow backdrop-blur-xl">
      <h2 className="text-xl font-semibold text-white">Quản lý suất chiếu</h2>
      <p className="mt-3 text-sm leading-7 text-slate-300">Tạo suất chiếu cho phim và phòng đã có, đồng thời theo dõi lịch chiếu đang lưu.</p>
      <div className="mt-6">
        <ShowtimeManagementForm
          movies={movies.map((movie) => ({ id: movie.id, slug: movie.slug, title: movie.title }))}
          halls={cinemas.flatMap((cinema) => cinema.halls.map((hall) => ({ id: hall.id, name: hall.name, cinema: { name: cinema.name } })))}
        />
      </div>
      <div className="mt-6 grid gap-3">
        {showtimes.length === 0 ? (
          <p className="text-sm text-slate-400">Chưa có suất chiếu nào.</p>
        ) : (
          showtimes.slice(0, 10).map((showtime) => (
            <div key={showtime.id} className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-slate-200">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <span className="font-semibold text-white">{showtime.movie.title}</span>
                <span className="text-sky-200">{new Date(showtime.startTime).toLocaleString('vi-VN')}</span>
              </div>
              <div className="mt-2 text-slate-400">
                {showtime.hall.cinema.name} · {showtime.hall.name} · {showtime.format} · {showtime.language} · {showtime.basePrice.toLocaleString('vi-VN')} đ
              </div>
            </div>
          ))
        )}
      </div>
    </section>
  );
}
