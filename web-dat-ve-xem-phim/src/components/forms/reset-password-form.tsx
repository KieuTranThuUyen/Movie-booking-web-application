'use client';

import type { FormEvent } from 'react';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

type Props = {
  token: string;
};

export function ResetPasswordForm({ token }: Props) {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password, confirmPassword }),
      });
      const data = (await response.json()) as {
        message?: string;
        redirectTo?: string;
        field?: string;
      };
      setMessage(data.message ?? (response.ok ? 'Thành công.' : 'Có lỗi xảy ra.'));

      if (response.ok && data.redirectTo) {
        setTimeout(() => router.push(data.redirectTo!), 1500);
      }
    } catch {
      setMessage('Không thể kết nối máy chủ.');
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="rounded-[28px] border border-white/10 bg-slate-950/70 p-6 text-slate-200">
        <p>Thiếu token đặt lại mật khẩu. Vui lòng dùng liên kết trong email.</p>
        <Link href="/quen-mat-khau" className="mt-4 inline-block text-sky-300 hover:underline">
          Yêu cầu liên kết mới
        </Link>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4 rounded-[28px] border border-white/10 bg-slate-950/70 p-6 shadow-glow backdrop-blur-xl"
    >
      <div>
        <h2 className="text-2xl font-semibold text-white">Đặt lại mật khẩu</h2>
        <p className="mt-2 text-sm text-slate-300">
          Mật khẩu mới cần ít nhất 8 ký tự, gồm chữ hoa, chữ thường và số.
        </p>
      </div>

      <label className="block space-y-2 text-sm text-slate-200">
        <span>Mật khẩu mới</span>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none transition focus:border-sky-400/60"
          required
          minLength={8}
        />
      </label>

      <label className="block space-y-2 text-sm text-slate-200">
        <span>Xác nhận mật khẩu</span>
        <input
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none transition focus:border-sky-400/60"
          required
          minLength={8}
        />
      </label>

      {message ? (
        <p className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-200">
          {message}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={loading}
        className="inline-flex w-full items-center justify-center rounded-2xl bg-white px-4 py-3 font-semibold text-slate-950 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading ? 'Đang lưu...' : 'Đặt mật khẩu mới'}
      </button>
    </form>
  );
}
