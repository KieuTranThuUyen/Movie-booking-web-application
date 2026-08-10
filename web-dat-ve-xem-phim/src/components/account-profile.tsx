'use client';

import { useState } from 'react';

type AccountProfileProps = {
  name: string;
  email: string;
  phone: string;
  role: string;
};

export function AccountProfile({
  name,
  email,
  phone,
  role,
}: AccountProfileProps) {
  const [editing, setEditing] = useState(false);

  const [form, setForm] = useState({
    name,
    phone,
  });

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [success, setSuccess] = useState(false);

  const handleEdit = () => {
    setForm({
      name,
      phone,
    });

    setMessage('');
    setSuccess(false);
    setEditing(true);
  };

  const handleCancel = () => {
    setForm({
      name,
      phone,
    });

    setMessage('');
    setSuccess(false);
    setEditing(false);
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    setLoading(true);
    setMessage('');
    setSuccess(false);

    try {
      const response = await fetch('/api/account', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: form.name,
          phone: form.phone,
        }),
      });

      const data = (await response.json()) as {
        message?: string;
        user?: {
          name: string | null;
          phone: string | null;
        };
      };

      if (!response.ok) {
        setMessage(data.message ?? 'Có lỗi xảy ra.');
        return;
      }

      setMessage(data.message ?? 'Cập nhật thành công.');
      setSuccess(true);
      setEditing(false);

      /*
       * Reload để session + dữ liệu trên server
       * được cập nhật lại.
       */
      window.location.reload();
    } catch {
      setMessage('Không thể kết nối đến máy chủ.');
    } finally {
      setLoading(false);
    }
  };

  if (editing) {
    return (
      <section className="rounded-[28px] border border-white/10 bg-slate-950/70 p-6 shadow-glow backdrop-blur-xl">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-lg font-semibold text-white">
              Chỉnh sửa hồ sơ
            </div>

            <p className="mt-1 text-sm text-slate-400">
              Cập nhật thông tin cá nhân của bạn.
            </p>
          </div>

          <button
            type="button"
            onClick={handleCancel}
            className="rounded-xl border border-white/10 px-3 py-2 text-sm text-slate-300 transition hover:bg-white/10 hover:text-white"
          >
            Hủy
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          {/* Họ tên */}
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-300">
              Họ và tên
            </label>

            <input
              type="text"
              value={form.name}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  name: event.target.value,
                }))
              }
              placeholder="Nhập họ và tên"
              className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none transition placeholder:text-slate-500 focus:border-sky-400"
              required
            />
          </div>

          {/* Email */}
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-300">
              Email
            </label>

            <input
              type="email"
              value={email}
              disabled
              className="w-full cursor-not-allowed rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-slate-500 outline-none"
            />

            <p className="mt-1 text-xs text-slate-500">
              Email dùng để đăng nhập nên không thể thay đổi.
            </p>
          </div>

          {/* Số điện thoại */}
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-300">
              Số điện thoại
            </label>

            <input
              type="tel"
              value={form.phone}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  phone: event.target.value,
                }))
              }
              placeholder="Nhập số điện thoại"
              className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none transition placeholder:text-slate-500 focus:border-sky-400"
            />
          </div>

          {/* Vai trò */}
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-300">
              Vai trò
            </label>

            <input
              type="text"
              value={role}
              disabled
              className="w-full cursor-not-allowed rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-slate-500 outline-none"
            />

            <p className="mt-1 text-xs text-slate-500">
              Vai trò do hệ thống quản lý.
            </p>
          </div>

          {/* Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-2xl bg-white px-4 py-3 font-semibold text-slate-950 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? 'Đang lưu...' : 'Lưu thay đổi'}
          </button>

          {message ? (
            <p
              className={`rounded-2xl border px-4 py-3 text-sm ${
                success
                  ? 'border-emerald-400/20 bg-emerald-500/10 text-emerald-300'
                  : 'border-rose-400/20 bg-rose-500/10 text-rose-300'
              }`}
            >
              {message}
            </p>
          ) : null}
        </form>
      </section>
    );
  }

  return (
    <section className="rounded-[28px] border border-white/10 bg-slate-950/70 p-6 shadow-glow backdrop-blur-xl">
      <div className="flex items-center justify-between gap-3">
        <div className="text-lg font-semibold text-white">
          Hồ sơ
        </div>

        <button
        type="button"
        onClick={handleEdit}
        className="group inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-slate-300 transition-all duration-200 hover:border-sky-400/40 hover:bg-sky-400/10 hover:text-sky-300"
        >
        <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            className="h-4 w-4 transition-transform duration-200 group-hover:-rotate-6 group-hover:scale-110"
        >
            <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M16.862 3.487a2.1 2.1 0 0 1 2.97 2.97L8.25 18.04 4 19l.96-4.25L16.862 3.487Z"
            />
            <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="m15 5.35 3.65 3.65"
            />
        </svg>

        <span>Chỉnh sửa</span>
        </button>
      </div>

      <div className="mt-4 space-y-3 text-sm text-slate-200">
        <div className="flex items-center justify-between gap-4 border-b border-white/5 pb-3">
          <span className="text-slate-400">Họ và tên</span>

          <span className="text-right font-medium text-white">
            {name || 'Chưa cập nhật'}
          </span>
        </div>

        <div className="flex items-center justify-between gap-4 border-b border-white/5 pb-3">
          <span className="text-slate-400">Email</span>

          <span className="text-right font-medium text-white">
            {email || 'Chưa cập nhật'}
          </span>
        </div>

        <div className="flex items-center justify-between gap-4 border-b border-white/5 pb-3">
          <span className="text-slate-400">Số điện thoại</span>

          <span className="text-right font-medium text-white">
            {phone || 'Chưa cập nhật'}
          </span>
        </div>

        <div className="flex items-center justify-between gap-4">
          <span className="text-slate-400">Vai trò</span>

          <span className="rounded-full bg-sky-500/10 px-3 py-1 text-xs font-semibold uppercase text-sky-300">
            {role}
          </span>
        </div>
      </div>
    </section>
  );
}