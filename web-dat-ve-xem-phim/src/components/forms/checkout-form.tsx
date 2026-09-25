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

  combos?: Array<{
    id: string;
    name: string;
    description: string;
    imageUrl: string | null;
    price: number;
    stock: number;
  }>;

  initialCombos?: Array<{
    id: string;
    quantity: number;
  }>;

  vouchers?: Array<{
    code: string;
    discountType: string;
    discountValue: number;
  }>;
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
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const [voucherCode, setVoucherCode] = useState('');
  const [discount, setDiscount] = useState(0);
  const [voucherMessage, setVoucherMessage] = useState('');

  /*
   * Combo được lấy từ Giỏ hàng.
   * Trang Thanh toán chỉ hiển thị, không cho chỉnh số lượng.
   */
  const [selectedCombos] = useState<Record<string, number>>(
    Object.fromEntries(
      initialCombos.map((item) => [
        item.id,
        item.quantity,
      ]),
    ),
  );

  /*
   * Tổng tiền combo đã chọn ở Giỏ hàng.
   */
  const comboTotal = combos.reduce(
    (sum, combo) =>
      sum +
      combo.price *
        (selectedCombos[combo.id] ?? 0),
    0,
  );

  /*
   * Danh sách combo thực sự đã chọn.
   */
  const selectedComboList = combos.filter(
    (combo) =>
      (selectedCombos[combo.id] ?? 0) > 0,
  );

  /*
   * Tổng tiền cuối cùng.
   */
  const total = Math.max(
    0,
    subtotal +
      bookingFee +
      comboTotal -
      discount,
  );

  /*
   * Áp dụng voucher.
   */
  const handleVoucher = async () => {
    setVoucherMessage('');
    setDiscount(0);

    const code = voucherCode.trim();

    if (!code) {
      return;
    }

    try {
      const response = await fetch(
        '/api/vouchers/validate',
        {
          method: 'POST',
          headers: {
            'Content-Type':
              'application/json',
          },
          body: JSON.stringify({
            code,
            amount:
              subtotal +
              bookingFee +
              comboTotal,
          }),
        },
      );

      const data =
        (await response.json()) as {
          discount?: number;
          message?: string;
        };

      if (!response.ok) {
        setVoucherMessage(
          data.message ??
            'Voucher không hợp lệ.',
        );

        return;
      }

      const discountValue =
        data.discount ?? 0;

      setDiscount(discountValue);

      setVoucherMessage(
        `Đã áp dụng mã ${code.toUpperCase()}.`,
      );
    } catch (error) {
      console.error(
        'Voucher validation error:',
        error,
      );

      setVoucherMessage(
        'Không thể kiểm tra voucher.',
      );
    }
  };

  /*
   * Quay lại trang chọn ghế.
   */
  const handleBackToSeats = () => {
    router.push(
      `/dat-ve?showtime=${encodeURIComponent(
        showtimeId,
      )}`,
    );
  };

  /*
   * Quay lại Giỏ hàng để thay đổi Combo.
   */
  const handleBackToCart = () => {
    const params = new URLSearchParams();

    params.set('showtime', showtimeId);
    params.set('seats', seats.join(','));

    router.push(`/gio-hang?${params.toString()}`);
  };

  /*
   * Tạo Booking.
   */
  const handleSubmit = async () => {
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
      /*
       * Combo lấy từ Giỏ hàng.
       * Không cho chỉnh Combo ở trang này.
       */
      const bookingCombos =
        Object.entries(selectedCombos)
          .filter(
            ([, quantity]) =>
              quantity > 0,
          )
          .map(
            ([id, quantity]) => ({
              id,
              quantity,
            }),
          );

      const response = await fetch(
        '/api/bookings',
        {
          method: 'POST',

          headers: {
            'Content-Type':
              'application/json',
          },

          body: JSON.stringify({
            showtimeId,

            seats: seats.join(','),

            note: '',

            voucherCode:
              voucherCode.trim() ||
              undefined,

            combos: bookingCombos,
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
          combos: bookingCombos,
        },
      );

      /*
       * Chuyển sang SePay bằng bookingId
       * vừa được tạo.
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
      {/* =====================================================
          LEFT - THÔNG TIN ĐẶT VÉ
      ====================================================== */}
      <section className="space-y-5 rounded-[28px] border border-white/10 bg-slate-950/70 p-6 shadow-glow backdrop-blur-xl">
        {/* Header */}
        <div>
          <p className="text-sm uppercase tracking-[0.3em] text-sky-300/80">
            Thanh toán
          </p>

          <h2 className="mt-2 text-2xl font-semibold text-white">
            Kiểm tra thông tin đặt vé
          </h2>

          <p className="mt-1 text-sm text-slate-400">
            Kiểm tra lại thông tin trước khi
            chuyển sang thanh toán SePay.
          </p>
        </div>

        {/* =================================================
            THÔNG TIN PHIM
        ================================================== */}
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
            ).toLocaleString('vi-VN')}
          </p>

          {/* Ghế */}
          <div className="mt-4 flex items-center justify-between gap-4 border-t border-white/10 pt-4">
            <span className="text-sm text-slate-400">
              Ghế đã chọn
            </span>

            <span className="text-right font-semibold text-white">
              {seats.join(', ')}
            </span>
          </div>

          {/* =================================================
              COMBO ĐÃ CHỌN
              CHỈ HIỂN THỊ - KHÔNG CHO CHỈNH
          ================================================== */}
          {selectedComboList.length > 0 ? (
            <div className="mt-5 border-t border-white/10 pt-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-white">
                    Combo đã chọn
                  </p>

                  <p className="mt-1 text-xs leading-5 text-slate-500">
                    Combo đã được chọn từ giỏ hàng.
                    Muốn thay đổi, hãy quay lại giỏ hàng.
                  </p>
                </div>

                <span className="shrink-0 rounded-full bg-sky-400/10 px-2.5 py-1 text-xs font-medium text-sky-300">
                  {selectedComboList.length}{' '}
                  loại
                </span>
              </div>

              {/* Danh sách combo */}
              <div className="mt-4 space-y-3">
                {selectedComboList.map(
                  (combo) => {
                    const quantity =
                      selectedCombos[
                        combo.id
                      ] ?? 0;

                    const itemTotal =
                      combo.price *
                      quantity;

                    return (
                      <div
                        key={combo.id}
                        className="flex gap-3 rounded-2xl border border-white/10 bg-white/[0.035] p-3"
                      >
                        {/* Ảnh */}
                        {combo.imageUrl ? (
                          <img
                            src={
                              combo.imageUrl
                            }
                            alt={
                              combo.name
                            }
                            className="h-20 w-24 shrink-0 rounded-xl border border-white/10 bg-slate-900 object-cover"
                          />
                        ) : (
                          <div className="flex h-20 w-24 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-slate-900 text-[10px] text-slate-500">
                            Chưa có ảnh
                          </div>
                        )}

                        {/* Thông tin */}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="font-semibold text-white">
                                {combo.name}
                              </p>

                              <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-400">
                                {
                                  combo.description
                                }
                              </p>
                            </div>

                            {/* Số lượng */}
                            <span className="shrink-0 rounded-lg bg-slate-800 px-2.5 py-1 text-xs font-semibold text-slate-200">
                              ×{quantity}
                            </span>
                          </div>

                          <div className="mt-2 flex items-center justify-between gap-3">
                            <span className="text-xs text-slate-500">
                              {combo.price.toLocaleString(
                                'vi-VN',
                              )}{' '}
                              đ / combo
                            </span>

                            <span className="text-sm font-semibold text-sky-300">
                              {itemTotal.toLocaleString(
                                'vi-VN',
                              )}{' '}
                              đ
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  },
                )}
              </div>

              {/* Nút quay lại giỏ hàng */}
              <button
                type="button"
                onClick={
                  handleBackToCart
                }
                className="mt-4 w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-xs font-medium text-slate-300 transition hover:border-sky-400/30 hover:bg-sky-400/5 hover:text-sky-300"
              >
                ← Quay lại giỏ hàng để thay đổi Combo
              </button>
            </div>
          ) : (
            <div className="mt-5 border-t border-white/10 pt-5">
              <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] p-4 text-center">
                <p className="text-sm text-slate-400">
                  Chưa chọn Combo
                </p>

                <button
                  type="button"
                  onClick={
                    handleBackToCart
                  }
                  className="mt-2 text-xs font-medium text-sky-300 hover:text-sky-200"
                >
                  Quay lại giỏ hàng
                </button>
              </div>
            </div>
          )}
        </div>

        {/* =================================================
            THÔNG BÁO LỖI
        ================================================== */}
        {message ? (
          <div className="rounded-2xl border border-rose-400/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
            <p>{message}</p>

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

      {/* =====================================================
          RIGHT - CHI TIẾT THANH TOÁN
      ====================================================== */}
      <aside className="h-fit rounded-[28px] border border-white/10 bg-slate-950/70 p-6 shadow-glow backdrop-blur-xl">
        <h3 className="text-xl font-semibold text-white">
          Chi tiết thanh toán
        </h3>

        <div className="mt-5 space-y-3 text-sm">
          {/* =================================================
              VOUCHER
          ================================================== */}
          <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
            <label className="text-xs text-slate-400">
              Mã khuyến mãi
            </label>

            <div className="mt-2 flex gap-2">
              <input
                value={voucherCode}
                onChange={(event) =>
                  setVoucherCode(
                    event.target.value,
                  )
                }
                placeholder="WELCOME50"
                className="min-w-0 flex-1 rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-white outline-none focus:border-sky-400/50"
              />

              <button
                type="button"
                onClick={() =>
                  void handleVoucher()
                }
                className="rounded-xl bg-white px-3 py-2 text-xs font-semibold text-slate-950 transition hover:bg-slate-200"
              >
                Áp dụng
              </button>
            </div>

            {voucherMessage ? (
              <p className="mt-2 text-xs text-sky-300">
                {voucherMessage}
              </p>
            ) : null}

            {vouchers.length > 0 ? (
              <div className="mt-3 flex flex-wrap gap-2">
                {vouchers.map(
                  (voucher) => (
                    <button
                      key={
                        voucher.code
                      }
                      type="button"
                      onClick={() =>
                        setVoucherCode(
                          voucher.code,
                        )
                      }
                      className="rounded-lg border border-sky-400/30 px-2 py-1 text-xs text-sky-300 transition hover:bg-sky-400/10"
                    >
                      {voucher.code}{' '}
                      ·{' '}
                      {voucher.discountType ===
                      'PERCENT'
                        ? `${voucher.discountValue}%`
                        : `${voucher.discountValue.toLocaleString(
                            'vi-VN',
                          )} đ`}
                    </button>
                  ),
                )}
              </div>
            ) : null}
          </div>

          {/* Tiền vé */}
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

          {/* Tiền Combo */}
          {comboTotal > 0 ? (
            <div className="space-y-2">
              <div className="flex justify-between gap-4">
                <span className="text-slate-400">
                  Tiền Combo
                </span>

                <span className="font-medium text-white">
                  {comboTotal.toLocaleString(
                    'vi-VN',
                  )}{' '}
                  đ
                </span>
              </div>

              {selectedComboList.map(
                (combo) => {
                  const quantity =
                    selectedCombos[
                      combo.id
                    ] ?? 0;

                  const itemTotal =
                    combo.price *
                    quantity;

                  return (
                    <div
                      key={combo.id}
                      className="flex justify-between gap-4 pl-2 text-xs text-slate-500"
                    >
                      <span className="min-w-0 truncate">
                        {combo.name} ×{' '}
                        {quantity}
                      </span>

                      <span className="shrink-0">
                        {itemTotal.toLocaleString(
                          'vi-VN',
                        )}{' '}
                        đ
                      </span>
                    </div>
                  );
                },
              )}
            </div>
          ) : null}

          {/* Phí dịch vụ */}
          {bookingFee > 0 ? (
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
          ) : null}

          {/* Tạm tính */}
          <div className="flex justify-between gap-4 border-t border-white/10 pt-3 font-medium text-white">
            <span>
              Tạm tính
            </span>

            <span>
              {(
                subtotal +
                bookingFee +
                comboTotal
              ).toLocaleString(
                'vi-VN',
              )}{' '}
              đ
            </span>
          </div>

          {/* Voucher */}
          {discount > 0 ? (
            <div className="flex justify-between gap-4 text-emerald-300">
              <span>
                Giảm voucher
              </span>

              <span>
                -
                {discount.toLocaleString(
                  'vi-VN',
                )}{' '}
                đ
              </span>
            </div>
          ) : null}

          {/* Tổng cộng */}
          <div className="flex items-end justify-between gap-4 border-t border-white/10 pt-4">
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

        {/* =================================================
            THANH TOÁN
        ================================================== */}
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
            : `Thanh toán SePay ${total.toLocaleString(
                'vi-VN',
              )} đ`}
        </button>

        <p className="mt-3 text-center text-[11px] leading-5 text-slate-500">
          Combo đã chọn sẽ được tính vào đơn
          thanh toán hiện tại.
        </p>
      </aside>
    </div>
  );
}