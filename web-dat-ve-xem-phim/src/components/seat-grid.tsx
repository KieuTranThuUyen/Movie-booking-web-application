'use client';

import { useRouter } from 'next/navigation';

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
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
  rowLabel?: string | null;
  seatNumber?: number | null;
  type?: string | null;
  positionX?: number | null;
  positionY?: number | null;
};

type LayoutBlock = {
  id?: string;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  type?: string;
  label?: string;
  name?: string;
  [key: string]: unknown;
};

type HallLayout = {
  id?: string;
  name?: string;
  capacity?: number;
  layoutWidth?: number | null;
  layoutHeight?: number | null;
  layoutPreset?: string | null;
  layoutBlocks?: LayoutBlock[] | null;
};

type SeatsApiResponse = {
  hall?: HallLayout;
  seats?: Seat[];
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
  layoutWidth?: number | null;
  layoutHeight?: number | null;
  layoutPreset?: string | null;
  layoutBlocks?: LayoutBlock[] | null;
  initialSeats?: Seat[];
};

const HOLD_MINUTES = 10;
const DEFAULT_LAYOUT_WIDTH = 1000;
const DEFAULT_LAYOUT_HEIGHT = 650;
const DEFAULT_SEAT_SIZE = 44;
const DEFAULT_SEAT_GAP = 8;

const formatRemainingTime = (expiresAt: string) => {
  const remaining = Math.max(
    0,
    new Date(expiresAt).getTime() - Date.now(),
  );
  const totalSeconds = Math.floor(remaining / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
};

const normalizeNumber = (value: unknown, fallback: number) => {
  const number = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(number) ? number : fallback;
};

const getSeatType = (seat: Seat) => {
  return seat.type?.toUpperCase().trim() || 'STANDARD';
};

const getSeatTypeLabel = (seat: Seat) => {
  const type = getSeatType(seat);
  if (type === 'VIP') return 'Ghế VIP';
  if (type === 'COUPLE' || type === 'DOUBLE') return 'Ghế đôi';
  return 'Ghế thường';
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
  layoutWidth: initialLayoutWidth,
  layoutHeight: initialLayoutHeight,
  layoutPreset: initialLayoutPreset,
  layoutBlocks: initialLayoutBlocks,
  initialSeats,
}: SeatGridProps) {
  const router = useRouter();

  const [selectedSeats, setSelectedSeats] = useState<string[]>([]);
  const [currentHeldSeats, setCurrentHeldSeats] = useState<HeldSeat[]>(
    heldSeats ?? [],
  );
  const [seats, setSeats] = useState<Seat[]>(initialSeats ?? []);
  const [layoutWidth, setLayoutWidth] = useState<number>(
    normalizeNumber(initialLayoutWidth, DEFAULT_LAYOUT_WIDTH),
  );
  const [layoutHeight, setLayoutHeight] = useState<number>(
    normalizeNumber(initialLayoutHeight, DEFAULT_LAYOUT_HEIGHT),
  );
  const [layoutPreset, setLayoutPreset] = useState<string | null>(
    initialLayoutPreset ?? null,
  );
  const [layoutBlocks, setLayoutBlocks] = useState<LayoutBlock[]>(
    initialLayoutBlocks ?? [],
  );
  const [message, setMessage] = useState('');
  const [loadingSeat, setLoadingSeat] = useState('');
  const [loadingSeats, setLoadingSeats] = useState(
    !initialSeats || initialSeats.length === 0,
  );
  const [timeLeft, setTimeLeft] = useState<Record<string, string>>({});

  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const [containerSize, setContainerSize] = useState({
    width: 900,
    height: 620,
  });

  const soldSeatSet = useMemo(
    () => new Set(soldSeats ?? []),
    [soldSeats],
  );

  const getSeatPrice = useCallback(
    (seatCode: string) => {
      const seat = seats.find((item) => item.code === seatCode);
      if (!seat) return 0;
      const type = getSeatType(seat);
      switch (type) {
        case 'VIP':
          return Number(vipPrice) || 0;
        case 'COUPLE':
        case 'DOUBLE':
          return Number(couplePrice) || 0;
        default:
          return Number(standardPrice) || 0;
      }
    },
    [seats, standardPrice, vipPrice, couplePrice],
  );

  const total = useMemo(
    () =>
      selectedSeats.reduce(
        (sum, seatCode) => sum + getSeatPrice(seatCode),
        0,
      ),
    [selectedSeats, getSeatPrice],
  );

  const getSeatByCode = useCallback(
    (seatCode: string) => seats.find((seat) => seat.code === seatCode),
    [seats],
  );

  const getHeldSeat = useCallback(
    (seatCode: string) =>
      currentHeldSeats.find((hold) => hold.seatCode === seatCode),
    [currentHeldSeats],
  );

  const fetchSeats = useCallback(async () => {
    try {
      setLoadingSeats(true);
      const response = await fetch(
        `/api/showtimes/${encodeURIComponent(showtimeId)}/seats`,
        {
          cache: 'no-store',
          headers: { 'Cache-Control': 'no-cache' },
        },
      );

      if (!response.ok) {
        throw new Error('Không thể lấy sơ đồ ghế.');
      }

      const data = (await response.json()) as SeatsApiResponse | Seat[];

      if (!Array.isArray(data)) {
        const nextSeats = Array.isArray(data.seats) ? data.seats : [];
        setSeats(nextSeats);

        if (data.hall) {
          setLayoutWidth(
            normalizeNumber(
              data.hall.layoutWidth,
              DEFAULT_LAYOUT_WIDTH,
            ),
          );
          setLayoutHeight(
            normalizeNumber(
              data.hall.layoutHeight,
              DEFAULT_LAYOUT_HEIGHT,
            ),
          );
          setLayoutPreset(data.hall.layoutPreset ?? null);
          setLayoutBlocks(
            Array.isArray(data.hall.layoutBlocks)
              ? data.hall.layoutBlocks
              : [],
          );
        }
        return;
      }

      setSeats(data);
    } catch (error) {
      console.error('Fetch seats error:', error);
      if (!initialSeats || initialSeats.length === 0) {
        setSeats([]);
      }
      setMessage('Không thể lấy sơ đồ ghế. Vui lòng tải lại trang.');
    } finally {
      setLoadingSeats(false);
    }
  }, [showtimeId, initialSeats]);

  const fetchHeldSeats = useCallback(async () => {
    try {
      const response = await fetch(
        `/api/seat-holds?showtimeId=${encodeURIComponent(showtimeId)}`,
        {
          cache: 'no-store',
          headers: { 'Cache-Control': 'no-cache' },
        },
      );

      if (!response.ok) return;

      const data = (await response.json()) as HeldSeat[];
      const validHolds = data.filter(
        (hold) => new Date(hold.expiresAt).getTime() > Date.now(),
      );

      setCurrentHeldSeats(validHolds);

      const myHeldCodes = validHolds
        .filter((hold) => hold.isMine === true)
        .map((hold) => hold.seatCode)
        .sort();

      setSelectedSeats(myHeldCodes);
    } catch (error) {
      console.error('Fetch held seats error:', error);
    }
  }, [showtimeId]);

  useEffect(() => {
    void fetchSeats();
    void fetchHeldSeats();
  }, [fetchSeats, fetchHeldSeats]);

  useEffect(() => {
    const el = canvasContainerRef.current;
    if (!el) return;

    const updateSize = () => {
      const rect = el.getBoundingClientRect();
      setContainerSize({
        width: Math.max(200, rect.width - 24),
        height: Math.max(200, rect.height - 24),
      });
    };

    updateSize();
    const observer = new ResizeObserver(updateSize);
    observer.observe(el);
    return () => observer.disconnect();
  }, [layoutWidth, layoutHeight, seats.length]);

  useEffect(() => {
    const handleFocus = () => {
      void fetchSeats();
      void fetchHeldSeats();
    };
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        void fetchSeats();
        void fetchHeldSeats();
      }
    };

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [fetchSeats, fetchHeldSeats]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      void fetchHeldSeats();
    }, 5000);
    return () => window.clearInterval(timer);
  }, [fetchHeldSeats]);

  useEffect(() => {
    const update = () => {
      const next: Record<string, string> = {};
      currentHeldSeats.forEach((hold) => {
        next[hold.seatCode] = formatRemainingTime(hold.expiresAt);
      });
      setTimeLeft(next);
    };
    update();
    const timer = window.setInterval(update, 1000);
    return () => window.clearInterval(timer);
  }, [currentHeldSeats]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      const now = Date.now();
      const expired = currentHeldSeats.filter(
        (hold) => new Date(hold.expiresAt).getTime() <= now,
      );
      if (expired.length === 0) return;

      const expiredCodes = expired.map((hold) => hold.seatCode);
      setCurrentHeldSeats((current) =>
        current.filter((hold) => !expiredCodes.includes(hold.seatCode)),
      );
      setSelectedSeats((current) =>
        current.filter((seatCode) => !expiredCodes.includes(seatCode)),
      );
      setMessage(
        `Ghế ${expiredCodes.join(', ')} đã hết thời gian giữ.`,
      );
      void fetchHeldSeats();
    }, 1000);
    return () => window.clearInterval(timer);
  }, [currentHeldSeats, fetchHeldSeats]);

  const holdSeat = async (seatCode: string) => {
    setLoadingSeat(seatCode);
    setMessage('');

    try {
      const seat = getSeatByCode(seatCode);
      if (!seat) {
        setMessage(`Không tìm thấy ghế ${seatCode}.`);
        return;
      }
      if (!seat.isActive) {
        setMessage(
          `Ghế ${seatCode} đang bị khóa bởi quản trị viên.`,
        );
        return;
      }
      if (soldSeatSet.has(seatCode)) {
        setMessage(`Ghế ${seatCode} đã được đặt.`);
        return;
      }

      const response = await fetch(
        `/api/seat-holds?showtimeId=${encodeURIComponent(showtimeId)}`,
        {
          cache: 'no-store',
          headers: { 'Cache-Control': 'no-cache' },
        },
      );

      if (response.ok) {
        const holds = (await response.json()) as HeldSeat[];
        const validHolds = holds.filter(
          (hold) => new Date(hold.expiresAt).getTime() > Date.now(),
        );
        setCurrentHeldSeats(validHolds);

        const existing = validHolds.find(
          (hold) => hold.seatCode === seatCode,
        );
        if (existing) {
          if (existing.isMine) {
            setSelectedSeats((current) =>
              current.includes(seatCode)
                ? current
                : [...current, seatCode].sort(),
            );
            return;
          }
          setMessage(
            `Ghế ${seatCode} đang được người khác giữ.`,
          );
          return;
        }
      }

      const holdResponse = await fetch('/api/seat-holds', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          showtimeId,
          seatIds: [seat.id],
        }),
      });

      const data = (await holdResponse.json()) as {
        message?: string;
      };

      if (!holdResponse.ok) {
        setMessage(data.message ?? 'Không thể giữ ghế.');
        await fetchHeldSeats();
        return;
      }

      await fetchHeldSeats();
      setMessage(
        `Đã giữ ghế ${seatCode} trong ${HOLD_MINUTES} phút.`,
      );
    } catch (error) {
      console.error('Hold seat error:', error);
      setMessage('Không thể giữ ghế. Vui lòng thử lại.');
    } finally {
      setLoadingSeat('');
    }
  };

  const releaseSeat = async (seatCode: string) => {
    const heldSeat = getHeldSeat(seatCode);
    setLoadingSeat(seatCode);
    setMessage('');

    try {
      if (!heldSeat) {
        setSelectedSeats((current) =>
          current.filter((seat) => seat !== seatCode),
        );
        return;
      }

      if (heldSeat.isMine === false) {
        setMessage(
          `Ghế ${seatCode} đang được người khác giữ.`,
        );
        return;
      }

      const response = await fetch('/api/seat-holds', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          showtimeId,
          seatIds: [heldSeat.seatId],
        }),
      });

      const data = (await response.json()) as {
        message?: string;
      };

      if (!response.ok) {
        setMessage(data.message ?? 'Không thể bỏ giữ ghế.');
        return;
      }

      setSelectedSeats((current) =>
        current.filter((seat) => seat !== seatCode),
      );
      setCurrentHeldSeats((current) =>
        current.filter((hold) => hold.seatCode !== seatCode),
      );
      setMessage(`Đã bỏ giữ ghế ${seatCode}.`);
      await fetchHeldSeats();
    } catch (error) {
      console.error('Release seat error:', error);
      setMessage('Không thể bỏ giữ ghế. Vui lòng thử lại.');
    } finally {
      setLoadingSeat('');
    }
  };

  const toggleSeat = async (seatCode: string) => {
    if (soldSeatSet.has(seatCode)) return;
    if (loadingSeat === seatCode) return;

    if (selectedSeats.includes(seatCode)) {
      await releaseSeat(seatCode);
      return;
    }

    const heldSeat = getHeldSeat(seatCode);
    if (heldSeat) {
      if (heldSeat.isMine) {
        setSelectedSeats((current) =>
          current.includes(seatCode)
            ? current
            : [...current, seatCode].sort(),
        );
        return;
      }
      setMessage(`Ghế ${seatCode} đang được người khác giữ.`);
      return;
    }

    await holdSeat(seatCode);
  };

  const goToCart = async () => {
    if (selectedSeats.length === 0) {
      setMessage('Vui lòng chọn ít nhất một ghế.');
      return;
    }

    try {
      const response = await fetch(
        `/api/seat-holds?showtimeId=${encodeURIComponent(showtimeId)}`,
        {
          cache: 'no-store',
          headers: { 'Cache-Control': 'no-cache' },
        },
      );

      if (!response.ok) {
        setMessage('Không thể kiểm tra trạng thái ghế.');
        return;
      }

      const holds = (await response.json()) as HeldSeat[];
      const validHolds = holds.filter(
        (hold) => new Date(hold.expiresAt).getTime() > Date.now(),
      );

      const myHeldCodes = validHolds
        .filter((hold) => hold.isMine === true)
        .map((hold) => hold.seatCode)
        .sort();

      setCurrentHeldSeats(validHolds);
      setSelectedSeats(myHeldCodes);

      const missing = selectedSeats.filter(
        (seatCode) => !myHeldCodes.includes(seatCode),
      );

      if (missing.length > 0) {
        setMessage(
          `Ghế ${missing.join(', ')} không còn được bạn giữ.`,
        );
        return;
      }

      router.push(
        `/gio-hang?movie=${encodeURIComponent(movieSlug)}&showtime=${encodeURIComponent(showtimeId)}&seats=${encodeURIComponent(myHeldCodes.join(','))}`,
      );
    } catch (error) {
      console.error('Go to cart error:', error);
      setMessage('Không thể chuyển sang giỏ vé.');
    }
  };

  const fallbackPositions = useMemo(() => {
    const positions = new Map<string, { x: number; y: number }>();
    const rowsMap = new Map<string, Seat[]>();

    seats.forEach((seat) => {
      const row =
        seat.rowLabel ||
        seat.code.match(/^[A-Za-z]+/)?.[0] ||
        'A';
      const list = rowsMap.get(row) ?? [];
      list.push(seat);
      rowsMap.set(row, list);
    });

    const sortedRows = Array.from(rowsMap.entries()).sort(([a], [b]) =>
      a.localeCompare(b, undefined, { numeric: true }),
    );

    sortedRows.forEach(([, rowSeats], rowIndex) => {
      const sortedSeats = [...rowSeats].sort((a, b) => {
        const aNumber = Number(
          a.seatNumber ?? a.code.match(/\d+$/)?.[0] ?? 0,
        );
        const bNumber = Number(
          b.seatNumber ?? b.code.match(/\d+$/)?.[0] ?? 0,
        );
        return aNumber - bNumber;
      });

      sortedSeats.forEach((seat, seatIndex) => {
        positions.set(seat.id, {
          x: 40 + seatIndex * (DEFAULT_SEAT_SIZE + DEFAULT_SEAT_GAP),
          y: 80 + rowIndex * (DEFAULT_SEAT_SIZE + DEFAULT_SEAT_GAP),
        });
      });
    });

    return positions;
  }, [seats]);

  const getSeatPosition = useCallback(
    (seat: Seat) => {
      const x =
        seat.positionX !== null && seat.positionX !== undefined
          ? Number(seat.positionX)
          : NaN;
      const y =
        seat.positionY !== null && seat.positionY !== undefined
          ? Number(seat.positionY)
          : NaN;

      const hasValidPosition =
        Number.isFinite(x) &&
        Number.isFinite(y) &&
        !(x === 0 && y === 0);

      if (hasValidPosition) {
        return { x, y };
      }

      return fallbackPositions.get(seat.id) ?? { x: 40, y: 80 };
    },
    [fallbackPositions],
  );

  const normalizedBlocks = useMemo(() => {
    return (layoutBlocks ?? []).map((block, index) => {
      const raw = block as Record<string, unknown>;
      const x = normalizeNumber(raw.x ?? raw.positionX, 0);
      const y = normalizeNumber(raw.y ?? raw.positionY, 0);
      const width = normalizeNumber(raw.width ?? raw.w, 100);
      const height = normalizeNumber(raw.height ?? raw.h, 60);
      const label =
        typeof raw.label === 'string'
          ? raw.label
          : typeof raw.name === 'string'
            ? raw.name
            : '';
      const type = typeof raw.type === 'string' ? raw.type : 'BLOCK';

      return {
        ...block,
        id: block.id ?? `layout-block-${index}`,
        x,
        y,
        width,
        height,
        label,
        type,
      };
    });
  }, [layoutBlocks]);

  // Tự co giãn theo khung thật — không cần thanh kéo
  const layoutScale = useMemo(() => {
    const w = Math.max(layoutWidth, 1);
    const h = Math.max(layoutHeight, 1);
    return Math.min(
      1,
      containerSize.width / w,
      containerSize.height / h,
    );
  }, [layoutWidth, layoutHeight, containerSize]);

  const renderedWidth = Math.max(
    1,
    Math.round(layoutWidth * layoutScale),
  );
  const renderedHeight = Math.max(
    1,
    Math.round(layoutHeight * layoutScale),
  );

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
      <section className="min-w-0 rounded-[28px] border border-white/10 bg-slate-950/70 p-4 shadow-glow backdrop-blur-xl sm:p-6">
        <div>
          <h2 className="text-2xl font-semibold text-white">
            Chọn ghế
          </h2>
          <p className="mt-2 text-sm text-slate-300">
            {movieTitle} | {cinemaName} | {hallName} |{' '}
            {new Date(startTime).toLocaleString('vi-VN')}
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
                <span>Ghế thường</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="h-4 w-4 rounded border border-amber-400/70 bg-amber-500/15" />
                <span>Ghế VIP</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="h-4 w-4 rounded border border-pink-400/70 bg-pink-500/15" />
                <span>Ghế đôi</span>
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
                <span>Ghế trống</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="h-4 w-4 rounded border border-emerald-400/60 bg-emerald-500" />
                <span>Đang chọn</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="h-4 w-4 rounded border border-rose-400/40 bg-rose-500/20" />
                <span>Đã bán</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="h-4 w-4 rounded border border-amber-400/40 bg-amber-500/20" />
                <span>Đang được giữ</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="h-4 w-4 rounded border border-slate-500/20 bg-slate-700/30" />
                <span>Đang khóa</span>
              </div>
            </div>
          </div>
        </div>

        {/* SEAT MAP — tự co giãn, không thanh kéo */}
        <div
          ref={canvasContainerRef}
          className="mt-6 min-h-[420px] overflow-hidden rounded-[24px] border border-white/10 bg-white/5 p-3 sm:p-5"
        >
          {loadingSeats ? (
            <div className="py-10 text-center text-sm text-slate-400">
              Đang tải sơ đồ ghế...
            </div>
          ) : seats.length === 0 ? (
            <div className="py-10 text-center text-sm text-slate-400">
              Chưa có ghế trong phòng chiếu.
            </div>
          ) : (
            <div className="mx-auto w-fit">
              <div
                className="mb-5 flex flex-col items-center"
                style={{
                  width: renderedWidth,
                  maxWidth: '100%',
                }}
              >
                <div className="h-2 w-[70%] rounded-full bg-sky-400/60 shadow-[0_0_25px_rgba(56,189,248,0.35)]" />
                <span className="mt-2 text-[10px] uppercase tracking-[0.3em] text-slate-500">
                  Màn hình
                </span>
              </div>

              <div
                className="relative overflow-hidden rounded-2xl border border-white/10 bg-slate-950/80"
                style={{
                  width: renderedWidth,
                  height: renderedHeight,
                }}
              >
                {normalizedBlocks.map((block) => {
                  const left = block.x * layoutScale;
                  const top = block.y * layoutScale;
                  const width = block.width * layoutScale;
                  const height = block.height * layoutScale;
                  const blockType = String(
                    block.type ?? 'BLOCK',
                  ).toUpperCase();
                  const isAisle =
                    blockType.includes('AISLE') ||
                    blockType.includes('LOI') ||
                    blockType.includes('PATH');

                  return (
                    <div
                      key={block.id}
                      className={`absolute flex items-center justify-center overflow-hidden rounded-xl border text-xs ${
                        isAisle
                          ? 'border-slate-600/30 bg-slate-800/20 text-slate-500'
                          : 'border-white/10 bg-white/5 text-slate-400'
                      }`}
                      style={{ left, top, width, height }}
                    >
                      {block.label ? (
                        <span className="truncate px-2 text-center">
                          {block.label}
                        </span>
                      ) : null}
                    </div>
                  );
                })}

                {seats.map((seat) => {
                  const position = getSeatPosition(seat);
                  const left = position.x * layoutScale;
                  const top = position.y * layoutScale;
                  const seatSize = DEFAULT_SEAT_SIZE * layoutScale;

                  const isSelected = selectedSeats.includes(seat.code);
                  const isSold = soldSeatSet.has(seat.code);
                  const isInactive = !seat.isActive;
                  const heldSeat = getHeldSeat(seat.code);
                  const isHeldBySomeoneElse =
                    Boolean(heldSeat) && heldSeat?.isMine === false;
                  const isMyHold =
                    Boolean(heldSeat) && heldSeat?.isMine === true;
                  const isLoading = loadingSeat === seat.code;
                  const remainingTime = heldSeat
                    ? timeLeft[seat.code]
                    : undefined;
                  const price = getSeatPrice(seat.code);
                  const type = getSeatType(seat);

                  const typeClass =
                    type === 'VIP'
                      ? 'border-amber-400/70 bg-amber-500/15 text-amber-200'
                      : type === 'COUPLE' || type === 'DOUBLE'
                        ? 'border-pink-400/70 bg-pink-500/15 text-pink-200'
                        : 'border-sky-400/50 bg-sky-500/10 text-sky-200';

                  const typeLabel = getSeatTypeLabel(seat);

                  return (
                    <button
                      key={seat.id}
                      type="button"
                      onClick={() => void toggleSeat(seat.code)}
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
                              ? `Đang được người khác giữ - còn ${remainingTime ?? '...'}`
                              : isSelected || isMyHold
                                ? `Bạn đang giữ ghế - còn ${remainingTime ?? '...'}`
                                : `${typeLabel} - ${price.toLocaleString('vi-VN')} đ`
                      }
                      className={`absolute flex items-center justify-center rounded-xl border text-xs font-semibold transition ${
                        isSold
                          ? 'cursor-not-allowed border-rose-400/40 bg-rose-500/20 text-rose-200'
                          : isInactive
                            ? 'cursor-not-allowed border-slate-500/20 bg-slate-700/30 text-slate-500'
                            : isHeldBySomeoneElse
                              ? 'cursor-not-allowed border-amber-400/40 bg-amber-500/20 text-amber-200'
                              : isSelected || isMyHold
                                ? 'border-emerald-400/60 bg-emerald-500 text-slate-950 shadow-[0_0_18px_rgba(16,185,129,0.35)]'
                                : `${typeClass} hover:brightness-125`
                      }`}
                      style={{
                        left,
                        top,
                        width: seatSize,
                        height: seatSize,
                        minWidth: seatSize,
                        minHeight: seatSize,
                        fontSize: Math.max(9, 12 * layoutScale),
                      }}
                    >
                      {seat.code}

                      {(isSelected || isMyHold) && remainingTime ? (
                        <span
                          className="absolute whitespace-nowrap rounded bg-slate-950/90 px-1 text-[9px] font-normal text-emerald-300"
                          style={{
                            left: '50%',
                            top: 'calc(100% + 3px)',
                            transform: 'translateX(-50%)',
                          }}
                        >
                          {remainingTime}
                        </span>
                      ) : null}

                      {isHeldBySomeoneElse && remainingTime ? (
                        <span
                          className="absolute whitespace-nowrap rounded bg-slate-950/90 px-1 text-[9px] font-normal text-amber-300"
                          style={{
                            left: '50%',
                            top: 'calc(100% + 3px)',
                            transform: 'translateX(-50%)',
                          }}
                        >
                          {remainingTime}
                        </span>
                      ) : null}

                      {isLoading ? (
                        <span className="absolute inset-0 flex items-center justify-center rounded-xl bg-black/30 text-[10px]">
                          ...
                        </span>
                      ) : null}
                    </button>
                  );
                })}
              </div>

              <div className="mt-3 flex flex-wrap items-center justify-center gap-3 text-[10px] text-slate-500">
                {layoutPreset ? (
                  <span>Layout: {layoutPreset}</span>
                ) : null}
                <span>{seats.length} ghế</span>
                <span>
                  {layoutWidth} × {layoutHeight}
                </span>
                {normalizedBlocks.length > 0 ? (
                  <span>{normalizedBlocks.length} khu vực</span>
                ) : null}
              </div>
            </div>
          )}
        </div>

        {message ? (
          <p className="mt-8 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-200">
            {message}
          </p>
        ) : null}
      </section>

      <aside className="h-fit space-y-4 rounded-[28px] border border-white/10 bg-slate-950/70 p-6 shadow-glow backdrop-blur-xl lg:sticky lg:top-6">
        <div>
          <h3 className="text-xl font-semibold text-white">
            Thông tin đặt vé
          </h3>
          <p className="mt-2 text-sm text-slate-300">
            Ghế được giữ trong {HOLD_MINUTES} phút để bạn hoàn tất
            quá trình đặt vé.
          </p>
        </div>

        <div className="space-y-3 rounded-3xl border border-white/10 bg-white/5 p-4 text-sm text-slate-200">
          <div className="flex items-start justify-between gap-3">
            <span>Ghế đã chọn</span>
            <span className="max-w-[220px] text-right font-semibold text-white">
              {selectedSeats.join(', ') || 'Chưa chọn'}
            </span>
          </div>

          <div className="flex items-center justify-between gap-3">
            <span>Số lượng</span>
            <span className="font-semibold text-white">
              {selectedSeats.length}
            </span>
          </div>

          <div className="border-t border-white/10 pt-3">
            <p className="mb-2 text-sm text-slate-300">Chi tiết giá</p>
            {selectedSeats.length === 0 ? (
              <p className="text-xs text-slate-500">Chưa chọn ghế</p>
            ) : (
              <div className="space-y-1">
                {selectedSeats.map((seatCode) => {
                  const seat = getSeatByCode(seatCode);
                  const price = getSeatPrice(seatCode);
                  const typeLabel = seat
                    ? getSeatTypeLabel(seat)
                    : 'Ghế thường';

                  return (
                    <div
                      key={seatCode}
                      className="flex items-center justify-between gap-3 text-xs"
                    >
                      <span>
                        {seatCode}{' '}
                        <span className="text-slate-500">
                          ({typeLabel})
                        </span>
                      </span>
                      <span className="whitespace-nowrap">
                        {price.toLocaleString('vi-VN')} đ
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="flex items-center justify-between gap-3 border-t border-white/10 pt-3 text-base font-semibold text-white">
            <span>Tổng cộng</span>
            <span>{total.toLocaleString('vi-VN')} đ</span>
          </div>
        </div>

        <button
          type="button"
          onClick={() => void goToCart()}
          disabled={selectedSeats.length === 0 || Boolean(loadingSeat)}
          className="inline-flex w-full items-center justify-center rounded-2xl bg-white px-4 py-3 font-semibold text-slate-950 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Tiếp tục sang giỏ vé
        </button>
      </aside>
    </div>
  );
}