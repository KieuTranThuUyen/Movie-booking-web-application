'use client';

import Link from 'next/link';
import { useState } from 'react';

type Combo = { id: string; name: string; price: number; stock: number };

type Props = { combos: Combo[]; showtimeId: string; seats: string[] };

export function CartCombos({ combos, showtimeId, seats }: Props) {
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const selected = Object.entries(quantities).filter(([, quantity]) => quantity > 0);
  const params = new URLSearchParams({
    showtime: showtimeId,
    seats: seats.join(','),
  });
  if (selected.length) params.set('combos', selected.map(([id, quantity]) => `${id}:${quantity}`).join(','));

  if (!combos.length) return null;

  return (
    <section className="mt-6 rounded-3xl border border-white/10 bg-white/5 p-5">
      <h2 className="font-semibold text-white">Combo bắp nước</h2>
      <p className="mt-1 text-sm text-slate-400">Chọn combo để nhận QR riêng cùng đơn vé.</p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {combos.map((combo) => (
          <label key={combo.id} className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-slate-950/50 p-3 text-sm text-slate-200">
            <span>{combo.name}<br /><b className="text-sky-300">{combo.price.toLocaleString('vi-VN')} đ</b></span>
            <input type="number" min={0} max={combo.stock} value={quantities[combo.id] ?? 0} onChange={(event) => setQuantities({ ...quantities, [combo.id]: Math.min(combo.stock, Math.max(0, Number(event.target.value))) })} className="w-16 rounded-lg bg-slate-900 px-2 py-1 text-white" />
          </label>
        ))}
      </div>
      <Link href={`/thanh-toan?${params.toString()}`} className="mt-5 inline-flex w-full items-center justify-center rounded-2xl bg-white px-4 py-3 font-semibold text-slate-950">Sang thanh toán</Link>
    </section>
  );
}
