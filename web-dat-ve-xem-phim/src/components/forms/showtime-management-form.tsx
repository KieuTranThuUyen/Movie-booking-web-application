'use client';

import type { FormEvent } from 'react';
import { useState } from 'react';

type MovieOption = {
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

export function ShowtimeManagementForm({ movies, halls }: ShowtimeManagementFormProps) {
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    movieSlug: movies[0]?.slug ?? '',
    hallId: halls[0]?.id ?? '',
    startTime: '',
    endTime: '',
    basePrice: 85000,
    language: 'VietSub',
    format: '2D'
  });

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setMessage('');

    const response = await fetch('/api/admin/showtimes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form)
    });

    const data = (await response.json()) as { message: string };
    setLoading(false);
    setMessage(data.message);

    if (response.ok) {
      setForm((current) => ({ ...current, startTime: '', endTime: '' }));
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-[28px] border border-white/10 bg-slate-950/70 p-6 shadow-glow backdrop-blur-xl">
      <div>
        <h3 className="text-xl font-semibold text-white">Thêm suất chiếu</h3>
        <p className="mt-2 text-sm text-slate-300">Chọn phim, phòng chiếu, thời gian và giá vé để tạo suất chiếu thật.</p>
      </div>

      <select value={form.movieSlug} onChange={(event) => setForm((current) => ({ ...current, movieSlug: event.target.value }))} className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none">
        {movies.map((movie) => (
          <option key={movie.slug} value={movie.slug} className="bg-slate-950">
            {movie.title}
          </option>
        ))}
      </select>

      <select value={form.hallId} onChange={(event) => setForm((current) => ({ ...current, hallId: event.target.value }))} className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none">
        {halls.map((hall) => (
          <option key={hall.id} value={hall.id} className="bg-slate-950">
            {hall.cinema.name} - {hall.name}
          </option>
        ))}
      </select>

      <div className="grid gap-3 sm:grid-cols-2">
        <input type="datetime-local" value={form.startTime} onChange={(event) => setForm((current) => ({ ...current, startTime: event.target.value }))} className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none" required />
        <input type="datetime-local" value={form.endTime} onChange={(event) => setForm((current) => ({ ...current, endTime: event.target.value }))} className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none" required />
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <input type="number" min={1} value={form.basePrice} onChange={(event) => setForm((current) => ({ ...current, basePrice: Number(event.target.value) }))} className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none" required />
        <input value={form.language} onChange={(event) => setForm((current) => ({ ...current, language: event.target.value }))} className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none" required />
        <input value={form.format} onChange={(event) => setForm((current) => ({ ...current, format: event.target.value }))} className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none" required />
      </div>

      <button type="submit" disabled={loading} className="rounded-2xl bg-white px-4 py-3 font-semibold text-slate-950 disabled:opacity-60">
        {loading ? 'Đang lưu...' : 'Lưu suất chiếu'}
      </button>

      {message ? <p className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-200">{message}</p> : null}
    </form>
  );
}
