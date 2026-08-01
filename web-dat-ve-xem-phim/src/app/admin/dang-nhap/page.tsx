'use client';

import { useState } from 'react';
import { signIn, getSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';

export default function AdminLoginPage() {
  const router = useRouter();
  const [form, setForm] = useState({ identifier: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm((c) => ({ ...c, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    const result = await signIn('credentials', { redirect: false, identifier: form.identifier, password: form.password });

    if (result?.error) {
      setLoading(false);
      setMessage('Email/số điện thoại hoặc mật khẩu không đúng.');
      return;
    }

    // wait a moment for session to be available
    const session = await getSession();

    if (!session?.user || (session.user as any).role !== 'ADMIN') {
      // Not admin — sign out and show error
      await signOut({ redirect: false });
      setLoading(false);
      setMessage('Tài khoản này không có quyền quản trị.');
      return;
    }

    // success
    router.push('/admin');
  };

  return (
    <div className="mx-auto max-w-md">
      <form onSubmit={handleSubmit} className="space-y-4 rounded-[28px] border border-white/10 bg-slate-950/70 p-6 shadow-glow backdrop-blur-xl">
        <div>
          <h2 className="text-2xl font-semibold text-white">Đăng nhập Admin</h2>
          <p className="mt-2 text-sm text-slate-300">Đăng nhập với tài khoản quản trị để truy cập bảng điều khiển.</p>
        </div>

        <label className="block space-y-2 text-sm text-slate-200">
          <span>Email hoặc số điện thoại</span>
          <input name="identifier" value={form.identifier} onChange={handleChange} placeholder="Nhập email hoặc số điện thoại" className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none" required />
        </label>

        <label className="block space-y-2 text-sm text-slate-200">
          <span>Mật khẩu</span>
          <input type="password" name="password" value={form.password} onChange={handleChange} placeholder="Nhập mật khẩu" className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none" required />
        </label>

        {message ? <p className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-200">{message}</p> : null}

        <button type="submit" disabled={loading} className="inline-flex w-full items-center justify-center rounded-2xl bg-white px-4 py-3 font-semibold text-slate-950 disabled:opacity-60">
          {loading ? 'Đang xử lý...' : 'Đăng nhập Admin'}
        </button>
      </form>
    </div>
  );
}
