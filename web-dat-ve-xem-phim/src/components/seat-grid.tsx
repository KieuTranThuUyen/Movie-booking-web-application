'use client';

import { useMemo, useState } from 'react';

type SeatGridProps = {
  movieTitle: string;
  cinemaName: string;
  hallName: string;
  startTime: string;
  basePrice: number;
};

const rows = ['A', 'B', 'C', 'D', 'E', 'F'];
const soldSeats = ['A3', 'A4', 'B6', 'C2', 'D5', 'E1'];

export function SeatGrid({ movieTitle, cinemaName, hallName, startTime, basePrice }: SeatGridProps) {
  const [selectedSeats, setSelectedSeats] = useState<string[]>(['B2', 'B3']);

  const total = useMemo(() => selectedSeats.length * basePrice, [selectedSeats, basePrice]);

  const toggleSeat = (seatCode: string) => {
    if (soldSeats.includes(seatCode)) {
      return;
    }

    setSelectedSeats((current) =>
      current.includes(seatCode)
        ? current.filter((seat) => seat !== seatCode)
        : [...current, seatCode].sort()
    );
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[1.4fr_0.8fr]">
      <section className="rounded-[28px] border border-white/10 bg-slate-950/70 p-6 shadow-glow backdrop-blur-xl">
        <div className="space-y-2">
          <h2 className="text-2xl font-semibold text-white">Chọn ghế</h2>
          <p className="text-sm text-slate-300">{movieTitle} | {cinemaName} | {hallName} | {new Date(startTime).toLocaleString('vi-VN')}</p>
        </div>

        <div className="mt-6 grid gap-3 rounded-[24px] border border-white/10 bg-white/5 p-4">
          <div className="mx-auto mb-3 h-2 w-1/2 rounded-full bg-sky-400/60" />
          {rows.map((row) => (
            <div key={row} className="flex flex-wrap justify-center gap-2">
              {Array.from({ length: 8 }, (_, index) => {
                const seatCode = `${row}${index + 1}`;
                const isSelected = selectedSeats.includes(seatCode);
                const isSold = soldSeats.includes(seatCode);

                return (
                  <button
                    key={seatCode}
                    type="button"
                    onClick={() => toggleSeat(seatCode)}
                    className={`h-11 w-11 rounded-xl border text-xs font-semibold transition ${
                      isSold
                        ? 'cursor-not-allowed border-rose-400/40 bg-rose-500/20 text-rose-200'
                        : isSelected
                          ? 'border-emerald-400/60 bg-emerald-500 text-slate-950'
                          : 'border-white/10 bg-white/5 text-slate-200 hover:border-sky-400/60 hover:bg-sky-500/20'
                    }`}
                    disabled={isSold}
                  >
                    {seatCode}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </section>

      <aside className="space-y-4 rounded-[28px] border border-white/10 bg-slate-950/70 p-6 shadow-glow backdrop-blur-xl">
        <div>
          <h3 className="text-xl font-semibold text-white">Thông tin đặt vé</h3>
          <p className="mt-2 text-sm text-slate-300">Màn hình này thay thế giỏ hàng PHP cũ bằng luồng chọn ghế đúng với hệ thống phim.</p>
        </div>

        <div className="space-y-3 rounded-3xl border border-white/10 bg-white/5 p-4 text-sm text-slate-200">
          <div className="flex items-center justify-between gap-3">
            <span>Ghế đã chọn</span>
            <span className="font-semibold text-white">{selectedSeats.join(', ') || 'Chưa chọn'}</span>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span>Số lượng</span>
            <span className="font-semibold text-white">{selectedSeats.length}</span>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span>Giá mỗi vé</span>
            <span className="font-semibold text-white">{basePrice.toLocaleString('vi-VN')} đ</span>
          </div>
          <div className="flex items-center justify-between gap-3 border-t border-white/10 pt-3 text-base font-semibold text-white">
            <span>Tổng cộng</span>
            <span>{total.toLocaleString('vi-VN')} đ</span>
          </div>
        </div>

        <button
          type="button"
          onClick={() => window.location.assign('/thanh-toan')}
          className="inline-flex w-full items-center justify-center rounded-2xl bg-white px-4 py-3 font-semibold text-slate-950 transition hover:bg-slate-100"
        >
          Tiếp tục thanh toán
        </button>
      </aside>
    </div>
  );
}