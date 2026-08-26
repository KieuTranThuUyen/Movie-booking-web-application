'use client';

import { useRouter } from 'next/navigation';

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';

type HeldSeat = {
  id?: string;

  seatId: string;

  seatCode: string;

  expiresAt: string;

  userId?: string | null;

  isMine?: boolean;
};

type Seat = {
  id: string;

  code: string;

  isActive: boolean;

  rowLabel?: string;

  seatNumber?: number;

  type?: string;
};

type SeatGridProps = {
  movieSlug: string;

  showtimeId: string;

  movieTitle: string;

  cinemaName: string;

  hallName: string;

  startTime: string;

  standardPrice: number;

  vipPrice: number;

  couplePrice: number;

  soldSeats: string[];

  heldSeats: HeldSeat[];
};

const rows = [
  'A',
  'B',
  'C',
  'D',
  'E',
  'F',
];

const formatRemainingTime = (
  expiresAt: string,
) => {
  const remaining =
    Math.max(
      0,
      new Date(
        expiresAt,
      ).getTime() -
        Date.now(),
    );

  const totalSeconds =
    Math.floor(
      remaining / 1000,
    );

  const minutes =
    Math.floor(
      totalSeconds / 60,
    );

  const seconds =
    totalSeconds % 60;

  return `${minutes}:${seconds
    .toString()
    .padStart(2, '0')}`;
};

export function SeatGrid({
  movieSlug,
  showtimeId,
  movieTitle,
  cinemaName,
  hallName,
  startTime,
  standardPrice,
  vipPrice,
  couplePrice,
  soldSeats,
  heldSeats,
}: SeatGridProps) {
  const router = useRouter();

  const [
    selectedSeats,
    setSelectedSeats,
  ] = useState<string[]>(
    [],
  );

  const [
    currentHeldSeats,
    setCurrentHeldSeats,
  ] = useState<HeldSeat[]>(
    heldSeats,
  );

  const [
    seats,
    setSeats,
  ] = useState<Seat[]>(
    [],
  );

  const [
    message,
    setMessage,
  ] = useState('');

  const [
    loadingSeat,
    setLoadingSeat,
  ] = useState('');

  const [
    loadingSeats,
    setLoadingSeats,
  ] = useState(true);

  const [
    timeLeft,
    setTimeLeft,
  ] = useState<
    Record<
      string,
      string
    >
  >({});

  /*
   * ============================================================
   * GIÁ GHẾ
   * ============================================================
   */

  const getSeatPrice =
    useCallback(
      (seatCode: string) => {
        const seat =
          seats.find(
            (item) =>
              item.code ===
              seatCode,
          );

        if (!seat) {
          return 0;
        }

        switch (
          seat.type?.toUpperCase()
        ) {
          case 'VIP':
            return (
              Number(
                vipPrice,
              ) || 0
            );

          case 'COUPLE':
            return (
              Number(
                couplePrice,
              ) || 0
            );

          default:
            return (
              Number(
                standardPrice,
              ) || 0
            );
        }
      },
      [
        seats,
        standardPrice,
        vipPrice,
        couplePrice,
      ],
    );

  /*
   * ============================================================
   * TOTAL
   * ============================================================
   */

  const total =
    useMemo(
      () =>
        selectedSeats.reduce(
          (
            sum,
            seatCode,
          ) =>
            sum +
            getSeatPrice(
              seatCode,
            ),
          0,
        ),
      [
        selectedSeats,
        getSeatPrice,
      ],
    );

  /*
   * ============================================================
   * FETCH SEATS
   * ============================================================
   */

  const fetchSeats =
    useCallback(
      async () => {
        try {
          const response =
            await fetch(
              `/api/showtimes/${encodeURIComponent(
                showtimeId,
              )}/seats`,
              {
                cache:
                  'no-store',
              },
            );

          if (
            !response.ok
          ) {
            throw new Error(
              'Không thể lấy danh sách ghế.',
            );
          }

          const data =
            (await response.json()) as Seat[];

          setSeats(data);
        } catch (error) {
          console.error(
            'Fetch seats error:',
            error,
          );

          setMessage(
            'Không thể lấy danh sách ghế. Vui lòng tải lại trang.',
          );
        } finally {
          setLoadingSeats(
            false,
          );
        }
      },
      [showtimeId],
    );

  /*
   * ============================================================
   * FETCH HOLD
   *
   * Server là nguồn sự thật.
   *
   * ============================================================
   */

  const fetchHeldSeats =
    useCallback(
      async () => {
        try {
          const response =
            await fetch(
              `/api/seat-holds?showtimeId=${encodeURIComponent(
                showtimeId,
              )}`,
              {
                cache:
                  'no-store',

                headers: {
                  'Cache-Control':
                    'no-cache',
                },
              },
            );

          if (
            !response.ok
          ) {
            return;
          }

          const data =
            (await response.json()) as HeldSeat[];

          const validHolds =
            data.filter(
              (hold) =>
                new Date(
                  hold.expiresAt,
                ).getTime() >
                Date.now(),
            );

          /*
           * Server → current hold
           */
          setCurrentHeldSeats(
            validHolds,
          );

          /*
           * User đang giữ ghế nào thì selected đúng
           * những ghế đó.
           */
          const myHeldCodes =
            validHolds
              .filter(
                (hold) =>
                  hold.isMine ===
                  true,
              )
              .map(
                (hold) =>
                  hold.seatCode,
              )
              .sort();

          setSelectedSeats(
            myHeldCodes,
          );
        } catch (error) {
          console.error(
            'Fetch held seats error:',
            error,
          );
        }
      },
      [showtimeId],
    );

  /*
   * ============================================================
   * INITIAL
   * ============================================================
   */

  useEffect(() => {
    void fetchSeats();

    void fetchHeldSeats();
  }, [
    fetchSeats,
    fetchHeldSeats,
  ]);

  /*
   * ============================================================
   * REFRESH KHI QUAY LẠI TAB
   * ============================================================
   */

  useEffect(() => {
    const handleFocus =
      () => {
        void fetchSeats();

        void fetchHeldSeats();
      };

    const handleVisibility =
      () => {
        if (
          document.visibilityState ===
          'visible'
        ) {
          void fetchSeats();

          void fetchHeldSeats();
        }
      };

    window.addEventListener(
      'focus',
      handleFocus,
    );

    document.addEventListener(
      'visibilitychange',
      handleVisibility,
    );

    return () => {
      window.removeEventListener(
        'focus',
        handleFocus,
      );

      document.removeEventListener(
        'visibilitychange',
        handleVisibility,
      );
    };
  }, [
    fetchSeats,
    fetchHeldSeats,
  ]);

  /*
   * ============================================================
   * AUTO REFRESH
   * ============================================================
   */

  useEffect(() => {
    const timer =
      window.setInterval(
        () => {
          void fetchHeldSeats();
        },
        5000,
      );

    return () => {
      window.clearInterval(
        timer,
      );
    };
  }, [
    fetchHeldSeats,
  ]);

  /*
   * ============================================================
   * COUNTDOWN
   * ============================================================
   */

  useEffect(() => {
    const update =
      () => {
        const next:
          Record<
            string,
            string
          > = {};

        currentHeldSeats.forEach(
          (hold) => {
            next[
              hold.seatCode
            ] =
              formatRemainingTime(
                hold.expiresAt,
              );
          },
        );

        setTimeLeft(
          next,
        );
      };

    update();

    const timer =
      window.setInterval(
        update,
        1000,
      );

    return () => {
      window.clearInterval(
        timer,
      );
    };
  }, [
    currentHeldSeats,
  ]);

  /*
   * ============================================================
   * HANDLE EXPIRED
   * ============================================================
   */

  useEffect(() => {
    const timer =
      window.setInterval(
        () => {
          const now =
            Date.now();

          const expired =
            currentHeldSeats.filter(
              (hold) =>
                new Date(
                  hold.expiresAt,
                ).getTime() <=
                now,
            );

          if (
            expired.length ===
            0
          ) {
            return;
          }

          const expiredCodes =
            expired.map(
              (hold) =>
                hold.seatCode,
            );

          setCurrentHeldSeats(
            (current) =>
              current.filter(
                (hold) =>
                  !expiredCodes.includes(
                    hold.seatCode,
                  ),
              ),
          );

          setSelectedSeats(
            (current) =>
              current.filter(
                (seatCode) =>
                  !expiredCodes.includes(
                    seatCode,
                  ),
              ),
          );

          setMessage(
            `Ghế ${expiredCodes.join(
              ', ',
            )} đã hết thời gian giữ.`,
          );

          void fetchHeldSeats();
        },
        1000,
      );

    return () => {
      window.clearInterval(
        timer,
      );
    };
  }, [
    currentHeldSeats,
    fetchHeldSeats,
  ]);

  /*
   * ============================================================
   * GET HOLD
   * ============================================================
   */

  const getHeldSeat =
    useCallback(
      (
        seatCode: string,
      ) =>
        currentHeldSeats.find(
          (hold) =>
            hold.seatCode ===
            seatCode,
        ),
      [
        currentHeldSeats,
      ],
    );

  /*
   * ============================================================
   * GET SEAT
   * ============================================================
   */

  const getSeatByCode =
    useCallback(
      (
        seatCode: string,
      ) =>
        seats.find(
          (seat) =>
            seat.code ===
            seatCode,
        ),
      [seats],
    );

  /*
   * ============================================================
   * HOLD SEAT
   * ============================================================
   */

  const holdSeat =
    async (
      seatCode: string,
    ) => {
      setLoadingSeat(
        seatCode,
      );

      setMessage('');

      try {
        const seat =
          getSeatByCode(
            seatCode,
          );

        if (!seat) {
          setMessage(
            `Không tìm thấy ghế ${seatCode}.`,
          );

          return;
        }

        if (!seat.isActive) {
          setMessage(
            `Ghế ${seatCode} đang bị khóa bởi quản trị viên.`,
          );

          return;
        }

        if (
          soldSeats.includes(
            seatCode,
          )
        ) {
          setMessage(
            `Ghế ${seatCode} đã được đặt.`,
          );

          return;
        }

        /*
         * Kiểm tra server trước.
         */
        const response =
          await fetch(
            `/api/seat-holds?showtimeId=${encodeURIComponent(
              showtimeId,
            )}`,
            {
              cache:
                'no-store',
            },
          );

        if (
          response.ok
        ) {
          const holds =
            (await response.json()) as HeldSeat[];

          const validHolds =
            holds.filter(
              (hold) =>
                new Date(
                  hold.expiresAt,
                ).getTime() >
                Date.now(),
            );

          setCurrentHeldSeats(
            validHolds,
          );

          const existing =
            validHolds.find(
              (hold) =>
                hold.seatCode ===
                seatCode,
            );

          if (
            existing
          ) {
            if (
              existing.isMine
            ) {
              setSelectedSeats(
                (
                  current,
                ) =>
                  current.includes(
                    seatCode,
                  )
                    ? current
                    : [
                        ...current,
                        seatCode,
                      ].sort(),
              );

              return;
            }

            setMessage(
              `Ghế ${seatCode} đang được người khác giữ.`,
            );

            return;
          }
        }

        /*
         * Tạo hold.
         */
        const holdResponse =
          await fetch(
            '/api/seat-holds',
            {
              method:
                'POST',

              headers: {
                'Content-Type':
                  'application/json',
              },

              body: JSON.stringify({
                showtimeId,

                seatIds: [
                  seat.id,
                ],
              }),
            },
          );

        const data =
          (await holdResponse.json()) as {
            message?: string;
          };

        if (
          !holdResponse.ok
        ) {
          setMessage(
            data.message ??
              'Không thể giữ ghế.',
          );

          await fetchHeldSeats();

          return;
        }

        await fetchHeldSeats();

        setMessage(
          `Đã giữ ghế ${seatCode} trong 10 phút.`,
        );
      } catch (error) {
        console.error(
          'Hold seat error:',
          error,
        );

        setMessage(
          'Không thể giữ ghế. Vui lòng thử lại.',
        );
      } finally {
        setLoadingSeat(
          '',
        );
      }
    };

  /*
   * ============================================================
   * RELEASE SEAT
   * ============================================================
   */

  const releaseSeat =
    async (
      seatCode: string,
    ) => {
      const heldSeat =
        getHeldSeat(
          seatCode,
        );

      setLoadingSeat(
        seatCode,
      );

      setMessage('');

      try {
        if (!heldSeat) {
          setSelectedSeats(
            (current) =>
              current.filter(
                (seat) =>
                  seat !==
                  seatCode,
              ),
          );

          return;
        }

        if (
          heldSeat.isMine ===
          false
        ) {
          setMessage(
            `Ghế ${seatCode} đang được người khác giữ.`,
          );

          return;
        }

        const response =
          await fetch(
            '/api/seat-holds',
            {
              method:
                'DELETE',

              headers: {
                'Content-Type':
                  'application/json',
              },

              body: JSON.stringify({
                showtimeId,

                seatIds: [
                  heldSeat.seatId,
                ],
              }),
            },
          );

        const data =
          (await response.json()) as {
            success?: boolean;

            message?: string;

            deletedCount?: number;
          };

        if (
          !response.ok
        ) {
          setMessage(
            data.message ??
              'Không thể bỏ giữ ghế.',
          );

          return;
        }

        /*
         * Xóa local ngay.
         */
        setSelectedSeats(
          (current) =>
            current.filter(
              (seat) =>
                seat !==
                seatCode,
            ),
        );

        setCurrentHeldSeats(
          (current) =>
            current.filter(
              (hold) =>
                hold.seatCode !==
                seatCode,
            ),
        );

        setMessage(
          `Đã bỏ giữ ghế ${seatCode}.`,
        );

        /*
         * Đồng bộ lại server.
         */
        await fetchHeldSeats();
      } catch (error) {
        console.error(
          'Release seat error:',
          error,
        );

        setMessage(
          'Không thể bỏ giữ ghế. Vui lòng thử lại.',
        );
      } finally {
        setLoadingSeat(
          '',
        );
      }
    };

  /*
   * ============================================================
   * TOGGLE
   * ============================================================
   */

  const toggleSeat =
    async (
      seatCode: string,
    ) => {
      if (
        soldSeats.includes(
          seatCode,
        )
      ) {
        return;
      }

      if (
        loadingSeat ===
        seatCode
      ) {
        return;
      }

      if (
        selectedSeats.includes(
          seatCode,
        )
      ) {
        await releaseSeat(
          seatCode,
        );

        return;
      }

      const heldSeat =
        getHeldSeat(
          seatCode,
        );

      if (
        heldSeat
      ) {
        if (
          heldSeat.isMine
        ) {
          setSelectedSeats(
            (current) =>
              current.includes(
                seatCode,
              )
                ? current
                : [
                    ...current,
                    seatCode,
                  ].sort(),
          );

          return;
        }

        setMessage(
          `Ghế ${seatCode} đang được người khác giữ.`,
        );

        return;
      }

      await holdSeat(
        seatCode,
      );
    };

  /*
   * ============================================================
   * GO TO CART
   * ============================================================
   */

  const goToCart =
    async () => {
      if (
        selectedSeats.length ===
        0
      ) {
        setMessage(
          'Vui lòng chọn ít nhất một ghế.',
        );

        return;
      }

      try {
        const response =
          await fetch(
            `/api/seat-holds?showtimeId=${encodeURIComponent(
              showtimeId,
            )}`,
            {
              cache:
                'no-store',
            },
          );

        if (
          !response.ok
        ) {
          setMessage(
            'Không thể kiểm tra trạng thái ghế.',
          );

          return;
        }

        const holds =
          (await response.json()) as HeldSeat[];

        const myHeldCodes =
          holds
            .filter(
              (hold) =>
                hold.isMine,
            )
            .filter(
              (hold) =>
                new Date(
                  hold.expiresAt,
                ).getTime() >
                Date.now(),
            )
            .map(
              (hold) =>
                hold.seatCode,
            )
            .sort();

        /*
         * Server là nguồn sự thật.
         */
        setCurrentHeldSeats(
          holds,
        );

        setSelectedSeats(
          myHeldCodes,
        );

        const missing =
          selectedSeats.filter(
            (seatCode) =>
              !myHeldCodes.includes(
                seatCode,
              ),
          );

        if (
          missing.length >
          0
        ) {
          setMessage(
            `Ghế ${missing.join(
              ', ',
            )} không còn được bạn giữ.`,
          );

          return;
        }

        router.push(
          `/gio-hang?movie=${encodeURIComponent(
            movieSlug,
          )}&showtime=${encodeURIComponent(
            showtimeId,
          )}&seats=${encodeURIComponent(
            myHeldCodes.join(
              ',',
            ),
          )}`,
        );
      } catch (error) {
        console.error(
          'Go to cart error:',
          error,
        );

        setMessage(
          'Không thể chuyển sang giỏ vé.',
        );
      }
    };

  /*
   * ============================================================
   * RENDER
   * ============================================================
   */

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
      <section className="rounded-[28px] border border-white/10 bg-slate-950/70 p-6 shadow-glow backdrop-blur-xl">
        <div>
          <h2 className="text-2xl font-semibold text-white">
            Chọn ghế
          </h2>

          <p className="mt-2 text-sm text-slate-300">
            {movieTitle} |{' '}
            {cinemaName} |{' '}
            {hallName} |{' '}
            {new Date(
              startTime,
            ).toLocaleString(
              'vi-VN',
            )}
          </p>
        </div>

        <div className="mt-6 space-y-4">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
              Loại ghế
            </p>

            <div className="flex flex-wrap gap-4 text-xs text-slate-300">
              <div className="flex items-center gap-2">
                <span className="h-4 w-4 rounded border border-sky-400/50 bg-sky-500/10" />

                <span>
                  Ghế thường
                </span>
              </div>

              <div className="flex items-center gap-2">
                <span className="h-4 w-4 rounded border border-amber-400/70 bg-amber-500/15" />

                <span>
                  Ghế VIP
                </span>
              </div>

              <div className="flex items-center gap-2">
                <span className="h-4 w-4 rounded border border-pink-400/70 bg-pink-500/15" />

                <span>
                  Ghế đôi
                </span>
              </div>
            </div>
          </div>

          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
              Trạng thái
            </p>

            <div className="flex flex-wrap gap-4 text-xs text-slate-300">
              <div className="flex items-center gap-2">
                <span className="h-4 w-4 rounded border border-sky-400/50 bg-sky-500/10" />

                <span>
                  Ghế trống
                </span>
              </div>

              <div className="flex items-center gap-2">
                <span className="h-4 w-4 rounded border border-emerald-400/60 bg-emerald-500" />

                <span>
                  Đang chọn
                </span>
              </div>

              <div className="flex items-center gap-2">
                <span className="h-4 w-4 rounded border border-rose-400/40 bg-rose-500/20" />

                <span>
                  Đã bán
                </span>
              </div>

              <div className="flex items-center gap-2">
                <span className="h-4 w-4 rounded border border-amber-400/40 bg-amber-500/20" />

                <span>
                  Đang được giữ
                </span>
              </div>

              <div className="flex items-center gap-2">
                <span className="h-4 w-4 rounded border border-slate-500/20 bg-slate-700/30" />

                <span>
                  Đang khóa
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 grid gap-3 rounded-[24px] border border-white/10 bg-white/5 p-4">
          <div className="mx-auto mb-3 flex w-1/2 flex-col items-center">
            <div className="h-2 w-full rounded-full bg-sky-400/60 shadow-[0_0_25px_rgba(56,189,248,0.35)]" />

            <span className="mt-2 text-[10px] uppercase tracking-[0.3em] text-slate-500">
              Màn hình
            </span>
          </div>

          {loadingSeats ? (
            <div className="py-10 text-center text-sm text-slate-400">
              Đang tải sơ đồ ghế...
            </div>
          ) : seats.length ===
            0 ? (
            <div className="py-10 text-center text-sm text-slate-400">
              Chưa có ghế trong phòng
              chiếu.
            </div>
          ) : (
            rows.map(
              (row) => (
                <div
                  key={row}
                  className="flex flex-wrap justify-center gap-2"
                >
                  {Array.from(
                    {
                      length: 8,
                    },
                    (
                      _,
                      index,
                    ) => {
                      const seatCode =
                        `${row}${index + 1}`;

                      const seat =
                        getSeatByCode(
                          seatCode,
                        );

                      const isInactive =
                        seat
                          ? !seat.isActive
                          : true;

                      const isSelected =
                        selectedSeats.includes(
                          seatCode,
                        );

                      const isSold =
                        soldSeats.includes(
                          seatCode,
                        );

                      const heldSeat =
                        getHeldSeat(
                          seatCode,
                        );

                      const isHeldBySomeoneElse =
                        Boolean(
                          heldSeat,
                        ) &&
                        heldSeat?.isMine ===
                          false;

                      const isMyHold =
                        Boolean(
                          heldSeat,
                        ) &&
                        heldSeat?.isMine ===
                          true;

                      const isLoading =
                        loadingSeat ===
                        seatCode;

                      const remainingTime =
                        heldSeat
                          ? timeLeft[
                              seatCode
                            ]
                          : undefined;

                      const price =
                        getSeatPrice(
                          seatCode,
                        );

                      const type =
                        seat?.type?.toUpperCase() ??
                        'STANDARD';

                      const typeClass =
                        type ===
                        'VIP'
                          ? 'border-amber-400/70 bg-amber-500/15 text-amber-200'
                          : type ===
                              'COUPLE'
                            ? 'border-pink-400/70 bg-pink-500/15 text-pink-200'
                            : 'border-sky-400/50 bg-sky-500/10 text-sky-200';

                      const typeLabel =
                        type ===
                        'VIP'
                          ? 'Ghế VIP'
                          : type ===
                              'COUPLE'
                            ? 'Ghế đôi'
                            : 'Ghế thường';

                      return (
                        <button
                          key={
                            seatCode
                          }
                          type="button"
                          onClick={() =>
                            void toggleSeat(
                              seatCode,
                            )
                          }
                          disabled={
                            isSold ||
                            isInactive ||
                            isHeldBySomeoneElse ||
                            isLoading
                          }
                          title={
                            isSold
                              ? 'Ghế đã được đặt'
                              : isInactive
                                ? 'Ghế đang bị khóa'
                                : isHeldBySomeoneElse
                                  ? `Đang được người khác giữ - còn ${
                                      remainingTime ??
                                      '...'
                                    }`
                                  : isSelected ||
                                      isMyHold
                                    ? `Bạn đang giữ ghế - còn ${
                                        remainingTime ??
                                        '...'
                                      }`
                                    : `${typeLabel} - ${price.toLocaleString(
                                        'vi-VN',
                                      )} đ`
                          }
                          className={`relative h-11 w-11 rounded-xl border text-xs font-semibold transition ${
                            isSold
                              ? 'cursor-not-allowed border-rose-400/40 bg-rose-500/20 text-rose-200'
                              : isInactive
                                ? 'cursor-not-allowed border-slate-500/20 bg-slate-700/30 text-slate-500'
                                : isHeldBySomeoneElse
                                  ? 'cursor-not-allowed border-amber-400/40 bg-amber-500/20 text-amber-200'
                                  : isSelected ||
                                      isMyHold
                                    ? 'border-emerald-400/60 bg-emerald-500 text-slate-950 shadow-[0_0_18px_rgba(16,185,129,0.35)]'
                                    : `${typeClass} hover:brightness-125`
                          }`}
                        >
                          {seatCode}

                          {(isSelected ||
                            isMyHold) &&
                          remainingTime ? (
                            <span className="absolute -bottom-5 left-1/2 -translate-x-1/2 whitespace-nowrap text-[9px] font-normal text-emerald-300">
                              {
                                remainingTime
                              }
                            </span>
                          ) : null}

                          {isHeldBySomeoneElse &&
                          remainingTime ? (
                            <span className="absolute -bottom-5 left-1/2 -translate-x-1/2 whitespace-nowrap text-[9px] font-normal text-amber-300">
                              {
                                remainingTime
                              }
                            </span>
                          ) : null}

                          {isLoading ? (
                            <span className="absolute inset-0 flex items-center justify-center rounded-xl bg-black/30 text-[10px]">
                              ...
                            </span>
                          ) : null}
                        </button>
                      );
                    },
                  )}
                </div>
              ),
            )
          )}
        </div>

        {message ? (
          <p className="mt-8 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-200">
            {message}
          </p>
        ) : null}
      </section>

      <aside className="space-y-4 rounded-[28px] border border-white/10 bg-slate-950/70 p-6 shadow-glow backdrop-blur-xl">
        <div>
          <h3 className="text-xl font-semibold text-white">
            Thông tin đặt vé
          </h3>

          <p className="mt-2 text-sm text-slate-300">
            Ghế được giữ trong 10
            phút để bạn hoàn tất
            quá trình đặt vé.
          </p>
        </div>

        <div className="space-y-3 rounded-3xl border border-white/10 bg-white/5 p-4 text-sm text-slate-200">
          <div className="flex items-center justify-between gap-3">
            <span>
              Ghế đã chọn
            </span>

            <span className="text-right font-semibold text-white">
              {selectedSeats.join(
                ', ',
              ) ||
                'Chưa chọn'}
            </span>
          </div>

          <div className="flex items-center justify-between gap-3">
            <span>
              Số lượng
            </span>

            <span className="font-semibold text-white">
              {
                selectedSeats.length
              }
            </span>
          </div>

          <div className="border-t border-white/10 pt-3">
            <p className="mb-2 text-sm text-slate-300">
              Chi tiết giá
            </p>

            {selectedSeats.length ===
            0 ? (
              <p className="text-xs text-slate-500">
                Chưa chọn ghế
              </p>
            ) : (
              <div className="space-y-1">
                {selectedSeats.map(
                  (
                    seatCode,
                  ) => {
                    const seat =
                      getSeatByCode(
                        seatCode,
                      );

                    const price =
                      getSeatPrice(
                        seatCode,
                      );

                    const type =
                      seat?.type?.toUpperCase() ??
                      'STANDARD';

                    const typeLabel =
                      type ===
                      'VIP'
                        ? 'VIP'
                        : type ===
                            'COUPLE'
                          ? 'Ghế đôi'
                          : 'Thường';

                    return (
                      <div
                        key={
                          seatCode
                        }
                        className="flex items-center justify-between text-xs"
                      >
                        <span>
                          {
                            seatCode
                          }{' '}
                          <span className="text-slate-500">
                            (
                            {
                              typeLabel
                            }
                            )
                          </span>
                        </span>

                        <span>
                          {price.toLocaleString(
                            'vi-VN',
                          )}{' '}
                          đ
                        </span>
                      </div>
                    );
                  },
                )}
              </div>
            )}
          </div>

          <div className="flex items-center justify-between gap-3 border-t border-white/10 pt-3 text-base font-semibold text-white">
            <span>
              Tổng cộng
            </span>

            <span>
              {total.toLocaleString(
                'vi-VN',
              )}{' '}
              đ
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={() =>
            void goToCart()
          }
          disabled={
            selectedSeats.length ===
              0 ||
            Boolean(
              loadingSeat,
            )
          }
          className="inline-flex w-full items-center justify-center rounded-2xl bg-white px-4 py-3 font-semibold text-slate-950 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Tiếp tục sang giỏ vé
        </button>
      </aside>
    </div>
  );
}