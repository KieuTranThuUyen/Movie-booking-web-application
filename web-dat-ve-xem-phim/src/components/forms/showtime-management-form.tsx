'use client';

import type { FormEvent } from 'react';
import { useMemo, useState } from 'react';

type MovieOption = {
  id: string;
  slug: string;
  title: string;
  duration?: number;
  releaseDate?: string | Date;
  isNowShowing?: boolean;
  isComingSoon?: boolean;
};

type HallOption = {
  id: string;
  name: string;
  cinema: {
    name: string;
  };
};

type ShowtimeItem = {
  id: string;
  startTime: string | Date;
  endTime: string | Date;
  language: string;
  format: string;
  standardPrice: number;
  vipPrice: number;
  couplePrice: number;
  bookingCount: number;
  movie: {
    id: string;
    slug: string;
    title: string;
    duration?: number;
    releaseDate?: string | Date;
    isComingSoon?: boolean;
  };
  hall: {
    id: string;
    name: string;
    cinema: { name: string };
  };
};

type ShowtimeManagementFormProps = {
  movies: MovieOption[];
  halls: HallOption[];
  showtimes?: ShowtimeItem[];
};

const emptyForm = {
  movieSlug: '',
  hallId: '',
  date: '',
  startTime: '',
  standardPrice: 85000,
  vipPrice: 100000,
  couplePrice: 160000,
  language: 'VietSub',
  format: '2D',
};

function toDateKey(value: string | Date | undefined) {
  if (!value) return '';
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value.trim())) {
    return value.trim();
  }
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Ho_Chi_Minh',
  }).format(new Date(value));
}

function toTimeInput(value: string | Date) {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Ho_Chi_Minh',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(new Date(value));
}

function formatVi(value: string | Date) {
  return new Date(value).toLocaleString('vi-VN', {
    timeZone: 'Asia/Ho_Chi_Minh',
  });
}

export function ShowtimeManagementForm({
  movies,
  halls,
  showtimes = [],
}: ShowtimeManagementFormProps) {
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState('');
  const [list, setList] = useState(showtimes);

  // Chỉ phim đang chiếu (không phải sắp chiếu) mới tạo/sửa suất
  const bookableMovies = useMemo(
    () =>
      movies.filter(
        (m) => m.isComingSoon !== true && m.isNowShowing !== false,
      ),
    [movies],
  );

  const [form, setForm] = useState({
    ...emptyForm,
    movieSlug: bookableMovies[0]?.slug ?? '',
    hallId: halls[0]?.id ?? '',
  });

  const selectedMovie = useMemo(
    () => movies.find((m) => m.slug === form.movieSlug),
    [movies, form.movieSlug],
  );

  const movieDuration = selectedMovie?.duration ?? 120;

  const releaseDateMin = useMemo(() => {
    return toDateKey(selectedMovie?.releaseDate) || undefined;
  }, [selectedMovie]);

  const calculatedEndTime = useMemo(() => {
    if (!form.date || !form.startTime) return '';
    if (!/^\d{4}-\d{2}-\d{2}$/.test(form.date)) return '';

    const [year, month, day] = form.date.split('-').map(Number);
    const [hours, minutes] = form.startTime.split(':').map(Number);

    const startDate = new Date(year, month - 1, day, hours, minutes);
    if (Number.isNaN(startDate.getTime())) return '';

    startDate.setMinutes(startDate.getMinutes() + movieDuration);

    return startDate.toLocaleString('vi-VN', {
      timeZone: 'Asia/Ho_Chi_Minh',
    });
  }, [form.date, form.startTime, movieDuration]);

  const handleCreateNew = () => {
    setEditingId('');
    setForm({
      ...emptyForm,
      movieSlug: bookableMovies[0]?.slug ?? '',
      hallId: halls[0]?.id ?? '',
    });
    setMessage('');
  };

  const handleEdit = (st: ShowtimeItem) => {
    if (st.bookingCount > 0) {
      setMessage(
        `Không thể sửa suất này vì đã có ${st.bookingCount} đơn đặt vé.`,
      );
      return;
    }

    setEditingId(st.id);
    setForm({
      movieSlug: st.movie.slug,
      hallId: st.hall.id,
      date: toDateKey(st.startTime),
      startTime: toTimeInput(st.startTime),
      standardPrice: st.standardPrice,
      vipPrice: st.vipPrice,
      couplePrice: st.couplePrice,
      language: st.language,
      format: st.format,
    });
    setMessage(`Đang sửa: ${st.movie.title}`);
  };

  const buildStartEnd = () => {
    const [year, month, day] = form.date.split('-').map(Number);
    const [hours, minutes] = form.startTime.split(':').map(Number);
    const start = new Date(year, month - 1, day, hours, minutes);
    const end = new Date(start);
    end.setMinutes(end.getMinutes() + movieDuration);
    return { start, end };
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage('');

    if (!form.movieSlug) {
      setMessage('Vui lòng chọn phim.');
      return;
    }

    if (selectedMovie?.isComingSoon) {
      setMessage('Không thể tạo suất chiếu cho phim sắp chiếu.');
      return;
    }

    if (!form.hallId) {
      setMessage('Vui lòng chọn phòng chiếu.');
      return;
    }

    if (!form.date || !/^\d{4}-\d{2}-\d{2}$/.test(form.date)) {
      setMessage('Ngày chiếu không hợp lệ.');
      return;
    }

    if (releaseDateMin && form.date < releaseDateMin) {
      setMessage('Ngày chiếu phải từ ngày khởi chiếu của phim trở đi.');
      return;
    }

    if (!form.startTime) {
      setMessage('Vui lòng nhập giờ bắt đầu.');
      return;
    }

    for (const [label, price] of [
      ['Ghế thường', form.standardPrice],
      ['VIP', form.vipPrice],
      ['Ghế đôi', form.couplePrice],
    ] as const) {
      if (!Number.isInteger(price) || price < 1000) {
        setMessage(`${label}: giá phải từ 1.000đ.`);
        return;
      }
    }

    const { start, end } = buildStartEnd();

    if (Number.isNaN(start.getTime())) {
      setMessage('Thời gian không hợp lệ.');
      return;
    }

    setLoading(true);

    try {
      const isEdit = Boolean(editingId);
      const response = await fetch(
        isEdit ? `/api/admin/showtimes/${editingId}` : '/api/admin/showtimes',
        {
          method: isEdit ? 'PATCH' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            movieSlug: form.movieSlug,
            hallId: form.hallId,
            startTime: start.toISOString(),
            endTime: end.toISOString(),
            standardPrice: form.standardPrice,
            vipPrice: form.vipPrice,
            couplePrice: form.couplePrice,
            language: form.language,
            format: form.format,
          }),
        },
      );

      const data = (await response.json()) as {
        message?: string;
        showtime?: ShowtimeItem & { id: string };
      };

      if (!response.ok) {
        setMessage(data.message ?? 'Không thể lưu suất chiếu.');
        return;
      }

      setMessage(data.message ?? (isEdit ? 'Cập nhật thành công.' : 'Tạo thành công.'));

      if (data.showtime) {
        const normalized: ShowtimeItem = {
          id: data.showtime.id,
          startTime: data.showtime.startTime,
          endTime: data.showtime.endTime,
          language: data.showtime.language,
          format: data.showtime.format,
          standardPrice: data.showtime.standardPrice,
          vipPrice: data.showtime.vipPrice,
          couplePrice: data.showtime.couplePrice,
          bookingCount:
            'bookingCount' in data.showtime
              ? Number((data.showtime as ShowtimeItem).bookingCount ?? 0)
              : 0,
          movie: data.showtime.movie,
          hall: data.showtime.hall,
        };

        setList((prev) => {
          if (isEdit) {
            return prev.map((s) => (s.id === normalized.id ? { ...s, ...normalized } : s));
          }
          return [normalized, ...prev];
        });
      }

      if (!isEdit) {
        setForm((c) => ({ ...c, date: '', startTime: '' }));
      }
    } catch {
      setMessage('Có lỗi khi kết nối máy chủ.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (st: ShowtimeItem) => {
    if (st.bookingCount > 0) {
      setMessage(
        `Không thể xóa suất này vì đã có ${st.bookingCount} đơn đặt vé.`,
      );
      return;
    }

    if (!window.confirm(`Xóa suất chiếu "${st.movie.title}" lúc ${formatVi(st.startTime)}?`)) {
      return;
    }

    setLoading(true);
    setMessage('');

    try {
      const response = await fetch(`/api/admin/showtimes/${st.id}`, {
        method: 'DELETE',
      });
      const data = (await response.json()) as { message?: string };

      if (!response.ok) {
        setMessage(data.message ?? 'Không thể xóa suất chiếu.');
        return;
      }

      setMessage(data.message ?? 'Đã xóa suất chiếu.');
      setList((prev) => prev.filter((s) => s.id !== st.id));
      if (editingId === st.id) handleCreateNew();
    } catch {
      setMessage('Có lỗi khi kết nối máy chủ.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-lg font-semibold text-white">
            {editingId ? 'Chỉnh sửa suất chiếu' : 'Tạo suất chiếu mới'}
          </h3>
          {editingId ? (
            <button
              type="button"
              onClick={handleCreateNew}
              className="rounded-xl border border-white/10 px-4 py-2 text-sm font-semibold text-slate-200 hover:bg-white/5"
            >
              + Tạo suất mới
            </button>
          ) : null}
        </div>

        {/* Phim */}
        <label className="block">
          <span className="mb-2 block text-sm font-medium text-slate-300">Phim</span>
          <select
            value={form.movieSlug}
            onChange={(e) =>
              setForm((c) => ({ ...c, movieSlug: e.target.value }))
            }
            className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none focus:border-sky-400"
            required
          >
            {bookableMovies.length === 0 ? (
              <option value="">Không có phim đang chiếu</option>
            ) : (
              bookableMovies.map((m) => (
                <option key={m.id} value={m.slug} className="bg-slate-950">
                  {m.title}
                </option>
              ))
            )}
          </select>
          <p className="mt-1.5 text-xs text-slate-500">
            Chỉ hiện phim đang chiếu — phim sắp chiếu không tạo suất được.
          </p>
        </label>

        {/* Phòng */}
        <label className="block">
          <span className="mb-2 block text-sm font-medium text-slate-300">Phòng chiếu</span>
          <select
            value={form.hallId}
            onChange={(e) => setForm((c) => ({ ...c, hallId: e.target.value }))}
            className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none focus:border-sky-400"
            required
          >
            {halls.map((h) => (
              <option key={h.id} value={h.id} className="bg-slate-950">
                {h.cinema.name} · {h.name}
              </option>
            ))}
          </select>
        </label>

        {/* Ngày + giờ */}
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-slate-300">Ngày chiếu</span>
            <input
              type="date"
              min={releaseDateMin}
              value={form.date}
              onChange={(e) => setForm((c) => ({ ...c, date: e.target.value }))}
              className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none focus:border-sky-400"
              required
            />
            <p className="mt-1.5 text-xs text-slate-400">
              {releaseDateMin
                ? `Từ ngày khởi chiếu ${releaseDateMin} trở đi`
                : 'Chọn ngày chiếu'}
            </p>
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-medium text-slate-300">Giờ bắt đầu</span>
            <input
              type="time"
              value={form.startTime}
              onChange={(e) =>
                setForm((c) => ({ ...c, startTime: e.target.value }))
              }
              className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none focus:border-sky-400"
              required
            />
            {calculatedEndTime ? (
              <p className="mt-1.5 text-xs text-slate-400">
                Kết thúc dự kiến: {calculatedEndTime}
              </p>
            ) : null}
          </label>
        </div>

        {/* Giá */}
        <div className="grid gap-3 sm:grid-cols-3">
          {(
            [
              ['standardPrice', 'Ghế thường'],
              ['vipPrice', 'VIP'],
              ['couplePrice', 'Ghế đôi'],
            ] as const
          ).map(([key, label]) => (
            <label key={key} className="block">
              <span className="mb-2 block text-sm font-medium text-slate-300">
                {label}
              </span>
              <input
                type="number"
                min={1000}
                step={1000}
                value={form[key]}
                onChange={(e) =>
                  setForm((c) => ({
                    ...c,
                    [key]: Number(e.target.value),
                  }))
                }
                className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none focus:border-sky-400"
                required
              />
            </label>
          ))}
        </div>

        {/* Language + format */}
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-slate-300">
              Ngôn ngữ
            </span>
            <select
              value={form.language}
              onChange={(e) =>
                setForm((c) => ({ ...c, language: e.target.value }))
              }
              className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none focus:border-sky-400"
            >
              {['VietSub', 'VietDub', 'EngSub'].map((x) => (
                <option key={x} value={x} className="bg-slate-950">
                  {x}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-medium text-slate-300">
              Định dạng
            </span>
            <select
              value={form.format}
              onChange={(e) =>
                setForm((c) => ({ ...c, format: e.target.value }))
              }
              className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none focus:border-sky-400"
            >
              {['2D', '3D', 'IMAX'].map((x) => (
                <option key={x} value={x} className="bg-slate-950">
                  {x}
                </option>
              ))}
            </select>
          </label>
        </div>

        <button
          type="submit"
          disabled={loading || bookableMovies.length === 0 || halls.length === 0}
          className="rounded-2xl bg-white px-5 py-3 font-semibold text-slate-950 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading
            ? 'Đang lưu...'
            : editingId
              ? 'Cập nhật suất chiếu'
              : 'Tạo suất chiếu'}
        </button>

        {message ? (
          <p className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-200">
            {message}
          </p>
        ) : null}
      </form>

      {/* Danh sách + sửa/xóa */}
      <div>
        <h3 className="text-lg font-semibold text-white">
          Danh sách suất chiếu ({list.length})
        </h3>
        <p className="mt-1 text-xs text-slate-500">
          Chỉ sửa/xóa được suất chưa có ai đặt vé.
        </p>

        <div className="mt-4 grid gap-3">
          {list.length === 0 ? (
            <p className="text-sm text-slate-400">Chưa có suất chiếu nào.</p>
          ) : (
            list.map((st) => (
              <div
                key={st.id}
                className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-slate-200"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="font-semibold text-white">
                      {st.movie.title}
                    </div>
                    <div className="mt-1 text-sky-200">
                      {formatVi(st.startTime)}
                    </div>
                    <div className="mt-1 text-slate-400">
                      {st.hall.cinema.name} · {st.hall.name} · {st.format} ·{' '}
                      {st.language}
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2 text-xs">
                      <span className="rounded-full bg-emerald-500/10 px-2.5 py-1 text-emerald-300">
                        Thường: {st.standardPrice.toLocaleString('vi-VN')}đ
                      </span>
                      <span className="rounded-full bg-amber-500/10 px-2.5 py-1 text-amber-300">
                        VIP: {st.vipPrice.toLocaleString('vi-VN')}đ
                      </span>
                      <span className="rounded-full bg-pink-500/10 px-2.5 py-1 text-pink-300">
                        Đôi: {st.couplePrice.toLocaleString('vi-VN')}đ
                      </span>
                      {st.bookingCount > 0 ? (
                        <span className="rounded-full bg-sky-500/10 px-2.5 py-1 text-sky-300">
                          {st.bookingCount} đơn đặt
                        </span>
                      ) : (
                        <span className="rounded-full bg-white/10 px-2.5 py-1 text-slate-400">
                          Chưa có đơn
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={loading || st.bookingCount > 0}
                      onClick={() => handleEdit(st)}
                      title={
                        st.bookingCount > 0
                          ? 'Đã có người đặt — không sửa được'
                          : 'Sửa suất chiếu'
                      }
                      className="rounded-xl border border-white/15 px-3 py-2 text-xs font-semibold text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      Sửa
                    </button>
                    <button
                      type="button"
                      disabled={loading || st.bookingCount > 0}
                      onClick={() => handleDelete(st)}
                      title={
                        st.bookingCount > 0
                          ? 'Đã có người đặt — không xóa được'
                          : 'Xóa suất chiếu'
                      }
                      className="rounded-xl border border-rose-400/40 px-3 py-2 text-xs font-semibold text-rose-200 transition hover:bg-rose-500/10 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      Xóa
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}