import { prisma } from '@/lib/prisma';
import { CinemaManagementForm } from '@/components/forms/cinema-management-form';
import { MovieManagementForm } from '@/components/forms/movie-management-form';
import { ShowtimeManagementForm } from '@/components/forms/showtime-management-form';

export default async function AdminPage() {
  type BookingSummary = {
    id: string;
    bookingCode: string;
    customerName: string;
    totalPrice: number;
    status: string;
    showtime: {
      movie: {
        title: string;
      };
    };
  };

  const [bookings, moviesCount, usersCount, movies] = await Promise.all([
    prisma.booking.findMany({
      orderBy: { createdAt: 'desc' },
      take: 5,
      include: { showtime: { include: { movie: true } } }
    }) as Promise<BookingSummary[]>,
    prisma.movie.count(),
    prisma.user.count(),
    prisma.movie.findMany({
      orderBy: [{ isNowShowing: 'desc' }, { releaseDate: 'desc' }]
    })
  ]);

  const cinemas = await prisma.cinema.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      halls: {
        include: {
          seats: true
        }
      }
    }
  });

  const showtimes = await prisma.showtime.findMany({
    orderBy: { startTime: 'asc' },
    include: {
      movie: true,
      hall: {
        include: {
          cinema: true
        }
      }
    }
  });

  const stats = [
    { label: 'Phim', value: moviesCount },
    { label: 'Suất chiếu', value: await prisma.showtime.count() },
    { label: 'Đơn đặt', value: bookings.length },
    { label: 'Người dùng', value: usersCount }
  ];

  return (
    <main className="page-shell py-12 lg:py-16">
      <div className="space-y-3">
        <p className="text-sm uppercase tracking-[0.35em] text-sky-300/80">Admin</p>
        <h1 className="text-4xl font-bold text-white">Bảng điều khiển quản trị</h1>
      </div>

      <div className="mt-10 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => (
          <div key={stat.label} className="rounded-[24px] border border-white/10 bg-white/5 p-5 shadow-glow">
            <div className="text-sm text-slate-400">{stat.label}</div>
            <div className="mt-2 text-3xl font-semibold text-white">{stat.value}</div>
          </div>
        ))}
      </div>

      <section className="mt-10 rounded-[28px] border border-white/10 bg-slate-950/70 p-6 shadow-glow backdrop-blur-xl">
        <h2 className="text-xl font-semibold text-white">Quản lý phim</h2>
        <p className="mt-3 text-sm leading-7 text-slate-300">
          Tạo, cập nhật và xóa phim trực tiếp từ cơ sở dữ liệu.
        </p>
        <div className="mt-6">
          <MovieManagementForm movies={movies} />
        </div>
      </section>

      <section className="mt-10 rounded-[28px] border border-white/10 bg-slate-950/70 p-6 shadow-glow backdrop-blur-xl">
        <h2 className="text-xl font-semibold text-white">Quản lý rạp chiếu và sơ đồ ghế</h2>
        <p className="mt-3 text-sm leading-7 text-slate-300">
          Tạo rạp, thêm phòng chiếu và sinh sơ đồ ghế khác nhau cho từng phòng để phù hợp với mô tả hệ thống.
        </p>
        <div className="mt-6">
          <CinemaManagementForm cinemas={cinemas} />
        </div>
      </section>

      <section className="mt-10 rounded-[28px] border border-white/10 bg-slate-950/70 p-6 shadow-glow backdrop-blur-xl">
        <h2 className="text-xl font-semibold text-white">Quản lý suất chiếu</h2>
        <p className="mt-3 text-sm leading-7 text-slate-300">
          Tạo suất chiếu cho phim và phòng đã có, đồng thời hiển thị danh sách suất chiếu đang lưu trong cơ sở dữ liệu.
        </p>
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
            showtimes.slice(0, 6).map((showtime) => (
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

      <div className="mt-10 grid gap-6 lg:grid-cols-2">
        <section className="rounded-[28px] border border-white/10 bg-slate-950/70 p-6 shadow-glow backdrop-blur-xl">
          <h2 className="text-xl font-semibold text-white">Quản lý phim</h2>
          <p className="mt-3 text-sm leading-7 text-slate-300">
            Thêm, sửa, xóa phim; cập nhật poster, trailer, thể loại, thời lượng và trạng thái đang chiếu / sắp chiếu.
          </p>
        </section>
        <section className="rounded-[28px] border border-white/10 bg-slate-950/70 p-6 shadow-glow backdrop-blur-xl">
          <h2 className="text-xl font-semibold text-white">Quản lý đặt vé</h2>
          <p className="mt-3 text-sm leading-7 text-slate-300">
            Theo dõi booking, ghế đã bán, tình trạng thanh toán, xử lý hủy vé và xác nhận đơn.
          </p>
          <div className="mt-6 space-y-3">
            {bookings.length === 0 ? (
              <p className="text-sm text-slate-400">Chưa có đơn đặt vé nào được ghi nhận.</p>
            ) : (
              bookings.map((booking) => (
                <div key={booking.id} className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-slate-200">
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-semibold text-white">{booking.bookingCode}</span>
                    <span className="rounded-full border border-white/10 px-3 py-1 text-xs uppercase tracking-[0.2em] text-sky-200">
                      {booking.status}
                    </span>
                  </div>
                  <div className="mt-2 text-slate-400">
                    {booking.showtime.movie.title} · {booking.customerName} · {booking.totalPrice.toLocaleString('vi-VN')} đ
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </main>
  );
}