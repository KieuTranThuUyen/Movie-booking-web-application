'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

type PaymentConfirmButtonProps = {
  bookingId: string;
  isPaid: boolean;
};

export function PaymentConfirmButton({
  bookingId,
  isPaid,
}: PaymentConfirmButtonProps) {
  const router =
    useRouter();

  const [loading, setLoading] =
    useState(false);

  const [message, setMessage] =
    useState('');

  /* ==========================================================
     XÁC NHẬN THANH TOÁN
     ========================================================== */

  const handleConfirm =
    async () => {
      if (loading) {
        return;
      }

      setLoading(true);
      setMessage('');

      try {
        const response =
          await fetch(
            `/api/payments/${bookingId}/confirm`,
            {
              method: 'POST',
              headers: {
                'Content-Type':
                  'application/json',
              },
            },
          );

        const data =
          (await response.json()) as {
            message?: string;
            redirectTo?: string;
            bookingId?: string;
          };

        if (!response.ok) {
          setMessage(
            data.message ||
              'Không thể xác nhận thanh toán.',
          );

          return;
        }

        /* ======================================================
           SAU KHI THANH TOÁN THÀNH CÔNG

           Đi thẳng đến vé điện tử.
           ====================================================== */

        const target =
          data.redirectTo ||
          `/ve/${data.bookingId || bookingId}`;

        router.push(
          target,
        );

        router.refresh();
      } catch (error) {
        console.error(
          'Confirm payment error:',
          error,
        );

        setMessage(
          'Không thể kết nối hệ thống thanh toán.',
        );
      } finally {
        setLoading(false);
      }
    };

  /* ==========================================================
     ĐÃ THANH TOÁN
     ========================================================== */

  if (isPaid) {
    return (
      <div className="mt-6 rounded-2xl border border-emerald-400/20 bg-emerald-500/10 px-5 py-4 text-center">
        <p className="font-semibold text-emerald-400">
          ✓ Thanh toán thành công
        </p>

        <p className="mt-1 text-sm text-slate-400">
          Đơn vé của bạn đã được xác nhận.
        </p>

        <button
          type="button"
          onClick={() =>
            router.push(
              `/ve/${bookingId}`,
            )
          }
          className="mt-4 rounded-xl bg-white px-5 py-3 font-semibold text-slate-950 transition hover:bg-slate-100"
        >
          Xem vé điện tử
        </button>
      </div>
    );
  }

  /* ==========================================================
     CHƯA THANH TOÁN
     ========================================================== */

  return (
    <div className="mt-6">
      {message && (
        <div className="mb-4 rounded-xl border border-rose-400/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
          {message}
        </div>
      )}

      <button
        type="button"
        onClick={
          handleConfirm
        }
        disabled={loading}
        className="w-full rounded-2xl bg-emerald-400 px-5 py-4 font-bold text-slate-950 transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading
          ? 'Đang xử lý thanh toán...'
          : '✓ Xác nhận thanh toán Demo'}
      </button>

      <p className="mt-3 text-center text-xs leading-5 text-slate-500">
        Đây là thanh toán mô phỏng phục vụ
        kiểm thử quy trình đặt vé.
      </p>
    </div>
  );
}