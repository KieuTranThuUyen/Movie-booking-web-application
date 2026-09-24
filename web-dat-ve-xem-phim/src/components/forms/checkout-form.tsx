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
  combos?: Array<{ id: string; name: string; price: number; stock: number }>;
  initialCombos?: Array<{ id: string; quantity: number }>;
  vouchers?: Array<{ code: string; discountType: string; discountValue: number }>;
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
  combos = [],
  initialCombos = [],
  vouchers = [],
}: CheckoutFormProps) {
  const router =
    useRouter();

  const [loading, setLoading] =
    useState(false);

  const [message, setMessage] =
    useState('');

  const [voucherCode, setVoucherCode] = useState('');
  const [discount, setDiscount] = useState(0);
  const [voucherMessage, setVoucherMessage] = useState('');
  const [selectedCombos, setSelectedCombos] = useState<Record<string, number>>(
    Object.fromEntries(initialCombos.map((item) => [item.id, item.quantity])),
  );

  const comboTotal = combos.reduce(
    (sum, combo) => sum + combo.price * (selectedCombos[combo.id] ?? 0),
    0,
  );

  const total = Math.max(0, subtotal + bookingFee - discount + comboTotal);

  const handleVoucher = async () => {
    setVoucherMessage('');
    setDiscount(0);
    if (!voucherCode.trim()) return;
    const response = await fetch('/api/vouchers/validate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: voucherCode, amount: subtotal + bookingFee }),
    });
    const data = (await response.json()) as { discount?: number; message?: string };
    if (!response.ok) {
      setVoucherMessage(data.message ?? 'Voucher không hợp lệ.');
      return;
    }
    setDiscount(data.discount ?? 0);
    setVoucherMessage(`Đã áp dụng mã ${voucherCode.trim().toUpperCase()}.`);
  };

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
                voucherCode: voucherCode.trim() || undefined,
                combos: Object.entries(selectedCombos)
                  .filter(([, quantity]) => quantity > 0)
                  .map(([id, quantity]) => ({ id, quantity })),
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
          <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
            <label className="text-xs text-slate-400">Mã khuyến mãi</label>
            <div className="mt-2 flex gap-2">
              <input value={voucherCode} onChange={(event) => setVoucherCode(event.target.value)} placeholder="WELCOME50" className="min-w-0 flex-1 rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-white outline-none" />
              <button type="button" onClick={() => void handleVoucher()} className="rounded-xl bg-white px-3 py-2 text-xs font-semibold text-slate-950">Áp dụng</button>
            </div>
            {voucherMessage ? <p className="mt-2 text-xs text-sky-300">{voucherMessage}</p> : null}
            {vouchers.length > 0 ? <div className="mt-3 flex flex-wrap gap-2">{vouchers.map((voucher) => <button key={voucher.code} type="button" onClick={() => setVoucherCode(voucher.code)} className="rounded-lg border border-sky-400/30 px-2 py-1 text-xs text-sky-300">{voucher.code} · {voucher.discountType === 'PERCENT' ? `${voucher.discountValue}%` : `${voucher.discountValue.toLocaleString('vi-VN')} đ`}</button>)}</div> : null}
          </div>

          {combos.length > 0 ? (
            <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
              <p className="text-xs text-slate-400">Combo bắp nước</p>
              <div className="mt-2 space-y-2">
                {combos.map((combo) => (
                  <label key={combo.id} className="flex items-center justify-between gap-3 text-sm text-slate-200">
                    <span>{combo.name} · {combo.price.toLocaleString('vi-VN')} đ</span>
                    <input type="number" min={0} max={combo.stock} value={selectedCombos[combo.id] ?? 0} onChange={(event) => setSelectedCombos({ ...selectedCombos, [combo.id]: Math.min(combo.stock, Math.max(0, Number(event.target.value))) })} className="w-20 rounded-lg bg-slate-900 px-2 py-1 text-white" />
                  </label>
                ))}
              </div>
            </div>
          ) : null}
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
            {discount > 0 ? <div className="mb-3 flex justify-between gap-4 text-emerald-300"><span>Giảm voucher</span><span>-{discount.toLocaleString('vi-VN')} đ</span></div> : null}
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

      </aside>
    </div>
  );
}