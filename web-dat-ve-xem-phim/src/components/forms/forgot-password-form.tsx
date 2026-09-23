'use client';

import type { FormEvent } from 'react';
import { useState } from 'react';
import Link from 'next/link';

export function ForgotPasswordForm() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [done, setDone] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = (await response.json()) as { message?: string };
      setMessage(data.message ?? 'Đã xử lý yêu cầu.');
      if (response.ok) setDone(true);
    } catch {
      setMessage('Không thể kết nối máy chủ.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4 rounded-[28px] border border-white/10 bg-slate-950/70 p-6 shadow-glow backdrop-blur-xl"
    >
      <div>
        <h2 className="text-2xl font-semibold text-white">Quên mật khẩu</h2>
        <p className="mt-2 text-sm text-slate-300">
          Nhập email đã đăng ký. Nếu tài khoản tồn tại, chúng tôi sẽ gửi liên kết đặt lại mật khẩu.
        </p>
      </div>

      <label className="block space-y-2 text-sm text-slate-200">
        <span>Email</span>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="email@example.com"
          className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none transition placeholder:text-slate-500 focus:border-sky-400/60"
          required
          disabled={done}
        />
      </label>

      {message ? (
        <p className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-200">
          {message}
        </p>
      ) : null}

      {!done ? (
        <button
          type="submit"
          disabled={loading}
          className="inline-flex w-full items-center justify-center rounded-2xl bg-white px-4 py-3 font-semibold text-slate-950 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? 'Đang gửi...' : 'Gửi liên kết đặt lại'}
        </button>
      ) : null}

      <p className="text-center text-sm text-slate-400">
        <Link href="/dang-nhap" className="text-sky-300 hover:underline">
          Quay lại đăng nhập
        </Link>
      </p>
    </form>
  );
}
