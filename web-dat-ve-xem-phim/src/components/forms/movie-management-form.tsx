'use client';

import type { FormEvent } from 'react';
import { useMemo, useState } from 'react';

type MovieItem = {
  id: string;
  title: string;
  slug: string;
  genre: string;
  duration: number;
  ageRating: string;
  synopsis: string;
  posterUrl: string;
  trailerUrl: string | null;
  releaseDate: string | Date;
  isNowShowing: boolean;
  isComingSoon: boolean;
};

type MovieManagementFormProps = {
  movies: MovieItem[];
};

const emptyForm = {
  title: '',
  slug: '',
  genre: '',
  duration: 120,
  ageRating: 'T13',
  synopsis: '',
  posterUrl: '',
  trailerUrl: '',
  releaseDate: '',
  isNowShowing: true,
  isComingSoon: false
};

export function MovieManagementForm({ movies }: MovieManagementFormProps) {
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [editingMovieId, setEditingMovieId] = useState(movies[0]?.id ?? '');
  const [form, setForm] = useState(() => {
    const selectedMovie = movies[0];

    if (!selectedMovie) {
      return emptyForm;
    }

    return {
      title: selectedMovie.title,
      slug: selectedMovie.slug,
      genre: selectedMovie.genre,
      duration: selectedMovie.duration,
      ageRating: selectedMovie.ageRating,
      synopsis: selectedMovie.synopsis,
      posterUrl: selectedMovie.posterUrl,
      trailerUrl: selectedMovie.trailerUrl ?? '',
      releaseDate: String(selectedMovie.releaseDate).slice(0, 10),
      isNowShowing: selectedMovie.isNowShowing,
      isComingSoon: selectedMovie.isComingSoon
    };
  });

  const selectedMovie = useMemo(() => movies.find((movie) => movie.id === editingMovieId), [editingMovieId, movies]);

  const syncSelectedMovie = (movieId: string) => {
    setEditingMovieId(movieId);
    const movie = movies.find((item) => item.id === movieId);

    if (!movie) {
      setForm(emptyForm);
      return;
    }

    setForm({
      title: movie.title,
      slug: movie.slug,
      genre: movie.genre,
      duration: movie.duration,
      ageRating: movie.ageRating,
      synopsis: movie.synopsis,
      posterUrl: movie.posterUrl,
      trailerUrl: movie.trailerUrl ?? '',
      releaseDate: String(movie.releaseDate).slice(0, 10),
      isNowShowing: movie.isNowShowing,
      isComingSoon: movie.isComingSoon
    });
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setMessage('');

    const response = await fetch(editingMovieId ? `/api/admin/movies/${editingMovieId}` : '/api/admin/movies', {
      method: editingMovieId ? 'PATCH' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form)
    });

    const data = (await response.json()) as { message: string; movie?: MovieItem };
    setLoading(false);
    setMessage(data.message);

    if (response.ok && data.movie) {
      setEditingMovieId(data.movie.id);
      setForm({
        title: data.movie.title,
        slug: data.movie.slug,
        genre: data.movie.genre,
        duration: data.movie.duration,
        ageRating: data.movie.ageRating,
        synopsis: data.movie.synopsis,
        posterUrl: data.movie.posterUrl,
        trailerUrl: data.movie.trailerUrl ?? '',
        releaseDate: String(data.movie.releaseDate).slice(0, 10),
        isNowShowing: data.movie.isNowShowing,
        isComingSoon: data.movie.isComingSoon
      });
    }
  };

  const handleDelete = async () => {
    if (!editingMovieId) {
      return;
    }

    setLoading(true);
    setMessage('');

    const response = await fetch(`/api/admin/movies/${editingMovieId}`, { method: 'DELETE' });
    const data = (await response.json()) as { message: string };
    setLoading(false);
    setMessage(data.message);

    if (response.ok) {
      const nextMovie = movies.find((movie) => movie.id !== editingMovieId);
      syncSelectedMovie(nextMovie?.id ?? '');
    }
  };

  return (
    <div className="grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
      <div className="rounded-[28px] border border-white/10 bg-white/5 p-4">
        <div className="text-sm font-semibold text-white">Danh sách phim hiện có</div>
        <div className="mt-4 max-h-[480px] space-y-2 overflow-auto pr-1">
          {movies.map((movie) => (
            <button
              key={movie.id}
              type="button"
              onClick={() => syncSelectedMovie(movie.id)}
              className={`block w-full rounded-2xl border px-4 py-3 text-left text-sm transition ${
                movie.id === editingMovieId ? 'border-sky-400/60 bg-sky-500/15 text-white' : 'border-white/10 bg-slate-950/60 text-slate-300 hover:border-white/20'
              }`}
            >
              <div className="font-semibold text-white">{movie.title}</div>
              <div className="mt-1 text-slate-400">{movie.slug}</div>
            </button>
          ))}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 rounded-[28px] border border-white/10 bg-slate-950/70 p-6 shadow-glow backdrop-blur-xl">
        <div>
          <h3 className="text-xl font-semibold text-white">Quản lý phim</h3>
          <p className="mt-2 text-sm text-slate-300">Tạo, chỉnh sửa và xóa phim đang lưu trong cơ sở dữ liệu.</p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <input value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} placeholder="Tên phim" className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none" required />
          <input value={form.slug} onChange={(event) => setForm((current) => ({ ...current, slug: event.target.value }))} placeholder="Slug" className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none" required />
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <input value={form.genre} onChange={(event) => setForm((current) => ({ ...current, genre: event.target.value }))} placeholder="Thể loại" className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none" required />
          <input type="number" min={1} value={form.duration} onChange={(event) => setForm((current) => ({ ...current, duration: Number(event.target.value) }))} placeholder="Thời lượng" className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none" required />
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <input value={form.ageRating} onChange={(event) => setForm((current) => ({ ...current, ageRating: event.target.value }))} placeholder="Độ tuổi" className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none" required />
          <input type="date" value={form.releaseDate} onChange={(event) => setForm((current) => ({ ...current, releaseDate: event.target.value }))} className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none" required />
        </div>

        <input value={form.posterUrl} onChange={(event) => setForm((current) => ({ ...current, posterUrl: event.target.value }))} placeholder="Poster URL" className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none" required />
        <input value={form.trailerUrl} onChange={(event) => setForm((current) => ({ ...current, trailerUrl: event.target.value }))} placeholder="Trailer URL" className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none" />

        <textarea value={form.synopsis} onChange={(event) => setForm((current) => ({ ...current, synopsis: event.target.value }))} rows={5} placeholder="Mô tả phim" className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none" required />

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-200">
            <input type="checkbox" checked={form.isNowShowing} onChange={(event) => setForm((current) => ({ ...current, isNowShowing: event.target.checked }))} />
            Đang chiếu
          </label>
          <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-200">
            <input type="checkbox" checked={form.isComingSoon} onChange={(event) => setForm((current) => ({ ...current, isComingSoon: event.target.checked }))} />
            Sắp chiếu
          </label>
        </div>

        <div className="flex flex-wrap gap-3">
          <button type="submit" disabled={loading} className="rounded-2xl bg-white px-4 py-3 font-semibold text-slate-950 disabled:opacity-60">
            {loading ? 'Đang lưu...' : editingMovieId ? 'Cập nhật phim' : 'Tạo phim'}
          </button>
          <button type="button" onClick={handleDelete} disabled={loading || !editingMovieId} className="rounded-2xl border border-rose-400/40 px-4 py-3 font-semibold text-rose-200 disabled:opacity-50">
            Xóa phim
          </button>
        </div>

        {message ? <p className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-200">{message}</p> : null}
        {selectedMovie ? <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Đang chọn: {selectedMovie.title}</p> : null}
      </form>
    </div>
  );
}