'use client';

import type { FormEvent } from 'react';
import { useState } from 'react';

export function ChangePasswordForm() {
  const [form, setForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setMessage('');
    setSuccess(false);

    try {
      const response = await fetch('/api/account/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = (await response.json()) as { message?: string };
      setMessage(data.message ?? (response.ok ? 'Thành công.' : 'Có lỗi.'));
      if (response.ok) {
        setSuccess(true);
        setForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      }
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
        <h3 className="text-lg font-semibold text-white">Đổi mật khẩu</h3>
        <p className="mt-1 text-sm text-slate-400">
          Mật khẩu mới: tối thiểu 8 ký tự, có chữ hoa, chữ thường và số.
        </p>
      </div>

      {(
        [
          ['currentPassword', 'Mật khẩu hiện tại'],
          ['newPassword', 'Mật khẩu mới'],
          ['confirmPassword', 'Xác nhận mật khẩu mới'],
        ] as const
      ).map(([name, label]) => (
        <label key={name} className="block space-y-2 text-sm text-slate-200">
          <span>{label}</span>
          <input
            type="password"
            name={name}
            value={form[name]}
            onChange={(e) => setForm((c) => ({ ...c, [name]: e.target.value }))}
            className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none transition focus:border-sky-400/60"
            required
            minLength={8}
          />
        </label>
      ))}

      {message ? (
        <p
          className={`rounded-2xl border px-4 py-3 text-sm ${
            success
              ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200'
              : 'border-white/10 bg-white/5 text-slate-200'
          }`}
        >
          {message}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={loading}
        className="inline-flex w-full items-center justify-center rounded-2xl bg-white px-4 py-3 font-semibold text-slate-950 transition hover:bg-slate-100 disabled:opacity-60"
      >
        {loading ? 'Đang lưu...' : 'Đổi mật khẩu'}
      </button>
    </form>
  );
}
