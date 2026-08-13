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

const rows = ['A', 'B', 'C', 'D', 'E', 'F'];

const formatRemainingTime = (expiresAt: string) => {
  const remaining = Math.max(
    0,
    new Date(expiresAt).getTime() - Date.now()
  );

  const totalSeconds = Math.floor(
    remaining / 1000
  );

  const minutes = Math.floor(
    totalSeconds / 60
  );

  const seconds = totalSeconds % 60;

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

  /*
   * ============================================================
   * STATE
   * ============================================================
   */

  const [selectedSeats, setSelectedSeats] =
    useState<string[]>([]);

  const [currentHeldSeats, setCurrentHeldSeats] =
    useState<HeldSeat[]>(heldSeats);

  const [seats, setSeats] = useState<Seat[]>([]);

  const [message, setMessage] = useState('');

  const [loadingSeat, setLoadingSeat] =
    useState('');

  const [loadingSeats, setLoadingSeats] =
    useState(true);

  const [timeLeft, setTimeLeft] = useState<
    Record<string, string>
  >({});

  /*
   * ============================================================
   * PRICE
   * ============================================================
   */

  const getSeatPrice = useCallback(
    (seatCode: string) => {
      const seat = seats.find(
        (item) => item.code === seatCode
      );

      if (!seat) {
        return 0;
      }

      switch (seat.type?.toUpperCase()) {
        case 'VIP':
          return Number(vipPrice) || 0;

        case 'COUPLE':
          return Number(couplePrice) || 0;

        case 'STANDARD':
        default:
          return Number(standardPrice) || 0;
      }
    },
    [
      seats,
      standardPrice,
      vipPrice,
      couplePrice,
    ]
  );

  /*
   * ============================================================
   * TOTAL
   * ============================================================
   */

  const total = useMemo(() => {
    return selectedSeats.reduce(
      (sum, seatCode) =>
        sum + getSeatPrice(seatCode),
      0
    );
  }, [
    selectedSeats,
    getSeatPrice,
  ]);

  /*
   * ============================================================
   * FETCH SEATS
   * ============================================================
   */

  const fetchSeats = useCallback(async () => {
    try {
      const response = await fetch(
        `/api/showtimes/${encodeURIComponent(
          showtimeId
        )}/seats`,
        {
          cache: 'no-store',
        }
      );

      if (!response.ok) {
        throw new Error(
          'Không thể lấy danh sách ghế.'
        );
      }

      const data =
        (await response.json()) as Seat[];

      setSeats(data);
    } catch (error) {
      console.error(
        'Không thể lấy danh sách ghế:',
        error
      );

      setMessage(
        'Không thể lấy danh sách ghế. Vui lòng tải lại trang.'
      );
    } finally {
      setLoadingSeats(false);
    }
  }, [showtimeId]);

  /*
   * ============================================================
   * FETCH HELD SEATS
   * ============================================================
   */

  const fetchHeldSeats = useCallback(async () => {
    try {
      const response = await fetch(
        `/api/seat-holds?showtimeId=${encodeURIComponent(
          showtimeId
        )}`,
        {
          cache: 'no-store',
        }
      );

      if (!response.ok) {
        return;
      }

      const data =
        (await response.json()) as HeldSeat[];

      setCurrentHeldSeats(data);

      const myHeldSeatCodes = data
        .filter((hold) => hold.isMine)
        .map((hold) => hold.seatCode);

      setSelectedSeats((current) => {
        const validCurrent = current.filter(
          (seatCode) =>
            myHeldSeatCodes.includes(
              seatCode
            )
        );

        const newMineSeats =
          myHeldSeatCodes.filter(
            (seatCode) =>
              !validCurrent.includes(
                seatCode
              )
          );

        return [
          ...validCurrent,
          ...newMineSeats,
        ].sort();
      });
    } catch (error) {
      console.error(
        'Không thể lấy trạng thái giữ ghế:',
        error
      );
    }
  }, [showtimeId]);

  /*
   * ============================================================
   * INITIAL LOAD
   * ============================================================
   */

  useEffect(() => {
    fetchSeats();
    fetchHeldSeats();
  }, [
    fetchSeats,
    fetchHeldSeats,
  ]);

  /*
   * ============================================================
   * AUTO REFRESH HOLD
   * ============================================================
   */

  useEffect(() => {
    const interval = window.setInterval(() => {
      fetchHeldSeats();
    }, 5000);

    return () => {
      window.clearInterval(interval);
    };
  }, [fetchHeldSeats]);

  /*
   * ============================================================
   * COUNTDOWN
   * ============================================================
   */

  useEffect(() => {
    const updateCountdown = () => {
      const nextTimeLeft: Record<
        string,
        string
      > = {};

      currentHeldSeats.forEach((hold) => {
        nextTimeLeft[hold.seatCode] =
          formatRemainingTime(
            hold.expiresAt
          );
      });

      setTimeLeft(nextTimeLeft);
    };

    updateCountdown();

    const interval = window.setInterval(
      updateCountdown,
      1000
    );

    return () => {
      window.clearInterval(interval);
    };
  }, [currentHeldSeats]);

  /*
   * ============================================================
   * HANDLE EXPIRED HOLD
   * ============================================================
   */

  useEffect(() => {
    const expiredTimer =
      window.setInterval(() => {
        const now = Date.now();

        const expiredSeats =
          currentHeldSeats.filter(
            (hold) =>
              new Date(
                hold.expiresAt
              ).getTime() <= now
          );

        if (expiredSeats.length === 0) {
          return;
        }

        const expiredCodes =
          expiredSeats.map(
            (hold) => hold.seatCode
          );

        setCurrentHeldSeats((current) =>
          current.filter(
            (hold) =>
              !expiredCodes.includes(
                hold.seatCode
              )
          )
        );

        setSelectedSeats((current) =>
          current.filter(
            (seatCode) =>
              !expiredCodes.includes(
                seatCode
              )
          )
        );

        setMessage(
          `Ghế ${expiredCodes.join(
            ', '
          )} đã hết thời gian giữ.`
        );

        fetchHeldSeats();
      }, 1000);

    return () => {
      window.clearInterval(
        expiredTimer
      );
    };
  }, [
    currentHeldSeats,
    fetchHeldSeats,
  ]);

  /*
   * ============================================================
   * GET HOLD BY SEAT CODE
   * ============================================================
   */

  const getHeldSeat = useCallback(
    (seatCode: string) => {
      return currentHeldSeats.find(
        (hold) =>
          hold.seatCode === seatCode
      );
    },
    [currentHeldSeats]
  );

  /*
   * ============================================================
   * GET SEAT BY CODE
   * ============================================================
   */

  const getSeatByCode = useCallback(
    (seatCode: string) => {
      return seats.find(
        (seat) =>
          seat.code === seatCode
      );
    },
    [seats]
  );

  /*
   * ============================================================
   * HOLD SEAT
   * ============================================================
   */

  const holdSeat = async (
    seatCode: string
  ) => {
    setLoadingSeat(seatCode);
    setMessage('');

    try {
      const seat =
        getSeatByCode(seatCode);

      if (!seat) {
        setMessage(
          `Không tìm thấy ghế ${seatCode}.`
        );
        return;
      }

      if (!seat.isActive) {
        setMessage(
          `Ghế ${seatCode} đang bị khóa bởi quản trị viên.`
        );
        return;
      }

      if (
        soldSeats.includes(seatCode)
      ) {
        setMessage(
          `Ghế ${seatCode} đã được đặt.`
        );
        return;
      }

      const latestResponse =
        await fetch(
          `/api/seat-holds?showtimeId=${encodeURIComponent(
            showtimeId
          )}`,
          {
            cache: 'no-store',
          }
        );

      if (latestResponse.ok) {
        const latestHolds =
          (await latestResponse.json()) as HeldSeat[];

        setCurrentHeldSeats(
          latestHolds
        );

        const existingHold =
          latestHolds.find(
            (hold) =>
              hold.seatCode ===
              seatCode
          );

        if (existingHold) {
          if (existingHold.isMine) {
            setSelectedSeats(
              (current) =>
                current.includes(
                  seatCode
                )
                  ? current
                  : [
                      ...current,
                      seatCode,
                    ].sort()
            );

            setMessage(
              `Bạn đang giữ ghế ${seatCode}.`
            );

            return;
          }

          setMessage(
            `Ghế ${seatCode} đang được người khác giữ.`
          );

          return;
        }
      }

      const holdResponse =
        await fetch(
          '/api/seat-holds',
          {
            method: 'POST',
            headers: {
              'Content-Type':
                'application/json',
            },
            body: JSON.stringify({
              showtimeId,
              seatIds: [seat.id],
            }),
          }
        );

      const data =
        (await holdResponse.json()) as {
          message: string;
          expiresAt?: string;
          holds?: HeldSeat[];
        };

      if (!holdResponse.ok) {
        setMessage(data.message);

        await fetchHeldSeats();

        return;
      }

      setSelectedSeats(
        (current) =>
          current.includes(seatCode)
            ? current
            : [
                ...current,
                seatCode,
              ].sort()
      );

      if (data.holds) {
        setCurrentHeldSeats(
          (current) => {
            const newHolds =
              data.holds ?? [];

            const withoutDuplicate =
              current.filter(
                (hold) =>
                  !newHolds.some(
                    (newHold) =>
                      newHold.seatCode ===
                      hold.seatCode
                  )
              );

            return [
              ...withoutDuplicate,
              ...newHolds,
            ];
          }
        );
      } else {
        await fetchHeldSeats();
      }

      setMessage(
        `Đã giữ ghế ${seatCode} trong 10 phút.`
      );
    } catch (error) {
      console.error(
        'Hold seat error:',
        error
      );

      setMessage(
        'Không thể giữ ghế. Vui lòng thử lại.'
      );
    } finally {
      setLoadingSeat('');
    }
  };

  /*
   * ============================================================
   * RELEASE SEAT
   * ============================================================
   */

  const releaseSeat = async (
    seatCode: string
  ) => {
    const heldSeat =
      getHeldSeat(seatCode);

    setLoadingSeat(seatCode);
    setMessage('');

    try {
      if (!heldSeat) {
        setSelectedSeats(
          (current) =>
            current.filter(
              (seat) =>
                seat !== seatCode
            )
        );

        return;
      }

      if (
        heldSeat.isMine === false
      ) {
        setMessage(
          `Ghế ${seatCode} đang được người khác giữ.`
        );

        return;
      }

      const response =
        await fetch(
          '/api/seat-holds',
          {
            method: 'DELETE',
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
          }
        );

      const data =
        (await response.json()) as {
          message: string;
        };

      if (!response.ok) {
        setMessage(data.message);
        return;
      }

      setSelectedSeats(
        (current) =>
          current.filter(
            (seat) =>
              seat !== seatCode
          )
      );

      setCurrentHeldSeats(
        (current) =>
          current.filter(
            (hold) =>
              hold.seatCode !==
              seatCode
          )
      );

      setMessage(
        `Đã bỏ giữ ghế ${seatCode}.`
      );
    } catch (error) {
      console.error(
        'Release seat error:',
        error
      );

      setMessage(
        'Không thể bỏ giữ ghế. Vui lòng thử lại.'
      );
    } finally {
      setLoadingSeat('');
    }
  };

  /*
   * ============================================================
   * TOGGLE SEAT
   * ============================================================
   */

  const toggleSeat = async (
    seatCode: string
  ) => {
    if (
      soldSeats.includes(seatCode)
    ) {
      return;
    }

    if (
      loadingSeat === seatCode
    ) {
      return;
    }

    const heldSeat =
      getHeldSeat(seatCode);

    if (
      selectedSeats.includes(
        seatCode
      )
    ) {
      await releaseSeat(
        seatCode
      );

      return;
    }

    if (heldSeat) {
      if (heldSeat.isMine) {
        setSelectedSeats(
          (current) =>
            current.includes(
              seatCode
            )
              ? current
              : [
                  ...current,
                  seatCode,
                ].sort()
        );

        return;
      }

      setMessage(
        `Ghế ${seatCode} đang được người khác giữ.`
      );

      return;
    }

    await holdSeat(seatCode);
  };

  /*
   * ============================================================
   * GO TO CART
   * ============================================================
   */

  const goToCart = async () => {
    if (
      selectedSeats.length === 0
    ) {
      setMessage(
        'Vui lòng chọn ít nhất một ghế.'
      );

      return;
    }

    try {
      const response =
        await fetch(
          `/api/seat-holds?showtimeId=${encodeURIComponent(
            showtimeId
          )}`,
          {
            cache: 'no-store',
          }
        );

      if (!response.ok) {
        setMessage(
          'Không thể kiểm tra trạng thái ghế. Vui lòng thử lại.'
        );

        return;
      }

      const latestHeldSeats =
        (await response.json()) as HeldSeat[];

      setCurrentHeldSeats(
        latestHeldSeats
      );

      const missingSeats =
        selectedSeats.filter(
          (seatCode) => {
            const hold =
              latestHeldSeats.find(
                (item) =>
                  item.seatCode ===
                  seatCode
              );

            return (
              !hold ||
              !hold.isMine
            );
          }
        );

      if (
        missingSeats.length > 0
      ) {
        setMessage(
          `Ghế ${missingSeats.join(
            ', '
          )} không còn được bạn giữ. Vui lòng chọn lại.`
        );

        setSelectedSeats(
          (current) =>
            current.filter(
              (seatCode) =>
                !missingSeats.includes(
                  seatCode
                )
            )
        );

        return;
      }

      const seatParam =
        selectedSeats.join(',');

      router.push(
        `/gio-hang?movie=${encodeURIComponent(
          movieSlug
        )}&showtime=${encodeURIComponent(
          showtimeId
        )}&seats=${encodeURIComponent(
          seatParam
        )}`
      );
    } catch (error) {
      console.error(
        'Go to cart error:',
        error
      );

      setMessage(
        'Không thể chuyển sang giỏ vé.'
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
      {/* ======================================================
          SEAT AREA
      ======================================================= */}

      <section className="rounded-[28px] border border-white/10 bg-slate-950/70 p-6 shadow-glow backdrop-blur-xl">
        <div>
          <h2 className="text-2xl font-semibold text-white">
            Chọn ghế
          </h2>

          <p className="mt-2 text-sm text-slate-300">
            {movieTitle} | {cinemaName} |{' '}
            {hallName} |{' '}
            {new Date(
              startTime
            ).toLocaleString(
              'vi-VN'
            )}
          </p>
        </div>

        {/* ==================================================
            LEGEND
        =================================================== */}

        <div className="mt-6 space-y-4">
          {/* LOẠI GHẾ */}

          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
              Loại ghế
            </p>

            <div className="flex flex-wrap gap-4 text-xs text-slate-300">
              {/* STANDARD */}

              <div className="flex items-center gap-2">
                <span className="h-4 w-4 rounded border border-sky-400/50 bg-sky-500/10" />

                <span>
                  Ghế thường
                </span>
              </div>

              {/* VIP */}

              <div className="flex items-center gap-2">
                <span className="h-4 w-4 rounded border border-amber-400/70 bg-amber-500/15" />

                <span>
                  Ghế VIP
                </span>
              </div>

              {/* COUPLE */}

              <div className="flex items-center gap-2">
                <span className="h-4 w-4 rounded border border-pink-400/70 bg-pink-500/15" />

                <span>
                  Ghế đôi
                </span>
              </div>
            </div>
          </div>

          {/* TRẠNG THÁI GHẾ */}

          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
              Trạng thái
            </p>

            <div className="flex flex-wrap gap-4 text-xs text-slate-300">
              {/* TRỐNG */}

              <div className="flex items-center gap-2">
                <span className="h-4 w-4 rounded border border-sky-400/50 bg-sky-500/10" />

                <span>
                  Ghế trống
                </span>
              </div>

              {/* ĐANG CHỌN */}

              <div className="flex items-center gap-2">
                <span className="h-4 w-4 rounded border border-emerald-400/60 bg-emerald-500" />

                <span>
                  Đang chọn
                </span>
              </div>

              {/* ĐÃ BÁN */}

              <div className="flex items-center gap-2">
                <span className="h-4 w-4 rounded border border-rose-400/40 bg-rose-500/20" />

                <span>
                  Đã bán
                </span>
              </div>

              {/* NGƯỜI KHÁC GIỮ */}

              <div className="flex items-center gap-2">
                <span className="h-4 w-4 rounded border border-amber-400/40 bg-amber-500/20" />

                <span>
                  Đang được giữ
                </span>
              </div>

              {/* KHÓA */}

              <div className="flex items-center gap-2">
                <span className="h-4 w-4 rounded border border-slate-500/20 bg-slate-700/30" />

                <span>
                  Đang khóa
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* ==================================================
            SEAT GRID
        =================================================== */}

        <div className="mt-6 grid gap-3 rounded-[24px] border border-white/10 bg-white/5 p-4">
          {/* SCREEN */}

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
          ) : seats.length === 0 ? (
            <div className="py-10 text-center text-sm text-slate-400">
              Chưa có ghế trong phòng chiếu.
            </div>
          ) : (
            rows.map((row) => (
              <div
                key={row}
                className="flex flex-wrap justify-center gap-2"
              >
                {Array.from(
                  { length: 8 },
                  (_, index) => {
                    const seatCode =
                      `${row}${index + 1}`;

                    const seat =
                      getSeatByCode(
                        seatCode
                      );

                    const isInactive =
                      seat
                        ? !seat.isActive
                        : true;

                    const isSelected =
                      selectedSeats.includes(
                        seatCode
                      );

                    const isSold =
                      soldSeats.includes(
                        seatCode
                      );

                    const heldSeat =
                      getHeldSeat(
                        seatCode
                      );

                    const isHeldBySomeoneElse =
                      Boolean(
                        heldSeat
                      ) &&
                      heldSeat?.isMine ===
                        false;

                    const isMyHold =
                      Boolean(
                        heldSeat
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

                    const seatPrice =
                      getSeatPrice(
                        seatCode
                      );

                    const seatType =
                      seat?.type
                        ?.toUpperCase() ??
                      'STANDARD';

                    /*
                     * MÀU THEO LOẠI GHẾ
                     */

                    const seatTypeClass =
                      seatType === 'VIP'
                        ? 'border-amber-400/70 bg-amber-500/15 text-amber-200'
                        : seatType ===
                            'COUPLE'
                          ? 'border-pink-400/70 bg-pink-500/15 text-pink-200'
                          : 'border-sky-400/50 bg-sky-500/10 text-sky-200';

                    /*
                     * TÊN LOẠI GHẾ
                     */

                    const seatTypeLabel =
                      seatType === 'VIP'
                        ? 'Ghế VIP'
                        : seatType ===
                            'COUPLE'
                          ? 'Ghế đôi'
                          : 'Ghế thường';

                    return (
                      <button
                        key={seatCode}
                        type="button"
                        onClick={() =>
                          toggleSeat(
                            seatCode
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
                                  : `${seatTypeLabel} - ${seatPrice.toLocaleString(
                                      'vi-VN'
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
                                  : `${seatTypeClass} hover:brightness-125`
                        }`}
                      >
                        {seatCode}

                        {/* COUNTDOWN CỦA MÌNH */}

                        {(isSelected ||
                          isMyHold) &&
                        remainingTime ? (
                          <span className="absolute -bottom-5 left-1/2 -translate-x-1/2 whitespace-nowrap text-[9px] font-normal text-emerald-300">
                            {
                              remainingTime
                            }
                          </span>
                        ) : null}

                        {/* COUNTDOWN NGƯỜI KHÁC */}

                        {isHeldBySomeoneElse &&
                        remainingTime ? (
                          <span className="absolute -bottom-5 left-1/2 -translate-x-1/2 whitespace-nowrap text-[9px] font-normal text-amber-300">
                            {
                              remainingTime
                            }
                          </span>
                        ) : null}

                        {/* LOADING */}

                        {isLoading ? (
                          <span className="absolute inset-0 flex items-center justify-center rounded-xl bg-black/30 text-[10px]">
                            ...
                          </span>
                        ) : null}
                      </button>
                    );
                  }
                )}
              </div>
            ))
          )}
        </div>

        {/* ==================================================
            MESSAGE
        =================================================== */}

        {message ? (
          <p className="mt-8 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-200">
            {message}
          </p>
        ) : null}
      </section>

      {/* ======================================================
          BOOKING INFO
      ======================================================= */}

      <aside className="space-y-4 rounded-[28px] border border-white/10 bg-slate-950/70 p-6 shadow-glow backdrop-blur-xl">
        <div>
          <h3 className="text-xl font-semibold text-white">
            Thông tin đặt vé
          </h3>

          <p className="mt-2 text-sm text-slate-300">
            Ghế được giữ trong 10 phút để
            bạn hoàn tất quá trình đặt vé.
          </p>
        </div>

        <div className="space-y-3 rounded-3xl border border-white/10 bg-white/5 p-4 text-sm text-slate-200">
          {/* GHẾ */}

          <div className="flex items-center justify-between gap-3">
            <span>Ghế đã chọn</span>

            <span className="text-right font-semibold text-white">
              {selectedSeats.join(', ') ||
                'Chưa chọn'}
            </span>
          </div>

          {/* SỐ LƯỢNG */}

          <div className="flex items-center justify-between gap-3">
            <span>Số lượng</span>

            <span className="font-semibold text-white">
              {selectedSeats.length}
            </span>
          </div>

          {/* GIÁ GHẾ */}

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
                  (seatCode) => {
                    const seat =
                      getSeatByCode(
                        seatCode
                      );

                    const price =
                      getSeatPrice(
                        seatCode
                      );

                    const type =
                      seat?.type?.toUpperCase() ??
                      'STANDARD';

                    const typeLabel =
                      type === 'VIP'
                        ? 'VIP'
                        : type ===
                            'COUPLE'
                          ? 'Ghế đôi'
                          : 'Thường';

                    return (
                      <div
                        key={seatCode}
                        className="flex items-center justify-between text-xs"
                      >
                        <span>
                          {seatCode}{' '}
                          <span className="text-slate-500">
                            ({typeLabel})
                          </span>
                        </span>

                        <span>
                          {price.toLocaleString(
                            'vi-VN'
                          )}{' '}
                          đ
                        </span>
                      </div>
                    );
                  }
                )}
              </div>
            )}
          </div>

          {/* TỔNG */}

          <div className="flex items-center justify-between gap-3 border-t border-white/10 pt-3 text-base font-semibold text-white">
            <span>Tổng cộng</span>

            <span>
              {total.toLocaleString(
                'vi-VN'
              )}{' '}
              đ
            </span>
          </div>
        </div>

        {/* BUTTON */}

        <button
          type="button"
          onClick={goToCart}
          disabled={
            selectedSeats.length === 0 ||
            Boolean(loadingSeat)
          }
          className="inline-flex w-full items-center justify-center rounded-2xl bg-white px-4 py-3 font-semibold text-slate-950 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Tiếp tục sang giỏ vé
        </button>
      </aside>
    </div>
  );
}