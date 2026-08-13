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
  const router = useRouter();

  const [loading, setLoading] =
    useState(false);

  const [message, setMessage] =
    useState('');

  const handleConfirm = async () => {
    setLoading(true);
    setMessage('');

    try {
      const response = await fetch(
        `/api/payments/${bookingId}/confirm`,
        {
          method: 'POST',
        }
      );

      const data =
        (await response.json()) as {
          message?: string;
        };

      if (!response.ok) {
        setMessage(
          data.message ||
            'Không thể xác nhận thanh toán.'
        );

        return;
      }

      router.push(
        `/don-hang?booking=${bookingId}`
      );

      router.refresh();
    } catch (error) {
      console.error(
        'Confirm payment error:',
        error
      );

      setMessage(
        'Không thể kết nối hệ thống thanh toán.'
      );
    } finally {
      setLoading(false);
    }
  };

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
              `/don-hang?booking=${bookingId}`
            )
          }
          className="mt-4 rounded-xl bg-white px-5 py-3 font-semibold text-slate-950"
        >
          Xem vé
        </button>
      </div>
    );
  }

  return (
    <div className="mt-6">

      {message && (
        <div className="mb-4 rounded-xl border border-rose-400/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
          {message}
        </div>
      )}

      <button
        type="button"
        onClick={handleConfirm}
        disabled={loading}
        className="w-full rounded-2xl bg-emerald-400 px-5 py-4 font-bold text-slate-950 transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading
          ? 'Đang xác nhận...'
          : '✓ Xác nhận thanh toán'}
      </button>

      <p className="mt-3 text-center text-xs text-slate-500">
        Demo: Sau khi thanh toán, nhấn nút
        để xác nhận giao dịch.
      </p>
    </div>
  );
}