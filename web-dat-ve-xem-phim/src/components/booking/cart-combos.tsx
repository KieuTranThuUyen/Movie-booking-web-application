'use client';

import Link from 'next/link';

import {
  useMemo,
  useState,
} from 'react';

type Combo = {
  id: string;

  name: string;

  description: string;

  imageUrl: string | null;

  price: number;

  stock: number;
};

type SeatLine = {
  code: string;

  type: string;

  price: number;
};

type Props = {
  movieTitle: string;

  cinemaName: string;

  hallName: string;

  startTime: Date | string;

  combos: Combo[];

  showtimeId: string;

  seats: string[];

  seatDetails: SeatLine[];

  seatSubtotal: number;
};

export function CartCombos({
  movieTitle,

  cinemaName,

  hallName,

  startTime,

  combos,

  showtimeId,

  seats,

  seatDetails,

  seatSubtotal,
}: Props) {
  /*
   * ============================================================
   * QUANTITY COMBO
   * ============================================================
   */

  const [
    quantities,
    setQuantities,
  ] = useState<
    Record<
      string,
      number
    >
  >({});

  /*
   * ============================================================
   * COMBO ĐÃ CHỌN
   * ============================================================
   */

  const selectedCombos =
    useMemo(
      () =>
        combos
          .map(
            (combo) => ({
              ...combo,

              quantity:
                quantities[
                  combo.id
                ] ?? 0,
            }),
          )
          .filter(
            (combo) =>
              combo.quantity > 0,
          ),

      [
        combos,
        quantities,
      ],
    );

  /*
   * ============================================================
   * TIỀN COMBO
   * ============================================================
   */

  const comboTotal =
    selectedCombos.reduce(
      (
        total,
        combo,
      ) =>
        total +
        Number(
          combo.price,
        ) *
          combo.quantity,

      0,
    );

  /*
   * ============================================================
   * TỔNG CỘNG
   * ============================================================
   */

  const grandTotal =
    seatSubtotal +
    comboTotal;

  /*
   * ============================================================
   * PARAMS THANH TOÁN
   * ============================================================
   */

  const params =
    new URLSearchParams({
      showtime:
        showtimeId,

      seats:
        seats.join(','),
    });

  if (
    selectedCombos.length >
    0
  ) {
    params.set(
      'combos',

      selectedCombos
        .map(
          (combo) =>
            `${combo.id}:${combo.quantity}`,
        )
        .join(','),
    );
  }

  /*
   * ============================================================
   * THAY ĐỔI SỐ LƯỢNG COMBO
   * ============================================================
   */

  const setQty = (
    id: string,

    stock: number,

    raw: string,
  ) => {
    const numberValue =
      Number(raw);

    const quantity =
      Math.min(
        stock,

        Math.max(
          0,

          Math.floor(
            Number.isFinite(
              numberValue,
            )
              ? numberValue
              : 0,
          ),
        ),
      );

    setQuantities(
      (previous) => ({
        ...previous,

        [id]:
          quantity,
      }),
    );
  };

  return (
    <div
      className="
        grid
        gap-6
        lg:grid-cols-[1.15fr_0.85fr]
        lg:items-start
      "
    >
      {/* ======================================================
          CỘT TRÁI
         ====================================================== */}

      <div className="min-w-0 space-y-6">
        {/* ====================================================
            THÔNG TIN VÉ
           ==================================================== */}

        <section
          className="
            rounded-[28px]
            border
            border-white/10
            bg-slate-950/70
            p-6
            shadow-glow
            backdrop-blur-xl
          "
        >
          <div
            className="
              rounded-3xl
              border
              border-white/10
              bg-white/5
              p-5
            "
          >
            {/* PHIM */}

            <div className="text-xl font-semibold text-white">
              {movieTitle}
            </div>

            {/* RẠP + PHÒNG */}

            <div className="mt-2 text-sm text-slate-300">
              {cinemaName}
              {' · '}
              {hallName}
            </div>

            {/* THỜI GIAN */}

            <div className="mt-2 text-sm text-slate-300">
              {new Date(
                startTime,
              ).toLocaleString(
                'vi-VN',
              )}
            </div>

            {/* GHẾ */}

            <div className="mt-6">
              <div className="text-sm font-semibold text-white">
                Ghế đã chọn
              </div>

              <div className="mt-3 space-y-2">
                {seatDetails.length >
                0 ? (
                  seatDetails.map(
                    (seat) => (
                      <div
                        key={
                          seat.code
                        }
                        className="
                          flex
                          items-center
                          justify-between
                          rounded-2xl
                          border
                          border-white/10
                          bg-white/5
                          px-4
                          py-3
                        "
                      >
                        <div className="flex items-center gap-3">
                          <span className="font-semibold text-white">
                            {
                              seat.code
                            }
                          </span>

                          <span
                            className="
                              rounded-lg
                              bg-slate-700/60
                              px-2
                              py-1
                              text-xs
                              text-slate-300
                            "
                          >
                            {
                              seat.type
                            }
                          </span>
                        </div>

                        <span className="font-semibold text-white">
                          {seat.price.toLocaleString(
                            'vi-VN',
                          )}{' '}
                          đ
                        </span>
                      </div>
                    ),
                  )
                ) : (
                  <div
                    className="
                      rounded-2xl
                      border
                      border-white/10
                      bg-white/5
                      p-4
                      text-sm
                      text-slate-300
                    "
                  >
                    Không còn ghế nào được bạn giữ.
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* ====================================================
            COMBO
           ==================================================== */}

        <section
          className="
            rounded-[28px]
            border
            border-white/10
            bg-slate-950/70
            p-6
            shadow-glow
            backdrop-blur-xl
          "
        >
          <h2 className="text-lg font-semibold text-white">
            Combo bắp nước
          </h2>

          <p className="mt-1 text-sm text-slate-400">
            Chọn combo để nhận QR riêng cùng đơn vé.
          </p>

          {combos.length === 0 ? (
            <div
              className="
                mt-4
                rounded-2xl
                border
                border-white/10
                bg-white/5
                p-5
                text-sm
                text-slate-400
              "
            >
              Hiện chưa có combo đang bán.
            </div>
          ) : (
            <div
              className="
                mt-4
                grid
                gap-3
                sm:grid-cols-2
              "
            >
              {combos.map(
                (combo) => (
                  <label
                    key={
                      combo.id
                    }
                    className="
                      flex
                      min-w-0
                      items-center
                      gap-3
                      rounded-2xl
                      border
                      border-white/10
                      bg-white/5
                      p-3
                      text-sm
                      text-slate-200
                      transition
                      hover:border-sky-400/30
                      hover:bg-white/[0.07]
                    "
                  >
                    {/* ========================================
                        ẢNH COMBO
                       ======================================== */}

                    <div
                      className="
                        flex
                        h-[80px]
                        w-[80px]
                        shrink-0
                        items-center
                        justify-center
                      "
                    >
                      {combo.imageUrl ? (
                        <img
                          src={
                            combo.imageUrl
                          }
                          alt={
                            combo.name
                          }
                          className="
                            h-[80px]
                            w-[80px]
                            rounded-xl
                            border
                            border-white/10
                            bg-slate-900
                            object-cover
                          "
                        />
                      ) : (
                        <div
                          className="
                            flex
                            h-[80px]
                            w-[80px]
                            items-center
                            justify-center
                            rounded-xl
                            border
                            border-white/10
                            bg-slate-900
                            text-2xl
                          "
                        >
                          🍿
                        </div>
                      )}
                    </div>

                    {/* ========================================
                        THÔNG TIN
                       ======================================== */}

                    <span className="min-w-0 flex-1">
                      <span className="block font-semibold text-white">
                        {
                          combo.name
                        }
                      </span>

                      <span className="mt-1 block line-clamp-2 text-xs leading-5 text-slate-400">
                        {
                          combo.description
                        }
                      </span>

                      <span className="mt-1 flex flex-wrap items-center gap-2">
                        <b className="text-sky-300">
                          {Number(
                            combo.price,
                          ).toLocaleString(
                            'vi-VN',
                          )}{' '}
                          đ
                        </b>

                        <span className="text-xs text-slate-500">
                          Còn{' '}
                          {
                            combo.stock
                          }
                        </span>
                      </span>
                    </span>

                    {/* ========================================
                        SỐ LƯỢNG
                       ======================================== */}

                    <input
                      type="number"
                      min={0}
                      max={
                        combo.stock
                      }
                      value={
                        quantities[
                          combo.id
                        ] ?? 0
                      }
                      onChange={(
                        event,
                      ) =>
                        setQty(
                          combo.id,

                          combo.stock,

                          event.target
                            .value,
                        )
                      }
                      className="
                        w-16
                        shrink-0
                        rounded-lg
                        border
                        border-white/10
                        bg-slate-900
                        px-2
                        py-1.5
                        text-center
                        font-semibold
                        text-white
                        outline-none
                        focus:border-sky-400/50
                      "
                    />
                  </label>
                ),
              )}
            </div>
          )}
        </section>
      </div>

      {/* ======================================================
          CỘT PHẢI — TÓM TẮT
         ====================================================== */}

      <aside
        className="
          self-start
          rounded-[28px]
          border
          border-white/10
          bg-slate-950/70
          p-6
          shadow-glow
          backdrop-blur-xl
          lg:sticky
          lg:top-6
        "
      >
        {/* TIÊU ĐỀ */}

        <div className="text-lg font-semibold text-white">
          Tóm tắt
        </div>

        <div className="mt-4 space-y-3 text-sm text-slate-200">
          {/* ==================================================
              SỐ VÉ
             ================================================== */}

          <div className="flex items-center justify-between">
            <span className="text-slate-400">
              Số vé
            </span>

            <span className="font-medium text-white">
              {
                seatDetails.length
              }
            </span>
          </div>

          {/* ==================================================
              CHI TIẾT VÉ
             ================================================== */}

          <div className="border-t border-white/10 pt-3">
            <div className="mb-2 font-semibold text-white">
              Chi tiết vé
            </div>

            <div className="space-y-2">
              {seatDetails.map(
                (seat) => (
                  <div
                    key={
                      seat.code
                    }
                    className="flex items-center justify-between gap-3 text-sm"
                  >
                    <span className="text-slate-300">
                      {
                        seat.code
                      }{' '}
                      <span className="text-slate-500">
                        (
                        {
                          seat.type
                        }
                        )
                      </span>
                    </span>

                    <span className="shrink-0 text-white">
                      {seat.price.toLocaleString(
                        'vi-VN',
                      )}{' '}
                      đ
                    </span>
                  </div>
                ),
              )}
            </div>

            <div className="mt-3 flex items-center justify-between border-t border-white/5 pt-3">
              <span className="text-slate-400">
                Tiền vé
              </span>

              <span className="font-medium text-white">
                {seatSubtotal.toLocaleString(
                  'vi-VN',
                )}{' '}
                đ
              </span>
            </div>
          </div>

          {/* ==================================================
              COMBO
             ================================================== */}

          <div className="border-t border-white/10 pt-3">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-white">
                Combo
              </span>

              {selectedCombos.length >
              0 ? (
                <span className="text-xs text-sky-300">
                  {
                    selectedCombos.length
                  }{' '}
                  loại
                </span>
              ) : (
                <span className="text-xs text-slate-500">
                  Chọn bên trái
                </span>
              )}
            </div>

            {selectedCombos.length >
            0 ? (
              <div className="mt-3 space-y-2">
                {selectedCombos.map(
                  (combo) => (
                    <div
                      key={
                        combo.id
                      }
                      className="
                        flex
                        items-center
                        justify-between
                        gap-3
                        rounded-xl
                        border
                        border-white/5
                        bg-white/[0.025]
                        p-2.5
                      "
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        {combo.imageUrl ? (
                          <img
                            src={
                              combo.imageUrl
                            }
                            alt={
                              combo.name
                            }
                            className="
                              h-11
                              w-14
                              shrink-0
                              rounded-lg
                              border
                              border-white/10
                              object-cover
                            "
                          />
                        ) : (
                          <div
                            className="
                              flex
                              h-11
                              w-14
                              shrink-0
                              items-center
                              justify-center
                              rounded-lg
                              border
                              border-white/10
                              bg-slate-900
                            "
                          >
                            🍿
                          </div>
                        )}

                        <div className="min-w-0">
                          <div className="truncate text-sm text-slate-200">
                            {
                              combo.name
                            }
                          </div>

                          <div className="mt-0.5 text-xs text-slate-500">
                            ×{' '}
                            {
                              combo.quantity
                            }
                          </div>
                        </div>
                      </div>

                      <span className="shrink-0 text-sm text-white">
                        {(
                          Number(
                            combo.price,
                          ) *
                          combo.quantity
                        ).toLocaleString(
                          'vi-VN',
                        )}{' '}
                        đ
                      </span>
                    </div>
                  ),
                )}

                <div className="flex items-center justify-between pt-1">
                  <span className="text-slate-400">
                    Tiền combo
                  </span>

                  <span className="text-white">
                    {comboTotal.toLocaleString(
                      'vi-VN',
                    )}{' '}
                    đ
                  </span>
                </div>
              </div>
            ) : (
              <div
                className="
                  mt-3
                  rounded-xl
                  border
                  border-white/5
                  bg-white/[0.025]
                  p-3
                  text-xs
                  text-slate-500
                "
              >
                Giá combo sẽ được cập nhật theo số lượng bạn chọn.
              </div>
            )}
          </div>

          {/* ==================================================
              TỔNG TIỀN
             ================================================== */}

          <div
            className="
              flex
              items-center
              justify-between
              border-t
              border-white/10
              pt-4
            "
          >
            <span className="text-base font-semibold text-white">
              Tổng tiền
            </span>

            <span className="text-xl font-bold text-sky-300">
              {grandTotal.toLocaleString(
                'vi-VN',
              )}{' '}
              đ
            </span>
          </div>
        </div>

        {/* ==================================================
            NÚT THANH TOÁN
            LUÔN Ở CUỐI TÓM TẮT
           ================================================== */}

        {seatDetails.length >
        0 ? (
          <Link
            href={`/thanh-toan?${params.toString()}`}
            className="
              mt-6
              inline-flex
              w-full
              items-center
              justify-center
              rounded-2xl
              bg-white
              px-4
              py-3
              font-semibold
              text-slate-950
              transition
              hover:bg-slate-100
            "
          >
            Sang thanh toán
          </Link>
        ) : null}
      </aside>
    </div>
  );
}