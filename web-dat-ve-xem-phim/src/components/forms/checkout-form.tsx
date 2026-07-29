'use client';

import type { ChangeEvent, FormEvent } from 'react';
import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

type CheckoutFormProps = {
  subtotal: number;
  bookingFee?: number;
};

export function CheckoutForm({ subtotal, bookingFee = 0 }: CheckoutFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('COD');
  const [form, setForm] = useState({
    fullName: '',
    phone: '',
    email: '',
    address: '',
    city: '',
    district: '',
    note: ''
  });

  const total = useMemo(() => subtotal + bookingFee, [subtotal, bookingFee]);

  const handleChange = (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = event.target;
    setForm((current) => ({
      ...current,
      [name]: value
    }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setMessage('');

    const response = await fetch('/api/bookings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, paymentMethod, subtotal, bookingFee, total })
    });

    const data = (await response.json()) as { message: string; redirectTo?: string };
    setLoading(false);
    setMessage(data.message);

    if (response.ok && data.redirectTo) {
      router.push(data.redirectTo);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-[28px] border border-white/10 bg-slate-950/70 p-6 shadow-glow backdrop-blur-xl">
      <div>
        <h2 className="text-2xl font-semibold text-white">Thông tin thanh toán</h2>
        <p className="mt-2 text-sm text-slate-300">Form giữ nguyên cấu trúc từ project cũ, chỉ đổi thành ngữ cảnh đặt vé phim.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <label className="block space-y-2 text-sm text-slate-200">
          <span>Họ và tên</span>
          <input name="fullName" value={form.fullName} onChange={handleChange} className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none placeholder:text-slate-500" required />
        </label>
        <label className="block space-y-2 text-sm text-slate-200">
          <span>Số điện thoại</span>
          <input name="phone" value={form.phone} onChange={handleChange} className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none placeholder:text-slate-500" required />
        </label>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <label className="block space-y-2 text-sm text-slate-200">
          <span>Email</span>
          <input type="email" name="email" value={form.email} onChange={handleChange} className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none placeholder:text-slate-500" required />
        </label>
        <label className="block space-y-2 text-sm text-slate-200">
          <span>Thành phố</span>
          <input name="city" value={form.city} onChange={handleChange} className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none placeholder:text-slate-500" required />
        </label>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <label className="block space-y-2 text-sm text-slate-200">
          <span>Quận/Huyện</span>
          <input name="district" value={form.district} onChange={handleChange} className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none placeholder:text-slate-500" required />
        </label>
        <label className="block space-y-2 text-sm text-slate-200">
          <span>Địa chỉ</span>
          <input name="address" value={form.address} onChange={handleChange} className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none placeholder:text-slate-500" required />
        </label>
      </div>

      <label className="block space-y-2 text-sm text-slate-200">
        <span>Ghi chú</span>
        <textarea name="note" value={form.note} onChange={handleChange} rows={4} className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none placeholder:text-slate-500" placeholder="Ví dụ: cần ghế giữa, nhận vé qua email..." />
      </label>

      <div className="space-y-3 rounded-3xl border border-white/10 bg-white/5 p-4">
        <div className="text-sm font-medium text-white">Phương thức thanh toán</div>
        <label className="flex items-center gap-3 text-sm text-slate-200">
          <input type="radio" name="paymentMethod" value="COD" checked={paymentMethod === 'COD'} onChange={(event) => setPaymentMethod(event.target.value)} />
          Thanh toán tại quầy / COD
        </label>
        <label className="flex items-center gap-3 text-sm text-slate-200">
          <input type="radio" name="paymentMethod" value="BANK" checked={paymentMethod === 'BANK'} onChange={(event) => setPaymentMethod(event.target.value)} />
          Chuyển khoản / ví điện tử
        </label>
      </div>

      <div className="rounded-3xl border border-white/10 bg-slate-900/70 p-4 text-sm text-slate-200">
        <div className="flex items-center justify-between">
          <span>Tạm tính</span>
          <span>{subtotal.toLocaleString('vi-VN')} đ</span>
        </div>
        <div className="mt-2 flex items-center justify-between">
          <span>Phí dịch vụ</span>
          <span>{bookingFee.toLocaleString('vi-VN')} đ</span>
        </div>
        <div className="mt-3 flex items-center justify-between border-t border-white/10 pt-3 text-base font-semibold text-white">
          <span>Tổng cộng</span>
          <span>{total.toLocaleString('vi-VN')} đ</span>
        </div>
      </div>

      {message ? <p className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-200">{message}</p> : null}

      <button type="submit" disabled={loading} className="inline-flex w-full items-center justify-center rounded-2xl bg-white px-4 py-3 font-semibold text-slate-950 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60">
        {loading ? 'Đang tạo đơn...' : 'Xác nhận đặt vé'}
      </button>
    </form>
  );
}