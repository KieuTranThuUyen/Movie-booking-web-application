'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type {
  FormEvent,
  PointerEvent as ReactPointerEvent,
} from 'react';

type SeatType = 'STANDARD' | 'VIP' | 'COUPLE';

type BlockType = 'AISLE' | 'SPACE';

type Preset =
  | 'STANDARD'
  | 'AISLE_CENTER'
  | 'STAGGERED'
  | 'VIP_REAR'
  | 'COUPLE_REAR'
  | 'FREE';

type SeatOption = {
  id: string;
  code: string;
  type: string;
  isActive: boolean;
  rowLabel: string;
  seatNumber: number;
  positionX: number;
  positionY: number;
};

type LayoutBlock = {
  id: string;
  type: BlockType | string;
  x: number;
  y: number;
  width: number;
  height: number;
  label: string | null;
};

type HallOption = {
  id: string;
  name: string;
  capacity: number;
  layoutWidth: number;
  layoutHeight: number;
  layoutPreset: string;
  seats: SeatOption[];
  layoutBlocks: LayoutBlock[];
};

type CinemaOption = {
  id: string;
  name: string;
  city: string;
  address: string;
  halls: HallOption[];
};

type Props = {
  cinemas: CinemaOption[];
};

const PRESETS: Array<{
  value: Preset;
  label: string;
}> = [
  { value: 'STANDARD', label: 'Rạp tiêu chuẩn' },
  { value: 'AISLE_CENTER', label: 'Có lối đi giữa' },
  { value: 'STAGGERED', label: 'So le' },
  { value: 'VIP_REAR', label: 'VIP phía sau' },
  { value: 'COUPLE_REAR', label: 'Couple cuối rạp' },
  { value: 'FREE', label: 'Tự do' },
];

const TYPES: Array<{
  value: SeatType;
  label: string;
}> = [
  { value: 'STANDARD', label: 'Standard' },
  { value: 'VIP', label: 'VIP' },
  { value: 'COUPLE', label: 'Couple' },
];

const clone = <T,>(value: T): T =>
  JSON.parse(JSON.stringify(value)) as T;

function defaultCounts(total: number) {
  const vip = Math.min(12, Math.floor(total * 0.2));
  const couple = Math.min(4, Math.floor(total * 0.1));
  return {
    STANDARD: Math.max(0, total - vip - couple),
    VIP: vip,
    COUPLE: couple,
  };
}

/**
 * Tự động sắp xếp ghế theo preset.
 * - CHỈ đổi positionX / positionY.
 * - KHÔNG đổi code, rowLabel, seatNumber.
 * - KHÔNG đổi type.
 */
function makePositions(
  seats: SeatOption[],
  preset: Preset,
  width: number,
  height: number,
) {
  if (seats.length === 0) return clone(seats);

  const seatSize = 44;
  const sidePadding = 70;
  const topPadding = 100;
  const bottomPadding = 70;

  const byType = {
    STANDARD: [] as SeatOption[],
    VIP: [] as SeatOption[],
    COUPLE: [] as SeatOption[],
  };

  seats.forEach((seat) => {
    const t = (seat.type as SeatType) || 'STANDARD';
    if (t === 'VIP') byType.VIP.push(seat);
    else if (t === 'COUPLE') byType.COUPLE.push(seat);
    else byType.STANDARD.push(seat);
  });

  const sortSeats = (list: SeatOption[]) =>
    [...list].sort((a, b) => {
      const r = a.rowLabel.localeCompare(b.rowLabel);
      return r || a.seatNumber - b.seatNumber;
    });

  byType.STANDARD = sortSeats(byType.STANDARD);
  byType.VIP = sortSeats(byType.VIP);
  byType.COUPLE = sortSeats(byType.COUPLE);

  let ordered: SeatOption[] = [];

  if (preset === 'VIP_REAR') {
    ordered = [...byType.STANDARD, ...byType.COUPLE, ...byType.VIP];
  } else if (preset === 'COUPLE_REAR') {
    ordered = [...byType.STANDARD, ...byType.VIP, ...byType.COUPLE];
  } else {
    ordered = [...seats].sort((a, b) => {
      const r = a.rowLabel.localeCompare(b.rowLabel);
      return r || a.seatNumber - b.seatNumber;
    });
  }

  const total = ordered.length;
  const seatsPerRow = Math.min(
    14,
    Math.max(6, Math.ceil(Math.sqrt(total * 1.4))),
  );
  const rowCount = Math.ceil(total / seatsPerRow);

  const availableWidth = width - sidePadding * 2;
  let gapX =
    seatsPerRow > 1
      ? Math.floor((availableWidth - seatSize) / (seatsPerRow - 1))
      : 0;
  gapX = Math.max(52, Math.min(gapX, 70));

  const availableHeight = height - topPadding - bottomPadding;
  let gapY =
    rowCount > 1 ? Math.floor(availableHeight / (rowCount - 1)) : 0;
  gapY = Math.max(52, Math.min(gapY, 62));

  const result = clone(seats);
  const resultById = new Map(result.map((s) => [s.id, s]));

  let index = 0;
  for (let r = 0; r < rowCount; r++) {
    const seatsInRow = Math.min(seatsPerRow, total - index);
    if (seatsInRow <= 0) break;

    const positions: number[] = [];
    for (let c = 0; c < seatsInRow; c++) {
      let x = c * gapX;
      if (preset === 'AISLE_CENTER' && c >= Math.ceil(seatsInRow / 2)) {
        x += gapX * 0.8;
      }
      if (preset === 'STAGGERED' && r % 2 === 1) {
        x += gapX / 2;
      }
      positions.push(x);
    }

    const minX = Math.min(...positions);
    const maxX = Math.max(...positions);
    const actualWidth = maxX - minX + seatSize;

    let centeredStartX = Math.round((width - actualWidth) / 2);
    centeredStartX = Math.max(
      sidePadding,
      Math.min(centeredStartX, width - sidePadding - actualWidth),
    );

    for (let c = 0; c < seatsInRow; c++) {
      const source = ordered[index];
      const target = resultById.get(source.id);
      if (target) {
        target.positionX = Math.round(centeredStartX + positions[c]);
        target.positionY = Math.round(topPadding + r * gapY);
        target.type = source.type;
      }
      index++;
    }
  }

  return result;
}

export function CinemaManagementForm({ cinemas }: Props) {
  const [cinemaList, setCinemaList] = useState<CinemaOption[]>(
    clone(cinemas),
  );
  const [selectedCinemaId, setSelectedCinemaId] = useState(
    cinemas[0]?.id ?? '',
  );
  const [selectedHallId, setSelectedHallId] = useState(
    cinemas[0]?.halls[0]?.id ?? '',
  );
  const [selectedSeatIds, setSelectedSeatIds] = useState<string[]>([]);
  const [selectedBlockId, setSelectedBlockId] = useState('');
  const [toast, setToast] = useState<{
    text: string;
    type: 'success' | 'error' | 'info';
  } | null>(null);

  const setMessage = (
    text: string,
    type: 'success' | 'error' | 'info' = 'info',
  ) => {
    const lower = text.toLowerCase();
    let resolved: 'success' | 'error' | 'info' = type;
    if (
      type === 'info' &&
      (lower.includes('không thể') ||
        lower.includes('vui lòng') ||
        lower.includes('lỗi') ||
        lower.includes('đã có người') ||
        lower.includes('không được'))
    ) {
      resolved = 'error';
    } else if (
      type === 'info' &&
      (lower.includes('thành công') ||
        lower.includes('đã lưu') ||
        lower.includes('đã xóa') ||
        lower.includes('đã áp dụng') ||
        lower.includes('đã khóa') ||
        lower.includes('đã mở'))
    ) {
      resolved = 'success';
    }
    setToast(text ? { text, type: resolved } : null);
  };

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 3500);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const [loading, setLoading] = useState(false);
  const [dragging, setDragging] = useState<{
    kind: 'seat' | 'block';
    id: string;
    offsetX: number;
    offsetY: number;
  } | null>(null);

  const [cinemaForm, setCinemaForm] = useState({
    name: '',
    city: '',
    address: '',
  });

  const [hallForm, setHallForm] = useState({
    name: '',
    standardCount: 40,
    vipCount: 8,
    coupleCount: 4,
    layoutWidth: 1000,
    layoutHeight: 650,
    layoutPreset: 'STANDARD' as Preset,
  });

  const [newSeatCode, setNewSeatCode] = useState('');
  const [renameValue, setRenameValue] = useState('');

  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const [containerSize, setContainerSize] = useState({
    width: 860,
    height: 620,
  });

  const selectedCinema = useMemo(
    () => cinemaList.find((c) => c.id === selectedCinemaId),
    [cinemaList, selectedCinemaId],
  );

  const selectedHall = useMemo(
    () => selectedCinema?.halls.find((h) => h.id === selectedHallId),
    [selectedCinema, selectedHallId],
  );

  useEffect(() => {
    const el = canvasContainerRef.current;
    if (!el) return;

    const updateSize = () => {
      const rect = el.getBoundingClientRect();
      setContainerSize({
        width: Math.max(200, rect.width - 32),
        height: Math.max(200, rect.height - 32),
      });
    };

    updateSize();
    const observer = new ResizeObserver(updateSize);
    observer.observe(el);
    return () => observer.disconnect();
  }, [selectedHallId]);

  const updateHallLocal = (
    updater: (hall: HallOption) => HallOption,
  ) => {
    setCinemaList((current) =>
      current.map((cinema) =>
        cinema.id !== selectedCinemaId
          ? cinema
          : {
              ...cinema,
              halls: cinema.halls.map((hall) =>
                hall.id === selectedHallId
                  ? updater(clone(hall))
                  : hall,
              ),
            },
      ),
    );
  };

  const selectCinema = (id: string) => {
    setSelectedCinemaId(id);
    const cinema = cinemaList.find((item) => item.id === id);
    const hall = cinema?.halls[0];
    setSelectedHallId(hall?.id ?? '');
    setSelectedSeatIds([]);
    setSelectedBlockId('');
  };

  const selectHall = (id: string) => {
    setSelectedHallId(id);
    setSelectedSeatIds([]);
    setSelectedBlockId('');

    const hall = selectedCinema?.halls.find((item) => item.id === id);
    if (!hall) return;

    setHallForm((current) => ({
      ...current,
      name: hall.name,
      layoutWidth: hall.layoutWidth,
      layoutHeight: hall.layoutHeight,
      layoutPreset: (hall.layoutPreset as Preset) || 'STANDARD',
    }));
  };

  const handleCinemaCreate = async (event: FormEvent) => {
    event.preventDefault();
    if (!cinemaForm.name.trim()) {
      setMessage('Vui lòng nhập tên rạp.');
      return;
    }

    setLoading(true);
    setMessage('');

    try {
      const response = await fetch('/api/admin/cinemas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cinemaForm),
      });
      const data = await response.json();

      if (!response.ok) {
        setMessage(data.message ?? 'Không thể tạo rạp.');
        return;
      }

      const cinema = {
        ...data.cinema,
        halls: data.cinema?.halls ?? [],
      } as CinemaOption;

      setCinemaList((current) => [cinema, ...current]);
      setSelectedCinemaId(cinema.id);
      setSelectedHallId('');
      setCinemaForm({ name: '', city: '', address: '' });
      setMessage(data.message ?? 'Tạo rạp thành công.');
    } catch {
      setMessage('Không thể kết nối đến máy chủ.');
    } finally {
      setLoading(false);
    }
  };

  const handleCinemaUpdate = async () => {
    if (!selectedCinemaId || !selectedCinema) return;

    setLoading(true);
    try {
      const response = await fetch(
        `/api/admin/cinemas/${selectedCinemaId}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: selectedCinema.name,
            city: selectedCinema.city,
            address: selectedCinema.address,
          }),
        },
      );
      const data = await response.json();

      if (!response.ok) {
        setMessage(data.message ?? 'Không thể cập nhật rạp.');
        return;
      }
      setMessage(data.message ?? 'Cập nhật rạp thành công.');
    } catch {
      setMessage('Không thể kết nối đến máy chủ.');
    } finally {
      setLoading(false);
    }
  };

  const handleCinemaDelete = async () => {
    if (!selectedCinemaId || !confirm('Xóa rạp này?')) return;

    setLoading(true);
    try {
      const response = await fetch(
        `/api/admin/cinemas/${selectedCinemaId}`,
        { method: 'DELETE' },
      );
      const data = await response.json();

      if (!response.ok) {
        setMessage(data.message ?? 'Không thể xóa rạp.');
        return;
      }

      const next = cinemaList.filter(
        (item) => item.id !== selectedCinemaId,
      );
      setCinemaList(next);
      setSelectedCinemaId(next[0]?.id ?? '');
      setSelectedHallId(next[0]?.halls[0]?.id ?? '');
      setSelectedSeatIds([]);
      setMessage(data.message ?? 'Xóa rạp thành công.');
    } catch {
      setMessage('Không thể kết nối đến máy chủ.');
    } finally {
      setLoading(false);
    }
  };

  const handleHallCreate = async (event: FormEvent) => {
    event.preventDefault();
    if (!selectedCinemaId || !hallForm.name.trim()) {
      setMessage('Vui lòng chọn rạp và nhập tên phòng.');
      return;
    }

    const standardCount = Math.max(0, Math.floor(hallForm.standardCount));
    const vipCount = Math.max(0, Math.floor(hallForm.vipCount));
    const coupleCount = Math.max(0, Math.floor(hallForm.coupleCount));

    if (standardCount + vipCount + coupleCount < 1) {
      setMessage('Vui lòng nhập tổng số ghế ít nhất là 1.');
      return;
    }

    setLoading(true);
    setMessage('');

    try {
      const response = await fetch('/api/admin/halls', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cinemaId: selectedCinemaId,
          name: hallForm.name,
          standardCount,
          vipCount,
          coupleCount,
          layoutWidth: hallForm.layoutWidth,
          layoutHeight: hallForm.layoutHeight,
          layoutPreset: hallForm.layoutPreset,
        }),
      });
      const data = await response.json();

      if (!response.ok) {
        setMessage(data.message ?? 'Không thể tạo phòng.');
        return;
      }

      const hall = data.hall as HallOption;
      setCinemaList((current) =>
        current.map((cinema) =>
          cinema.id === selectedCinemaId
            ? { ...cinema, halls: [...cinema.halls, hall] }
            : cinema,
        ),
      );
      setSelectedHallId(hall.id);
      setSelectedSeatIds([]);
      setHallForm((current) => ({ ...current, name: '' }));
      setMessage(data.message ?? 'Tạo phòng thành công.');
    } catch {
      setMessage('Không thể kết nối đến máy chủ.');
    } finally {
      setLoading(false);
    }
  };

  const saveLayout = async (hallOverride?: HallOption) => {
    const hall = hallOverride ?? selectedHall;
    if (!hall) return;

    setLoading(true);
    setMessage('');

    try {
      const response = await fetch(`/api/admin/halls/${hall.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: hall.name,
          layoutWidth: hall.layoutWidth,
          layoutHeight: hall.layoutHeight,
          layoutPreset: hall.layoutPreset,
          seats: hall.seats.map((seat) => ({
            id: seat.id,
            code: seat.code,
            rowLabel: seat.rowLabel,
            seatNumber: seat.seatNumber,
            type: seat.type,
            isActive: seat.isActive,
            positionX: Math.round(seat.positionX),
            positionY: Math.round(seat.positionY),
          })),
          layoutBlocks: hall.layoutBlocks,
        }),
      });
      const data = await response.json();

      if (!response.ok) {
        setMessage(data.message ?? 'Không thể lưu sơ đồ.');
        return;
      }

      if (data.hall) {
        const savedHall = data.hall as HallOption;
        setCinemaList((current) =>
          current.map((cinema) =>
            cinema.id !== selectedCinemaId
              ? cinema
              : {
                  ...cinema,
                  halls: cinema.halls.map((item) =>
                    item.id === savedHall.id ? savedHall : item,
                  ),
                },
          ),
        );
      }

      setMessage(data.message ?? 'Đã lưu sơ đồ.');
    } catch {
      setMessage('Không thể kết nối đến máy chủ.');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Đổi loại ghế.
   * Không cập nhật local state trước — chỉ cập nhật khi API thành công.
   */
  const updateSelectedSeatsType = async (type: SeatType) => {
    if (!selectedHall || selectedSeatIds.length === 0) return;

    const ids = new Set(selectedSeatIds);
    const nextHall = clone(selectedHall);
    nextHall.seats = nextHall.seats.map((seat) =>
      ids.has(seat.id) ? { ...seat, type } : seat,
    );

    await saveLayout(nextHall);
  };

  /**
   * Khóa / mở khóa ghế.
   * Không cập nhật local state trước — chỉ cập nhật khi API thành công.
   */
  const toggleLockSelectedSeats = async (lock: boolean) => {
    if (!selectedHall || selectedSeatIds.length === 0) return;

    const ids = new Set(selectedSeatIds);
    const nextHall = clone(selectedHall);
    nextHall.seats = nextHall.seats.map((seat) =>
      ids.has(seat.id) ? { ...seat, isActive: !lock } : seat,
    );

    await saveLayout(nextHall);
  };

  const startSeatDrag = (
    event: ReactPointerEvent<HTMLButtonElement>,
    seat: SeatOption,
  ) => {
    if (!selectedHall) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    setDragging({
      kind: 'seat',
      id: seat.id,
      offsetX: event.nativeEvent.offsetX,
      offsetY: event.nativeEvent.offsetY,
    });
  };

  const moveCanvas = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!dragging || !selectedHall) return;

    const rect = event.currentTarget.getBoundingClientRect();
    const scaleX = selectedHall.layoutWidth / rect.width;
    const scaleY = selectedHall.layoutHeight / rect.height;

    const rawX =
      (event.clientX - rect.left) * scaleX - dragging.offsetX;
    const rawY =
      (event.clientY - rect.top) * scaleY - dragging.offsetY;

    const maxX = selectedHall.layoutWidth - 44;
    const maxY = selectedHall.layoutHeight - 44;

    const x = Math.max(0, Math.min(maxX, rawX));
    const y = Math.max(0, Math.min(maxY, rawY));

    updateHallLocal((hall) => {
      if (dragging.kind === 'seat') {
        return {
          ...hall,
          seats: hall.seats.map((seat) =>
            seat.id === dragging.id
              ? {
                  ...seat,
                  positionX: Math.round(x),
                  positionY: Math.round(y),
                }
              : seat,
          ),
        };
      }

      return {
        ...hall,
        layoutBlocks: hall.layoutBlocks.map((block) =>
          block.id === dragging.id
            ? {
                ...block,
                x: Math.round(x),
                y: Math.round(y),
              }
            : block,
        ),
      };
    });
  };

  const stopDrag = () => setDragging(null);

  const toggleSeat = (seatId: string) => {
    setSelectedSeatIds((current) =>
      current.includes(seatId)
        ? current.filter((id) => id !== seatId)
        : [...current, seatId],
    );
    setSelectedBlockId('');
  };

  const toggleAllSeats = () => {
    if (!selectedHall) return;
    setSelectedSeatIds((current) =>
      current.length === selectedHall.seats.length
        ? []
        : selectedHall.seats.map((seat) => seat.id),
    );
  };

  const addSeat = async () => {
    if (!selectedHall) return;

    const code =
      newSeatCode.trim() || `N${selectedHall.seats.length + 1}`;
    const rowMatch = code.match(/^[A-Z]+/);
    const numberMatch = code.match(/\d+$/);
    const rowLabel = rowMatch?.[0] ?? 'A';
    const seatNumber = Number(
      numberMatch?.[0] ?? selectedHall.seats.length + 1,
    );

    setLoading(true);
    try {
      const response = await fetch('/api/admin/seats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hallId: selectedHall.id,
          code,
          rowLabel,
          seatNumber,
          type: 'STANDARD',
          isActive: true,
          positionX: Math.round(selectedHall.layoutWidth / 2 - 22),
          positionY: 120,
        }),
      });
      const data = await response.json();

      if (!response.ok) {
        setMessage(data.message ?? 'Không thể thêm ghế.');
        return;
      }

      const newSeat = data.seat as SeatOption;
      updateHallLocal((hall) => ({
        ...hall,
        capacity: hall.capacity + 1,
        seats: [...hall.seats, newSeat],
      }));
      setNewSeatCode('');
      setMessage(
        data.message ??
          'Thêm ghế thành công. Nhấn "Tự động sắp xếp" để căn giữa.',
      );
    } catch {
      setMessage('Không thể kết nối đến máy chủ.');
    } finally {
      setLoading(false);
    }
  };

  const deleteSelectedSeats = async () => {
    if (!selectedHall || selectedSeatIds.length === 0) return;
    if (!confirm(`Xóa ${selectedSeatIds.length} ghế đã chọn?`)) return;

    setLoading(true);
    try {
      for (const id of selectedSeatIds) {
        const response = await fetch(`/api/admin/seats/${id}`, {
          method: 'DELETE',
        });
        const data = await response.json();
        if (!response.ok) {
          setMessage(data.message ?? 'Không thể xóa ghế.');
          return;
        }
      }

      const ids = new Set(selectedSeatIds);
      updateHallLocal((hall) => ({
        ...hall,
        capacity: Math.max(0, hall.capacity - selectedSeatIds.length),
        seats: hall.seats.filter((seat) => !ids.has(seat.id)),
      }));
      setSelectedSeatIds([]);
      setMessage('Đã xóa ghế.');
    } catch {
      setMessage('Không thể kết nối đến máy chủ.');
    } finally {
      setLoading(false);
    }
  };

  const renameSelectedSeats = async () => {
    const value = renameValue.trim();
    if (!selectedHall || selectedSeatIds.length !== 1 || !value) return;

    const id = selectedSeatIds[0];
    const seat = selectedHall.seats.find((item) => item.id === id);
    if (!seat) return;

    const rowMatch = value.match(/^[A-Z]+/);
    const numberMatch = value.match(/\d+$/);
    const rowLabel = rowMatch?.[0] ?? seat.rowLabel;
    const seatNumber = Number(numberMatch?.[0] ?? seat.seatNumber);

    setLoading(true);
    try {
      const response = await fetch(`/api/admin/seats/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: value, rowLabel, seatNumber }),
      });
      const data = await response.json();

      if (!response.ok) {
        setMessage(data.message ?? 'Không thể đổi tên ghế.');
        return;
      }

      updateHallLocal((hall) => ({
        ...hall,
        seats: hall.seats.map((item) =>
          item.id === id
            ? { ...item, code: value, rowLabel, seatNumber }
            : item,
        ),
      }));
      setRenameValue('');
      setMessage(data.message ?? 'Đổi tên ghế thành công.');
    } catch {
      setMessage('Không thể kết nối đến máy chủ.');
    } finally {
      setLoading(false);
    }
  };

  const addBlock = (type: BlockType) => {
    if (!selectedHall) return;

    const block: LayoutBlock = {
      id: `local-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      type,
      x: Math.max(20, Math.floor(selectedHall.layoutWidth / 2 - 100)),
      y: Math.max(80, Math.floor(selectedHall.layoutHeight / 2 - 20)),
      width: type === 'AISLE' ? 70 : 160,
      height:
        type === 'AISLE' ? selectedHall.layoutHeight - 150 : 60,
      label: type === 'AISLE' ? 'Lối đi' : 'Khoảng trống',
    };

    updateHallLocal((hall) => ({
      ...hall,
      layoutBlocks: [...hall.layoutBlocks, block],
    }));
    setSelectedBlockId(block.id);
    setSelectedSeatIds([]);
  };

  const deleteSelectedBlock = () => {
    if (!selectedBlockId) return;
    updateHallLocal((hall) => ({
      ...hall,
      layoutBlocks: hall.layoutBlocks.filter(
        (block) => block.id !== selectedBlockId,
      ),
    }));
    setSelectedBlockId('');
  };

  const autoArrange = (preset: Preset) => {
    if (!selectedHall) return;

    const seats = makePositions(
      selectedHall.seats,
      preset,
      selectedHall.layoutWidth,
      selectedHall.layoutHeight,
    );

    const nextHall = {
      ...clone(selectedHall),
      layoutPreset: preset,
      seats,
    };

    updateHallLocal(() => nextHall);
    setSelectedSeatIds([]);

    const presetLabel =
      PRESETS.find((item) => item.value === preset)?.label ?? preset;
    setMessage(
      `Đã áp dụng mẫu "${presetLabel}". Các hàng ghế đã được căn giữa. Nhấn "Lưu sơ đồ" để lưu.`,
    );
  };

  const updateHallName = (name: string) => {
    updateHallLocal((hall) => ({ ...hall, name }));
  };

  const deleteHall = async () => {
    if (!selectedHall || !confirm(`Xóa ${selectedHall.name}?`)) return;

    setLoading(true);
    try {
      const response = await fetch(
        `/api/admin/halls/${selectedHall.id}`,
        { method: 'DELETE' },
      );
      const data = await response.json();

      if (!response.ok) {
        setMessage(data.message ?? 'Không thể xóa phòng.');
        return;
      }

      const remaining =
        selectedCinema?.halls.filter(
          (hall) => hall.id !== selectedHall.id,
        ) ?? [];

      setCinemaList((current) =>
        current.map((cinema) =>
          cinema.id === selectedCinemaId
            ? { ...cinema, halls: remaining }
            : cinema,
        ),
      );
      setSelectedHallId(remaining[0]?.id ?? '');
      setSelectedSeatIds([]);
      setMessage(data.message ?? 'Xóa phòng thành công.');
    } catch {
      setMessage('Không thể kết nối đến máy chủ.');
    } finally {
      setLoading(false);
    }
  };

  const seatCounts = useMemo(() => {
    const result = { STANDARD: 0, VIP: 0, COUPLE: 0 };
    selectedHall?.seats.forEach((seat) => {
      const type = seat.type as SeatType;
      if (type in result) result[type]++;
    });
    return result;
  }, [selectedHall]);

  return (
    <div className="space-y-6">
      {toast &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            className="pointer-events-none fixed right-4 top-4 z-[9999] max-w-sm"
            role="status"
            style={{ position: 'fixed' }}
          >
            <div
              className={`pointer-events-auto flex items-start gap-3 rounded-2xl border px-4 py-3 shadow-2xl backdrop-blur-xl ${
                toast.type === 'success'
                  ? 'border-emerald-400/40 bg-emerald-500/90 text-white'
                  : toast.type === 'error'
                    ? 'border-rose-400/40 bg-rose-500/90 text-white'
                    : 'border-sky-400/40 bg-sky-500/90 text-white'
              }`}
            >
              <span className="mt-0.5 text-base leading-none">
                {toast.type === 'success'
                  ? '✓'
                  : toast.type === 'error'
                    ? '!'
                    : 'ℹ'}
              </span>
              <p className="flex-1 text-sm leading-6">{toast.text}</p>
              <button
                type="button"
                onClick={() => setToast(null)}
                className="ml-1 shrink-0 rounded-lg px-1.5 py-0.5 text-xs opacity-80 hover:opacity-100"
              >
                ✕
              </button>
            </div>
          </div>,
          document.body,
        )}

      <div className="grid gap-6 lg:grid-cols-2">
        <form
          onSubmit={handleCinemaCreate}
          className="space-y-4 rounded-[28px] border border-white/10 bg-slate-950/70 p-6"
        >
          <h3 className="text-xl font-semibold text-white">
            Thêm rạp chiếu
          </h3>
          <input
            value={cinemaForm.name}
            onChange={(e) =>
              setCinemaForm({ ...cinemaForm, name: e.target.value })
            }
            placeholder="Tên rạp"
            className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white"
            required
          />
          <input
            value={cinemaForm.city}
            onChange={(e) =>
              setCinemaForm({ ...cinemaForm, city: e.target.value })
            }
            placeholder="Thành phố"
            className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white"
            required
          />
          <input
            value={cinemaForm.address}
            onChange={(e) =>
              setCinemaForm({
                ...cinemaForm,
                address: e.target.value,
              })
            }
            placeholder="Địa chỉ"
            className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white"
            required
          />
          <button
            type="submit"
            disabled={loading}
            className="rounded-2xl bg-white px-5 py-3 font-semibold text-slate-950 disabled:opacity-50"
          >
            Lưu rạp
          </button>
        </form>

        <div className="space-y-4 rounded-[28px] border border-white/10 bg-slate-950/70 p-6">
          <h3 className="text-xl font-semibold text-white">Chọn rạp</h3>
          <select
            value={selectedCinemaId}
            onChange={(e) => selectCinema(e.target.value)}
            className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white"
          >
            {cinemaList.map((cinema) => (
              <option
                key={cinema.id}
                value={cinema.id}
                className="bg-slate-950"
              >
                {cinema.name} — {cinema.city}
              </option>
            ))}
          </select>

          {selectedCinema && (
            <>
              <input
                value={selectedCinema.name}
                onChange={(e) =>
                  setCinemaList((current) =>
                    current.map((c) =>
                      c.id === selectedCinema.id
                        ? { ...c, name: e.target.value }
                        : c,
                    ),
                  )
                }
                className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white"
              />
              <input
                value={selectedCinema.city}
                onChange={(e) =>
                  setCinemaList((current) =>
                    current.map((c) =>
                      c.id === selectedCinema.id
                        ? { ...c, city: e.target.value }
                        : c,
                    ),
                  )
                }
                className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white"
              />
              <input
                value={selectedCinema.address}
                onChange={(e) =>
                  setCinemaList((current) =>
                    current.map((c) =>
                      c.id === selectedCinema.id
                        ? { ...c, address: e.target.value }
                        : c,
                    ),
                  )
                }
                className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white"
              />
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={handleCinemaUpdate}
                  disabled={loading}
                  className="rounded-2xl bg-white px-4 py-3 font-semibold text-slate-950 disabled:opacity-50"
                >
                  Cập nhật rạp
                </button>
                <button
                  type="button"
                  onClick={handleCinemaDelete}
                  disabled={loading}
                  className="rounded-2xl border border-rose-400/40 px-4 py-3 font-semibold text-rose-200 disabled:opacity-50"
                >
                  Xóa rạp
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
        <div className="space-y-5 rounded-[28px] border border-white/10 bg-slate-950/70 p-5">
          <div>
            <h3 className="text-xl font-semibold text-white">
              Phòng chiếu
            </h3>
            <p className="mt-1 text-xs text-slate-400">
              Tạo phòng mới, sau đó chỉnh sửa trực tiếp trên sơ đồ.
            </p>
          </div>

          <form
            onSubmit={handleHallCreate}
            className="space-y-3 border-b border-white/10 pb-5"
          >
            <input
              value={hallForm.name}
              onChange={(e) =>
                setHallForm({ ...hallForm, name: e.target.value })
              }
              placeholder="Tên phòng mới"
              className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white"
              required
            />

            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="mb-1 block text-[11px] text-slate-400">
                  Standard
                </label>
                <input
                  type="number"
                  min={0}
                  max={400}
                  value={hallForm.standardCount}
                  onChange={(e) =>
                    setHallForm({
                      ...hallForm,
                      standardCount: Math.max(0, Number(e.target.value)),
                    })
                  }
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-white"
                />
              </div>
              <div>
                <label className="mb-1 block text-[11px] text-slate-400">
                  VIP
                </label>
                <input
                  type="number"
                  min={0}
                  max={200}
                  value={hallForm.vipCount}
                  onChange={(e) =>
                    setHallForm({
                      ...hallForm,
                      vipCount: Math.max(0, Number(e.target.value)),
                    })
                  }
                  className="w-full rounded-xl border border-amber-400/20 bg-white/5 px-3 py-2.5 text-amber-100"
                />
              </div>
              <div>
                <label className="mb-1 block text-[11px] text-slate-400">
                  Couple
                </label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={hallForm.coupleCount}
                  onChange={(e) =>
                    setHallForm({
                      ...hallForm,
                      coupleCount: Math.max(0, Number(e.target.value)),
                    })
                  }
                  className="w-full rounded-xl border border-fuchsia-400/20 bg-white/5 px-3 py-2.5 text-fuchsia-100"
                />
              </div>
            </div>
            <p className="text-[11px] text-slate-500">
              Tổng:{' '}
              {hallForm.standardCount +
                hallForm.vipCount +
                hallForm.coupleCount}{' '}
              ghế
            </p>

            <select
              value={hallForm.layoutPreset}
              onChange={(e) =>
                setHallForm({
                  ...hallForm,
                  layoutPreset: e.target.value as Preset,
                })
              }
              className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-white"
            >
              {PRESETS.map((item) => (
                <option
                  key={item.value}
                  value={item.value}
                  className="bg-slate-950"
                >
                  {item.label}
                </option>
              ))}
            </select>

            <button
              type="submit"
              disabled={loading || !selectedCinemaId}
              className="w-full rounded-xl bg-sky-500 px-4 py-2.5 font-semibold text-white disabled:opacity-50"
            >
              + Tạo phòng
            </button>
          </form>

          <div className="space-y-2">
            {selectedCinema?.halls.map((hall) => (
              <button
                type="button"
                key={hall.id}
                onClick={() => selectHall(hall.id)}
                className={`w-full rounded-2xl border px-4 py-3 text-left transition ${
                  hall.id === selectedHallId
                    ? 'border-sky-400/40 bg-sky-500/15'
                    : 'border-white/10 bg-white/5 hover:bg-white/10'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-white">
                    {hall.name}
                  </span>
                  <span className="text-xs text-slate-400">
                    {hall.seats.length} ghế
                  </span>
                </div>
                <div className="mt-1 text-xs text-slate-400">
                  {hall.layoutWidth} × {hall.layoutHeight}
                </div>
              </button>
            ))}
          </div>

          {selectedHall && (
            <div className="space-y-3 border-t border-white/10 pt-5">
              <input
                value={selectedHall.name}
                onChange={(e) => updateHallName(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-white"
              />

              <div className="grid grid-cols-2 gap-2">
                <input
                  type="number"
                  min={600}
                  max={3000}
                  value={selectedHall.layoutWidth}
                  onChange={(e) =>
                    updateHallLocal((hall) => ({
                      ...hall,
                      layoutWidth: Math.max(
                        600,
                        Math.min(3000, Number(e.target.value)),
                      ),
                    }))
                  }
                  className="rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-white"
                />
                <input
                  type="number"
                  min={400}
                  max={2000}
                  value={selectedHall.layoutHeight}
                  onChange={(e) =>
                    updateHallLocal((hall) => ({
                      ...hall,
                      layoutHeight: Math.max(
                        400,
                        Math.min(2000, Number(e.target.value)),
                      ),
                    }))
                  }
                  className="rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-white"
                />
              </div>

              <select
                value={selectedHall.layoutPreset}
                onChange={(e) =>
                  autoArrange(e.target.value as Preset)
                }
                className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-white"
              >
                {PRESETS.map((item) => (
                  <option
                    key={item.value}
                    value={item.value}
                    className="bg-slate-950"
                  >
                    {item.label}
                  </option>
                ))}
              </select>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() =>
                    autoArrange(
                      selectedHall.layoutPreset as Preset,
                    )
                  }
                  className="flex-1 rounded-xl border border-sky-400/30 bg-sky-500/10 px-3 py-2 text-sm font-semibold text-sky-200"
                >
                  Tự động sắp xếp
                </button>
                <button
                  type="button"
                  onClick={() => saveLayout()}
                  disabled={loading}
                  className="flex-1 rounded-xl bg-white px-3 py-2 text-sm font-semibold text-slate-950 disabled:opacity-50"
                >
                  Lưu sơ đồ
                </button>
              </div>

              <button
                type="button"
                onClick={deleteHall}
                disabled={loading}
                className="w-full rounded-xl border border-rose-400/30 px-3 py-2 text-sm font-semibold text-rose-200"
              >
                Xóa phòng
              </button>
            </div>
          )}
        </div>

        <div className="min-w-0 rounded-[28px] border border-white/10 bg-slate-950/70 p-5">
          {!selectedHall ? (
            <div className="flex min-h-[500px] items-center justify-center text-slate-400">
              Chọn một phòng để thiết kế sơ đồ.
            </div>
          ) : (
            <>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-xl font-semibold text-white">
                    {selectedHall.name}
                  </h3>
                  <p className="text-xs text-slate-400">
                    Kéo ghế tự do. Click để chọn nhiều ghế.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2 text-xs">
                  <span className="rounded-full bg-slate-700 px-3 py-1 text-slate-200">
                    Standard {seatCounts.STANDARD}
                  </span>
                  <span className="rounded-full bg-amber-500/20 px-3 py-1 text-amber-200">
                    VIP {seatCounts.VIP}
                  </span>
                  <span className="rounded-full bg-fuchsia-500/20 px-3 py-1 text-fuchsia-200">
                    Couple {seatCounts.COUPLE}
                  </span>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-2 rounded-2xl border border-white/10 bg-white/5 p-3">
                <button
                  type="button"
                  onClick={toggleAllSeats}
                  className="rounded-xl border border-white/10 px-3 py-2 text-xs text-slate-200"
                >
                  Chọn tất cả
                </button>

                <select
                  value={
                    selectedSeatIds.length === 0
                      ? ''
                      : selectedHall.seats.find(
                          (s) => s.id === selectedSeatIds[0],
                        )?.type ?? ''
                  }
                  onChange={(e) =>
                    updateSelectedSeatsType(
                      e.target.value as SeatType,
                    )
                  }
                  disabled={selectedSeatIds.length === 0}
                  className="rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-xs text-white disabled:opacity-50"
                >
                  <option value="">Đổi loại ghế...</option>
                  {TYPES.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>

                <input
                  value={renameValue}
                  onChange={(e) => setRenameValue(e.target.value)}
                  placeholder="Tên ghế mới"
                  disabled={selectedSeatIds.length !== 1}
                  className="w-36 rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-xs text-white disabled:opacity-50"
                />
                <button
                  type="button"
                  onClick={renameSelectedSeats}
                  disabled={
                    selectedSeatIds.length !== 1 ||
                    !renameValue.trim()
                  }
                  className="rounded-xl border border-white/10 px-3 py-2 text-xs text-slate-200 disabled:opacity-40"
                >
                  Đổi tên
                </button>

                <input
                  value={newSeatCode}
                  onChange={(e) => setNewSeatCode(e.target.value)}
                  placeholder="Mã ghế mới"
                  className="w-32 rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-xs text-white"
                />
                <button
                  type="button"
                  onClick={addSeat}
                  disabled={loading}
                  className="rounded-xl bg-emerald-500/20 px-3 py-2 text-xs font-semibold text-emerald-200 disabled:opacity-40"
                >
                  + Thêm ghế
                </button>

                <button
                  type="button"
                  onClick={() => toggleLockSelectedSeats(true)}
                  disabled={
                    selectedSeatIds.length === 0 || loading
                  }
                  className="rounded-xl border border-orange-400/30 px-3 py-2 text-xs text-orange-200 disabled:opacity-40"
                  title="Khóa ghế (không cho đặt). Không khóa được nếu đã có người đặt vé."
                >
                  Khóa ghế
                </button>
                <button
                  type="button"
                  onClick={() => toggleLockSelectedSeats(false)}
                  disabled={
                    selectedSeatIds.length === 0 || loading
                  }
                  className="rounded-xl border border-emerald-400/30 px-3 py-2 text-xs text-emerald-200 disabled:opacity-40"
                  title="Mở khóa ghế"
                >
                  Mở khóa
                </button>

                <button
                  type="button"
                  onClick={deleteSelectedSeats}
                  disabled={
                    selectedSeatIds.length === 0 || loading
                  }
                  className="rounded-xl border border-rose-400/30 px-3 py-2 text-xs text-rose-200 disabled:opacity-40"
                >
                  Xóa ghế đã chọn
                </button>

                <button
                  type="button"
                  onClick={() => addBlock('AISLE')}
                  className="rounded-xl border border-sky-400/30 px-3 py-2 text-xs text-sky-200"
                >
                  + Lối đi
                </button>
                <button
                  type="button"
                  onClick={() => addBlock('SPACE')}
                  className="rounded-xl border border-violet-400/30 px-3 py-2 text-xs text-violet-200"
                >
                  + Khoảng trống
                </button>

                {selectedBlockId && (
                  <button
                    type="button"
                    onClick={deleteSelectedBlock}
                    className="rounded-xl border border-rose-400/30 px-3 py-2 text-xs text-rose-200"
                  >
                    Xóa khối
                  </button>
                )}
              </div>

              <div
                ref={canvasContainerRef}
                className="mt-4 min-h-[480px] overflow-hidden rounded-3xl border border-white/10 bg-slate-900/80 p-4"
              >
                {(() => {
                  const scale = Math.min(
                    1,
                    containerSize.width / selectedHall.layoutWidth,
                    containerSize.height /
                      selectedHall.layoutHeight,
                  );

                  const scaledWidth =
                    selectedHall.layoutWidth * scale;
                  const scaledHeight =
                    selectedHall.layoutHeight * scale;

                  return (
                    <div
                      className="relative mx-auto select-none"
                      style={{
                        width: scaledWidth,
                        height: scaledHeight,
                      }}
                    >
                      <div
                        className="absolute left-0 top-0 select-none overflow-hidden rounded-3xl border border-white/10 bg-slate-950"
                        style={{
                          width: selectedHall.layoutWidth,
                          height: selectedHall.layoutHeight,
                          transform: `scale(${scale})`,
                          transformOrigin: 'top left',
                        }}
                        onPointerMove={moveCanvas}
                        onPointerUp={stopDrag}
                        onPointerCancel={stopDrag}
                      >
                        <div className="absolute left-[8%] right-[8%] top-5 rounded-full border border-white/10 bg-white/5 py-2 text-center text-xs font-bold uppercase tracking-[0.35em] text-slate-400">
                          MÀN HÌNH
                        </div>

                        {selectedHall.layoutBlocks.map((block) => (
                          <button
                            type="button"
                            key={block.id}
                            onPointerDown={(event) => {
                              event.currentTarget.setPointerCapture(
                                event.pointerId,
                              );
                              setSelectedBlockId(block.id);
                              setSelectedSeatIds([]);
                              setDragging({
                                kind: 'block',
                                id: block.id,
                                offsetX:
                                  event.nativeEvent.offsetX,
                                offsetY:
                                  event.nativeEvent.offsetY,
                              });
                            }}
                            className={`absolute rounded-xl border text-xs font-semibold ${
                              selectedBlockId === block.id
                                ? 'border-white ring-2 ring-white/30'
                                : 'border-white/10'
                            } ${
                              block.type === 'AISLE'
                                ? 'bg-sky-500/15 text-sky-200'
                                : 'bg-violet-500/10 text-violet-200'
                            }`}
                            style={{
                              left: block.x,
                              top: block.y,
                              width: block.width,
                              height: block.height,
                            }}
                          >
                            {block.label ??
                              (block.type === 'AISLE'
                                ? 'Lối đi'
                                : 'Khoảng trống')}
                          </button>
                        ))}

                        {selectedHall.seats.map((seat) => {
                          const selected =
                            selectedSeatIds.includes(seat.id);
                          const type = seat.type as SeatType;

                          const typeClass =
                            type === 'VIP'
                              ? 'border-amber-300/60 bg-amber-400/20 text-amber-100'
                              : type === 'COUPLE'
                                ? 'border-fuchsia-300/60 bg-fuchsia-400/20 text-fuchsia-100'
                                : 'border-slate-400/40 bg-slate-500/20 text-slate-100';

                          return (
                            <button
                              type="button"
                              key={seat.id}
                              onPointerDown={(event) =>
                                startSeatDrag(event, seat)
                              }
                              onClick={() => toggleSeat(seat.id)}
                              className={`absolute flex h-11 w-11 items-center justify-center rounded-xl border text-[10px] font-bold shadow-lg transition ${typeClass} ${
                                selected
                                  ? 'ring-2 ring-sky-300 ring-offset-2 ring-offset-slate-950'
                                  : ''
                              } ${
                                !seat.isActive
                                  ? 'opacity-35 grayscale'
                                  : ''
                              }`}
                              style={{
                                left: seat.positionX,
                                top: seat.positionY,
                              }}
                              title={`${seat.code} — ${type}${
                                seat.isActive
                                  ? ''
                                  : ' (Đã khóa)'
                              }`}
                            >
                              {seat.code}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })()}
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl border border-white/10 bg-white/5 p-3 text-xs text-slate-300">
                  Ghế chọn:{' '}
                  <b className="text-white">
                    {selectedSeatIds.length}
                  </b>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-3 text-xs text-slate-300">
                  Sức chứa:{' '}
                  <b className="text-white">
                    {selectedHall.capacity}
                  </b>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-3 text-xs text-slate-300">
                  Khối:{' '}
                  <b className="text-white">
                    {selectedHall.layoutBlocks.length}
                  </b>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}