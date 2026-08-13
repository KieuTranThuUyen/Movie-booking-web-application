'use client';

import type { FormEvent } from 'react';
import { useMemo, useState } from 'react';

type MovieOption = {
  id: string;
  slug: string;
  title: string;
  duration?: number;
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

    date: '',
    startTime: '',

    // ============================
    // GIÁ THEO LOẠI GHẾ
    // ============================

    standardPrice: 85000,
    vipPrice: 100000,
    couplePrice: 160000,

    language: 'VietSub',
    format: '2D',
  });

  // ============================================================
  // PHIM ĐANG CHỌN
  // ============================================================

  const selectedMovie = useMemo(() => {
    return movies.find(
      (movie) => movie.slug === form.movieSlug
    );
  }, [movies, form.movieSlug]);

  // ============================================================
  // THỜI LƯỢNG PHIM
  // ============================================================

  const movieDuration = selectedMovie?.duration ?? 120;

  // ============================================================
  // TÍNH THỜI GIAN KẾT THÚC
  // ============================================================

  const calculatedEndTime = useMemo(() => {
    if (!form.date || !form.startTime) {
      return '';
    }

    const parts = form.date.split('/');

    if (parts.length !== 3) {
      return '';
    }

    const [day, month, year] = parts.map(Number);

    const [hours, minutes] = form.startTime
      .split(':')
      .map(Number);

    if (
      !day ||
      !month ||
      !year ||
      Number.isNaN(hours) ||
      Number.isNaN(minutes)
    ) {
      return '';
    }

    const startDate = new Date(
      year,
      month - 1,
      day,
      hours,
      minutes
    );

    if (Number.isNaN(startDate.getTime())) {
      return '';
    }

    startDate.setMinutes(
      startDate.getMinutes() + movieDuration
    );

    const endDay = String(
      startDate.getDate()
    ).padStart(2, '0');

    const endMonth = String(
      startDate.getMonth() + 1
    ).padStart(2, '0');

    const endYear = startDate.getFullYear();

    const endHours = String(
      startDate.getHours()
    ).padStart(2, '0');

    const endMinutes = String(
      startDate.getMinutes()
    ).padStart(2, '0');

    return `${endDay}/${endMonth}/${endYear} ${endHours}:${endMinutes}`;
  }, [
    form.date,
    form.startTime,
    movieDuration,
  ]);

  // ============================================================
  // KIỂM TRA NGÀY DD/MM/YYYY
  // ============================================================

  const isValidDate = (value: string) => {
    const parts = value.split('/');

    if (parts.length !== 3) {
      return false;
    }

    const day = Number(parts[0]);
    const month = Number(parts[1]);
    const year = Number(parts[2]);

    if (
      !Number.isInteger(day) ||
      !Number.isInteger(month) ||
      !Number.isInteger(year)
    ) {
      return false;
    }

    if (
      year < 2020 ||
      month < 1 ||
      month > 12 ||
      day < 1 ||
      day > 31
    ) {
      return false;
    }

    const date = new Date(
      year,
      month - 1,
      day
    );

    return (
      date.getFullYear() === year &&
      date.getMonth() === month - 1 &&
      date.getDate() === day
    );
  };

  // ============================================================
  // DD/MM/YYYY + HH:mm -> ISO
  // ============================================================

  const convertToISO = (
    dateString: string,
    timeString: string
  ) => {
    const [day, month, year] =
      dateString.split('/').map(Number);

    const [hours, minutes] =
      timeString.split(':').map(Number);

    const date = new Date(
      year,
      month - 1,
      day,
      hours,
      minutes
    );

    return date.toISOString();
  };

  // ============================================================
  // SUBMIT
  // ============================================================

  const handleSubmit = async (
    event: FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    setMessage('');

    // ----------------------------
    // PHIM
    // ----------------------------

    if (!form.movieSlug) {
      setMessage('Vui lòng chọn phim.');
      return;
    }

    // ----------------------------
    // PHÒNG
    // ----------------------------

    if (!form.hallId) {
      setMessage(
        'Vui lòng chọn phòng chiếu.'
      );
      return;
    }

    // ----------------------------
    // NGÀY
    // ----------------------------

    if (!form.date) {
      setMessage(
        'Vui lòng nhập ngày chiếu.'
      );
      return;
    }

    if (!isValidDate(form.date)) {
      setMessage(
        'Ngày chiếu không hợp lệ. Vui lòng nhập theo dạng dd/mm/yyyy.'
      );
      return;
    }

    // ----------------------------
    // GIỜ
    // ----------------------------

    if (!form.startTime) {
      setMessage(
        'Vui lòng nhập giờ bắt đầu.'
      );
      return;
    }

    // ----------------------------
    // GIÁ STANDARD
    // ----------------------------

    if (
      !Number.isInteger(form.standardPrice) ||
      form.standardPrice < 1000
    ) {
      setMessage(
        'Giá ghế thường phải từ 1.000đ.'
      );
      return;
    }

    // ----------------------------
    // GIÁ VIP
    // ----------------------------

    if (
      !Number.isInteger(form.vipPrice) ||
      form.vipPrice < 1000
    ) {
      setMessage(
        'Giá ghế VIP phải từ 1.000đ.'
      );
      return;
    }

    // ----------------------------
    // GIÁ COUPLE
    // ----------------------------

    if (
      !Number.isInteger(form.couplePrice) ||
      form.couplePrice < 1000
    ) {
      setMessage(
        'Giá ghế đôi phải từ 1.000đ.'
      );
      return;
    }

    // ----------------------------
    // CHUYỂN THỜI GIAN
    // ----------------------------

    const startTimeISO = convertToISO(
      form.date,
      form.startTime
    );

    const startDate = new Date(
      startTimeISO
    );

    const endDate = new Date(
      startDate
    );

    endDate.setMinutes(
      endDate.getMinutes() + movieDuration
    );

    setLoading(true);

    try {
      // ========================================================
      // GỌI API
      // ========================================================

      const response = await fetch(
        '/api/admin/showtimes',
        {
          method: 'POST',

          headers: {
            'Content-Type':
              'application/json',
          },

          body: JSON.stringify({
            movieSlug: form.movieSlug,

            hallId: form.hallId,

            startTime:
              startDate.toISOString(),

            endTime:
              endDate.toISOString(),

            // ========================
            // GIÁ THEO LOẠI GHẾ
            // ========================

            standardPrice:
              form.standardPrice,

            vipPrice:
              form.vipPrice,

            couplePrice:
              form.couplePrice,

            language:
              form.language,

            format:
              form.format,
          }),
        }
      );

      const data =
        (await response.json()) as {
          message?: string;
        };

      if (!response.ok) {
        setMessage(
          data.message ??
            'Không thể tạo suất chiếu.'
        );

        return;
      }

      setMessage(
        data.message ??
          'Tạo suất chiếu thành công.'
      );

      // ----------------------------
      // RESET NGÀY + GIỜ
      // ----------------------------

      setForm((current) => ({
        ...current,

        date: '',
        startTime: '',
      }));
    } catch (error) {
      console.error(error);

      setMessage(
        'Có lỗi xảy ra khi kết nối đến máy chủ.'
      );
    } finally {
      setLoading(false);
    }
  };

  // ============================================================
  // UI
  // ============================================================

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-[28px] border border-white/10 bg-slate-950/70 p-6 shadow-glow backdrop-blur-xl"
    >
      {/* ========================================================
          HEADER
      ======================================================== */}

      <h3 className="text-2xl font-semibold text-white">
        Thêm suất chiếu
      </h3>

      <p className="mt-2 text-sm leading-7 text-slate-300">
        Chọn phim, phòng chiếu, ngày, giờ bắt đầu
        và giá vé theo từng loại ghế.
        Thời gian kết thúc được tự động tính
        theo thời lượng phim.
      </p>

      <div className="mt-6 space-y-5">

        {/* ======================================================
            PHIM
        ====================================================== */}

        <label className="block">
          <span className="mb-2 block text-sm font-medium text-slate-300">
            Phim
          </span>

          <select
            value={form.movieSlug}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                movieSlug:
                  event.target.value,
              }))
            }
            className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none transition focus:border-sky-400"
            required
          >
            {movies.length === 0 ? (
              <option value="">
                Chưa có phim
              </option>
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

          {selectedMovie ? (
            <p className="mt-1.5 text-xs text-slate-500">
              Thời lượng:{' '}
              <span className="text-slate-300">
                {movieDuration} phút
              </span>
            </p>
          ) : null}
        </label>

        {/* ======================================================
            PHÒNG CHIẾU
        ====================================================== */}

        <label className="block">
          <span className="mb-2 block text-sm font-medium text-slate-300">
            Phòng chiếu
          </span>

          <select
            value={form.hallId}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                hallId:
                  event.target.value,
              }))
            }
            className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none transition focus:border-sky-400"
            required
          >
            {halls.length === 0 ? (
              <option value="">
                Chưa có phòng chiếu
              </option>
            ) : (
              halls.map((hall) => (
                <option
                  key={hall.id}
                  value={hall.id}
                  className="bg-slate-950"
                >
                  {hall.cinema.name} -{' '}
                  {hall.name}
                </option>
              ))
            )}
          </select>
        </label>

        {/* ======================================================
            NGÀY + GIỜ
        ====================================================== */}

        <div className="grid gap-4 sm:grid-cols-2">

          {/* NGÀY */}

          <label className="block">
            <span className="mb-2 block text-sm font-medium text-slate-300">
              Ngày chiếu
            </span>

            <input
              type="text"
              inputMode="numeric"
              value={form.date}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  date:
                    event.target.value,
                }))
              }
              placeholder="dd/mm/yyyy"
              maxLength={10}
              className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none transition focus:border-sky-400 placeholder:text-slate-500"
              required
            />

            <p className="mt-1.5 text-xs text-slate-400">
              Ví dụ: 15/08/2026
            </p>
          </label>

          {/* GIỜ */}

          <label className="block">
            <span className="mb-2 block text-sm font-medium text-slate-300">
              Giờ bắt đầu
            </span>

            <input
              type="time"
              value={form.startTime}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  startTime:
                    event.target.value,
                }))
              }
              className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none transition focus:border-sky-400"
              required
            />
          </label>
        </div>

        {/* ======================================================
            THỜI GIAN KẾT THÚC
        ====================================================== */}

        <div>
          <label className="mb-2 block text-sm font-medium text-slate-300">
            Thời gian kết thúc
          </label>

          <div className="rounded-2xl border border-emerald-400/20 bg-emerald-500/10 px-4 py-3">
            {calculatedEndTime ? (
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <span className="text-sm text-slate-300">
                  Tự động tính theo thời lượng phim
                </span>

                <span className="font-semibold text-emerald-300">
                  {calculatedEndTime}
                </span>
              </div>
            ) : (
              <span className="text-sm text-slate-400">
                Chọn ngày và giờ bắt đầu để
                tính thời gian kết thúc.
              </span>
            )}
          </div>

          <p className="mt-1.5 text-xs text-slate-400">
            Thời lượng phim:{' '}
            <span className="text-slate-300">
              {movieDuration} phút
            </span>
          </p>
        </div>

        {/* ======================================================
            GIÁ GHẾ
        ====================================================== */}

        <div>
          <label className="mb-3 block text-sm font-medium text-slate-300">
            Giá vé theo loại ghế
          </label>

          <div className="grid gap-4 sm:grid-cols-3">

            {/* ==================================================
                STANDARD
            ================================================== */}

            <label className="block">
              <span className="mb-2 block text-sm font-medium text-emerald-300">
                Ghế thường
              </span>

              <div className="relative">
                <input
                  type="number"

                  /*
                   * QUAN TRỌNG:
                   * Không dùng min={1} với step={1000}
                   *
                   * min=1000 + step=1000
                   * => 1000, 2000, 3000...
                   *
                   * => 84000 HOÀN TOÀN HỢP LỆ
                   */
                  min={1000}
                  step={1000}

                  value={
                    form.standardPrice
                  }
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      standardPrice:
                        Number(
                          event.target.value
                        ),
                    }))
                  }
                  className="w-full rounded-2xl border border-emerald-400/20 bg-emerald-500/5 px-4 py-3 pr-12 text-white outline-none transition focus:border-emerald-400"
                  required
                />

                <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-sm text-slate-400">
                  đ
                </span>
              </div>

              <p className="mt-1.5 text-xs text-slate-500">
                STANDARD
              </p>
            </label>

            {/* ==================================================
                VIP
            ================================================== */}

            <label className="block">
              <span className="mb-2 block text-sm font-medium text-amber-300">
                Ghế VIP
              </span>

              <div className="relative">
                <input
                  type="number"
                  min={1000}
                  step={1000}
                  value={form.vipPrice}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      vipPrice:
                        Number(
                          event.target.value
                        ),
                    }))
                  }
                  className="w-full rounded-2xl border border-amber-400/20 bg-amber-500/5 px-4 py-3 pr-12 text-white outline-none transition focus:border-amber-400"
                  required
                />

                <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-sm text-slate-400">
                  đ
                </span>
              </div>

              <p className="mt-1.5 text-xs text-slate-500">
                VIP
              </p>
            </label>

            {/* ==================================================
                COUPLE
            ================================================== */}

            <label className="block">
              <span className="mb-2 block text-sm font-medium text-pink-300">
                Ghế đôi
              </span>

              <div className="relative">
                <input
                  type="number"
                  min={1000}
                  step={1000}
                  value={
                    form.couplePrice
                  }
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      couplePrice:
                        Number(
                          event.target.value
                        ),
                    }))
                  }
                  className="w-full rounded-2xl border border-pink-400/20 bg-pink-500/5 px-4 py-3 pr-12 text-white outline-none transition focus:border-pink-400"
                  required
                />

                <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-sm text-slate-400">
                  đ
                </span>
              </div>

              <p className="mt-1.5 text-xs text-slate-500">
                COUPLE
              </p>
            </label>

          </div>

          <p className="mt-2 text-xs text-slate-500">
            Giá vé phải là bội số của 1.000đ.
          </p>
        </div>

        {/* ======================================================
            NGÔN NGỮ + ĐỊNH DẠNG
        ====================================================== */}

        <div className="grid gap-4 sm:grid-cols-2">

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
                  language:
                    event.target.value,
                }))
              }
              className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none transition focus:border-sky-400"
              required
            >
              <option
                value="VietSub"
                className="bg-slate-950"
              >
                VietSub
              </option>

              <option
                value="VietDub"
                className="bg-slate-950"
              >
                VietDub
              </option>

              <option
                value="EngSub"
                className="bg-slate-950"
              >
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
                  format:
                    event.target.value,
                }))
              }
              className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none transition focus:border-sky-400"
              required
            >
              <option
                value="2D"
                className="bg-slate-950"
              >
                2D
              </option>

              <option
                value="3D"
                className="bg-slate-950"
              >
                3D
              </option>

              <option
                value="IMAX"
                className="bg-slate-950"
              >
                IMAX
              </option>
            </select>
          </label>
        </div>

        {/* ======================================================
            TÓM TẮT GIÁ
        ====================================================== */}

        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <p className="text-sm font-medium text-slate-300">
            Bảng giá suất chiếu
          </p>

          <div className="mt-3 grid gap-2 text-sm sm:grid-cols-3">

            <div className="flex items-center justify-between rounded-xl bg-emerald-500/5 px-3 py-2">
              <span className="text-slate-400">
                STANDARD
              </span>

              <span className="font-semibold text-emerald-300">
                {form.standardPrice.toLocaleString(
                  'vi-VN'
                )}{' '}
                đ
              </span>
            </div>

            <div className="flex items-center justify-between rounded-xl bg-amber-500/5 px-3 py-2">
              <span className="text-slate-400">
                VIP
              </span>

              <span className="font-semibold text-amber-300">
                {form.vipPrice.toLocaleString(
                  'vi-VN'
                )}{' '}
                đ
              </span>
            </div>

            <div className="flex items-center justify-between rounded-xl bg-pink-500/5 px-3 py-2">
              <span className="text-slate-400">
                COUPLE
              </span>

              <span className="font-semibold text-pink-300">
                {form.couplePrice.toLocaleString(
                  'vi-VN'
                )}{' '}
                đ
              </span>
            </div>

          </div>
        </div>

        {/* ======================================================
            BUTTON
        ====================================================== */}

        <button
          type="submit"
          disabled={
            loading ||
            movies.length === 0 ||
            halls.length === 0
          }
          className="rounded-2xl bg-white px-5 py-3 font-semibold text-slate-950 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading
            ? 'Đang lưu...'
            : 'Lưu suất chiếu'}
        </button>

        {/* ======================================================
            MESSAGE
        ====================================================== */}

        {message ? (
          <p className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-200">
            {message}
          </p>
        ) : null}

      </div>
    </form>
  );
}