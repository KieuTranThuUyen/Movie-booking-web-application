import Link from 'next/link';
import { movies, showtimes } from '@/lib/mock-data';

export default function CartPage() {
  const selectedMovie = movies[0];
  const selectedShowtime = showtimes[0];

  return (
    <main className="page-shell py-12 lg:py-16">
      <div className="space-y-3">
        <p className="text-sm uppercase tracking-[0.35em] text-sky-300/80">Giỏ vé</p>
        <h1 className="text-4xl font-bold text-white">Thông tin vé đã chọn</h1>
      </div>

      <div className="mt-10 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <section className="rounded-[28px] border border-white/10 bg-slate-950/70 p-6 shadow-glow backdrop-blur-xl">
          <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
            <div className="font-semibold text-white">{selectedMovie.title}</div>
            <div className="mt-2 text-sm text-slate-300">{selectedShowtime.cinemaName} · {selectedShowtime.hallName}</div>
            <div className="mt-2 text-sm text-slate-300">{new Date(selectedShowtime.startTime).toLocaleString('vi-VN')}</div>
            <div className="mt-4 text-sm text-slate-300">Trang này dùng thay cho giỏ hàng PHP cũ. Khi làm thật có thể lưu ghế đã chọn vào session hoặc database.</div>
          </div>
        </section>

        <aside className="rounded-[28px] border border-white/10 bg-slate-950/70 p-6 shadow-glow backdrop-blur-xl">
          <div className="text-lg font-semibold text-white">Tóm tắt</div>
          <div className="mt-4 space-y-3 text-sm text-slate-200">
            <div className="flex items-center justify-between"><span>Số vé</span><span>2</span></div>
            <div className="flex items-center justify-between"><span>Tạm tính</span><span>170.000 đ</span></div>
          </div>
          <Link href="/thanh-toan" className="mt-6 inline-flex w-full items-center justify-center rounded-2xl bg-white px-4 py-3 font-semibold text-slate-950 transition hover:bg-slate-100">
            Sang thanh toán
          </Link>
        </aside>
      </div>
    </main>
  );
}