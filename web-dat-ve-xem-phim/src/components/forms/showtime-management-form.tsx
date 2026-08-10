'use client';

import type { FormEvent } from 'react';
import { useState } from 'react';

type MovieOption = {
  id: string;
  slug: string;
  title: string;
};

type HallOption = {
  id: string;
  name: string;
  cinema: {
    name: string;
  };
};

type ShowtimeManagementFormProps = {
  movies: MovieOption[];
  halls: HallOption[];
};

export function ShowtimeManagementForm({
  movies,
  halls,
}: ShowtimeManagementFormProps) {
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    movieSlug: movies[0]?.slug ?? '',
    hallId: halls[0]?.id ?? '',
    startTime: '',
    endTime: '',
    basePrice: 85000,
    language: 'VietSub',
    format: '2D',
  });

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!form.movieSlug) {
      setMessage('Vui lòng chọn phim.');
      return;
    }

    if (!form.hallId) {
      setMessage('Vui lòng chọn phòng chiếu.');
      return;
    }

    if (!form.startTime || !form.endTime) {
      setMessage('Vui lòng nhập thời gian bắt đầu và kết thúc.');
      return;
    }

    if (new Date(form.endTime) <= new Date(form.startTime)) {
      setMessage('Thời gian kết thúc phải sau thời gian bắt đầu.');
      return;
    }

    if (form.basePrice <= 0) {
      setMessage('Giá vé phải lớn hơn 0.');
      return;
    }

    setLoading(true);
    setMessage('');

    try {
      const response = await fetch('/api/admin/showtimes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(form),
      });

      const data = (await response.json()) as {
        message?: string;
      };

      if (!response.ok) {
        setMessage(data.message ?? 'Không thể tạo suất chiếu.');
        return;
      }

      setMessage(data.message ?? 'Tạo suất chiếu thành công.');

      setForm((current) => ({
        ...current,
        startTime: '',
        endTime: '',
      }));
    } catch {
      setMessage('Có lỗi xảy ra khi kết nối đến máy chủ.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-[28px] border border-white/10 bg-slate-950/70 p-6 shadow-glow backdrop-blur-xl"
    >
      <h3 className="text-2xl font-semibold text-white">
        Thêm suất chiếu
      </h3>

      <p className="mt-2 text-sm leading-7 text-slate-300">
        Chọn phim, phòng chiếu, thời gian và giá vé để tạo suất chiếu thật.
      </p>

      <div className="mt-6 space-y-4">
        {/* PHIM */}
        <label className="block">
          <span className="mb-2 block text-sm font-medium text-slate-300">
            Phim
          </span>

          <select
            value={form.movieSlug}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                movieSlug: event.target.value,
              }))
            }
            className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none transition focus:border-sky-400"
            required
          >
            {movies.length === 0 ? (
              <option value="">Chưa có phim</option>
            ) : (
              movies.map((movie) => (
                <option
                  key={movie.slug}
                  value={movie.slug}
                  className="bg-slate-950"
                >
                  {movie.title}
                </option>
              ))
            )}
          </select>
        </label>

        {/* PHÒNG CHIẾU */}
        <label className="block">
          <span className="mb-2 block text-sm font-medium text-slate-300">
            Phòng chiếu
          </span>

          <select
            value={form.hallId}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                hallId: event.target.value,
              }))
            }
            className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none transition focus:border-sky-400"
            required
          >
            {halls.length === 0 ? (
              <option value="">Chưa có phòng chiếu</option>
            ) : (
              halls.map((hall) => (
                <option
                  key={hall.id}
                  value={hall.id}
                  className="bg-slate-950"
                >
                  {hall.cinema.name} - {hall.name}
                </option>
              ))
            )}
          </select>
        </label>

        {/* THỜI GIAN */}
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-slate-300">
              Thời gian bắt đầu
            </span>

            <input
              type="datetime-local"
              value={form.startTime}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  startTime: event.target.value,
                }))
              }
              className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none transition focus:border-sky-400"
              required
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-medium text-slate-300">
              Thời gian kết thúc
            </span>

            <input
              type="datetime-local"
              value={form.endTime}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  endTime: event.target.value,
                }))
              }
              className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none transition focus:border-sky-400"
              required
            />
          </label>
        </div>

        {/* GIÁ - NGÔN NGỮ - ĐỊNH DẠNG */}
        <div className="grid gap-4 sm:grid-cols-3">
          {/* GIÁ */}
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-slate-300">
              Giá vé
            </span>

            <input
              type="number"
              min={1}
              step={1000}
              value={form.basePrice}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  basePrice: Number(event.target.value),
                }))
              }
              className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none transition focus:border-sky-400"
              required
            />
          </label>

          {/* NGÔN NGỮ */}
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-slate-300">
              Ngôn ngữ
            </span>

            <select
              value={form.language}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  language: event.target.value,
                }))
              }
              className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none transition focus:border-sky-400"
              required
            >
              <option value="VietSub" className="bg-slate-950">
                VietSub
              </option>

              <option value="VietDub" className="bg-slate-950">
                VietDub
              </option>

              <option value="EngSub" className="bg-slate-950">
                EngSub
              </option>
            </select>
          </label>

          {/* ĐỊNH DẠNG */}
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-slate-300">
              Định dạng
            </span>

            <select
              value={form.format}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  format: event.target.value,
                }))
              }
              className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none transition focus:border-sky-400"
              required
            >
              <option value="2D" className="bg-slate-950">
                2D
              </option>

              <option value="3D" className="bg-slate-950">
                3D
              </option>

              <option value="IMAX" className="bg-slate-950">
                IMAX
              </option>
            </select>
          </label>
        </div>

        {/* BUTTON */}
        <button
          type="submit"
          disabled={loading || movies.length === 0 || halls.length === 0}
          className="rounded-2xl bg-white px-5 py-3 font-semibold text-slate-950 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? 'Đang lưu...' : 'Lưu suất chiếu'}
        </button>

        {/* MESSAGE */}
        {message ? (
          <p className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-200">
            {message}
          </p>
        ) : null}
      </div>
    </form>
  );
}