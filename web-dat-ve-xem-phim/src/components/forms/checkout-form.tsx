'use client';

import { useState } from 'react';

import { useRouter } from 'next/navigation';

type CheckoutFormProps = {
  movieTitle: string;
  cinemaName: string;
  hallName: string;
  showtimeId: string;
  showtimeStart: string;
  seats: string[];
  subtotal: number;
  bookingFee?: number;
};

type CreateBookingResponse = {
  success?: boolean;
  id?: string;
  bookingId?: string;
  bookingCode?: string;
  message?: string;
};

export function CheckoutForm({
  movieTitle,
  cinemaName,
  hallName,
  showtimeId,
  showtimeStart,
  seats,
  subtotal,
  bookingFee = 0,
}: CheckoutFormProps) {
  const router =
    useRouter();

  const [loading, setLoading] =
    useState(false);

  const [message, setMessage] =
    useState('');

  const total =
    subtotal + bookingFee;

  const handleBackToSeats =
    () => {
      router.push(
        `/dat-ve?showtime=${encodeURIComponent(
          showtimeId,
        )}`,
      );
    };

  const handleSubmit =
    async () => {
      if (loading) {
        return;
      }

      if (
        !showtimeId ||
        seats.length === 0
      ) {
        setMessage(
          'Vui lòng chọn suất chiếu và ghế trước khi thanh toán.',
        );

        return;
      }

      setLoading(true);
      setMessage('');

      try {
        const response =
          await fetch(
            '/api/bookings',
            {
              method: 'POST',

              headers: {
                'Content-Type':
                  'application/json',
              },

              body: JSON.stringify({
                showtimeId,

                seats:
                  seats.join(','),

                note: '',
              }),
            },
          );

        const data =
          (await response.json()) as CreateBookingResponse;

        if (!response.ok) {
          setMessage(
            data.message ??
              'Không thể tạo đơn đặt vé.',
          );

          setLoading(false);

          return;
        }

        const bookingId =
          data.id ??
          data.bookingId;

        if (!bookingId) {
          setMessage(
            'Server không trả về id booking.',
          );

          setLoading(false);

          return;
        }

        console.log(
          '[CheckoutForm] NEW BOOKING',
          {
            bookingId,
            bookingCode:
              data.bookingCode,
          },
        );

        /*
         * Mỗi lần click phải dùng bookingId
         * vừa được POST /api/bookings trả về.
         */

        window.location.assign(
          `/api/payments/sepay/checkout/${encodeURIComponent(
            bookingId,
          )}`,
        );
      } catch (error) {
        console.error(
          'Checkout error:',
          error,
        );

        setMessage(
          'Không thể kết nối đến hệ thống đặt vé.',
        );

        setLoading(false);
      }
    };

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
      <section className="space-y-5 rounded-[28px] border border-white/10 bg-slate-950/70 p-6 shadow-glow backdrop-blur-xl">
        <div>
          <p className="text-sm uppercase tracking-[0.3em] text-sky-300/80">
            Thanh toán
          </p>

          <h2 className="mt-2 text-2xl font-semibold text-white">
            Thanh toán SePay Sandbox
          </h2>

          <p className="mt-2 text-sm text-slate-400">
            Bạn sẽ được chuyển đến môi
            trường SePay Sandbox để thực
            hiện thanh toán giả lập trên
            máy. Không phát sinh tiền thật.
          </p>
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
          <p className="text-sm font-medium text-white">
            {movieTitle}
          </p>

          <p className="mt-1 text-sm text-slate-400">
            {cinemaName} · {hallName}
          </p>

          <p className="mt-1 text-sm text-slate-400">
            {new Date(
              showtimeStart,
            ).toLocaleString(
              'vi-VN',
            )}
          </p>

          <div className="mt-4 flex items-center justify-between border-t border-white/10 pt-4">
            <span className="text-sm text-slate-400">
              Ghế
            </span>

            <span className="font-semibold text-white">
              {seats.join(', ')}
            </span>
          </div>
        </div>

        <div className="rounded-2xl border border-sky-400/20 bg-sky-500/5 p-4">
          <div className="flex gap-3">
            <span className="text-lg">
              🧪
            </span>

            <div>
              <p className="text-sm font-semibold text-white">
                Môi trường Sandbox
              </p>

              <p className="mt-1 text-xs leading-5 text-slate-400">
                Đây là giao dịch kiểm thử.
                Bạn không dùng tài khoản ngân
                hàng thật và không bị trừ tiền
                thật.
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-amber-400/10 bg-amber-500/5 p-4">
          <div className="flex gap-3">
            <span className="text-lg">
              ⏱️
            </span>

            <div>
              <p className="text-sm font-semibold text-white">
                Ghế có thời gian giữ
              </p>

              <p className="mt-1 text-xs leading-5 text-slate-400">
                Nếu thời gian giữ ghế hết
                trước khi thanh toán hoàn tất,
                phiên thanh toán sẽ bị hủy và
                ghế được giải phóng.
              </p>
            </div>
          </div>
        </div>

        {message ? (
          <div className="rounded-2xl border border-rose-400/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
            {message}

            <button
              type="button"
              onClick={
                handleBackToSeats
              }
              className="mt-3 block rounded-xl bg-white px-4 py-2 font-semibold text-slate-950"
            >
              Quay lại chọn ghế
            </button>
          </div>
        ) : null}
      </section>

      <aside className="h-fit rounded-[28px] border border-white/10 bg-slate-950/70 p-6 shadow-glow backdrop-blur-xl">
        <h3 className="text-xl font-semibold text-white">
          Chi tiết thanh toán
        </h3>

        <div className="mt-5 space-y-3 text-sm">
          <div className="flex justify-between gap-4">
            <span className="text-slate-400">
              Tiền vé
            </span>

            <span className="text-white">
              {subtotal.toLocaleString(
                'vi-VN',
              )}{' '}
              đ
            </span>
          </div>

          <div className="flex justify-between gap-4">
            <span className="text-slate-400">
              Phí dịch vụ
            </span>

            <span className="text-white">
              {bookingFee.toLocaleString(
                'vi-VN',
              )}{' '}
              đ
            </span>
          </div>

          <div className="border-t border-white/10 pt-4">
            <div className="flex items-end justify-between gap-4">
              <span className="font-medium text-white">
                Tổng cộng
              </span>

              <span className="text-2xl font-bold text-sky-300">
                {total.toLocaleString(
                  'vi-VN',
                )}{' '}
                đ
              </span>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={
            handleSubmit
          }
          disabled={loading}
          className="mt-6 inline-flex w-full items-center justify-center rounded-2xl bg-sky-400 px-4 py-4 font-semibold text-slate-950 transition hover:bg-sky-300 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading
            ? 'Đang tạo đơn...'
            : `Thanh toán Sandbox ${total.toLocaleString(
                'vi-VN',
              )} đ`}
        </button>

        <p className="mt-3 text-center text-xs leading-5 text-slate-500">
          Mỗi lần bấm thanh toán sẽ tạo một
          đơn mới. Không dùng lại đơn thanh
          toán cũ.
        </p>
      </aside>
    </div>
  );
}