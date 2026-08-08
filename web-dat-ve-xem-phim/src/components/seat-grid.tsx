'use client';

import { useRouter } from 'next/navigation';
import {
  useCallback,
  useEffect,
  useMemo,
  useState
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
  basePrice: number;
  soldSeats: string[];
  heldSeats: HeldSeat[];
};

const rows = ['A', 'B', 'C', 'D', 'E', 'F'];

const formatRemainingTime = (expiresAt: string) => {
  const remaining = Math.max(
    0,
    new Date(expiresAt).getTime() - Date.now()
  );

  const totalSeconds = Math.floor(remaining / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
};

export function SeatGrid({
  movieSlug,
  showtimeId,
  movieTitle,
  cinemaName,
  hallName,
  startTime,
  basePrice,
  soldSeats,
  heldSeats
}: SeatGridProps) {
  const router = useRouter();

  /*
   * ============================================================
   * STATE
   * ============================================================
   */

  // Các ghế mà user hiện tại đang chọn
  const [selectedSeats, setSelectedSeats] = useState<string[]>(
    []
  );

  // Tất cả các hold hiện tại của suất chiếu
  const [currentHeldSeats, setCurrentHeldSeats] =
    useState<HeldSeat[]>(heldSeats);

  // Danh sách ghế thực tế trong database
  const [seats, setSeats] = useState<Seat[]>([]);

  const [message, setMessage] = useState('');
  const [loadingSeat, setLoadingSeat] = useState('');
  const [loadingSeats, setLoadingSeats] = useState(true);

  // Countdown từng ghế
  const [timeLeft, setTimeLeft] = useState<
    Record<string, string>
  >({});

  /*
   * ============================================================
   * TOTAL
   * ============================================================
   */

  const total = useMemo(
    () => selectedSeats.length * basePrice,
    [selectedSeats, basePrice]
  );

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
          cache: 'no-store'
        }
      );

      if (!response.ok) {
        throw new Error(
          'Không thể lấy danh sách ghế.'
        );
      }

      const data = (await response.json()) as Seat[];

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
   *
   * API GET trả về:
   *
   * {
   *   id,
   *   seatId,
   *   seatCode,
   *   expiresAt,
   *   userId,
   *   isMine
   * }
   *
   */

  const fetchHeldSeats = useCallback(async () => {
    try {
      const response = await fetch(
        `/api/seat-holds?showtimeId=${encodeURIComponent(
          showtimeId
        )}`,
        {
          cache: 'no-store'
        }
      );

      if (!response.ok) {
        return;
      }

      const data = (await response.json()) as HeldSeat[];

      setCurrentHeldSeats(data);

      /*
       * Đồng bộ selectedSeats với các hold của chính user.
       *
       * Điều này rất quan trọng:
       *
       * Nếu reload trang mà user vẫn còn hold,
       * các ghế đó vẫn được xem là ghế của user.
       */
      const myHeldSeatCodes = data
        .filter((hold) => hold.isMine)
        .map((hold) => hold.seatCode);

      setSelectedSeats((current) => {
        /*
         * Những ghế hiện đang selected nhưng
         * không còn hold của mình nữa → xóa.
         */
        const validCurrent = current.filter((seatCode) =>
          myHeldSeatCodes.includes(seatCode)
        );

        /*
         * Thêm các hold của chính user chưa có
         * trong selectedSeats.
         */
        const newMineSeats = myHeldSeatCodes.filter(
          (seatCode) => !validCurrent.includes(seatCode)
        );

        return [...validCurrent, ...newMineSeats].sort();
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
  }, [fetchSeats, fetchHeldSeats]);

  /*
   * ============================================================
   * AUTO REFRESH HOLD
   * ============================================================
   *
   * Cứ 5 giây lấy trạng thái mới từ server.
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
      const nextTimeLeft: Record<string, string> = {};

      currentHeldSeats.forEach((hold) => {
        nextTimeLeft[hold.seatCode] =
          formatRemainingTime(hold.expiresAt);
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
    const expiredTimer = window.setInterval(() => {
      const now = Date.now();

      const expiredSeats = currentHeldSeats.filter(
        (hold) =>
          new Date(hold.expiresAt).getTime() <= now
      );

      if (expiredSeats.length === 0) {
        return;
      }

      const expiredCodes = expiredSeats.map(
        (hold) => hold.seatCode
      );

      /*
       * Xóa khỏi UI
       */
      setCurrentHeldSeats((current) =>
        current.filter(
          (hold) =>
            !expiredCodes.includes(hold.seatCode)
        )
      );

      /*
       * Xóa khỏi selectedSeats
       */
      setSelectedSeats((current) =>
        current.filter(
          (seatCode) =>
            !expiredCodes.includes(seatCode)
        )
      );

      setMessage(
        `Ghế ${expiredCodes.join(
          ', '
        )} đã hết thời gian giữ.`
      );

      /*
       * Đồng bộ lại server
       */
      fetchHeldSeats();
    }, 1000);

    return () => {
      window.clearInterval(expiredTimer);
    };
  }, [currentHeldSeats, fetchHeldSeats]);

  /*
   * ============================================================
   * GET HOLD BY SEAT CODE
   * ============================================================
   */

  const getHeldSeat = useCallback(
    (seatCode: string) => {
      return currentHeldSeats.find(
        (hold) => hold.seatCode === seatCode
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
        (seat) => seat.code === seatCode
      );
    },
    [seats]
  );

  /*
   * ============================================================
   * HOLD SEAT
   * ============================================================
   */

  const holdSeat = async (seatCode: string) => {
    setLoadingSeat(seatCode);
    setMessage('');

    try {
      /*
       * Tìm seatId
       */
      const seat = getSeatByCode(seatCode);

      if (!seat) {
        setMessage(
          `Không tìm thấy ghế ${seatCode}.`
        );
        return;
      }

      /*
       * Kiểm tra ghế active
       */
      if (!seat.isActive) {
        setMessage(
          `Ghế ${seatCode} đang bị khóa bởi quản trị viên.`
        );
        return;
      }

      /*
       * Kiểm tra ghế đã bán
       */
      if (soldSeats.includes(seatCode)) {
        setMessage(
          `Ghế ${seatCode} đã được đặt.`
        );
        return;
      }

      /*
       * Lấy hold mới nhất
       */
      const latestResponse = await fetch(
        `/api/seat-holds?showtimeId=${encodeURIComponent(
          showtimeId
        )}`,
        {
          cache: 'no-store'
        }
      );

      if (latestResponse.ok) {
        const latestHolds =
          (await latestResponse.json()) as HeldSeat[];

        setCurrentHeldSeats(latestHolds);

        const existingHold = latestHolds.find(
          (hold) => hold.seatCode === seatCode
        );

        if (existingHold) {
          /*
           * Nếu chính mình đã giữ:
           * Không tạo hold mới.
           */
          if (existingHold.isMine) {
            setSelectedSeats((current) =>
              current.includes(seatCode)
                ? current
                : [...current, seatCode].sort()
            );

            setMessage(
              `Bạn đang giữ ghế ${seatCode}.`
            );

            return;
          }

          /*
           * Nếu người khác đang giữ
           */
          setMessage(
            `Ghế ${seatCode} đang được người khác giữ.`
          );

          return;
        }
      }

      /*
       * POST tạo hold
       */
      const holdResponse = await fetch(
        '/api/seat-holds',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            showtimeId,
            seatIds: [seat.id]
          })
        }
      );

      const data = (await holdResponse.json()) as {
        message: string;
        expiresAt?: string;
        holds?: HeldSeat[];
      };

      if (!holdResponse.ok) {
        setMessage(data.message);

        await fetchHeldSeats();

        return;
      }

      /*
       * Thêm ghế vào selected
       */
      setSelectedSeats((current) =>
        current.includes(seatCode)
          ? current
          : [...current, seatCode].sort()
      );

      /*
       * Cập nhật hold
       */
      if (data.holds) {
        setCurrentHeldSeats((current) => {
          const newHolds = data.holds ?? [];

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
            ...newHolds
          ];
        });
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
      /*
       * Không có hold
       */
      if (!heldSeat) {
        setSelectedSeats((current) =>
          current.filter(
            (seat) => seat !== seatCode
          )
        );

        return;
      }

      /*
       * Chỉ cho phép release nếu
       * hold thuộc chính user.
       */
      if (heldSeat.isMine === false) {
        setMessage(
          `Ghế ${seatCode} đang được người khác giữ.`
        );

        return;
      }

      /*
       * DELETE API
       */
      const response = await fetch(
        '/api/seat-holds',
        {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            showtimeId,
            seatIds: [heldSeat.seatId]
          })
        }
      );

      const data = (await response.json()) as {
        message: string;
      };

      if (!response.ok) {
        setMessage(data.message);
        return;
      }

      /*
       * Xóa selected
       */
      setSelectedSeats((current) =>
        current.filter(
          (seat) => seat !== seatCode
        )
      );

      /*
       * Xóa hold khỏi UI
       */
      setCurrentHeldSeats((current) =>
        current.filter(
          (hold) =>
            hold.seatCode !== seatCode
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
    /*
     * Ghế đã bán
     */
    if (soldSeats.includes(seatCode)) {
      return;
    }

    /*
     * Đang loading
     */
    if (loadingSeat === seatCode) {
      return;
    }

    const heldSeat =
      getHeldSeat(seatCode);

    /*
     * Nếu user đang chọn ghế
     * → bỏ giữ
     */
    if (
      selectedSeats.includes(seatCode)
    ) {
      await releaseSeat(seatCode);
      return;
    }

    /*
     * Nếu ghế đang hold
     */
    if (heldSeat) {
      /*
       * Hold của chính mình
       */
      if (heldSeat.isMine) {
        setSelectedSeats((current) =>
          current.includes(seatCode)
            ? current
            : [...current, seatCode].sort()
        );

        return;
      }

      /*
       * Hold của người khác
       */
      setMessage(
        `Ghế ${seatCode} đang được người khác giữ.`
      );

      return;
    }

    /*
     * Ghế trống
     */
    await holdSeat(seatCode);
  };

  /*
   * ============================================================
   * GO TO CART
   * ============================================================
   */

  const goToCart = async () => {
    if (selectedSeats.length === 0) {
      setMessage(
        'Vui lòng chọn ít nhất một ghế.'
      );

      return;
    }

    try {
      /*
       * Lấy hold mới nhất
       */
      const response = await fetch(
        `/api/seat-holds?showtimeId=${encodeURIComponent(
          showtimeId
        )}`,
        {
          cache: 'no-store'
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

      /*
       * Quan trọng:
       *
       * Chỉ chấp nhận hold của chính user.
       */
      const missingSeats =
        selectedSeats.filter(
          (seatCode) => {
            const hold =
              latestHeldSeats.find(
                (item) =>
                  item.seatCode ===
                  seatCode
              );

            return !hold || !hold.isMine;
          }
        );

      if (missingSeats.length > 0) {
        setMessage(
          `Ghế ${missingSeats.join(
            ', '
          )} không còn được bạn giữ. Vui lòng chọn lại.`
        );

        setSelectedSeats((current) =>
          current.filter(
            (seatCode) =>
              !missingSeats.includes(
                seatCode
              )
          )
        );

        return;
      }

      /*
       * seats=A1,A2,A3
       */
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
      {/* =====================================================
          SEAT AREA
      ====================================================== */}

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
            ).toLocaleString('vi-VN')}
          </p>
        </div>

        {/* =================================================
            LEGEND
        ================================================== */}

        <div className="mt-6 flex flex-wrap gap-4 text-xs text-slate-300">
          {/* Ghế trống */}
          <div className="flex items-center gap-2">
            <span className="h-4 w-4 rounded border border-white/10 bg-white/5" />
            Ghế trống
          </div>

          {/* Ghế của mình */}
          <div className="flex items-center gap-2">
            <span className="h-4 w-4 rounded bg-emerald-500" />
            Ghế đang chọn
          </div>

          {/* Đã bán */}
          <div className="flex items-center gap-2">
            <span className="h-4 w-4 rounded border border-rose-400/40 bg-rose-500/30" />
            Đã bán
          </div>

          {/* Người khác giữ */}
          <div className="flex items-center gap-2">
            <span className="h-4 w-4 rounded border border-amber-400/40 bg-amber-500/30" />
            Đang được giữ
          </div>
        </div>

        {/* =================================================
            SEAT GRID
        ================================================== */}

        <div className="mt-6 grid gap-3 rounded-[24px] border border-white/10 bg-white/5 p-4">
          {/* Màn hình */}
          <div className="mx-auto mb-3 h-2 w-1/2 rounded-full bg-sky-400/60" />

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
                    const seatCode = `${row}${
                      index + 1
                    }`;

                    const seat =
                      getSeatByCode(
                        seatCode
                      );

                    /*
                     * Nếu DB không có ghế
                     * → xem là inactive.
                     */
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

                    /*
                     * Quan trọng:
                     *
                     * Chỉ xem là hold của người khác
                     * khi:
                     *
                     * heldSeat tồn tại
                     * &&
                     * heldSeat.isMine === false
                     */
                    const isHeldBySomeoneElse =
                      Boolean(
                        heldSeat
                      ) &&
                      heldSeat?.isMine === false;

                    /*
                     * Hold của mình
                     */
                    const isMyHold =
                      Boolean(
                        heldSeat
                      ) &&
                      heldSeat?.isMine === true;

                    const isLoading =
                      loadingSeat ===
                      seatCode;

                    const remainingTime =
                      heldSeat
                        ? timeLeft[
                            seatCode
                          ]
                        : undefined;

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
                                  : 'Ghế trống'
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
                                  ? 'border-emerald-400/60 bg-emerald-500 text-slate-950'
                                  : 'border-white/10 bg-white/5 text-slate-200 hover:border-sky-400/60 hover:bg-sky-500/20'
                        }`}
                      >
                        {seatCode}

                        {/* COUNTDOWN CỦA MÌNH */}
                        {(isSelected ||
                          isMyHold) &&
                        remainingTime ? (
                          <span className="absolute -bottom-5 left-1/2 -translate-x-1/2 whitespace-nowrap text-[9px] font-normal text-emerald-300">
                            {remainingTime}
                          </span>
                        ) : null}

                        {/* COUNTDOWN NGƯỜI KHÁC */}
                        {isHeldBySomeoneElse &&
                        remainingTime ? (
                          <span className="absolute -bottom-5 left-1/2 -translate-x-1/2 whitespace-nowrap text-[9px] font-normal text-amber-300">
                            {remainingTime}
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

        {/* =================================================
            MESSAGE
        ================================================== */}

        {message ? (
          <p className="mt-8 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-200">
            {message}
          </p>
        ) : null}
      </section>

      {/* =====================================================
          BOOKING INFO
      ====================================================== */}

      <aside className="space-y-4 rounded-[28px] border border-white/10 bg-slate-950/70 p-6 shadow-glow backdrop-blur-xl">
        <div>
          <h3 className="text-xl font-semibold text-white">
            Thông tin đặt vé
          </h3>

          <p className="mt-2 text-sm text-slate-300">
            Ghế được giữ trong 10 phút để bạn hoàn tất
            quá trình đặt vé.
          </p>
        </div>

        <div className="space-y-3 rounded-3xl border border-white/10 bg-white/5 p-4 text-sm text-slate-200">
          <div className="flex items-center justify-between gap-3">
            <span>Ghế đã chọn</span>

            <span className="font-semibold text-white">
              {selectedSeats.join(', ') ||
                'Chưa chọn'}
            </span>
          </div>

          <div className="flex items-center justify-between gap-3">
            <span>Số lượng</span>

            <span className="font-semibold text-white">
              {selectedSeats.length}
            </span>
          </div>

          <div className="flex items-center justify-between gap-3">
            <span>Giá mỗi vé</span>

            <span className="font-semibold text-white">
              {basePrice.toLocaleString(
                'vi-VN'
              )}{' '}
              đ
            </span>
          </div>

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