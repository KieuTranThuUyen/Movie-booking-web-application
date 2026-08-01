'use client';

import type { ChangeEvent, FormEvent } from 'react';
import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';

export function LoginForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [form, setForm] = useState({ identifier: '', password: '' });

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

    const result = await signIn('credentials', {
      redirect: false,
      identifier: form.identifier,
      password: form.password,
      callbackUrl: '/tai-khoan'
    });

    setLoading(false);

    if (result?.error) {
      setMessage('Email/số điện thoại hoặc mật khẩu không đúng.');
      return;
    }

    if (result?.url) {
      router.push(result.url);
      return;
    }

    router.push('/tai-khoan');
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-[28px] border border-white/10 bg-slate-950/70 p-6 shadow-glow backdrop-blur-xl">
      <div>
        <h2 className="text-2xl font-semibold text-white">Đăng nhập</h2>
        <p className="mt-2 text-sm text-slate-300">Đăng nhập bằng email hoặc số điện thoại để truy cập tài khoản đặt vé.</p>
      </div>

      <label className="block space-y-2 text-sm text-slate-200">
        <span>Email hoặc số điện thoại</span>
        <input
          name="identifier"
          value={form.identifier}
          onChange={handleChange}
          placeholder="Nhập email hoặc số điện thoại"
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

      {message ? <p className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-200">{message}</p> : null}

      <button
        type="submit"
        disabled={loading}
        className="inline-flex w-full items-center justify-center rounded-2xl bg-white px-4 py-3 font-semibold text-slate-950 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading ? 'Đang xử lý...' : 'Đăng nhập'}
      </button>
    </form>
  );
}