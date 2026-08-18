import { CheckoutForm } from '@/components/forms/checkout-form';
import { prisma } from '@/lib/prisma';
import { ensureMoviesSeeded } from '@/lib/seed-movies';

type CheckoutPageProps = {
  searchParams: Promise<{
    showtime?: string;
    seats?: string;
  }>;
};

export default async function CheckoutPage({
  searchParams,
}: CheckoutPageProps) {
  const resolvedSearchParams = await searchParams;

  await ensureMoviesSeeded();

  const showtimeId =
    resolvedSearchParams.showtime?.trim() ?? '';

  const seats = [
    ...new Set(
      (resolvedSearchParams.seats ?? '')
        .split(',')
        .map((seat) => seat.trim())
        .filter(Boolean),
    ),
  ];

  if (!showtimeId || seats.length === 0) {
    return (
      <main className="page-shell py-12 lg:py-16">
        <div className="rounded-[28px] border border-white/10 bg-slate-950/70 p-8 text-center shadow-glow backdrop-blur-xl">
          <h1 className="text-2xl font-bold text-white">
            Không thể tiếp tục thanh toán
          </h1>

          <p className="mt-3 text-slate-400">
            Vui lòng quay lại chọn suất chiếu và ghế.
          </p>
        </div>
      </main>
    );
  }

  const showtime = await prisma.showtime.findUnique({
    where: {
      id: showtimeId,
    },
    include: {
      movie: true,
      hall: {
        include: {
          cinema: true,
          seats: true,
        },
      },
    },
  });

  if (!showtime) {
    return (
      <main className="page-shell py-12 lg:py-16">
        <div className="rounded-[28px] border border-white/10 bg-slate-950/70 p-8 text-center shadow-glow backdrop-blur-xl">
          <h1 className="text-2xl font-bold text-white">
            Không tìm thấy suất chiếu
          </h1>

          <p className="mt-3 text-slate-400">
            Suất chiếu không tồn tại hoặc đã bị xóa.
          </p>
        </div>
      </main>
    );
  }

  if (showtime.startTime <= new Date()) {
    return (
      <main className="page-shell py-12 lg:py-16">
        <div className="rounded-[28px] border border-white/10 bg-slate-950/70 p-8 text-center shadow-glow backdrop-blur-xl">
          <h1 className="text-2xl font-bold text-white">
            Suất chiếu đã bắt đầu
          </h1>

          <p className="mt-3 text-slate-400">
            Không thể đặt vé cho suất chiếu này.
          </p>
        </div>
      </main>
    );
  }

  const selectedSeats = showtime.hall.seats.filter(
    (seat) => seats.includes(seat.code),
  );

  if (selectedSeats.length !== seats.length) {
    return (
      <main className="page-shell py-12 lg:py-16">
        <div className="rounded-[28px] border border-white/10 bg-slate-950/70 p-8 text-center shadow-glow backdrop-blur-xl">
          <h1 className="text-2xl font-bold text-white">
            Ghế không hợp lệ
          </h1>

          <p className="mt-3 text-slate-400">
            Một hoặc nhiều ghế bạn chọn không tồn tại trong
            phòng chiếu này.
          </p>
        </div>
      </main>
    );
  }

  const inactiveSeats = selectedSeats.filter(
    (seat) => !seat.isActive,
  );

  if (inactiveSeats.length > 0) {
    return (
      <main className="page-shell py-12 lg:py-16">
        <div className="rounded-[28px] border border-white/10 bg-slate-950/70 p-8 text-center shadow-glow backdrop-blur-xl">
          <h1 className="text-2xl font-bold text-white">
            Ghế không khả dụng
          </h1>

          <p className="mt-3 text-slate-400">
            Ghế{' '}
            {inactiveSeats
              .map((seat) => seat.code)
              .join(', ')}{' '}
            hiện đang bị khóa.
          </p>
        </div>
      </main>
    );
  }

  const getSeatPrice = (seatType: string) => {
    switch (seatType.toUpperCase()) {
      case 'VIP':
        return showtime.vipPrice;

      case 'COUPLE':
        return showtime.couplePrice;

      case 'STANDARD':
      default:
        return showtime.standardPrice;
    }
  };

  const subtotal = selectedSeats.reduce(
    (total, seat) =>
      total + getSeatPrice(String(seat.type)),
    0,
  );

  const bookingFee = 0;

  return (
    <main className="page-shell py-12 lg:py-16">
      <div className="space-y-3">
        <p className="text-sm uppercase tracking-[0.35em] text-sky-300/80">
          Thanh toán
        </p>

        <h1 className="text-4xl font-bold text-white">
          Hoàn tất đặt vé
        </h1>

        <p className="text-slate-400">
          Kiểm tra thông tin vé trước khi thanh toán.
        </p>
      </div>

      <div className="mt-10">
        <CheckoutForm
          movieTitle={showtime.movie.title}
          cinemaName={showtime.hall.cinema.name}
          hallName={showtime.hall.name}
          showtimeId={showtime.id}
          showtimeStart={showtime.startTime.toISOString()}
          seats={seats}
          subtotal={subtotal}
          bookingFee={bookingFee}
        />
      </div>
    </main>
  );
}