'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useMemo, useState } from 'react';

type Combo = { id: string; name: string; imageUrl: string | null; price: number; stock: number };

type SeatLine = { code: string; type: string; price: number };

type Props = {
  combos: Combo[];
  showtimeId: string;
  seats: string[];
  seatDetails: SeatLine[];
  seatSubtotal: number;
};

export function CartCombos({
  combos,
  showtimeId,
  seats,
  seatDetails,
  seatSubtotal,
}: Props) {
  const [quantities, setQuantities] = useState<Record<string, number>>({});

  const selectedCombos = useMemo(
    () =>
      combos
        .map((combo) => ({
          ...combo,
          quantity: quantities[combo.id] ?? 0,
        }))
        .filter((c) => c.quantity > 0),
    [combos, quantities],
  );

  const comboTotal = selectedCombos.reduce(
    (sum, c) => sum + Number(c.price) * c.quantity,
    0,
  );
  const grandTotal = seatSubtotal + comboTotal;

  const params = new URLSearchParams({
    showtime: showtimeId,
    seats: seats.join(','),
  });
  if (selectedCombos.length > 0) {
    params.set(
      'combos',
      selectedCombos.map((c) => `${c.id}:${c.quantity}`).join(','),
    );
  }

  const setQty = (id: string, stock: number, raw: string) => {
    const n = Math.min(stock, Math.max(0, Math.floor(Number(raw) || 0)));
    setQuantities((prev) => ({ ...prev, [id]: n }));
  };

  return (
    <div className="space-y-6">
      <section className="rounded-[28px] border border-white/10 bg-slate-950/70 p-6 shadow-glow backdrop-blur-xl">
        <h2 className="text-lg font-semibold text-white">Combo bắp nước</h2>
        {combos.length === 0 ? (
          <p className="mt-2 text-sm text-slate-400">Hiện chưa có combo đang bán.</p>
        ) : (
          <>
            <p className="mt-1 text-sm text-slate-400">
              Chọn combo để nhận QR riêng cùng đơn vé.
            </p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {combos.map((combo) => (
                <label
                  key={combo.id}
                  className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/5 p-3 text-sm text-slate-200"
                >
                  {combo.imageUrl ? (
                    <Image
                      src={combo.imageUrl}
                      alt={combo.name}
                      width={96}
                      height={80}
                      className="h-20 w-24 shrink-0 rounded-xl border border-white/10 object-cover"
                    />
                  ) : null}
                  <span>
                    <span className="font-medium text-white">{combo.name}</span>
                    <br />
                    <b className="text-sky-300">
                      {Number(combo.price).toLocaleString('vi-VN')} đ
                    </b>
                    <span className="ml-2 text-xs text-slate-500">
                      (còn {combo.stock})
                    </span>
                  </span>
                  <input
                    type="number"
                    min={0}
                    max={combo.stock}
                    value={quantities[combo.id] ?? 0}
                    onChange={(e) => setQty(combo.id, combo.stock, e.target.value)}
                    className="w-16 rounded-lg border border-white/10 bg-slate-900 px-2 py-1.5 text-center text-white"
                  />
                </label>
              ))}
            </div>
          </>
        )}
      </section>

      <aside className="rounded-[28px] border border-white/10 bg-slate-950/70 p-6 shadow-glow backdrop-blur-xl lg:sticky lg:top-6">
        <div className="text-lg font-semibold text-white">Tóm tắt</div>

        <div className="mt-4 space-y-3 text-sm text-slate-200">
          <div className="flex items-center justify-between">
            <span className="text-slate-400">Số vé</span>
            <span>{seatDetails.length}</span>
          </div>

          <div className="border-t border-white/10 pt-3">
            <div className="mb-2 font-semibold text-white">Chi tiết vé</div>
            <div className="space-y-2">
              {seatDetails.map((seat) => (
                <div key={seat.code} className="flex items-center justify-between text-sm">
                  <span className="text-slate-300">
                    {seat.code} <span className="text-slate-500">({seat.type})</span>
                  </span>
                  <span className="text-white">{seat.price.toLocaleString('vi-VN')} đ</span>
                </div>
              ))}
            </div>
            <div className="mt-2 flex justify-between text-sm">
              <span className="text-slate-400">Tiền vé</span>
              <span className="text-white">{seatSubtotal.toLocaleString('vi-VN')} đ</span>
            </div>
          </div>

          {selectedCombos.length > 0 ? (
            <div className="border-t border-white/10 pt-3">
              <div className="mb-2 font-semibold text-white">Combo đã chọn</div>
              <div className="space-y-2">
                {selectedCombos.map((c) => (
                  <div key={c.id} className="flex items-center justify-between text-sm">
                    <span className="text-slate-300">
                      {c.name} × {c.quantity}
                    </span>
                    <span className="text-white">
                      {(Number(c.price) * c.quantity).toLocaleString('vi-VN')} đ
                    </span>
                  </div>
                ))}
              </div>
              <div className="mt-2 flex justify-between text-sm">
                <span className="text-slate-400">Tiền combo</span>
                <span className="text-white">{comboTotal.toLocaleString('vi-VN')} đ</span>
              </div>
            </div>
          ) : combos.length > 0 ? (
            <p className="border-t border-white/10 pt-3 text-xs text-slate-500">
              Chưa chọn combo — có thể thêm phía trên.
            </p>
          ) : null}

          <div className="flex items-center justify-between border-t border-white/10 pt-4 text-base font-semibold">
            <span className="text-white">Tổng cộng</span>
            <span className="text-xl text-sky-300">
              {grandTotal.toLocaleString('vi-VN')} đ
            </span>
          </div>
        </div>

        {seatDetails.length > 0 ? (
          <Link
            href={`/thanh-toan?${params.toString()}`}
            className="mt-6 inline-flex w-full items-center justify-center rounded-2xl bg-white px-4 py-3 font-semibold text-slate-950 transition hover:bg-slate-100"
          >
            Sang thanh toán · {grandTotal.toLocaleString('vi-VN')} đ
          </Link>
        ) : null}
      </aside>
    </div>
  );
}
