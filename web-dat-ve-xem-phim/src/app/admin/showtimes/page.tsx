import { prisma } from '@/lib/prisma';
import { ShowtimeManagementForm } from '@/components/forms/showtime-management-form';

export default async function AdminShowtimesPage() {
  const [movies, cinemas, showtimes] = await Promise.all([
    prisma.movie.findMany({
      orderBy: [{ isNowShowing: 'desc' }, { releaseDate: 'desc' }],
    }),

    prisma.cinema.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        halls: {
          include: {
            seats: true,
          },
        },
      },
    }),

    prisma.showtime.findMany({
      orderBy: { startTime: 'desc' },
      include: {
        movie: true,
        hall: {
          include: {
            cinema: true,
          },
        },
        _count: {
          select: { bookings: true },
        },
      },
    }),
  ]);

  return (
    <section className="rounded-[28px] border border-white/10 bg-slate-950/70 p-6 shadow-glow backdrop-blur-xl">
      <h2 className="text-xl font-semibold text-white">
        Quản lý suất chiếu
      </h2>

      <p className="mt-3 text-sm leading-7 text-slate-300">
        Chỉ tạo suất cho phim đang chiếu. Chỉ sửa/xóa suất chưa có ai đặt vé.
      </p>

      <div className="mt-6">
        <ShowtimeManagementForm
          movies={movies.map((movie) => ({
            id: movie.id,
            slug: movie.slug,
            title: movie.title,
            duration: movie.duration ?? 120,
            releaseDate: movie.releaseDate,
            isNowShowing: movie.isNowShowing,
            isComingSoon: movie.isComingSoon,
          }))}
          halls={cinemas.flatMap((cinema) =>
            cinema.halls.map((hall) => ({
              id: hall.id,
              name: hall.name,
              cinema: { name: cinema.name },
              seats: hall.seats.map((seat) => ({
                id: seat.id,
                code: seat.code,
                type: seat.type,
                isActive: seat.isActive,
              })),
            })),
          )}
          showtimes={showtimes.map((st) => ({
            id: st.id,
            startTime: st.startTime,
            endTime: st.endTime,
            language: st.language,
            format: st.format,
            standardPrice: st.standardPrice,
            vipPrice: st.vipPrice,
            couplePrice: st.couplePrice,
            bookingCount: st._count.bookings,
            movie: {
              id: st.movie.id,
              slug: st.movie.slug,
              title: st.movie.title,
              duration: st.movie.duration,
              releaseDate: st.movie.releaseDate,
              isComingSoon: st.movie.isComingSoon,
            },
            hall: {
              id: st.hall.id,
              name: st.hall.name,
              cinema: { name: st.hall.cinema.name },
            },
          }))}
        />
      </div>
    </section>
  );
}