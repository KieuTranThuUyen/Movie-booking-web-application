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
  const resolvedSearchParams =
    await searchParams;

  // ============================================================
  // SEED MOVIES
  // ============================================================

  await ensureMoviesSeeded();

  // ============================================================
  // LẤY SHOWTIME
  // ============================================================

  const showtime =
    resolvedSearchParams.showtime
      ? await prisma.showtime.findUnique({
          where: {
            id: resolvedSearchParams.showtime,
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
        })
      : null;

  // ============================================================
  // LẤY GHẾ
  // ============================================================

  const seats = (
    resolvedSearchParams.seats ?? ''
  )
    .split(',')
    .map((seat) => seat.trim())
    .filter(Boolean);

  // ============================================================
  // TÍNH TIỀN
  //
  // Giá lấy trực tiếp từ Showtime.
  // Không sử dụng subtotal từ URL.
  // ============================================================

  let subtotal = 0;

  if (showtime) {
    const selectedSeats =
      showtime.hall.seats.filter(
        (seat) =>
          seats.includes(
            seat.code,
          ),
      );

    subtotal =
      selectedSeats.reduce(
        (total, seat) => {
          switch (
            String(
              seat.type,
            ).toUpperCase()
          ) {
            case 'VIP':
              return (
                total +
                showtime.vipPrice
              );

            case 'COUPLE':
              return (
                total +
                showtime.couplePrice
              );

            case 'STANDARD':
            default:
              return (
                total +
                showtime.standardPrice
              );
          }
        },
        0,
      );
  }

  // ============================================================
  // PHÍ DỊCH VỤ
  // ============================================================

  const bookingFee = 0;

  // ============================================================
  // RENDER
  // ============================================================

  return (
    <main className="page-shell py-12 lg:py-16">
      <div className="space-y-3">
        <p className="text-sm uppercase tracking-[0.35em] text-sky-300/80">
          Thanh toán
        </p>

        <h1 className="text-4xl font-bold text-white">
          Hoàn tất đặt vé
        </h1>
      </div>

      <div className="mt-10">
        {showtime ? (
          <CheckoutForm
            movieTitle={
              showtime.movie.title
            }
            cinemaName={
              showtime.hall.cinema.name
            }
            hallName={
              showtime.hall.name
            }
            showtimeId={
              showtime.id
            }
            showtimeStart={showtime.startTime.toISOString()}
            seats={seats}
            subtotal={subtotal}
            bookingFee={bookingFee}
          />
        ) : (
          <div className="rounded-[28px] border border-white/10 bg-slate-950/70 p-6 text-slate-300 shadow-glow backdrop-blur-xl">
            Chưa có thông tin suất chiếu
            để thanh toán.
          </div>
        )}
      </div>
    </main>
  );
}