'use client';

import type { ChangeEvent, FormEvent } from 'react';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function RegisterForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: ''
  });

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
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

    const response = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form)
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
        <h2 className="text-2xl font-semibold text-white">Đăng ký tài khoản</h2>
        <p className="mt-2 text-sm text-slate-300">Form này được lấy từ project cũ và đổi nhãn theo hệ thống đặt vé phim.</p>
      </div>

      <label className="block space-y-2 text-sm text-slate-200">
        <span>Họ và tên</span>
        <input
          name="name"
          value={form.name}
          onChange={handleChange}
          placeholder="Nhập họ và tên"
          className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none transition placeholder:text-slate-500 focus:border-sky-400/60"
          required
        />
      </label>

      <label className="block space-y-2 text-sm text-slate-200">
        <span>Email</span>
        <input
          type="email"
          name="email"
          value={form.email}
          onChange={handleChange}
          placeholder="Nhập email"
          className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none transition placeholder:text-slate-500 focus:border-sky-400/60"
          required
        />
      </label>

      <label className="block space-y-2 text-sm text-slate-200">
        <span>Số điện thoại</span>
        <input
          type="tel"
          name="phone"
          value={form.phone}
          onChange={handleChange}
          placeholder="Nhập số điện thoại"
          className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none transition placeholder:text-slate-500 focus:border-sky-400/60"
          required
        />
      </label>

      <label className="block space-y-2 text-sm text-slate-200">
        <span>Mật khẩu</span>
        <input
          type="password"
          name="password"
          value={form.password}
          onChange={handleChange}
          placeholder="Nhập mật khẩu"
          className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none transition placeholder:text-slate-500 focus:border-sky-400/60"
          required
        />
      </label>

      <label className="block space-y-2 text-sm text-slate-200">
        <span>Nhập lại mật khẩu</span>
        <input
          type="password"
          name="confirmPassword"
          value={form.confirmPassword}
          onChange={handleChange}
          placeholder="Xác nhận mật khẩu"
          className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none transition placeholder:text-slate-500 focus:border-sky-400/60"
          required
        />
      </label>

      {message ? <p className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-200">{message}</p> : null}

      <button
        type="submit"
        disabled={loading}
        className="inline-flex w-full items-center justify-center rounded-2xl bg-white px-4 py-3 font-semibold text-slate-950 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading ? 'Đang xử lý...' : 'Tạo tài khoản'}
      </button>
    </form>
  );
}