'use client';

import type { FormEvent } from 'react';
import { useMemo, useState } from 'react';

type SeatOption = {
  id: string;
  code: string;
  type: string;
  isActive: boolean;
  rowLabel?: string;
  seatNumber?: number;
};

type HallOption = {
  id: string;
  name: string;
  capacity: number;
  seats?: SeatOption[];
};

type CinemaOption = {
  id: string;
  name: string;
  city: string;
  address: string;
  halls: HallOption[];
};

type CinemaManagementFormProps = {
  cinemas: CinemaOption[];
};

type SeatTypeForm = {
  standard: number;
  vip: number;
  couple: number;
};

type HallForm = {
  name: string;
  rows: number;
  seatsPerRow: number;
  seatTypes: SeatTypeForm;
};

const DEFAULT_SEAT_TYPES: SeatTypeForm = {
  standard: 40,
  vip: 12,
  couple: 4,
};

const createDefaultSeatTypes = (
  totalSeats: number
): SeatTypeForm => {
  if (totalSeats <= 0) {
    return {
      standard: 0,
      vip: 0,
      couple: 0,
    };
  }

  const vip = Math.min(
    12,
    Math.floor(totalSeats * 0.2)
  );

  const couple = Math.min(
    4,
    Math.floor(totalSeats * 0.1)
  );

  const standard = Math.max(
    0,
    totalSeats - vip - couple
  );

  return {
    standard,
    vip,
    couple,
  };
};

const getSeatTypeCounts = (
  seats: SeatOption[] = []
): SeatTypeForm => {
  return {
    standard: seats.filter(
      (seat) => seat.type === 'STANDARD'
    ).length,

    vip: seats.filter(
      (seat) => seat.type === 'VIP'
    ).length,

    couple: seats.filter(
      (seat) => seat.type === 'COUPLE'
    ).length,
  };
};

export function CinemaManagementForm({
  cinemas,
}: CinemaManagementFormProps) {
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const [cinemaList, setCinemaList] =
    useState<CinemaOption[]>(cinemas);

  const [selectedCinemaId, setSelectedCinemaId] =
    useState(cinemas[0]?.id ?? '');

  const [selectedHallId, setSelectedHallId] =
    useState(cinemas[0]?.halls?.[0]?.id ?? '');

  // ============================================================
  // FORM RẠP
  // ============================================================

  const [cinemaForm, setCinemaForm] = useState({
    name: '',
    city: '',
    address: '',
  });

  const [editCinemaForm, setEditCinemaForm] = useState({
    name: cinemas[0]?.name ?? '',
    city: cinemas[0]?.city ?? '',
    address: cinemas[0]?.address ?? '',
  });

  // ============================================================
  // FORM THÊM PHÒNG
  // ============================================================

  const [hallForm, setHallForm] = useState<HallForm>({
    name: '',
    rows: 6,
    seatsPerRow: 8,
    seatTypes: {
      ...DEFAULT_SEAT_TYPES,
    },
  });

  // ============================================================
  // FORM SỬA PHÒNG
  // ============================================================

  const [editHallForm, setEditHallForm] =
    useState<HallForm>({
      name: cinemas[0]?.halls?.[0]?.name ?? '',
      rows: 6,
      seatsPerRow: 8,
      seatTypes: getSeatTypeCounts(
        cinemas[0]?.halls?.[0]?.seats ?? []
      ),
    });

  // ============================================================
  // DỮ LIỆU ĐANG CHỌN
  // ============================================================

  const selectedCinema = useMemo(() => {
    return cinemaList.find(
      (cinema) => cinema.id === selectedCinemaId
    );
  }, [cinemaList, selectedCinemaId]);

  const selectedHall = useMemo(() => {
    return selectedCinema?.halls?.find(
      (hall) => hall.id === selectedHallId
    );
  }, [
    selectedCinema,
    selectedHallId,
  ]);

  // ============================================================
  // TỔNG GHẾ
  // ============================================================

  const hallCapacity =
    Math.max(1, hallForm.rows) *
    Math.max(1, hallForm.seatsPerRow);

  const editHallCapacity =
    Math.max(1, editHallForm.rows) *
    Math.max(1, editHallForm.seatsPerRow);

  // ============================================================
  // TỔNG THEO LOẠI GHẾ
  // ============================================================

  const hallSeatTypeTotal =
    Number(hallForm.seatTypes.standard) +
    Number(hallForm.seatTypes.vip) +
    Number(hallForm.seatTypes.couple);

  const editHallSeatTypeTotal =
    Number(editHallForm.seatTypes.standard) +
    Number(editHallForm.seatTypes.vip) +
    Number(editHallForm.seatTypes.couple);

  const hallSeatTypeValid =
    hallSeatTypeTotal === hallCapacity;

  const editHallSeatTypeValid =
    editHallSeatTypeTotal === editHallCapacity;

  // ============================================================
  // LẤY SƠ ĐỒ PHÒNG
  // ============================================================

  const getHallLayout = (
    hall?: HallOption
  ) => {
    const seats = hall?.seats ?? [];

    if (seats.length === 0) {
      return {
        rows: 6,
        seatsPerRow: 8,
      };
    }

    const rowNumbers = seats
      .map((seat) => {
        const rowLabel =
          seat.rowLabel ??
          seat.code.match(/^[A-Z]+/)?.[0];

        if (!rowLabel) {
          return 0;
        }

        let value = 0;

        for (const char of rowLabel) {
          value =
            value * 26 +
            char.charCodeAt(0) -
            64;
        }

        return value;
      })
      .filter((value) => value > 0);

    const seatNumbers = seats
      .map((seat) => {
        if (
          typeof seat.seatNumber ===
          'number'
        ) {
          return seat.seatNumber;
        }

        const match =
          seat.code.match(/\d+$/);

        return match
          ? Number(match[0])
          : 0;
      })
      .filter((value) => value > 0);

    return {
      rows:
        rowNumbers.length > 0
          ? Math.max(...rowNumbers)
          : 6,

      seatsPerRow:
        seatNumbers.length > 0
          ? Math.max(...seatNumbers)
          : 8,
    };
  };

  // ============================================================
  // ĐỒNG BỘ KHI CHỌN RẠP
  // ============================================================

  const syncSelectedCinema = (
    cinemaId: string
  ) => {
    setSelectedCinemaId(cinemaId);

    const nextCinema =
      cinemaList.find(
        (cinema) =>
          cinema.id === cinemaId
      );

    setEditCinemaForm({
      name: nextCinema?.name ?? '',
      city: nextCinema?.city ?? '',
      address:
        nextCinema?.address ?? '',
    });

    const firstHall =
      nextCinema?.halls?.[0];

    setSelectedHallId(
      firstHall?.id ?? ''
    );

    const layout =
      getHallLayout(firstHall);

    setEditHallForm({
      name: firstHall?.name ?? '',
      rows: layout.rows,
      seatsPerRow:
        layout.seatsPerRow,
      seatTypes:
        getSeatTypeCounts(
          firstHall?.seats ?? []
        ),
    });
  };

  // ============================================================
  // ĐỒNG BỘ KHI CHỌN PHÒNG
  // ============================================================

  const syncSelectedHall = (
    hallId: string
  ) => {
    setSelectedHallId(hallId);

    const hall =
      selectedCinema?.halls?.find(
        (item) =>
          item.id === hallId
      );

    const layout =
      getHallLayout(hall);

    const totalSeats =
      layout.rows *
      layout.seatsPerRow;

    const currentTypes =
      getSeatTypeCounts(
        hall?.seats ?? []
      );

    const currentTotal =
      currentTypes.standard +
      currentTypes.vip +
      currentTypes.couple;

    setEditHallForm({
      name: hall?.name ?? '',
      rows: layout.rows,
      seatsPerRow:
        layout.seatsPerRow,

      seatTypes:
        currentTotal > 0
          ? currentTypes
          : createDefaultSeatTypes(
              totalSeats
            ),
    });
  };

  // ============================================================
  // THÊM RẠP
  // ============================================================

  const handleCinemaCreate = async (
    event: FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    if (!cinemaForm.name.trim()) {
      setMessage(
        'Vui lòng nhập tên rạp.'
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
              cinemaForm
            ),
          }
        );

      const data =
        (await response.json()) as {
          message: string;
          cinema?: CinemaOption;
        };

      if (!response.ok) {
        setMessage(
          data.message ??
            'Không thể tạo rạp.'
        );
        return;
      }

      setMessage(
        data.message ??
          'Tạo rạp thành công.'
      );

      if (data.cinema) {
        const created: CinemaOption =
          {
            ...data.cinema,
            halls:
              data.cinema.halls ?? [],
          };

        setCinemaList(
          (current) => [
            created,
            ...current,
          ]
        );

        setCinemaForm({
          name: '',
          city: '',
          address: '',
        });

        setSelectedCinemaId(
          created.id
        );

        setSelectedHallId(
          created.halls?.[0]?.id ??
            ''
        );

        setEditCinemaForm({
          name: created.name,
          city: created.city,
          address:
            created.address,
        });

        setEditHallForm({
          name:
            created.halls?.[0]
              ?.name ?? '',
          rows: 6,
          seatsPerRow: 8,
          seatTypes:
            createDefaultSeatTypes(
              48
            ),
        });
      }
    } catch {
      setMessage(
        'Không thể kết nối đến máy chủ.'
      );
    } finally {
      setLoading(false);
    }
  };

  // ============================================================
  // SỬA RẠP
  // ============================================================

  const handleCinemaUpdate = async (
    event: FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    if (!selectedCinemaId) {
      setMessage(
        'Vui lòng chọn rạp.'
      );
      return;
    }

    setLoading(true);
    setMessage('');

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
            body: JSON.stringify(
              editCinemaForm
            ),
          }
        );

      const data =
        (await response.json()) as {
          message: string;
          cinema?: CinemaOption;
        };

      if (!response.ok) {
        setMessage(
          data.message ??
            'Không thể cập nhật rạp.'
        );
        return;
      }

      setMessage(
        data.message ??
          'Cập nhật rạp thành công.'
      );

      if (data.cinema) {
        setCinemaList(
          (current) =>
            current.map(
              (cinema) =>
                cinema.id ===
                selectedCinemaId
                  ? {
                      ...cinema,
                      ...data.cinema,
                      halls:
                        cinema.halls ??
                        [],
                    }
                  : cinema
            )
        );
      }
    } catch {
      setMessage(
        'Không thể kết nối đến máy chủ.'
      );
    } finally {
      setLoading(false);
    }
  };

  // ============================================================
  // XÓA RẠP
  // ============================================================

  const handleCinemaDelete =
    async () => {
      if (
        !selectedCinemaId ||
        !confirm(
          'Xác nhận xóa rạp này?'
        )
      ) {
        return;
      }

      setLoading(true);
      setMessage('');

      try {
        const response =
          await fetch(
            `/api/admin/cinemas/${selectedCinemaId}`,
            {
              method: 'DELETE',
            }
          );

        const data =
          (await response.json()) as {
            message: string;
          };

        if (!response.ok) {
          setMessage(
            data.message ??
              'Không thể xóa rạp.'
          );
          return;
        }

        const nextList =
          cinemaList.filter(
            (cinema) =>
              cinema.id !==
              selectedCinemaId
          );

        setCinemaList(nextList);

        const fallbackCinema =
          nextList[0];

        setSelectedCinemaId(
          fallbackCinema?.id ??
            ''
        );

        setSelectedHallId(
          fallbackCinema
            ?.halls?.[0]?.id ??
            ''
        );

        setEditCinemaForm({
          name:
            fallbackCinema?.name ??
            '',
          city:
            fallbackCinema?.city ??
            '',
          address:
            fallbackCinema?.address ??
            '',
        });

        const fallbackHall =
          fallbackCinema
            ?.halls?.[0];

        const layout =
          getHallLayout(
            fallbackHall
          );

        setEditHallForm({
          name:
            fallbackHall?.name ??
            '',
          rows: layout.rows,
          seatsPerRow:
            layout.seatsPerRow,
          seatTypes:
            getSeatTypeCounts(
              fallbackHall?.seats ??
                []
            ),
        });

        setMessage(
          data.message ??
            'Xóa rạp thành công.'
        );
      } catch {
        setMessage(
          'Không thể kết nối đến máy chủ.'
        );
      } finally {
        setLoading(false);
      }
    };

  // ============================================================
  // THÊM PHÒNG
  // ============================================================

  const handleHallCreate = async (
    event: FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    if (!selectedCinemaId) {
      setMessage(
        'Vui lòng tạo hoặc chọn rạp trước.'
      );
      return;
    }

    if (!hallForm.name.trim()) {
      setMessage(
        'Vui lòng nhập tên phòng.'
      );
      return;
    }

    if (
      hallForm.rows < 1 ||
      hallForm.seatsPerRow < 1
    ) {
      setMessage(
        'Số hàng và số ghế mỗi hàng phải lớn hơn 0.'
      );
      return;
    }

    if (!hallSeatTypeValid) {
      setMessage(
        `Tổng số ghế theo loại phải bằng ${hallCapacity} ghế. Hiện tại bạn nhập ${hallSeatTypeTotal} ghế.`
      );
      return;
    }

    setLoading(true);
    setMessage('');

    try {
      const seatTypes = [
        {
          type: 'STANDARD',
          quantity:
            Number(
              hallForm.seatTypes
                .standard
            ),
        },
        {
          type: 'VIP',
          quantity:
            Number(
              hallForm.seatTypes.vip
            ),
        },
        {
          type: 'COUPLE',
          quantity:
            Number(
              hallForm.seatTypes.couple
            ),
        },
      ].filter(
        (item) =>
          item.quantity > 0
      );

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
                hallForm.name.trim(),
              rows:
                hallForm.rows,
              seatsPerRow:
                hallForm.seatsPerRow,
              seatTypes,
            }),
          }
        );

      const data =
        (await response.json()) as {
          message: string;
          hall?: HallOption;
        };

      if (!response.ok) {
        setMessage(
          data.message ??
            'Không thể tạo phòng.'
        );
        return;
      }

      setMessage(
        data.message ??
          'Tạo phòng thành công.'
      );

      if (data.hall) {
        const createdHall: HallOption =
          {
            ...data.hall,
            seats:
              data.hall.seats ?? [],
          };

        setCinemaList(
          (current) =>
            current.map(
              (cinema) =>
                cinema.id ===
                selectedCinemaId
                  ? {
                      ...cinema,
                      halls: [
                        ...(cinema.halls ??
                          []),
                        createdHall,
                      ],
                    }
                  : cinema
            )
        );

        setSelectedHallId(
          createdHall.id
        );

        setEditHallForm({
          name:
            createdHall.name,
          rows:
            hallForm.rows,
          seatsPerRow:
            hallForm.seatsPerRow,
          seatTypes:
            getSeatTypeCounts(
              createdHall.seats
            ),
        });

        setHallForm({
          name: '',
          rows: 6,
          seatsPerRow: 8,
          seatTypes:
            createDefaultSeatTypes(
              48
            ),
        });
      }
    } catch {
      setMessage(
        'Không thể kết nối đến máy chủ /api/admin/halls.'
      );
    } finally {
      setLoading(false);
    }
  };

  // ============================================================
  // SỬA PHÒNG
  // ============================================================

  const handleHallUpdate = async (
    event: FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    if (!selectedHallId) {
      setMessage(
        'Vui lòng chọn phòng cần sửa.'
      );
      return;
    }

    if (!editHallForm.name.trim()) {
      setMessage(
        'Vui lòng nhập tên phòng.'
      );
      return;
    }

    if (
      editHallForm.rows < 1 ||
      editHallForm.seatsPerRow < 1
    ) {
      setMessage(
        'Số hàng và số ghế mỗi hàng phải lớn hơn 0.'
      );
      return;
    }

    if (!editHallSeatTypeValid) {
      setMessage(
        `Tổng số ghế theo loại phải bằng ${editHallCapacity} ghế. Hiện tại bạn nhập ${editHallSeatTypeTotal} ghế.`
      );
      return;
    }

    setLoading(true);
    setMessage('');

    try {
      const seatTypes = [
        {
          type: 'STANDARD',
          quantity:
            Number(
              editHallForm
                .seatTypes.standard
            ),
        },
        {
          type: 'VIP',
          quantity:
            Number(
              editHallForm
                .seatTypes.vip
            ),
        },
        {
          type: 'COUPLE',
          quantity:
            Number(
              editHallForm
                .seatTypes.couple
            ),
        },
      ].filter(
        (item) =>
          item.quantity > 0
      );

      const response =
        await fetch(
          `/api/admin/halls/${selectedHallId}`,
          {
            method: 'PATCH',
            headers: {
              'Content-Type':
                'application/json',
            },
            body: JSON.stringify({
              name:
                editHallForm.name.trim(),
              rows:
                editHallForm.rows,
              seatsPerRow:
                editHallForm.seatsPerRow,
              seatTypes,
            }),
          }
        );

      const data =
        (await response.json()) as {
          message: string;
          hall?: HallOption;
        };

      if (!response.ok) {
        setMessage(
          data.message ??
            'Không thể cập nhật phòng.'
        );
        return;
      }

      setMessage(
        data.message ??
          'Cập nhật phòng thành công.'
      );

      if (data.hall) {
        const updatedHall: HallOption =
          {
            ...data.hall,
            seats:
              data.hall.seats ?? [],
          };

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
                              ? updatedHall
                              : hall
                        ),
                    }
            )
        );

        setEditHallForm({
          name:
            updatedHall.name,
          rows:
            editHallForm.rows,
          seatsPerRow:
            editHallForm.seatsPerRow,
          seatTypes:
            getSeatTypeCounts(
              updatedHall.seats
            ),
        });
      }
    } catch {
      setMessage(
        'Không thể kết nối đến máy chủ /api/admin/halls/[id].'
      );
    } finally {
      setLoading(false);
    }
  };

  // ============================================================
  // XÓA PHÒNG
  // ============================================================

  const handleHallDelete =
    async () => {
      if (
        !selectedHallId ||
        !confirm(
          'Xác nhận xóa phòng chiếu này?'
        )
      ) {
        return;
      }

      setLoading(true);
      setMessage('');

      try {
        const response =
          await fetch(
            `/api/admin/halls/${selectedHallId}`,
            {
              method: 'DELETE',
            }
          );

        const data =
          (await response.json()) as {
            message: string;
          };

        if (!response.ok) {
          setMessage(
            data.message ??
              'Không thể xóa phòng.'
          );
          return;
        }

        const nextHalls =
          selectedCinema?.halls?.filter(
            (hall) =>
              hall.id !==
              selectedHallId
          ) ?? [];

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
                        cinema.halls.filter(
                          (hall) =>
                            hall.id !==
                            selectedHallId
                        ),
                    }
            )
        );

        const fallbackHall =
          nextHalls[0];

        setSelectedHallId(
          fallbackHall?.id ?? ''
        );

        const layout =
          getHallLayout(
            fallbackHall
          );

        setEditHallForm({
          name:
            fallbackHall?.name ??
            '',
          rows: layout.rows,
          seatsPerRow:
            layout.seatsPerRow,
          seatTypes:
            getSeatTypeCounts(
              fallbackHall?.seats ??
                []
            ),
        });

        setMessage(
          data.message ??
            'Xóa phòng thành công.'
        );
      } catch {
        setMessage(
          'Không thể kết nối đến máy chủ.'
        );
      } finally {
        setLoading(false);
      }
    };

  // ============================================================
  // BẬT / TẮT GHẾ
  // ============================================================

  const toggleSeatActive = async (
    seatId: string,
    isActive: boolean
  ) => {
    setLoading(true);
    setMessage('');

    try {
      const response =
        await fetch(
          `/api/admin/seats/${seatId}`,
          {
            method: 'PATCH',
            headers: {
              'Content-Type':
                'application/json',
            },
            body: JSON.stringify({
              isActive:
                !isActive,
            }),
          }
        );

      const data =
        (await response.json()) as {
          message: string;
        };

      if (!response.ok) {
        setMessage(
          data.message ??
            'Không thể cập nhật ghế.'
        );
        return;
      }

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
                          hall.id !==
                          selectedHallId
                            ? hall
                            : {
                                ...hall,
                                seats: (
                                  hall.seats ??
                                  []
                                ).map(
                                  (
                                    seat
                                  ) =>
                                    seat.id ===
                                    seatId
                                      ? {
                                          ...seat,
                                          isActive:
                                            !isActive,
                                        }
                                      : seat
                                ),
                              }
                      ),
                  }
          )
      );

      setMessage(
        data.message ??
          'Cập nhật ghế thành công.'
      );
    } catch {
      setMessage(
        'Không thể kết nối đến máy chủ.'
      );
    } finally {
      setLoading(false);
    }
  };

  // ============================================================
  // RENDER
  // ============================================================

  return (
    <div className="space-y-6">

      {/* ========================================================
          QUẢN LÝ RẠP
      ======================================================== */}

      <div className="grid gap-6 lg:grid-cols-2">

        {/* THÊM RẠP */}

        <form
          onSubmit={
            handleCinemaCreate
          }
          className="space-y-4 rounded-[28px] border border-white/10 bg-slate-950/70 p-6 shadow-glow backdrop-blur-xl"
        >
          <div>
            <h3 className="text-xl font-semibold text-white">
              Thêm rạp chiếu
            </h3>

            <p className="mt-2 text-sm text-slate-300">
              Tạo rạp mới và bổ sung vào
              hệ thống.
            </p>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-200">
              Tên rạp
            </label>

            <input
              value={cinemaForm.name}
              onChange={(event) =>
                setCinemaForm(
                  (current) => ({
                    ...current,
                    name:
                      event.target
                        .value,
                  })
                )
              }
              placeholder="Ví dụ: CGV Vincom"
              className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none placeholder:text-slate-500"
              required
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-200">
              Thành phố
            </label>

            <input
              value={
                cinemaForm.city
              }
              onChange={(event) =>
                setCinemaForm(
                  (current) => ({
                    ...current,
                    city:
                      event.target
                        .value,
                  })
                )
              }
              placeholder="Ví dụ: TP. Hồ Chí Minh"
              className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none placeholder:text-slate-500"
              required
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-200">
              Địa chỉ
            </label>

            <input
              value={
                cinemaForm.address
              }
              onChange={(event) =>
                setCinemaForm(
                  (current) => ({
                    ...current,
                    address:
                      event.target
                        .value,
                  })
                )
              }
              placeholder="Ví dụ: 123 Nguyễn Huệ"
              className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none placeholder:text-slate-500"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="rounded-2xl bg-white px-4 py-3 font-semibold text-slate-950 disabled:opacity-60"
          >
            {loading
              ? 'Đang lưu...'
              : 'Lưu rạp'}
          </button>
        </form>

        {/* SỬA RẠP */}

        <form
          onSubmit={
            handleCinemaUpdate
          }
          className="space-y-4 rounded-[28px] border border-white/10 bg-slate-950/70 p-6 shadow-glow backdrop-blur-xl"
        >
          <div>
            <h3 className="text-xl font-semibold text-white">
              Chỉnh sửa rạp
            </h3>

            <p className="mt-2 text-sm text-slate-300">
              Sửa thông tin hoặc xóa
              rạp đã chọn.
            </p>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-200">
              Chọn rạp
            </label>

            <select
              value={
                selectedCinemaId
              }
              onChange={(event) =>
                syncSelectedCinema(
                  event.target
                    .value
                )
              }
              className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none"
            >
              <option
                value=""
                className="bg-slate-950"
              >
                Chọn rạp
              </option>

              {cinemaList.map(
                (cinema) => (
                  <option
                    key={
                      cinema.id
                    }
                    value={
                      cinema.id
                    }
                    className="bg-slate-950"
                  >
                    {cinema.name} -{' '}
                    {cinema.city}
                  </option>
                )
              )}
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-200">
              Tên rạp
            </label>

            <input
              value={
                editCinemaForm.name
              }
              onChange={(event) =>
                setEditCinemaForm(
                  (current) => ({
                    ...current,
                    name:
                      event.target
                        .value,
                  })
                )
              }
              className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none"
              required
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-200">
              Thành phố
            </label>

            <input
              value={
                editCinemaForm.city
              }
              onChange={(event) =>
                setEditCinemaForm(
                  (current) => ({
                    ...current,
                    city:
                      event.target
                        .value,
                  })
                )
              }
              className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none"
              required
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-200">
              Địa chỉ
            </label>

            <input
              value={
                editCinemaForm.address
              }
              onChange={(event) =>
                setEditCinemaForm(
                  (current) => ({
                    ...current,
                    address:
                      event.target
                        .value,
                  })
                )
              }
              className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none"
              required
            />
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="submit"
              disabled={
                loading ||
                !selectedCinemaId
              }
              className="rounded-2xl bg-white px-4 py-3 font-semibold text-slate-950 disabled:opacity-60"
            >
              Cập nhật rạp
            </button>

            <button
              type="button"
              onClick={
                handleCinemaDelete
              }
              disabled={
                loading ||
                !selectedCinemaId
              }
              className="rounded-2xl border border-rose-400/40 px-4 py-3 font-semibold text-rose-200 disabled:opacity-50"
            >
              Xóa rạp
            </button>
          </div>
        </form>
      </div>

      {/* ========================================================
          QUẢN LÝ PHÒNG
      ======================================================== */}

      <div className="grid gap-6 lg:grid-cols-2">

        {/* ======================================================
            THÊM PHÒNG
        ====================================================== */}

        <form
          onSubmit={
            handleHallCreate
          }
          className="space-y-5 rounded-[28px] border border-white/10 bg-slate-950/70 p-6 shadow-glow backdrop-blur-xl"
        >
          <div>
            <h3 className="text-xl font-semibold text-white">
              Thêm phòng chiếu
            </h3>

            <p className="mt-2 text-sm leading-6 text-slate-300">
              Nhập số hàng, số ghế và
              phân chia số lượng từng
              loại ghế.
            </p>
          </div>

          {/* RẠP */}

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-200">
              Rạp chiếu
            </label>

            <select
              value={
                selectedCinemaId
              }
              onChange={(event) =>
                syncSelectedCinema(
                  event.target
                    .value
                )
              }
              className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none"
              required
            >
              <option
                value=""
                className="bg-slate-950"
              >
                Chọn rạp
              </option>

              {cinemaList.map(
                (cinema) => (
                  <option
                    key={
                      cinema.id
                    }
                    value={
                      cinema.id
                    }
                    className="bg-slate-950"
                  >
                    {cinema.name} -{' '}
                    {cinema.city}
                  </option>
                )
              )}
            </select>
          </div>

          {/* TÊN PHÒNG */}

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-200">
              Tên phòng chiếu
            </label>

            <input
              value={
                hallForm.name
              }
              onChange={(event) =>
                setHallForm(
                  (current) => ({
                    ...current,
                    name:
                      event.target
                        .value,
                  })
                )
              }
              placeholder="Ví dụ: Phòng 01"
              className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none placeholder:text-slate-500"
              required
            />
          </div>

          {/* HÀNG + GHẾ */}

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-200">
                Số hàng ghế
              </label>

              <input
                type="number"
                min={1}
                max={26}
                value={
                  hallForm.rows
                }
                onChange={(event) =>
                  setHallForm(
                    (current) => ({
                      ...current,
                      rows: Math.max(
                        1,
                        Number(
                          event.target
                            .value
                        )
                      ),
                    })
                  )
                }
                className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none"
                required
              />

              <p className="mt-1.5 text-xs text-slate-400">
                Ví dụ: 7 hàng → A đến G
              </p>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-200">
                Số ghế mỗi hàng
              </label>

              <input
                type="number"
                min={1}
                max={50}
                value={
                  hallForm.seatsPerRow
                }
                onChange={(event) =>
                  setHallForm(
                    (current) => ({
                      ...current,
                      seatsPerRow:
                        Math.max(
                          1,
                          Number(
                            event.target
                              .value
                          )
                        ),
                    })
                  )
                }
                className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none"
                required
              />

              <p className="mt-1.5 text-xs text-slate-400">
                Ví dụ: 8 ghế/hàng
              </p>
            </div>
          </div>

          {/* TỔNG SỨC CHỨA */}

          <div className="rounded-2xl border border-sky-400/20 bg-sky-500/10 p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-300">
                Tổng sức chứa
              </span>

              <span className="text-xl font-bold text-sky-300">
                {hallCapacity}{' '}
                ghế
              </span>
            </div>

            <p className="mt-1 text-xs text-slate-400">
              {hallForm.rows} hàng ×{' '}
              {hallForm.seatsPerRow}{' '}
              ghế ={' '}
              {hallCapacity} ghế
            </p>
          </div>

          {/* LOẠI GHẾ */}

          <div>
            <div className="mb-3">
              <label className="block text-sm font-medium text-slate-200">
                Số lượng từng loại ghế
              </label>

              <p className="mt-1 text-xs text-slate-400">
                Tổng 3 loại ghế phải bằng{' '}
                {hallCapacity} ghế.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">

              {/* STANDARD */}

              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <label className="mb-2 block text-sm font-medium text-slate-200">
                  Ghế thường
                </label>

                <input
                  type="number"
                  min={0}
                  max={hallCapacity}
                  value={
                    hallForm.seatTypes
                      .standard
                  }
                  onChange={(
                    event
                  ) =>
                    setHallForm(
                      (current) => ({
                        ...current,
                        seatTypes:
                          {
                            ...current
                              .seatTypes,
                            standard:
                              Math.max(
                                0,
                                Number(
                                  event
                                    .target
                                    .value
                                )
                              ),
                          },
                      })
                    )
                  }
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-white outline-none"
                />

                <p className="mt-2 text-xs text-slate-400">
                  STANDARD
                </p>
              </div>

              {/* VIP */}

              <div className="rounded-2xl border border-amber-400/20 bg-amber-500/5 p-4">
                <label className="mb-2 block text-sm font-medium text-amber-100">
                  Ghế VIP
                </label>

                <input
                  type="number"
                  min={0}
                  max={hallCapacity}
                  value={
                    hallForm.seatTypes
                      .vip
                  }
                  onChange={(
                    event
                  ) =>
                    setHallForm(
                      (current) => ({
                        ...current,
                        seatTypes:
                          {
                            ...current
                              .seatTypes,
                            vip:
                              Math.max(
                                0,
                                Number(
                                  event
                                    .target
                                    .value
                                )
                              ),
                          },
                      })
                    )
                  }
                  className="w-full rounded-xl border border-amber-400/20 bg-white/5 px-3 py-2.5 text-white outline-none"
                />

                <p className="mt-2 text-xs text-slate-400">
                  VIP
                </p>
              </div>

              {/* COUPLE */}

              <div className="rounded-2xl border border-pink-400/20 bg-pink-500/5 p-4">
                <label className="mb-2 block text-sm font-medium text-pink-100">
                  Ghế đôi
                </label>

                <input
                  type="number"
                  min={0}
                  max={hallCapacity}
                  value={
                    hallForm.seatTypes
                      .couple
                  }
                  onChange={(
                    event
                  ) =>
                    setHallForm(
                      (current) => ({
                        ...current,
                        seatTypes:
                          {
                            ...current
                              .seatTypes,
                            couple:
                              Math.max(
                                0,
                                Number(
                                  event
                                    .target
                                    .value
                                )
                              ),
                          },
                      })
                    )
                  }
                  className="w-full rounded-xl border border-pink-400/20 bg-white/5 px-3 py-2.5 text-white outline-none"
                />

                <p className="mt-2 text-xs text-slate-400">
                  COUPLE
                </p>
              </div>
            </div>

            {/* KIỂM TRA TỔNG */}

            <div
              className={`mt-4 rounded-2xl border px-4 py-3 ${
                hallSeatTypeValid
                  ? 'border-emerald-400/20 bg-emerald-500/10'
                  : 'border-rose-400/30 bg-rose-500/10'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-300">
                  Tổng đã nhập
                </span>

                <span
                  className={`font-bold ${
                    hallSeatTypeValid
                      ? 'text-emerald-300'
                      : 'text-rose-300'
                  }`}
                >
                  {
                    hallSeatTypeTotal
                  }{' '}
                  / {hallCapacity}{' '}
                  ghế
                </span>
              </div>

              {!hallSeatTypeValid && (
                <p className="mt-1 text-xs text-rose-300">
                  Còn thiếu hoặc thừa{' '}
                  {Math.abs(
                    hallCapacity -
                      hallSeatTypeTotal
                  )}{' '}
                  ghế.
                </p>
              )}
            </div>
          </div>

          <button
            type="submit"
            disabled={
              loading ||
              !selectedCinemaId ||
              !hallSeatTypeValid
            }
            className="rounded-2xl bg-white px-4 py-3 font-semibold text-slate-950 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading
              ? 'Đang lưu...'
              : 'Lưu phòng và tạo ghế'}
          </button>
        </form>

        {/* ======================================================
            SỬA PHÒNG
        ====================================================== */}

        <form
          onSubmit={
            handleHallUpdate
          }
          className="space-y-5 rounded-[28px] border border-white/10 bg-slate-950/70 p-6 shadow-glow backdrop-blur-xl"
        >
          <div>
            <h3 className="text-xl font-semibold text-white">
              Chỉnh sửa phòng
            </h3>

            <p className="mt-2 text-sm leading-6 text-slate-300">
              Đổi tên, số hàng, số ghế và
              số lượng từng loại ghế.
            </p>
          </div>

          {/* CHỌN PHÒNG */}

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-200">
              Chọn phòng
            </label>

            <select
              value={
                selectedHallId
              }
              onChange={(event) =>
                syncSelectedHall(
                  event.target
                    .value
                )
              }
              className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none"
            >
              <option
                value=""
                className="bg-slate-950"
              >
                Chọn phòng
              </option>

              {(
                selectedCinema
                  ?.halls ?? []
              ).map((hall) => (
                <option
                  key={
                    hall.id
                  }
                  value={
                    hall.id
                  }
                  className="bg-slate-950"
                >
                  {hall.name}
                </option>
              ))}
            </select>
          </div>

          {/* TÊN PHÒNG */}

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-200">
              Tên phòng chiếu
            </label>

            <input
              value={
                editHallForm.name
              }
              onChange={(event) =>
                setEditHallForm(
                  (current) => ({
                    ...current,
                    name:
                      event.target
                        .value,
                  })
                )
              }
              placeholder="Ví dụ: Phòng 01"
              className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none placeholder:text-slate-500"
              required
            />
          </div>

          {/* HÀNG + GHẾ */}

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-200">
                Số hàng ghế
              </label>

              <input
                type="number"
                min={1}
                max={26}
                value={
                  editHallForm.rows
                }
                onChange={(event) =>
                  setEditHallForm(
                    (current) => ({
                      ...current,
                      rows: Math.max(
                        1,
                        Number(
                          event.target
                            .value
                        )
                      ),
                    })
                  )
                }
                className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none"
                required
              />

              <p className="mt-1.5 text-xs text-slate-400">
                Ví dụ: 7 hàng → A đến G
              </p>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-200">
                Số ghế mỗi hàng
              </label>

              <input
                type="number"
                min={1}
                max={50}
                value={
                  editHallForm.seatsPerRow
                }
                onChange={(event) =>
                  setEditHallForm(
                    (current) => ({
                      ...current,
                      seatsPerRow:
                        Math.max(
                          1,
                          Number(
                            event.target
                              .value
                          )
                        ),
                    })
                  )
                }
                className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none"
                required
              />

              <p className="mt-1.5 text-xs text-slate-400">
                Ví dụ: 8 ghế/hàng
              </p>
            </div>
          </div>

          {/* SỨC CHỨA */}

          <div className="rounded-2xl border border-sky-400/20 bg-sky-500/10 p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-300">
                Tổng sức chứa
              </span>

              <span className="text-xl font-bold text-sky-300">
                {
                  editHallCapacity
                }{' '}
                ghế
              </span>
            </div>

            <p className="mt-1 text-xs text-slate-400">
              {editHallForm.rows}{' '}
              hàng ×{' '}
              {
                editHallForm.seatsPerRow
              }{' '}
              ghế ={' '}
              {
                editHallCapacity
              }{' '}
              ghế
            </p>
          </div>

          {/* LOẠI GHẾ */}

          <div>
            <div className="mb-3">
              <label className="block text-sm font-medium text-slate-200">
                Số lượng từng loại ghế
              </label>

              <p className="mt-1 text-xs text-slate-400">
                Tổng số lượng phải bằng{' '}
                {
                  editHallCapacity
                }{' '}
                ghế.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">

              {/* STANDARD */}

              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <label className="mb-2 block text-sm font-medium text-slate-200">
                  Ghế thường
                </label>

                <input
                  type="number"
                  min={0}
                  max={
                    editHallCapacity
                  }
                  value={
                    editHallForm
                      .seatTypes
                      .standard
                  }
                  onChange={(
                    event
                  ) =>
                    setEditHallForm(
                      (current) => ({
                        ...current,
                        seatTypes:
                          {
                            ...current
                              .seatTypes,
                            standard:
                              Math.max(
                                0,
                                Number(
                                  event
                                    .target
                                    .value
                                )
                              ),
                          },
                      })
                    )
                  }
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-white outline-none"
                />

                <p className="mt-2 text-xs text-slate-400">
                  STANDARD
                </p>
              </div>

              {/* VIP */}

              <div className="rounded-2xl border border-amber-400/20 bg-amber-500/5 p-4">
                <label className="mb-2 block text-sm font-medium text-amber-100">
                  Ghế VIP
                </label>

                <input
                  type="number"
                  min={0}
                  max={
                    editHallCapacity
                  }
                  value={
                    editHallForm
                      .seatTypes
                      .vip
                  }
                  onChange={(
                    event
                  ) =>
                    setEditHallForm(
                      (current) => ({
                        ...current,
                        seatTypes:
                          {
                            ...current
                              .seatTypes,
                            vip:
                              Math.max(
                                0,
                                Number(
                                  event
                                    .target
                                    .value
                                )
                              ),
                          },
                      })
                    )
                  }
                  className="w-full rounded-xl border border-amber-400/20 bg-white/5 px-3 py-2.5 text-white outline-none"
                />

                <p className="mt-2 text-xs text-slate-400">
                  VIP
                </p>
              </div>

              {/* COUPLE */}

              <div className="rounded-2xl border border-pink-400/20 bg-pink-500/5 p-4">
                <label className="mb-2 block text-sm font-medium text-pink-100">
                  Ghế đôi
                </label>

                <input
                  type="number"
                  min={0}
                  max={
                    editHallCapacity
                  }
                  value={
                    editHallForm
                      .seatTypes
                      .couple
                  }
                  onChange={(
                    event
                  ) =>
                    setEditHallForm(
                      (current) => ({
                        ...current,
                        seatTypes:
                          {
                            ...current
                              .seatTypes,
                            couple:
                              Math.max(
                                0,
                                Number(
                                  event
                                    .target
                                    .value
                                )
                              ),
                          },
                      })
                    )
                  }
                  className="w-full rounded-xl border border-pink-400/20 bg-white/5 px-3 py-2.5 text-white outline-none"
                />

                <p className="mt-2 text-xs text-slate-400">
                  COUPLE
                </p>
              </div>
            </div>

            {/* KIỂM TRA */}

            <div
              className={`mt-4 rounded-2xl border px-4 py-3 ${
                editHallSeatTypeValid
                  ? 'border-emerald-400/20 bg-emerald-500/10'
                  : 'border-rose-400/30 bg-rose-500/10'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-300">
                  Tổng đã nhập
                </span>

                <span
                  className={`font-bold ${
                    editHallSeatTypeValid
                      ? 'text-emerald-300'
                      : 'text-rose-300'
                  }`}
                >
                  {
                    editHallSeatTypeTotal
                  }{' '}
                  /{' '}
                  {
                    editHallCapacity
                  }{' '}
                  ghế
                </span>
              </div>

              {!editHallSeatTypeValid && (
                <p className="mt-1 text-xs text-rose-300">
                  Còn thiếu hoặc thừa{' '}
                  {Math.abs(
                    editHallCapacity -
                      editHallSeatTypeTotal
                  )}{' '}
                  ghế.
                </p>
              )}
            </div>
          </div>

          {/* BUTTON */}

          <div className="flex flex-wrap gap-3">
            <button
              type="submit"
              disabled={
                loading ||
                !selectedHallId ||
                !editHallSeatTypeValid
              }
              className="rounded-2xl bg-white px-4 py-3 font-semibold text-slate-950 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading
                ? 'Đang lưu...'
                : 'Cập nhật phòng'}
            </button>

            <button
              type="button"
              onClick={
                handleHallDelete
              }
              disabled={
                loading ||
                !selectedHallId
              }
              className="rounded-2xl border border-rose-400/40 px-4 py-3 font-semibold text-rose-200 disabled:opacity-50"
            >
              Xóa phòng
            </button>
          </div>
        </form>
      </div>

      {/* ========================================================
          QUẢN LÝ GHẾ
      ======================================================== */}

      <section className="rounded-[28px] border border-white/10 bg-white/5 p-6">

        {/* TIÊU ĐỀ */}

        <div>
          <h3 className="text-lg font-semibold text-white">
            Quản lý ghế theo phòng
          </h3>

          <p className="mt-2 text-sm text-slate-300">
            Xem loại ghế, số lượng ghế đang hoạt động và
            bật/tắt trạng thái từng ghế.
          </p>
        </div>

        {selectedHall ? (
          <>
            {/* ==================================================
                THỐNG KÊ GHẾ
            ================================================== */}

            <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">

              {/* GHẾ THƯỜNG */}

              <div className="rounded-2xl border border-emerald-400/20 bg-emerald-500/5 p-4">
                <p className="text-xs font-medium text-emerald-200/70">
                  GHẾ THƯỜNG
                </p>

                <p className="mt-1 text-2xl font-bold text-emerald-200">
                  {
                    (selectedHall.seats ?? []).filter(
                      (seat) =>
                        seat.type === 'STANDARD' &&
                        seat.isActive
                    ).length
                  }
                </p>

                <p className="text-xs text-slate-500">
                  STANDARD đang hoạt động
                </p>
              </div>


              {/* GHẾ VIP */}

              <div className="rounded-2xl border border-amber-400/20 bg-amber-500/5 p-4">
                <p className="text-xs font-medium text-amber-200/70">
                  GHẾ VIP
                </p>

                <p className="mt-1 text-2xl font-bold text-amber-200">
                  {
                    (selectedHall.seats ?? []).filter(
                      (seat) =>
                        seat.type === 'VIP' &&
                        seat.isActive
                    ).length
                  }
                </p>

                <p className="text-xs text-slate-500">
                  VIP đang hoạt động
                </p>
              </div>


              {/* GHẾ ĐÔI */}

              <div className="rounded-2xl border border-pink-400/20 bg-pink-500/5 p-4">
                <p className="text-xs font-medium text-pink-200/70">
                  GHẾ ĐÔI
                </p>

                <p className="mt-1 text-2xl font-bold text-pink-200">
                  {
                    (selectedHall.seats ?? []).filter(
                      (seat) =>
                        seat.type === 'COUPLE' &&
                        seat.isActive
                    ).length
                  }
                </p>

                <p className="text-xs text-slate-500">
                  COUPLE đang hoạt động
                </p>
              </div>


              {/* TỔNG GHẾ */}

              <div className="rounded-2xl border border-sky-400/20 bg-sky-500/5 p-4">
                <p className="text-xs font-medium text-sky-200/70">
                  TỔNG ĐANG HOẠT ĐỘNG
                </p>

                <p className="mt-1 text-2xl font-bold text-sky-200">
                  {
                    (selectedHall.seats ?? []).filter(
                      (seat) => seat.isActive
                    ).length
                  }
                </p>

                <p className="text-xs text-slate-500">
                  Ghế có thể sử dụng
                </p>
              </div>

            </div>


            {/* ==================================================
                THỐNG KÊ TỔNG QUAN
            ================================================== */}

            <div className="mt-5 flex flex-wrap gap-3 text-xs text-slate-400">

              <span>
                Tổng sơ đồ:{' '}
                <strong className="text-slate-200">
                  {(selectedHall.seats ?? []).length}
                </strong>{' '}
                ghế
              </span>

              <span>•</span>

              <span>
                Đang hoạt động:{' '}
                <strong className="text-emerald-300">
                  {
                    (selectedHall.seats ?? []).filter(
                      (seat) => seat.isActive
                    ).length
                  }
                </strong>{' '}
                ghế
              </span>

              <span>•</span>

              <span>
                Đang tắt:{' '}
                <strong className="text-rose-300">
                  {
                    (selectedHall.seats ?? []).filter(
                      (seat) => !seat.isActive
                    ).length
                  }
                </strong>{' '}
                ghế
              </span>

              <span>•</span>

              <span>
                Phòng:{' '}
                <strong className="text-slate-200">
                  {selectedHall.name}
                </strong>
              </span>

            </div>


            {/* ==================================================
                CHÚ THÍCH
            ================================================== */}

            <div className="mt-4 flex flex-wrap gap-4 text-xs">

              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-emerald-400" />
                <span className="text-slate-300">
                  STANDARD
                </span>
              </div>

              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-amber-400" />
                <span className="text-slate-300">
                  VIP
                </span>
              </div>

              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-pink-400" />
                <span className="text-slate-300">
                  COUPLE
                </span>
              </div>

              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-slate-500" />
                <span className="text-slate-300">
                  Đang tắt
                </span>
              </div>

            </div>


            {/* ==================================================
                DANH SÁCH GHẾ
            ================================================== */}

            <div className="mt-5">

              <div className="mb-3 flex items-center justify-between">

                <div>
                  <h4 className="font-medium text-white">
                    Sơ đồ ghế
                  </h4>

                  <p className="mt-1 text-xs text-slate-500">
                    Nhấn vào ghế để bật hoặc tắt.
                  </p>
                </div>

                <div className="text-xs text-slate-400">
                  {
                    (selectedHall.seats ?? []).length
                  }{' '}
                  ghế
                </div>

              </div>


              {(selectedHall.seats ?? []).length > 0 ? (

                <div className="grid gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-7">

                  {(selectedHall.seats ?? []).map(
                    (seat) => {

                      let seatClass =
                        'border-emerald-400/50 bg-emerald-500/10 text-emerald-100';

                      if (seat.type === 'VIP') {
                        seatClass =
                          'border-amber-400/50 bg-amber-500/10 text-amber-100';
                      }

                      if (seat.type === 'COUPLE') {
                        seatClass =
                          'border-pink-400/50 bg-pink-500/10 text-pink-100';
                      }

                      if (!seat.isActive) {
                        seatClass =
                          'border-slate-600 bg-slate-900/70 text-slate-500';
                      }

                      return (
                        <button
                          key={seat.id}
                          type="button"
                          onClick={() =>
                            toggleSeatActive(
                              seat.id,
                              seat.isActive
                            )
                          }
                          disabled={loading}
                          className={`rounded-xl border px-3 py-3 text-sm transition hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-60 ${seatClass}`}
                        >

                          {/* MÃ GHẾ */}

                          <div className="font-semibold">
                            {seat.code}
                          </div>


                          {/* LOẠI GHẾ */}

                          <div className="mt-1 text-xs opacity-80">
                            {seat.type}
                          </div>


                          {/* TRẠNG THÁI */}

                          <div className="mt-1 text-xs">
                            {seat.isActive
                              ? 'Đang hoạt động'
                              : 'Đang tắt'}
                          </div>

                        </button>
                      );
                    }
                  )}

                </div>

              ) : (

                <p className="rounded-2xl border border-white/10 bg-white/5 px-4 py-5 text-sm text-slate-400">
                  Phòng này chưa có ghế.
                </p>

              )}

            </div>

          </>

        ) : (

          <p className="mt-4 rounded-2xl border border-white/10 bg-white/5 px-4 py-5 text-sm text-slate-400">
            Chọn một phòng để xem danh sách ghế.
          </p>

        )}


        {/* ==================================================
            MESSAGE
        ================================================== */}

        {message ? (
          <p className="mt-5 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-200">
            {message}
          </p>
        ) : null}

      </section>
    </div>
  );
}