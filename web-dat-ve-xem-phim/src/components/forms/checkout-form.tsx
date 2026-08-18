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

type PaymentMethod =
  | 'VNPAY'
  | 'MOMO'
  | 'ZALOPAY';

const paymentMethods = [
  {
    id: 'VNPAY' as const,
    shortName: 'VN',
    name: 'VNPay',
    description:
      'Mô phỏng thanh toán VNPay',
  },
  {
    id: 'MOMO' as const,
    shortName: 'M',
    name: 'MoMo',
    description:
      'Mô phỏng thanh toán MoMo',
  },
  {
    id: 'ZALOPAY' as const,
    shortName: 'Z',
    name: 'ZaloPay',
    description:
      'Mô phỏng thanh toán ZaloPay',
  },
];

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

  const [paymentMethod, setPaymentMethod] =
    useState<PaymentMethod>(
      'VNPAY',
    );

  const [loading, setLoading] =
    useState(false);

  const [message, setMessage] =
    useState('');

  /*
   * Phí dịch vụ hiện tại = 0.
   *
   * API cũng tự tính lại.
   */
  const total =
    subtotal + bookingFee;

  /* ==========================================================
     SUBMIT
     ========================================================== */

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

              /*
               * KHÔNG gửi giá.
               *
               * Server tự lấy giá từ Showtime.
               */
              body: JSON.stringify({
                paymentMethod,

                showtimeId,

                seats:
                  seats.join(','),
              }),
            },
          );

        const data =
          (await response.json()) as {
            message?: string;
            redirectTo?: string;
          };

        if (!response.ok) {
          setMessage(
            data.message ||
              'Không thể tạo đơn đặt vé.',
          );

          return;
        }

        if (
          data.redirectTo
        ) {
          router.push(
            data.redirectTo,
          );

          return;
        }

        setMessage(
          data.message ||
            'Không thể tiếp tục thanh toán.',
        );
      } catch (error) {
        console.error(
          'Checkout error:',
          error,
        );

        setMessage(
          'Không thể kết nối đến hệ thống đặt vé.',
        );
      } finally {
        setLoading(false);
      }
    };

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
      {/* =====================================================
          LEFT
          ===================================================== */}

      <section className="space-y-5 rounded-[28px] border border-white/10 bg-slate-950/70 p-6 shadow-glow backdrop-blur-xl">
        {/* HEADER */}

        <div>
          <p className="text-sm uppercase tracking-[0.3em] text-sky-300/80">
            Thanh toán
          </p>

          <h2 className="mt-2 text-2xl font-semibold text-white">
            Phương thức thanh toán
          </h2>

          <p className="mt-2 text-sm text-slate-400">
            Chọn phương thức để tiếp tục
            đến bước thanh toán mô phỏng.
          </p>
        </div>

        {/* THÔNG TIN VÉ */}

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

        {/* PAYMENT METHODS */}

        <div>
          <p className="mb-3 text-sm font-medium text-white">
            Chọn phương thức
          </p>

          <div className="space-y-3">
            {paymentMethods.map(
              (method) => {
                const selected =
                  paymentMethod ===
                  method.id;

                return (
                  <button
                    key={
                      method.id
                    }
                    type="button"
                    onClick={() =>
                      setPaymentMethod(
                        method.id,
                      )
                    }
                    className={`flex w-full items-center gap-4 rounded-2xl border p-4 text-left transition ${
                      selected
                        ? 'border-sky-400 bg-sky-500/10'
                        : 'border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/10'
                    }`}
                  >
                    {/* LOGO */}

                    <span
                      className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-lg font-bold ${
                        selected
                          ? 'bg-sky-400 text-slate-950'
                          : 'bg-white/10 text-white'
                      }`}
                    >
                      {
                        method.shortName
                      }
                    </span>

                    {/* INFO */}

                    <span className="min-w-0 flex-1">
                      <span className="block font-semibold text-white">
                        {
                          method.name
                        }
                      </span>

                      <span className="mt-1 block text-sm text-slate-400">
                        {
                          method.description
                        }
                      </span>
                    </span>

                    {/* CHECK */}

                    <span
                      className={`flex h-6 w-6 items-center justify-center rounded-full border ${
                        selected
                          ? 'border-sky-400 bg-sky-400 text-slate-950'
                          : 'border-white/20'
                      }`}
                    >
                      {selected
                        ? '✓'
                        : ''}
                    </span>
                  </button>
                );
              },
            )}
          </div>
        </div>

        {/* DEMO NOTICE */}

        <div className="rounded-2xl border border-amber-400/20 bg-amber-500/5 p-4">
          <div className="flex gap-3">
            <span className="text-lg">
              ℹ️
            </span>

            <div>
              <p className="text-sm font-semibold text-white">
                Thanh toán mô phỏng
              </p>

              <p className="mt-1 text-xs leading-5 text-slate-400">
                VNPay, MoMo và ZaloPay
                hiện chỉ được mô phỏng
                để kiểm thử quy trình
                đặt vé. Hệ thống chưa
                kết nối cổng thanh toán
                thực tế.
              </p>
            </div>
          </div>
        </div>

        {/* SECURITY */}

        <div className="rounded-2xl border border-emerald-400/10 bg-emerald-500/5 p-4">
          <div className="flex gap-3">
            <span className="text-lg">
              🔒
            </span>

            <div>
              <p className="text-sm font-semibold text-white">
                Kiểm tra thanh toán phía server
              </p>

              <p className="mt-1 text-xs leading-5 text-slate-400">
                Giá vé và trạng thái ghế
                được kiểm tra lại trên
                máy chủ trước khi xác nhận
                thanh toán.
              </p>
            </div>
          </div>
        </div>

        {/* ERROR */}

        {message ? (
          <div className="rounded-2xl border border-rose-400/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
            {message}
          </div>
        ) : null}
      </section>

      {/* =====================================================
          RIGHT
          ===================================================== */}

      <aside className="h-fit rounded-[28px] border border-white/10 bg-slate-950/70 p-6 shadow-glow backdrop-blur-xl">
        <h3 className="text-xl font-semibold text-white">
          Chi tiết thanh toán
        </h3>

        <div className="mt-5 space-y-3 text-sm">
          {/* TIỀN VÉ */}

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

          {/* PHÍ */}

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

          {/* TOTAL */}

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

        {/* SELECTED PAYMENT */}

        <div className="mt-5 rounded-2xl border border-white/10 bg-white/5 p-4">
          <p className="text-xs text-slate-500">
            Phương thức đã chọn
          </p>

          <p className="mt-1 font-semibold text-white">
            {
              paymentMethods.find(
                (item) =>
                  item.id ===
                  paymentMethod,
              )?.name
            }
          </p>
        </div>

        {/* BUTTON */}

        <button
          type="button"
          onClick={
            handleSubmit
          }
          disabled={loading}
          className="mt-5 inline-flex w-full items-center justify-center rounded-2xl bg-sky-400 px-4 py-4 font-semibold text-slate-950 transition hover:bg-sky-300 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading
            ? 'Đang tạo đơn...'
            : `Tiếp tục thanh toán ${total.toLocaleString(
                'vi-VN',
              )} đ`}
        </button>

        <p className="mt-3 text-center text-xs leading-5 text-slate-500">
          Ghế sẽ tiếp tục được giữ trong
          thời gian thanh toán. Giá cuối
          cùng được hệ thống kiểm tra lại
          trên máy chủ.
        </p>
      </aside>
    </div>
  );
}