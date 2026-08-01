import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { ensureMoviesSeeded } from '@/lib/seed-movies';

type CartPageProps = {
  searchParams: Promise<{ movie?: string; showtime?: string; seats?: string }>;
};

export default async function CartPage({ searchParams }: CartPageProps) {
  const resolvedSearchParams = await searchParams;
  await ensureMoviesSeeded();

  const showtime = resolvedSearchParams.showtime
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
    : null;

  const selectedSeats = (resolvedSearchParams.seats ?? '')
    .split(',')
    .map((seat) => seat.trim())
    .filter(Boolean);

  const subtotal = showtime ? selectedSeats.length * showtime.basePrice : 0;

  return (
    <main className="page-shell py-12 lg:py-16">
      <div className="space-y-3">
        <p className="text-sm uppercase tracking-[0.35em] text-sky-300/80">Giỏ vé</p>
        <h1 className="text-4xl font-bold text-white">Thông tin vé đã chọn</h1>
      </div>

      <div className="mt-10 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <section className="rounded-[28px] border border-white/10 bg-slate-950/70 p-6 shadow-glow backdrop-blur-xl">
          {showtime ? (
            <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
              <div className="font-semibold text-white">{showtime.movie.title}</div>
              <div className="mt-2 text-sm text-slate-300">{showtime.hall.cinema.name} · {showtime.hall.name}</div>
              <div className="mt-2 text-sm text-slate-300">{new Date(showtime.startTime).toLocaleString('vi-VN')}</div>
              <div className="mt-4 text-sm text-slate-300">Ghế đã chọn: {selectedSeats.join(', ') || 'Chưa chọn ghế'}</div>
            </div>
          ) : (
            <div className="rounded-3xl border border-white/10 bg-white/5 p-5 text-sm text-slate-300">
              Chưa có dữ liệu giỏ vé. Hãy quay lại màn hình chọn ghế để thêm vé trước khi thanh toán.
            </div>
          )}
        </section>

        <aside className="rounded-[28px] border border-white/10 bg-slate-950/70 p-6 shadow-glow backdrop-blur-xl">
          <div className="text-lg font-semibold text-white">Tóm tắt</div>
          <div className="mt-4 space-y-3 text-sm text-slate-200">
            <div className="flex items-center justify-between"><span>Số vé</span><span>{selectedSeats.length}</span></div>
            <div className="flex items-center justify-between"><span>Tạm tính</span><span>{subtotal.toLocaleString('vi-VN')} đ</span></div>
          </div>
          <Link
            href={showtime ? `/thanh-toan?showtime=${showtime.id}&seats=${selectedSeats.join(',')}&subtotal=${subtotal}` : '/dat-ve'}
            className="mt-6 inline-flex w-full items-center justify-center rounded-2xl bg-white px-4 py-3 font-semibold text-slate-950 transition hover:bg-slate-100"
          >
            Sang thanh toán
          </Link>
        </aside>
      </div>
    </main>
  );
}