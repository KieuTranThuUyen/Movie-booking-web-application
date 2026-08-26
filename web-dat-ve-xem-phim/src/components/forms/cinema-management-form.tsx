'use client';

import { useMemo, useState } from 'react';
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
  {
    value: 'STANDARD',
    label: 'Rạp tiêu chuẩn',
  },
  {
    value: 'AISLE_CENTER',
    label: 'Có lối đi giữa',
  },
  {
    value: 'STAGGERED',
    label: 'So le',
  },
  {
    value: 'VIP_REAR',
    label: 'VIP phía sau',
  },
  {
    value: 'COUPLE_REAR',
    label: 'Couple cuối rạp',
  },
  {
    value: 'FREE',
    label: 'Tự do',
  },
];

const TYPES: Array<{
  value: SeatType;
  label: string;
}> = [
  {
    value: 'STANDARD',
    label: 'Standard',
  },
  {
    value: 'VIP',
    label: 'VIP',
  },
  {
    value: 'COUPLE',
    label: 'Couple',
  },
];

const clone = <T,>(value: T): T =>
  JSON.parse(JSON.stringify(value)) as T;

function defaultCounts(total: number) {
  const vip = Math.min(
    12,
    Math.floor(total * 0.2),
  );

  const couple = Math.min(
    4,
    Math.floor(total * 0.1),
  );

  return {
    STANDARD: Math.max(
      0,
      total - vip - couple,
    ),
    VIP: vip,
    COUPLE: couple,
  };
}

/**
 * Tự động sắp xếp ghế.
 *
 * Điểm quan trọng:
 * - Mỗi hàng được căn giữa theo canvas.
 * - AISLE_CENTER vẫn giữ tâm hàng.
 * - STAGGERED vẫn giữ tâm hàng.
 * - Không còn bắt đầu cứng từ x = 90.
 */
function makePositions(
  seats: SeatOption[],
  preset: Preset,
  width: number,
  height: number,
) {
  const ordered = [...seats].sort((a, b) => {
    const rowCompare =
      a.rowLabel.localeCompare(b.rowLabel);

    return (
      rowCompare ||
      a.seatNumber - b.seatNumber
    );
  });

  const rows = new Map<
    string,
    SeatOption[]
  >();

  ordered.forEach((seat) => {
    const row =
      rows.get(seat.rowLabel) ?? [];

    row.push(seat);

    rows.set(
      seat.rowLabel,
      row,
    );
  });

  const rowList = [...rows.values()];
  const result = clone(seats);

  if (rowList.length === 0) {
    return result;
  }

  const seatSize = 44;

  const sidePadding = 70;

  const topPadding = 100;

  const bottomPadding = 70;

  /*
   * Số ghế lớn nhất trong một hàng.
   */
  const maxSeats = Math.max(
    ...rowList.map(
      (row) => row.length,
    ),
  );

  /*
   * Tính khoảng cách ngang.
   */
  const availableWidth =
    width - sidePadding * 2;

  let gapX =
    maxSeats > 1
      ? Math.floor(
          (availableWidth -
            seatSize) /
            (maxSeats - 1),
        )
      : 0;

  /*
   * Giới hạn khoảng cách.
   */
  gapX = Math.max(
    52,
    Math.min(gapX, 70),
  );

  /*
   * Tính khoảng cách dọc.
   */
  const availableHeight =
    height -
    topPadding -
    bottomPadding;

  let gapY =
    rowList.length > 1
      ? Math.floor(
          availableHeight /
            (rowList.length - 1),
        )
      : 0;

  gapY = Math.max(
    52,
    Math.min(gapY, 62),
  );

  rowList.forEach(
    (row, rowIndex) => {
      /*
       * Tính vị trí tương đối
       * của từng ghế trong hàng.
       */
      const positions: number[] = [];

      row.forEach(
        (_, columnIndex) => {
          let x =
            columnIndex * gapX;

          /*
           * Lối đi giữa.
           */
          if (
            preset ===
              'AISLE_CENTER' &&
            columnIndex >=
              Math.ceil(
                row.length / 2,
              )
          ) {
            x += gapX * 0.8;
          }

          /*
           * So le.
           */
          if (
            preset === 'STAGGERED' &&
            rowIndex % 2 === 1
          ) {
            x += gapX / 2;
          }

          positions.push(x);
        },
      );

      /*
       * Tìm chiều rộng thực tế
       * của hàng.
       */
      const minX =
        Math.min(...positions);

      const maxX =
        Math.max(...positions);

      const actualWidth =
        maxX - minX + seatSize;

      /*
       * CĂN GIỮA HÀNG.
       */
      let centeredStartX =
        Math.round(
          (width - actualWidth) /
            2,
        );

      /*
       * Không cho hàng vượt
       * quá vùng an toàn.
       */
      centeredStartX = Math.max(
        sidePadding,
        Math.min(
          centeredStartX,
          width -
            sidePadding -
            actualWidth,
        ),
      );

      row.forEach(
        (seat, columnIndex) => {
          const target =
            result.find(
              (item) =>
                item.id ===
                seat.id,
            );

          if (!target) return;

          target.positionX =
            Math.round(
              centeredStartX +
                positions[
                  columnIndex
                ],
            );

          target.positionY =
            Math.round(
              topPadding +
                rowIndex * gapY,
            );

          /*
           * VIP phía sau.
           */
          if (
            preset === 'VIP_REAR'
          ) {
            target.type =
              rowIndex >=
              Math.floor(
                rowList.length *
                  0.65,
              )
                ? 'VIP'
                : 'STANDARD';
          }

          /*
           * Couple phía sau.
           */
          if (
            preset === 'COUPLE_REAR'
          ) {
            target.type =
              rowIndex >=
              Math.floor(
                rowList.length *
                  0.75,
              )
                ? 'COUPLE'
                : 'STANDARD';
          }
        },
      );
    },
  );

  return result;
}

export function CinemaManagementForm({
  cinemas,
}: Props) {
  const [
    cinemaList,
    setCinemaList,
  ] = useState<CinemaOption[]>(
    clone(cinemas),
  );

  const [
    selectedCinemaId,
    setSelectedCinemaId,
  ] = useState(
    cinemas[0]?.id ?? '',
  );

  const [
    selectedHallId,
    setSelectedHallId,
  ] = useState(
    cinemas[0]?.halls[0]?.id ?? '',
  );

  const [
    selectedSeatIds,
    setSelectedSeatIds,
  ] = useState<string[]>([]);

  const [
    selectedBlockId,
    setSelectedBlockId,
  ] = useState('');

  const [
    message,
    setMessage,
  ] = useState('');

  const [
    loading,
    setLoading,
  ] = useState(false);

  const [
    dragging,
    setDragging,
  ] = useState<{
    kind: 'seat' | 'block';
    id: string;
    offsetX: number;
    offsetY: number;
  } | null>(null);

  const [
    cinemaForm,
    setCinemaForm,
  ] = useState({
    name: '',
    city: '',
    address: '',
  });

  const [
    hallForm,
    setHallForm,
  ] = useState({
    name: '',
    rows: 6,
    seatsPerRow: 8,
    layoutWidth: 1000,
    layoutHeight: 650,
    layoutPreset:
      'STANDARD' as Preset,
  });

  const [
    newSeatCode,
    setNewSeatCode,
  ] = useState('');

  const [
    renameValue,
    setRenameValue,
  ] = useState('');

  const selectedCinema =
    useMemo(
      () =>
        cinemaList.find(
          (cinema) =>
            cinema.id ===
            selectedCinemaId,
        ),
      [
        cinemaList,
        selectedCinemaId,
      ],
    );

  const selectedHall =
    useMemo(
      () =>
        selectedCinema?.halls.find(
          (hall) =>
            hall.id ===
            selectedHallId,
        ),
      [
        selectedCinema,
        selectedHallId,
      ],
    );

  /*
   * Cập nhật hall ở local state.
   */
  const updateHallLocal = (
    updater: (
      hall: HallOption,
    ) => HallOption,
  ) => {
    setCinemaList(
      (current) =>
        current.map(
          (cinema) =>
            cinema.id !==
            selectedCinemaId
              ? cinema
              : {
                  ...cinema,
                  halls:
                    cinema.halls.map(
                      (hall) =>
                        hall.id ===
                        selectedHallId
                          ? updater(
                              clone(
                                hall,
                              ),
                            )
                          : hall,
                    ),
                },
        ),
    );
  };

  /*
   * Chọn rạp.
   */
  const selectCinema = (
    id: string,
  ) => {
    setSelectedCinemaId(id);

    const cinema =
      cinemaList.find(
        (item) =>
          item.id === id,
      );

    const hall =
      cinema?.halls[0];

    setSelectedHallId(
      hall?.id ?? '',
    );

    setSelectedSeatIds([]);

    setSelectedBlockId('');
  };

  /*
   * Chọn phòng.
   */
  const selectHall = (
    id: string,
  ) => {
    setSelectedHallId(id);

    setSelectedSeatIds([]);

    setSelectedBlockId('');

    const hall =
      selectedCinema?.halls.find(
        (item) =>
          item.id === id,
      );

    if (!hall) return;

    setHallForm(
      (current) => ({
        ...current,
        name: hall.name,
        layoutWidth:
          hall.layoutWidth,
        layoutHeight:
          hall.layoutHeight,
        layoutPreset:
          (hall.layoutPreset as Preset) ||
          'STANDARD',
      }),
    );
  };

  /*
   * Tạo rạp.
   */
  const handleCinemaCreate =
    async (
      event: FormEvent,
    ) => {
      event.preventDefault();

      if (
        !cinemaForm.name.trim()
      ) {
        setMessage(
          'Vui lòng nhập tên rạp.',
        );
        return;
      }

      setLoading(true);
      setMessage('');

      try {
        const response =
          await fetch(
            '/api/admin/cinemas',
            {
              method: 'POST',
              headers: {
                'Content-Type':
                  'application/json',
              },
              body: JSON.stringify(
                cinemaForm,
              ),
            },
          );

        const data =
          await response.json();

        if (!response.ok) {
          setMessage(
            data.message ??
              'Không thể tạo rạp.',
          );
          return;
        }

        const cinema = {
          ...data.cinema,
          halls:
            data.cinema?.halls ??
            [],
        } as CinemaOption;

        setCinemaList(
          (current) => [
            cinema,
            ...current,
          ],
        );

        setSelectedCinemaId(
          cinema.id,
        );

        setSelectedHallId('');

        setCinemaForm({
          name: '',
          city: '',
          address: '',
        });

        setMessage(
          data.message ??
            'Tạo rạp thành công.',
        );
      } catch {
        setMessage(
          'Không thể kết nối đến máy chủ.',
        );
      } finally {
        setLoading(false);
      }
    };

  /*
   * Cập nhật rạp.
   */
  const handleCinemaUpdate =
    async () => {
      if (
        !selectedCinemaId ||
        !selectedCinema
      ) {
        return;
      }

      setLoading(true);

      try {
        const response =
          await fetch(
            `/api/admin/cinemas/${selectedCinemaId}`,
            {
              method: 'PATCH',
              headers: {
                'Content-Type':
                  'application/json',
              },
              body: JSON.stringify({
                name:
                  selectedCinema.name,
                city:
                  selectedCinema.city,
                address:
                  selectedCinema.address,
              }),
            },
          );

        const data =
          await response.json();

        if (!response.ok) {
          setMessage(
            data.message ??
              'Không thể cập nhật rạp.',
          );
          return;
        }

        setMessage(
          data.message ??
            'Cập nhật rạp thành công.',
        );
      } catch {
        setMessage(
          'Không thể kết nối đến máy chủ.',
        );
      } finally {
        setLoading(false);
      }
    };

  /*
   * Xóa rạp.
   */
  const handleCinemaDelete =
    async () => {
      if (
        !selectedCinemaId ||
        !confirm(
          'Xóa rạp này?',
        )
      ) {
        return;
      }

      setLoading(true);

      try {
        const response =
          await fetch(
            `/api/admin/cinemas/${selectedCinemaId}`,
            {
              method: 'DELETE',
            },
          );

        const data =
          await response.json();

        if (!response.ok) {
          setMessage(
            data.message ??
              'Không thể xóa rạp.',
          );
          return;
        }

        const next =
          cinemaList.filter(
            (item) =>
              item.id !==
              selectedCinemaId,
          );

        setCinemaList(next);

        setSelectedCinemaId(
          next[0]?.id ?? '',
        );

        setSelectedHallId(
          next[0]?.halls[0]?.id ??
            '',
        );

        setSelectedSeatIds([]);

        setMessage(
          data.message ??
            'Xóa rạp thành công.',
        );
      } catch {
        setMessage(
          'Không thể kết nối đến máy chủ.',
        );
      } finally {
        setLoading(false);
      }
    };

  /*
   * Tạo phòng.
   */
  const handleHallCreate =
    async (
      event: FormEvent,
    ) => {
      event.preventDefault();

      if (
        !selectedCinemaId ||
        !hallForm.name.trim()
      ) {
        setMessage(
          'Vui lòng chọn rạp và nhập tên phòng.',
        );
        return;
      }

      const total =
        hallForm.rows *
        hallForm.seatsPerRow;

      const counts =
        defaultCounts(total);

      setLoading(true);
      setMessage('');

      try {
        const response =
          await fetch(
            '/api/admin/halls',
            {
              method: 'POST',
              headers: {
                'Content-Type':
                  'application/json',
              },
              body: JSON.stringify({
                cinemaId:
                  selectedCinemaId,
                name:
                  hallForm.name,
                rows:
                  hallForm.rows,
                seatsPerRow:
                  hallForm.seatsPerRow,
                layoutWidth:
                  hallForm.layoutWidth,
                layoutHeight:
                  hallForm.layoutHeight,
                layoutPreset:
                  hallForm.layoutPreset,
                seatTypes:
                  Object.entries(
                    counts,
                  ).map(
                    ([
                      type,
                      quantity,
                    ]) => ({
                      type,
                      quantity,
                    }),
                  ),
              }),
            },
          );

        const data =
          await response.json();

        if (!response.ok) {
          setMessage(
            data.message ??
              'Không thể tạo phòng.',
          );
          return;
        }

        const hall =
          data.hall as HallOption;

        setCinemaList(
          (current) =>
            current.map(
              (cinema) =>
                cinema.id ===
                selectedCinemaId
                  ? {
                      ...cinema,
                      halls: [
                        ...cinema.halls,
                        hall,
                      ],
                    }
                  : cinema,
            ),
        );

        setSelectedHallId(
          hall.id,
        );

        setSelectedSeatIds([]);

        setHallForm(
          (current) => ({
            ...current,
            name: '',
          }),
        );

        setMessage(
          data.message ??
            'Tạo phòng thành công.',
        );
      } catch {
        setMessage(
          'Không thể kết nối đến máy chủ.',
        );
      } finally {
        setLoading(false);
      }
    };

  /*
   * Lưu layout.
   */
  const saveLayout = async (
    hallOverride?: HallOption,
  ) => {
    const hall =
      hallOverride ??
      selectedHall;

    if (!hall) return;

    setLoading(true);
    setMessage('');

    try {
      const response =
        await fetch(
          `/api/admin/halls/${hall.id}`,
          {
            method: 'PATCH',
            headers: {
              'Content-Type':
                'application/json',
            },
            body: JSON.stringify({
              name: hall.name,

              layoutWidth:
                hall.layoutWidth,

              layoutHeight:
                hall.layoutHeight,

              layoutPreset:
                hall.layoutPreset,

              seats:
                hall.seats.map(
                  (seat) => ({
                    id: seat.id,
                    code: seat.code,
                    rowLabel:
                      seat.rowLabel,
                    seatNumber:
                      seat.seatNumber,
                    type: seat.type,
                    isActive:
                      seat.isActive,
                    positionX:
                      Math.round(
                        seat.positionX,
                      ),
                    positionY:
                      Math.round(
                        seat.positionY,
                      ),
                  }),
                ),

              layoutBlocks:
                hall.layoutBlocks,
            }),
          },
        );

      const data =
        await response.json();

      if (!response.ok) {
        setMessage(
          data.message ??
            'Không thể lưu sơ đồ.',
        );
        return;
      }

      if (data.hall) {
        const savedHall =
          data.hall as HallOption;

        setCinemaList(
          (current) =>
            current.map(
              (cinema) =>
                cinema.id !==
                selectedCinemaId
                  ? cinema
                  : {
                      ...cinema,
                      halls:
                        cinema.halls.map(
                          (item) =>
                            item.id ===
                            savedHall.id
                              ? savedHall
                              : item,
                        ),
                    },
            ),
        );
      }

      setMessage(
        data.message ??
          'Đã lưu sơ đồ.',
      );
    } catch {
      setMessage(
        'Không thể kết nối đến máy chủ.',
      );
    } finally {
      setLoading(false);
    }
  };

  /*
   * Đổi loại ghế.
   */
  const updateSelectedSeatsType =
    async (
      type: SeatType,
    ) => {
      if (
        !selectedHall ||
        selectedSeatIds.length ===
          0
      ) {
        return;
      }

      const ids = new Set(
        selectedSeatIds,
      );

      const nextHall =
        clone(selectedHall);

      nextHall.seats =
        nextHall.seats.map(
          (seat) =>
            ids.has(seat.id)
              ? {
                  ...seat,
                  type,
                }
              : seat,
        );

      updateHallLocal(
        () => nextHall,
      );

      await saveLayout(
        nextHall,
      );
    };

  /*
   * Bắt đầu kéo ghế.
   */
  const startSeatDrag = (
    event: ReactPointerEvent<HTMLButtonElement>,
    seat: SeatOption,
  ) => {
    if (!selectedHall) return;

    event.currentTarget.setPointerCapture(
      event.pointerId,
    );

    setDragging({
      kind: 'seat',
      id: seat.id,
      offsetX:
        event.nativeEvent
          .offsetX,
      offsetY:
        event.nativeEvent
          .offsetY,
    });
  };

  /*
   * Kéo seat/block.
   */
  const moveCanvas = (
    event: ReactPointerEvent<HTMLDivElement>,
  ) => {
    if (
      !dragging ||
      !selectedHall
    ) {
      return;
    }

    const rect =
      event.currentTarget.getBoundingClientRect();

    const rawX =
      event.clientX -
      rect.left -
      dragging.offsetX;

    const rawY =
      event.clientY -
      rect.top -
      dragging.offsetY;

    const maxX =
      selectedHall.layoutWidth -
      44;

    const maxY =
      selectedHall.layoutHeight -
      44;

    const x = Math.max(
      0,
      Math.min(
        maxX,
        rawX,
      ),
    );

    const y = Math.max(
      0,
      Math.min(
        maxY,
        rawY,
      ),
    );

    updateHallLocal(
      (hall) => {
        if (
          dragging.kind ===
          'seat'
        ) {
          return {
            ...hall,
            seats:
              hall.seats.map(
                (seat) =>
                  seat.id ===
                  dragging.id
                    ? {
                        ...seat,
                        positionX:
                          Math.round(
                            x,
                          ),
                        positionY:
                          Math.round(
                            y,
                          ),
                      }
                    : seat,
              ),
          };
        }

        return {
          ...hall,
          layoutBlocks:
            hall.layoutBlocks.map(
              (block) =>
                block.id ===
                dragging.id
                  ? {
                      ...block,
                      x: Math.round(
                        x,
                      ),
                      y: Math.round(
                        y,
                      ),
                    }
                  : block,
            ),
        };
      },
    );
  };

  const stopDrag = () =>
    setDragging(null);

  /*
   * Chọn ghế.
   */
  const toggleSeat = (
    seatId: string,
  ) => {
    setSelectedSeatIds(
      (current) =>
        current.includes(
          seatId,
        )
          ? current.filter(
              (id) =>
                id !== seatId,
            )
          : [
              ...current,
              seatId,
            ],
    );

    setSelectedBlockId('');
  };

  /*
   * Chọn tất cả.
   */
  const toggleAllSeats =
    () => {
      if (!selectedHall) return;

      setSelectedSeatIds(
        (current) =>
          current.length ===
          selectedHall.seats
            .length
            ? []
            : selectedHall.seats.map(
                (seat) =>
                  seat.id,
              ),
      );
    };

  /*
   * Thêm ghế.
   */
  const addSeat = async () => {
    if (!selectedHall) return;

    const code =
      newSeatCode.trim() ||
      `N${
        selectedHall.seats
          .length + 1
      }`;

    const rowMatch =
      code.match(
        /^[A-Z]+/,
      );

    const numberMatch =
      code.match(
        /\d+$/,
      );

    const rowLabel =
      rowMatch?.[0] ?? 'A';

    const seatNumber =
      Number(
        numberMatch?.[0] ??
          selectedHall.seats
            .length + 1,
      );

    setLoading(true);

    try {
      const response =
        await fetch(
          '/api/admin/seats',
          {
            method: 'POST',
            headers: {
              'Content-Type':
                'application/json',
            },
            body: JSON.stringify({
              hallId:
                selectedHall.id,

              code,

              rowLabel,

              seatNumber,

              type: 'STANDARD',

              isActive: true,

              /*
               * Thêm tạm vào chính giữa.
               */
              positionX:
                Math.round(
                  selectedHall.layoutWidth /
                    2 -
                    22,
                ),

              positionY: 120,
            }),
          },
        );

      const data =
        await response.json();

      if (!response.ok) {
        setMessage(
          data.message ??
            'Không thể thêm ghế.',
        );
        return;
      }

      const newSeat =
        data.seat as SeatOption;

      updateHallLocal(
        (hall) => ({
          ...hall,

          capacity:
            hall.capacity + 1,

          seats: [
            ...hall.seats,
            newSeat,
          ],
        }),
      );

      setNewSeatCode('');

      setMessage(
        data.message ??
          'Thêm ghế thành công. Nhấn "Tự động sắp xếp" để căn giữa.',
      );
    } catch {
      setMessage(
        'Không thể kết nối đến máy chủ.',
      );
    } finally {
      setLoading(false);
    }
  };

  /*
   * Xóa các ghế đã chọn.
   */
  const deleteSelectedSeats =
    async () => {
      if (
        !selectedHall ||
        selectedSeatIds.length ===
          0
      ) {
        return;
      }

      if (
        !confirm(
          `Xóa ${selectedSeatIds.length} ghế đã chọn?`,
        )
      ) {
        return;
      }

      setLoading(true);

      try {
        for (const id of selectedSeatIds) {
          const response =
            await fetch(
              `/api/admin/seats/${id}`,
              {
                method: 'DELETE',
              },
            );

          const data =
            await response.json();

          if (!response.ok) {
            setMessage(
              data.message ??
                'Không thể xóa ghế.',
            );
            return;
          }
        }

        const ids = new Set(
          selectedSeatIds,
        );

        updateHallLocal(
          (hall) => ({
            ...hall,

            capacity:
              Math.max(
                0,
                hall.capacity -
                  selectedSeatIds.length,
              ),

            seats:
              hall.seats.filter(
                (seat) =>
                  !ids.has(
                    seat.id,
                  ),
              ),
          }),
        );

        setSelectedSeatIds([]);

        setMessage(
          'Đã xóa ghế.',
        );
      } catch {
        setMessage(
          'Không thể kết nối đến máy chủ.',
        );
      } finally {
        setLoading(false);
      }
    };

  /*
   * Đổi tên ghế.
   */
  const renameSelectedSeats =
    async () => {
      const value =
        renameValue.trim();

      if (
        !selectedHall ||
        selectedSeatIds.length !==
          1 ||
        !value
      ) {
        return;
      }

      const id =
        selectedSeatIds[0];

      const seat =
        selectedHall.seats.find(
          (item) =>
            item.id === id,
        );

      if (!seat) return;

      const rowMatch =
        value.match(
          /^[A-Z]+/,
        );

      const numberMatch =
        value.match(
          /\d+$/,
        );

      const rowLabel =
        rowMatch?.[0] ??
        seat.rowLabel;

      const seatNumber =
        Number(
          numberMatch?.[0] ??
            seat.seatNumber,
        );

      setLoading(true);

      try {
        const response =
          await fetch(
            `/api/admin/seats/${id}`,
            {
              method: 'PATCH',
              headers: {
                'Content-Type':
                  'application/json',
              },
              body: JSON.stringify({
                code: value,
                rowLabel,
                seatNumber,
              }),
            },
          );

        const data =
          await response.json();

        if (!response.ok) {
          setMessage(
            data.message ??
              'Không thể đổi tên ghế.',
          );
          return;
        }

        updateHallLocal(
          (hall) => ({
            ...hall,

            seats:
              hall.seats.map(
                (item) =>
                  item.id === id
                    ? {
                        ...item,
                        code: value,
                        rowLabel,
                        seatNumber,
                      }
                    : item,
              ),
          }),
        );

        setRenameValue('');

        setMessage(
          data.message ??
            'Đổi tên ghế thành công.',
        );
      } catch {
        setMessage(
          'Không thể kết nối đến máy chủ.',
        );
      } finally {
        setLoading(false);
      }
    };

  /*
   * Thêm block.
   */
  const addBlock = (
    type: BlockType,
  ) => {
    if (!selectedHall) return;

    const block: LayoutBlock = {
      id: `local-${Date.now()}-${Math.random()
        .toString(36)
        .slice(2)}`,

      type,

      x: Math.max(
        20,
        Math.floor(
          selectedHall.layoutWidth /
            2 -
            100,
        ),
      ),

      y: Math.max(
        80,
        Math.floor(
          selectedHall.layoutHeight /
            2 -
            20,
        ),
      ),

      width:
        type === 'AISLE'
          ? 70
          : 160,

      height:
        type === 'AISLE'
          ? selectedHall.layoutHeight -
            150
          : 60,

      label:
        type === 'AISLE'
          ? 'Lối đi'
          : 'Khoảng trống',
    };

    updateHallLocal(
      (hall) => ({
        ...hall,
        layoutBlocks: [
          ...hall.layoutBlocks,
          block,
        ],
      }),
    );

    setSelectedBlockId(
      block.id,
    );

    setSelectedSeatIds([]);
  };

  /*
   * Xóa block.
   */
  const deleteSelectedBlock =
    () => {
      if (!selectedBlockId)
        return;

      updateHallLocal(
        (hall) => ({
          ...hall,

          layoutBlocks:
            hall.layoutBlocks.filter(
              (block) =>
                block.id !==
                selectedBlockId,
            ),
        }),
      );

      setSelectedBlockId('');
    };

  /*
   * Auto arrange.
   */
  const autoArrange = (
    preset: Preset,
  ) => {
    if (!selectedHall) return;

    const seats =
      makePositions(
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

    updateHallLocal(
      () => nextHall,
    );

    setSelectedSeatIds([]);

    const presetLabel =
      PRESETS.find(
        (item) =>
          item.value === preset,
      )?.label ?? preset;

    setMessage(
      `Đã áp dụng mẫu "${presetLabel}". Các hàng ghế đã được căn giữa. Nhấn "Lưu sơ đồ" để lưu.`,
    );
  };

  /*
   * Đổi tên phòng.
   */
  const updateHallName = (
    name: string,
  ) => {
    updateHallLocal(
      (hall) => ({
        ...hall,
        name,
      }),
    );
  };

  /*
   * Xóa phòng.
   */
  const deleteHall = async () => {
    if (
      !selectedHall ||
      !confirm(
        `Xóa ${selectedHall.name}?`,
      )
    ) {
      return;
    }

    setLoading(true);

    try {
      const response =
        await fetch(
          `/api/admin/halls/${selectedHall.id}`,
          {
            method: 'DELETE',
          },
        );

      const data =
        await response.json();

      if (!response.ok) {
        setMessage(
          data.message ??
            'Không thể xóa phòng.',
        );
        return;
      }

      const remaining =
        selectedCinema?.halls.filter(
          (hall) =>
            hall.id !==
            selectedHall.id,
        ) ?? [];

      setCinemaList(
        (current) =>
          current.map(
            (cinema) =>
              cinema.id ===
              selectedCinemaId
                ? {
                    ...cinema,
                    halls:
                      remaining,
                  }
                : cinema,
          ),
      );

      setSelectedHallId(
        remaining[0]?.id ?? '',
      );

      setSelectedSeatIds([]);

      setMessage(
        data.message ??
          'Xóa phòng thành công.',
      );
    } catch {
      setMessage(
        'Không thể kết nối đến máy chủ.',
      );
    } finally {
      setLoading(false);
    }
  };

  /*
   * Đếm loại ghế.
   */
  const seatCounts =
    useMemo(() => {
      const result = {
        STANDARD: 0,
        VIP: 0,
        COUPLE: 0,
      };

      selectedHall?.seats.forEach(
        (seat) => {
          const type =
            seat.type as SeatType;

          if (
            type in result
          ) {
            result[type]++;
          }
        },
      );

      return result;
    }, [selectedHall]);

  return (
    <div className="space-y-6">
      {message && (
        <div className="rounded-2xl border border-sky-400/20 bg-sky-500/10 px-4 py-3 text-sm text-sky-100">
          {message}
        </div>
      )}

      {/* ========================= */}
      {/* RẠP */}
      {/* ========================= */}

      <div className="grid gap-6 lg:grid-cols-2">
        <form
          onSubmit={
            handleCinemaCreate
          }
          className="space-y-4 rounded-[28px] border border-white/10 bg-slate-950/70 p-6"
        >
          <h3 className="text-xl font-semibold text-white">
            Thêm rạp chiếu
          </h3>

          <input
            value={
              cinemaForm.name
            }
            onChange={(e) =>
              setCinemaForm({
                ...cinemaForm,
                name: e.target
                  .value,
              })
            }
            placeholder="Tên rạp"
            className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white"
            required
          />

          <input
            value={
              cinemaForm.city
            }
            onChange={(e) =>
              setCinemaForm({
                ...cinemaForm,
                city: e.target
                  .value,
              })
            }
            placeholder="Thành phố"
            className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white"
            required
          />

          <input
            value={
              cinemaForm.address
            }
            onChange={(e) =>
              setCinemaForm({
                ...cinemaForm,
                address:
                  e.target.value,
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
          <h3 className="text-xl font-semibold text-white">
            Chọn rạp
          </h3>

          <select
            value={
              selectedCinemaId
            }
            onChange={(e) =>
              selectCinema(
                e.target.value,
              )
            }
            className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white"
          >
            {cinemaList.map(
              (cinema) => (
                <option
                  key={cinema.id}
                  value={cinema.id}
                  className="bg-slate-950"
                >
                  {cinema.name} —{' '}
                  {cinema.city}
                </option>
              ),
            )}
          </select>

          {selectedCinema && (
            <>
              <input
                value={
                  selectedCinema.name
                }
                onChange={(e) =>
                  setCinemaList(
                    (current) =>
                      current.map(
                        (c) =>
                          c.id ===
                          selectedCinema.id
                            ? {
                                ...c,
                                name: e
                                  .target
                                  .value,
                              }
                            : c,
                      ),
                  )
                }
                className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white"
              />

              <input
                value={
                  selectedCinema.city
                }
                onChange={(e) =>
                  setCinemaList(
                    (current) =>
                      current.map(
                        (c) =>
                          c.id ===
                          selectedCinema.id
                            ? {
                                ...c,
                                city: e
                                  .target
                                  .value,
                              }
                            : c,
                      ),
                  )
                }
                className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white"
              />

              <input
                value={
                  selectedCinema.address
                }
                onChange={(e) =>
                  setCinemaList(
                    (current) =>
                      current.map(
                        (c) =>
                          c.id ===
                          selectedCinema.id
                            ? {
                                ...c,
                                address:
                                  e.target
                                    .value,
                              }
                            : c,
                      ),
                  )
                }
                className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white"
              />

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={
                    handleCinemaUpdate
                  }
                  disabled={loading}
                  className="rounded-2xl bg-white px-4 py-3 font-semibold text-slate-950 disabled:opacity-50"
                >
                  Cập nhật rạp
                </button>

                <button
                  type="button"
                  onClick={
                    handleCinemaDelete
                  }
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

      {/* ========================= */}
      {/* PHÒNG + SƠ ĐỒ */}
      {/* ========================= */}

      <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
        {/* SIDEBAR */}

        <div className="space-y-5 rounded-[28px] border border-white/10 bg-slate-950/70 p-5">
          <div>
            <h3 className="text-xl font-semibold text-white">
              Phòng chiếu
            </h3>

            <p className="mt-1 text-xs text-slate-400">
              Tạo phòng mới, sau đó
              chỉnh sửa trực tiếp trên
              sơ đồ.
            </p>
          </div>

          {/* CREATE HALL */}

          <form
            onSubmit={
              handleHallCreate
            }
            className="space-y-3 border-b border-white/10 pb-5"
          >
            <input
              value={hallForm.name}
              onChange={(e) =>
                setHallForm({
                  ...hallForm,
                  name: e.target
                    .value,
                })
              }
              placeholder="Tên phòng mới"
              className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white"
              required
            />

            <div className="grid grid-cols-2 gap-2">
              <input
                type="number"
                min={1}
                max={26}
                value={
                  hallForm.rows
                }
                onChange={(e) =>
                  setHallForm({
                    ...hallForm,
                    rows: Math.max(
                      1,
                      Number(
                        e.target.value,
                      ),
                    ),
                  })
                }
                className="rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-white"
                placeholder="Số hàng"
              />

              <input
                type="number"
                min={1}
                max={50}
                value={
                  hallForm.seatsPerRow
                }
                onChange={(e) =>
                  setHallForm({
                    ...hallForm,
                    seatsPerRow:
                      Math.max(
                        1,
                        Number(
                          e.target
                            .value,
                        ),
                      ),
                  })
                }
                className="rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-white"
                placeholder="Ghế/hàng"
              />
            </div>

            <select
              value={
                hallForm.layoutPreset
              }
              onChange={(e) =>
                setHallForm({
                  ...hallForm,
                  layoutPreset:
                    e.target
                      .value as Preset,
                })
              }
              className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-white"
            >
              {PRESETS.map(
                (item) => (
                  <option
                    key={
                      item.value
                    }
                    value={
                      item.value
                    }
                    className="bg-slate-950"
                  >
                    {item.label}
                  </option>
                ),
              )}
            </select>

            <button
              type="submit"
              disabled={
                loading ||
                !selectedCinemaId
              }
              className="w-full rounded-xl bg-sky-500 px-4 py-2.5 font-semibold text-white disabled:opacity-50"
            >
              + Tạo phòng
            </button>
          </form>

          {/* HALL LIST */}

          <div className="space-y-2">
            {selectedCinema?.halls.map(
              (hall) => (
                <button
                  type="button"
                  key={hall.id}
                  onClick={() =>
                    selectHall(
                      hall.id,
                    )
                  }
                  className={`w-full rounded-2xl border px-4 py-3 text-left transition ${
                    hall.id ===
                    selectedHallId
                      ? 'border-sky-400/40 bg-sky-500/15'
                      : 'border-white/10 bg-white/5 hover:bg-white/10'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-white">
                      {hall.name}
                    </span>

                    <span className="text-xs text-slate-400">
                      {
                        hall.seats
                          .length
                      }{' '}
                      ghế
                    </span>
                  </div>

                  <div className="mt-1 text-xs text-slate-400">
                    {
                      hall.layoutWidth
                    }{' '}
                    ×{' '}
                    {
                      hall.layoutHeight
                    }
                  </div>
                </button>
              ),
            )}
          </div>

          {/* HALL EDIT */}

          {selectedHall && (
            <div className="space-y-3 border-t border-white/10 pt-5">
              <input
                value={
                  selectedHall.name
                }
                onChange={(e) =>
                  updateHallName(
                    e.target.value,
                  )
                }
                className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-white"
              />

              <div className="grid grid-cols-2 gap-2">
                <input
                  type="number"
                  min={600}
                  max={3000}
                  value={
                    selectedHall.layoutWidth
                  }
                  onChange={(e) =>
                    updateHallLocal(
                      (hall) => ({
                        ...hall,
                        layoutWidth:
                          Math.max(
                            600,
                            Math.min(
                              3000,
                              Number(
                                e.target
                                  .value,
                              ),
                            ),
                          ),
                      }),
                    )
                  }
                  className="rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-white"
                />

                <input
                  type="number"
                  min={400}
                  max={2000}
                  value={
                    selectedHall.layoutHeight
                  }
                  onChange={(e) =>
                    updateHallLocal(
                      (hall) => ({
                        ...hall,
                        layoutHeight:
                          Math.max(
                            400,
                            Math.min(
                              2000,
                              Number(
                                e.target
                                  .value,
                              ),
                            ),
                          ),
                      }),
                    )
                  }
                  className="rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-white"
                />
              </div>

              <select
                value={
                  selectedHall.layoutPreset
                }
                onChange={(e) =>
                  autoArrange(
                    e.target
                      .value as Preset,
                  )
                }
                className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-white"
              >
                {PRESETS.map(
                  (item) => (
                    <option
                      key={
                        item.value
                      }
                      value={
                        item.value
                      }
                      className="bg-slate-950"
                    >
                      {item.label}
                    </option>
                  ),
                )}
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
                  onClick={() =>
                    saveLayout()
                  }
                  disabled={loading}
                  className="flex-1 rounded-xl bg-white px-3 py-2 text-sm font-semibold text-slate-950 disabled:opacity-50"
                >
                  Lưu sơ đồ
                </button>
              </div>

              <button
                type="button"
                onClick={
                  deleteHall
                }
                disabled={loading}
                className="w-full rounded-xl border border-rose-400/30 px-3 py-2 text-sm font-semibold text-rose-200"
              >
                Xóa phòng
              </button>
            </div>
          )}
        </div>

        {/* CANVAS */}

        <div className="min-w-0 rounded-[28px] border border-white/10 bg-slate-950/70 p-5">
          {!selectedHall ? (
            <div className="flex min-h-[500px] items-center justify-center text-slate-400">
              Chọn một phòng để
              thiết kế sơ đồ.
            </div>
          ) : (
            <>
              {/* HEADER */}

              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-xl font-semibold text-white">
                    {
                      selectedHall.name
                    }
                  </h3>

                  <p className="text-xs text-slate-400">
                    Kéo ghế tự do.
                    Click để chọn nhiều
                    ghế.
                  </p>
                </div>

                <div className="flex flex-wrap gap-2 text-xs">
                  <span className="rounded-full bg-slate-700 px-3 py-1 text-slate-200">
                    Standard{' '}
                    {
                      seatCounts.STANDARD
                    }
                  </span>

                  <span className="rounded-full bg-amber-500/20 px-3 py-1 text-amber-200">
                    VIP{' '}
                    {seatCounts.VIP}
                  </span>

                  <span className="rounded-full bg-fuchsia-500/20 px-3 py-1 text-fuchsia-200">
                    Couple{' '}
                    {
                      seatCounts.COUPLE
                    }
                  </span>
                </div>
              </div>

              {/* TOOLBAR */}

              <div className="mt-4 flex flex-wrap gap-2 rounded-2xl border border-white/10 bg-white/5 p-3">
                <button
                  type="button"
                  onClick={
                    toggleAllSeats
                  }
                  className="rounded-xl border border-white/10 px-3 py-2 text-xs text-slate-200"
                >
                  Chọn tất cả
                </button>

                <select
                  value={
                    selectedSeatIds.length ===
                    0
                      ? ''
                      : selectedHall.seats.find(
                          (s) =>
                            s.id ===
                            selectedSeatIds[0],
                        )?.type ??
                        ''
                  }
                  onChange={(e) =>
                    updateSelectedSeatsType(
                      e.target
                        .value as SeatType,
                    )
                  }
                  disabled={
                    selectedSeatIds.length ===
                    0
                  }
                  className="rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-xs text-white disabled:opacity-50"
                >
                  <option value="">
                    Đổi loại ghế...
                  </option>

                  {TYPES.map(
                    (item) => (
                      <option
                        key={
                          item.value
                        }
                        value={
                          item.value
                        }
                      >
                        {item.label}
                      </option>
                    ),
                  )}
                </select>

                <input
                  value={
                    renameValue
                  }
                  onChange={(e) =>
                    setRenameValue(
                      e.target.value,
                    )
                  }
                  placeholder="Tên ghế mới"
                  disabled={
                    selectedSeatIds.length !==
                    1
                  }
                  className="w-36 rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-xs text-white disabled:opacity-50"
                />

                <button
                  type="button"
                  onClick={
                    renameSelectedSeats
                  }
                  disabled={
                    selectedSeatIds.length !==
                      1 ||
                    !renameValue.trim()
                  }
                  className="rounded-xl border border-white/10 px-3 py-2 text-xs text-slate-200 disabled:opacity-40"
                >
                  Đổi tên
                </button>

                <input
                  value={
                    newSeatCode
                  }
                  onChange={(e) =>
                    setNewSeatCode(
                      e.target.value,
                    )
                  }
                  placeholder="Mã ghế mới"
                  className="w-32 rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-xs text-white"
                />

                <button
                  type="button"
                  onClick={
                    addSeat
                  }
                  disabled={loading}
                  className="rounded-xl bg-emerald-500/20 px-3 py-2 text-xs font-semibold text-emerald-200 disabled:opacity-40"
                >
                  + Thêm ghế
                </button>

                <button
                  type="button"
                  onClick={
                    deleteSelectedSeats
                  }
                  disabled={
                    selectedSeatIds.length ===
                      0 ||
                    loading
                  }
                  className="rounded-xl border border-rose-400/30 px-3 py-2 text-xs text-rose-200 disabled:opacity-40"
                >
                  Xóa ghế đã chọn
                </button>

                <button
                  type="button"
                  onClick={() =>
                    addBlock(
                      'AISLE',
                    )
                  }
                  className="rounded-xl border border-sky-400/30 px-3 py-2 text-xs text-sky-200"
                >
                  + Lối đi
                </button>

                <button
                  type="button"
                  onClick={() =>
                    addBlock(
                      'SPACE',
                    )
                  }
                  className="rounded-xl border border-violet-400/30 px-3 py-2 text-xs text-violet-200"
                >
                  + Khoảng trống
                </button>

                {selectedBlockId && (
                  <button
                    type="button"
                    onClick={
                      deleteSelectedBlock
                    }
                    className="rounded-xl border border-rose-400/30 px-3 py-2 text-xs text-rose-200"
                  >
                    Xóa khối
                  </button>
                )}
              </div>

              {/* CANVAS */}

              <div className="mt-4 overflow-auto rounded-3xl border border-white/10 bg-slate-900/80 p-4">
                <div
                  className="relative mx-auto select-none overflow-hidden rounded-3xl border border-white/10 bg-slate-950"
                  style={{
                    width:
                      selectedHall.layoutWidth,
                    height:
                      selectedHall.layoutHeight,
                  }}
                  onPointerMove={
                    moveCanvas
                  }
                  onPointerUp={
                    stopDrag
                  }
                  onPointerCancel={
                    stopDrag
                  }
                >
                  {/* SCREEN */}

                  <div className="absolute left-[8%] right-[8%] top-5 rounded-full border border-white/10 bg-white/5 py-2 text-center text-xs font-bold uppercase tracking-[0.35em] text-slate-400">
                    MÀN HÌNH
                  </div>

                  {/* BLOCKS */}

                  {selectedHall.layoutBlocks.map(
                    (block) => (
                      <button
                        type="button"
                        key={
                          block.id
                        }
                        onPointerDown={(
                          event,
                        ) => {
                          event.currentTarget.setPointerCapture(
                            event.pointerId,
                          );

                          setSelectedBlockId(
                            block.id,
                          );

                          setSelectedSeatIds(
                            [],
                          );

                          setDragging(
                            {
                              kind: 'block',
                              id: block.id,
                              offsetX:
                                event
                                  .nativeEvent
                                  .offsetX,
                              offsetY:
                                event
                                  .nativeEvent
                                  .offsetY,
                            },
                          );
                        }}
                        className={`absolute rounded-xl border text-xs font-semibold ${
                          selectedBlockId ===
                          block.id
                            ? 'border-white ring-2 ring-white/30'
                            : 'border-white/10'
                        } ${
                          block.type ===
                          'AISLE'
                            ? 'bg-sky-500/15 text-sky-200'
                            : 'bg-violet-500/10 text-violet-200'
                        }`}
                        style={{
                          left:
                            block.x,
                          top:
                            block.y,
                          width:
                            block.width,
                          height:
                            block.height,
                        }}
                      >
                        {block.label ??
                          (block.type ===
                          'AISLE'
                            ? 'Lối đi'
                            : 'Khoảng trống')}
                      </button>
                    ),
                  )}

                  {/* SEATS */}

                  {selectedHall.seats.map(
                    (seat) => {
                      const selected =
                        selectedSeatIds.includes(
                          seat.id,
                        );

                      const type =
                        seat.type as SeatType;

                      const typeClass =
                        type === 'VIP'
                          ? 'border-amber-300/60 bg-amber-400/20 text-amber-100'
                          : type ===
                              'COUPLE'
                            ? 'border-fuchsia-300/60 bg-fuchsia-400/20 text-fuchsia-100'
                            : 'border-slate-400/40 bg-slate-500/20 text-slate-100';

                      return (
                        <button
                          type="button"
                          key={
                            seat.id
                          }
                          onPointerDown={(
                            event,
                          ) =>
                            startSeatDrag(
                              event,
                              seat,
                            )
                          }
                          onClick={() =>
                            toggleSeat(
                              seat.id,
                            )
                          }
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
                            left:
                              seat.positionX,
                            top:
                              seat.positionY,
                          }}
                          title={`${seat.code} — ${type}`}
                        >
                          {
                            seat.code
                          }
                        </button>
                      );
                    },
                  )}
                </div>
              </div>

              {/* STATS */}

              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl border border-white/10 bg-white/5 p-3 text-xs text-slate-300">
                  Ghế chọn:{' '}
                  <b className="text-white">
                    {
                      selectedSeatIds.length
                    }
                  </b>
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/5 p-3 text-xs text-slate-300">
                  Sức chứa:{' '}
                  <b className="text-white">
                    {
                      selectedHall.capacity
                    }
                  </b>
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/5 p-3 text-xs text-slate-300">
                  Khối:{' '}
                  <b className="text-white">
                    {
                      selectedHall
                        .layoutBlocks
                        .length
                    }
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