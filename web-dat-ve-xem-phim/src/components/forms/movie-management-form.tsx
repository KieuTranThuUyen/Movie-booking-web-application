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


/** Chuẩn hóa ngày về YYYY-MM-DD theo giờ Việt Nam (cho input type="date") */
function toDateInputValue(value: string | Date | null | undefined): string {
  if (!value) return '';

  // Đã đúng dạng YYYY-MM-DD
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value.trim())) {
    return value.trim();
  }

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';

  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Ho_Chi_Minh',
  }).format(date);
}

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
  isComingSoon: false,
};

export function MovieManagementForm({
  movies,
}: MovieManagementFormProps) {
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  // QUAN TRỌNG:
  // Không tự động chọn movies[0]
  const [editingMovieId, setEditingMovieId] = useState('');

  // Ban đầu form trống để TẠO PHIM
  const [form, setForm] = useState(emptyForm);

  const selectedMovie = useMemo(
    () =>
      movies.find(
        (movie) => movie.id === editingMovieId,
      ),
    [editingMovieId, movies],
  );

  // =========================
  // CHUYỂN SANG TẠO PHIM MỚI
  // =========================
  const handleCreateNew = () => {
    setEditingMovieId('');
    setForm(emptyForm);
    setMessage('');
  };

  // =========================
  // CHỌN PHIM ĐỂ SỬA
  // =========================
  const syncSelectedMovie = (movieId: string) => {
    const movie = movies.find(
      (item) => item.id === movieId,
    );

    if (!movie) {
      handleCreateNew();
      return;
    }

    setEditingMovieId(movie.id);

    setForm({
      title: movie.title,
      slug: movie.slug,
      genre: movie.genre,
      duration: movie.duration,
      ageRating: movie.ageRating,
      synopsis: movie.synopsis,
      posterUrl: movie.posterUrl,
      trailerUrl: movie.trailerUrl ?? '',
      releaseDate: toDateInputValue(movie.releaseDate),
      isNowShowing: movie.isNowShowing,
      isComingSoon: movie.isComingSoon,
    });

    setMessage('');
  };

  // =========================
  // SUBMIT
  // =========================
  const handleSubmit = async (
    event: FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    setLoading(true);
    setMessage('');

    try {
      const response = await fetch(
        editingMovieId
          ? `/api/admin/movies/${editingMovieId}`
          : '/api/admin/movies',
        {
          method: editingMovieId ? 'PATCH' : 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(form),
        },
      );

      const data = (await response.json()) as {
        message: string;
        movie?: MovieItem;
      };

      if (!response.ok) {
        setMessage(
          data.message || 'Có lỗi xảy ra.',
        );
        return;
      }

      setMessage(data.message);

      // Sau khi tạo/cập nhật thành công
      if (data.movie) {
        setEditingMovieId(data.movie.id);

        setForm({
          title: data.movie.title,
          slug: data.movie.slug,
          genre: data.movie.genre,
          duration: data.movie.duration,
          ageRating: data.movie.ageRating,
          synopsis: data.movie.synopsis,
          posterUrl: data.movie.posterUrl,
          trailerUrl:
            data.movie.trailerUrl ?? '',
          releaseDate: toDateInputValue(data.movie.releaseDate) || form.releaseDate,
          isNowShowing:
            data.movie.isNowShowing,
          isComingSoon:
            data.movie.isComingSoon,
        });
      }
    } catch {
      setMessage(
        'Không thể kết nối đến máy chủ.',
      );
    } finally {
      setLoading(false);
    }
  };

  // =========================
  // DELETE
  // =========================
  const handleDelete = async () => {
    if (!editingMovieId) {
      return;
    }

    const confirmed = window.confirm(
      'Bạn có chắc muốn xóa phim này không?',
    );

    if (!confirmed) {
      return;
    }

    setLoading(true);
    setMessage('');

    try {
      const response = await fetch(
        `/api/admin/movies/${editingMovieId}`,
        {
          method: 'DELETE',
        },
      );

      const data = (await response.json()) as {
        message: string;
      };

      if (!response.ok) {
        setMessage(
          data.message || 'Không thể xóa phim.',
        );
        return;
      }

      setMessage(data.message);

      // Sau khi xóa → chuyển sang form tạo phim
      setEditingMovieId('');
      setForm(emptyForm);
    } catch {
      setMessage(
        'Không thể kết nối đến máy chủ.',
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
      {/* =====================================================
          DANH SÁCH PHIM
      ====================================================== */}
      <div className="rounded-[28px] border border-white/10 bg-white/5 p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold text-white">
              Danh sách phim hiện có
            </h3>

            <p className="mt-1 text-xs text-slate-400">
              {movies.length} phim
            </p>
          </div>

          {/* NÚT TẠO PHIM */}
          <button
            type="button"
            onClick={handleCreateNew}
            className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-slate-100"
          >
            + Tạo phim
          </button>
        </div>

        <div className="mt-4 max-h-[600px] space-y-2 overflow-y-auto pr-1">
          {movies.length === 0 ? (
            <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-5 text-center">
              <p className="text-sm text-slate-400">
                Chưa có phim nào.
              </p>

              <button
                type="button"
                onClick={handleCreateNew}
                className="mt-4 rounded-xl bg-white px-4 py-2 text-sm font-semibold text-slate-950"
              >
                + Tạo phim đầu tiên
              </button>
            </div>
          ) : (
            movies.map((movie) => (
              <button
                key={movie.id}
                type="button"
                onClick={() =>
                  syncSelectedMovie(movie.id)
                }
                className={`block w-full rounded-2xl border px-4 py-3 text-left text-sm transition ${
                  movie.id === editingMovieId
                    ? 'border-sky-400/60 bg-sky-500/15 text-white'
                    : 'border-white/10 bg-slate-950/60 text-slate-300 hover:border-white/20'
                }`}
              >
                <div className="font-semibold text-white">
                  {movie.title}
                </div>

                <div className="mt-1 text-xs text-slate-500">
                  {movie.slug}
                </div>

                <div className="mt-2 flex flex-wrap gap-2">
                  {movie.isNowShowing && (
                    <span className="rounded-full bg-emerald-500/10 px-2 py-1 text-[11px] text-emerald-300">
                      Đang chiếu
                    </span>
                  )}

                  {movie.isComingSoon && (
                    <span className="rounded-full bg-amber-500/10 px-2 py-1 text-[11px] text-amber-300">
                      Sắp chiếu
                    </span>
                  )}
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* =====================================================
          FORM
      ====================================================== */}
      <form
        onSubmit={handleSubmit}
        className="space-y-4 rounded-[28px] border border-white/10 bg-slate-950/70 p-6 shadow-glow backdrop-blur-xl"
      >
        <div>
          <h3 className="text-xl font-semibold text-white">
            {editingMovieId
              ? 'Chỉnh sửa phim'
              : 'Tạo phim mới'}
          </h3>

          <p className="mt-2 text-sm text-slate-300">
            {editingMovieId
              ? 'Cập nhật thông tin phim đang chọn.'
              : 'Nhập thông tin để tạo phim mới.'}
          </p>
        </div>

        {/* TÊN + SLUG */}
        <div className="grid gap-3 sm:grid-cols-2">
          <input
            value={form.title}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                title: event.target.value,
              }))
            }
            placeholder="Tên phim"
            className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none focus:border-sky-400"
            required
          />

          <input
            value={form.slug}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                slug: event.target.value,
              }))
            }
            placeholder="Slug, ví dụ: vu-dieu-rap-chieu"
            className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none focus:border-sky-400"
            required
          />
        </div>

        {/* THỂ LOẠI + THỜI LƯỢNG */}
        <div className="grid gap-3 sm:grid-cols-2">
          <input
            value={form.genre}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                genre: event.target.value,
              }))
            }
            placeholder="Thể loại"
            className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none focus:border-sky-400"
            required
          />

          <input
            type="number"
            min={1}
            value={form.duration}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                duration: Number(
                  event.target.value,
                ),
              }))
            }
            placeholder="Thời lượng (phút)"
            className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none focus:border-sky-400"
            required
          />
        </div>

        {/* ĐỘ TUỔI + NGÀY PHÁT HÀNH */}
        <div className="grid gap-3 sm:grid-cols-2">
          <select
            value={form.ageRating}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                ageRating: event.target.value,
              }))
            }
            className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none focus:border-sky-400"
            required
          >
            <option
              value="P"
              className="bg-slate-950"
            >
              P - Phổ biến
            </option>

            <option
              value="K"
              className="bg-slate-950"
            >
              K
            </option>

            <option
              value="T13"
              className="bg-slate-950"
            >
              T13
            </option>

            <option
              value="T16"
              className="bg-slate-950"
            >
              T16
            </option>

            <option
              value="T18"
              className="bg-slate-950"
            >
              T18
            </option>
          </select>

          <input
            type="date"
            value={form.releaseDate}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                releaseDate:
                  event.target.value,
              }))
            }
            className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none focus:border-sky-400"
            required
          />
        </div>

        {/* POSTER */}
        <input
          value={form.posterUrl}
          onChange={(event) =>
            setForm((current) => ({
              ...current,
              posterUrl: event.target.value,
            }))
          }
          placeholder="Poster URL"
          className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none focus:border-sky-400"
          required
        />

        {/* TRAILER */}
        <input
          value={form.trailerUrl}
          onChange={(event) =>
            setForm((current) => ({
              ...current,
              trailerUrl: event.target.value,
            }))
          }
          placeholder="Trailer URL - không bắt buộc"
          className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none focus:border-sky-400"
        />

        {/* MÔ TẢ */}
        <textarea
          value={form.synopsis}
          onChange={(event) =>
            setForm((current) => ({
              ...current,
              synopsis: event.target.value,
            }))
          }
          rows={5}
          placeholder="Mô tả phim"
          className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none focus:border-sky-400"
          required
        />

        {/* TRẠNG THÁI */}
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-200">
            <input
              type="checkbox"
              checked={form.isNowShowing}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  isNowShowing:
                    event.target.checked,
                }))
              }
            />

            Đang chiếu
          </label>

          <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-200">
            <input
              type="checkbox"
              checked={form.isComingSoon}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  isComingSoon:
                    event.target.checked,
                }))
              }
            />

            Sắp chiếu
          </label>
        </div>

        {/* BUTTON */}
        <div className="flex flex-wrap gap-3">
          <button
            type="submit"
            disabled={loading}
            className="rounded-2xl bg-white px-5 py-3 font-semibold text-slate-950 transition hover:bg-slate-100 disabled:opacity-60"
          >
            {loading
              ? 'Đang lưu...'
              : editingMovieId
                ? 'Cập nhật phim'
                : 'Tạo phim'}
          </button>

          {/* TẠO PHIM MỚI KHI ĐANG SỬA */}
          {editingMovieId && (
            <button
              type="button"
              onClick={handleCreateNew}
              disabled={loading}
              className="rounded-2xl border border-white/10 px-5 py-3 font-semibold text-slate-200 transition hover:bg-white/5 disabled:opacity-50"
            >
              Tạo phim mới
            </button>
          )}

          {/* XÓA */}
          <button
            type="button"
            onClick={handleDelete}
            disabled={
              loading || !editingMovieId
            }
            className="rounded-2xl border border-rose-400/40 px-5 py-3 font-semibold text-rose-200 transition hover:bg-rose-500/10 disabled:opacity-50"
          >
            Xóa phim
          </button>
        </div>

        {/* MESSAGE */}
        {message ? (
          <p className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-200">
            {message}
          </p>
        ) : null}

        {/* PHIM ĐANG CHỌN */}
        {selectedMovie ? (
          <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
            Đang chọn: {selectedMovie.title}
          </p>
        ) : (
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
            Đang ở chế độ tạo phim mới
          </p>
        )}
      </form>
    </div>
  );
}