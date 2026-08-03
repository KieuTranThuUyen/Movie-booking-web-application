'use client';

import type { FormEvent } from 'react';
import { useMemo, useState } from 'react';

type SeatOption = {
  id: string;
  code: string;
  type: string;
  isActive: boolean;
};

type HallOption = {
  id: string;
  name: string;
  capacity: number;
  seats: SeatOption[];
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

export function CinemaManagementForm({ cinemas }: CinemaManagementFormProps) {
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [cinemaList, setCinemaList] = useState(cinemas);
  const [selectedCinemaId, setSelectedCinemaId] = useState(cinemas[0]?.id ?? '');
  const [selectedHallId, setSelectedHallId] = useState(cinemas[0]?.halls[0]?.id ?? '');

  const [cinemaForm, setCinemaForm] = useState({ name: '', city: '', address: '' });
  const [editCinemaForm, setEditCinemaForm] = useState({ name: cinemas[0]?.name ?? '', city: cinemas[0]?.city ?? '', address: cinemas[0]?.address ?? '' });
  const [hallForm, setHallForm] = useState({ name: '', capacity: 80, rows: 6, seatsPerRow: 8 });
  const [editHallForm, setEditHallForm] = useState({ name: cinemas[0]?.halls[0]?.name ?? '', capacity: cinemas[0]?.halls[0]?.capacity ?? 80 });

  const selectedCinema = useMemo(() => cinemaList.find((cinema) => cinema.id === selectedCinemaId), [cinemaList, selectedCinemaId]);
  const selectedHall = useMemo(() => selectedCinema?.halls.find((hall) => hall.id === selectedHallId), [selectedCinema, selectedHallId]);

  const syncSelectedCinema = (cinemaId: string) => {
    setSelectedCinemaId(cinemaId);
    const nextCinema = cinemaList.find((cinema) => cinema.id === cinemaId);
    setEditCinemaForm({
      name: nextCinema?.name ?? '',
      city: nextCinema?.city ?? '',
      address: nextCinema?.address ?? ''
    });

    const firstHall = nextCinema?.halls[0];
    setSelectedHallId(firstHall?.id ?? '');
    setEditHallForm({ name: firstHall?.name ?? '', capacity: firstHall?.capacity ?? 80 });
  };

  const syncSelectedHall = (hallId: string) => {
    setSelectedHallId(hallId);
    const hall = selectedCinema?.halls.find((item) => item.id === hallId);
    setEditHallForm({ name: hall?.name ?? '', capacity: hall?.capacity ?? 80 });
  };

  const handleCinemaCreate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setMessage('');

    const response = await fetch('/api/admin/cinemas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(cinemaForm)
    });

    const data = (await response.json()) as { message: string; cinema?: CinemaOption };
    setLoading(false);
    setMessage(data.message);

    if (response.ok && data.cinema) {
      const created = { ...data.cinema, halls: [] };
      setCinemaList((current) => [created, ...current]);
      setCinemaForm({ name: '', city: '', address: '' });
      setSelectedCinemaId(created.id);
      setSelectedHallId('');
      setEditCinemaForm({ name: created.name, city: created.city, address: created.address });
      setEditHallForm({ name: '', capacity: 80 });
    }
  };

  const handleCinemaUpdate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedCinemaId) return;

    setLoading(true);
    setMessage('');

    const response = await fetch(`/api/admin/cinemas/${selectedCinemaId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editCinemaForm)
    });

    const data = (await response.json()) as { message: string; cinema?: CinemaOption };
    setLoading(false);
    setMessage(data.message);

    if (response.ok && data.cinema) {
      setCinemaList((current) => current.map((cinema) => (cinema.id === selectedCinemaId ? { ...cinema, ...data.cinema, halls: cinema.halls } : cinema)));
    }
  };

  const handleCinemaDelete = async () => {
    if (!selectedCinemaId || !confirm('Xác nhận xóa rạp này?')) return;

    setLoading(true);
    setMessage('');

    const response = await fetch(`/api/admin/cinemas/${selectedCinemaId}`, { method: 'DELETE' });
    const data = (await response.json()) as { message: string };
    setLoading(false);
    setMessage(data.message);

    if (response.ok) {
      const nextList = cinemaList.filter((cinema) => cinema.id !== selectedCinemaId);
      setCinemaList(nextList);
      const fallbackCinema = nextList[0];
      setSelectedCinemaId(fallbackCinema?.id ?? '');
      setSelectedHallId(fallbackCinema?.halls[0]?.id ?? '');
      setEditCinemaForm({
        name: fallbackCinema?.name ?? '',
        city: fallbackCinema?.city ?? '',
        address: fallbackCinema?.address ?? ''
      });
      setEditHallForm({ name: fallbackCinema?.halls[0]?.name ?? '', capacity: fallbackCinema?.halls[0]?.capacity ?? 80 });
    }
  };

  const handleHallCreate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedCinemaId) {
      setMessage('Vui lòng tạo hoặc chọn một rạp trước.');
      return;
    }

    setLoading(true);
    setMessage('');

    const response = await fetch('/api/admin/halls', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cinemaId: selectedCinemaId, ...hallForm })
    });

    const data = (await response.json()) as { message: string; hall?: HallOption };
    setLoading(false);
    setMessage(data.message);

    if (response.ok && data.hall) {
      setCinemaList((current) =>
        current.map((cinema) =>
          cinema.id === selectedCinemaId
            ? {
                ...cinema,
                halls: [...cinema.halls, data.hall!]
              }
            : cinema
        )
      );

      setHallForm({ name: '', capacity: 80, rows: 6, seatsPerRow: 8 });
      setSelectedHallId(data.hall.id);
      setEditHallForm({ name: data.hall.name, capacity: data.hall.capacity });
    }
  };

  const handleHallUpdate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedHallId) return;

    setLoading(true);
    setMessage('');

    const response = await fetch(`/api/admin/halls/${selectedHallId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editHallForm)
    });

    const data = (await response.json()) as { message: string; hall?: HallOption };
    setLoading(false);
    setMessage(data.message);

    if (response.ok && data.hall) {
      setCinemaList((current) =>
        current.map((cinema) =>
          cinema.id !== selectedCinemaId
            ? cinema
            : {
                ...cinema,
                halls: cinema.halls.map((hall) => (hall.id === selectedHallId ? { ...hall, name: data.hall!.name, capacity: data.hall!.capacity } : hall))
              }
        )
      );
    }
  };

  const handleHallDelete = async () => {
    if (!selectedHallId || !confirm('Xác nhận xóa phòng chiếu này?')) return;

    setLoading(true);
    setMessage('');

    const response = await fetch(`/api/admin/halls/${selectedHallId}`, { method: 'DELETE' });
    const data = (await response.json()) as { message: string };
    setLoading(false);
    setMessage(data.message);

    if (response.ok) {
      const nextHalls = selectedCinema?.halls.filter((hall) => hall.id !== selectedHallId) ?? [];

      setCinemaList((current) =>
        current.map((cinema) =>
          cinema.id !== selectedCinemaId
            ? cinema
            : {
                ...cinema,
                halls: cinema.halls.filter((hall) => hall.id !== selectedHallId)
              }
        )
      );
      const fallbackHall = nextHalls[0];
      setSelectedHallId(fallbackHall?.id ?? '');
      setEditHallForm({ name: fallbackHall?.name ?? '', capacity: fallbackHall?.capacity ?? 80 });
    }
  };

  const toggleSeatActive = async (seatId: string, isActive: boolean) => {
    setLoading(true);
    setMessage('');

    const response = await fetch(`/api/admin/seats/${seatId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive: !isActive })
    });

    const data = (await response.json()) as { message: string };
    setLoading(false);
    setMessage(data.message);

    if (response.ok) {
      setCinemaList((current) =>
        current.map((cinema) =>
          cinema.id !== selectedCinemaId
            ? cinema
            : {
                ...cinema,
                halls: cinema.halls.map((hall) =>
                  hall.id !== selectedHallId
                    ? hall
                    : {
                        ...hall,
                        seats: hall.seats.map((seat) => (seat.id === seatId ? { ...seat, isActive: !isActive } : seat))
                      }
                )
              }
        )
      );
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-2">
        <form onSubmit={handleCinemaCreate} className="space-y-4 rounded-[28px] border border-white/10 bg-slate-950/70 p-6 shadow-glow backdrop-blur-xl">
          <div>
            <h3 className="text-xl font-semibold text-white">Thêm rạp chiếu</h3>
            <p className="mt-2 text-sm text-slate-300">Tạo rạp mới và bổ sung vào hệ thống.</p>
          </div>

          <input value={cinemaForm.name} onChange={(event) => setCinemaForm((current) => ({ ...current, name: event.target.value }))} placeholder="Tên rạp" className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none" required />
          <input value={cinemaForm.city} onChange={(event) => setCinemaForm((current) => ({ ...current, city: event.target.value }))} placeholder="Thành phố" className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none" required />
          <input value={cinemaForm.address} onChange={(event) => setCinemaForm((current) => ({ ...current, address: event.target.value }))} placeholder="Địa chỉ" className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none" required />

          <button type="submit" disabled={loading} className="rounded-2xl bg-white px-4 py-3 font-semibold text-slate-950 disabled:opacity-60">
            {loading ? 'Đang lưu...' : 'Lưu rạp'}
          </button>
        </form>

        <form onSubmit={handleCinemaUpdate} className="space-y-4 rounded-[28px] border border-white/10 bg-slate-950/70 p-6 shadow-glow backdrop-blur-xl">
          <div>
            <h3 className="text-xl font-semibold text-white">Chỉnh sửa rạp</h3>
            <p className="mt-2 text-sm text-slate-300">Sửa thông tin hoặc xóa rạp đã chọn.</p>
          </div>

          <select value={selectedCinemaId} onChange={(event) => syncSelectedCinema(event.target.value)} className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none">
            <option value="" className="bg-slate-950">Chọn rạp</option>
            {cinemaList.map((cinema) => (
              <option key={cinema.id} value={cinema.id} className="bg-slate-950">
                {cinema.name} - {cinema.city}
              </option>
            ))}
          </select>

          <input value={editCinemaForm.name} onChange={(event) => setEditCinemaForm((current) => ({ ...current, name: event.target.value }))} placeholder="Tên rạp" className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none" required />
          <input value={editCinemaForm.city} onChange={(event) => setEditCinemaForm((current) => ({ ...current, city: event.target.value }))} placeholder="Thành phố" className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none" required />
          <input value={editCinemaForm.address} onChange={(event) => setEditCinemaForm((current) => ({ ...current, address: event.target.value }))} placeholder="Địa chỉ" className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none" required />

          <div className="flex flex-wrap gap-3">
            <button type="submit" disabled={loading || !selectedCinemaId} className="rounded-2xl bg-white px-4 py-3 font-semibold text-slate-950 disabled:opacity-60">
              Cập nhật rạp
            </button>
            <button type="button" onClick={handleCinemaDelete} disabled={loading || !selectedCinemaId} className="rounded-2xl border border-rose-400/40 px-4 py-3 font-semibold text-rose-200 disabled:opacity-50">
              Xóa rạp
            </button>
          </div>
        </form>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <form onSubmit={handleHallCreate} className="space-y-4 rounded-[28px] border border-white/10 bg-slate-950/70 p-6 shadow-glow backdrop-blur-xl">
          <div>
            <h3 className="text-xl font-semibold text-white">Thêm phòng chiếu</h3>
            <p className="mt-2 text-sm text-slate-300">Tạo phòng và sơ đồ ghế theo số hàng/số ghế.</p>
          </div>

          <input value={hallForm.name} onChange={(event) => setHallForm((current) => ({ ...current, name: event.target.value }))} placeholder="Tên phòng" className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none" required />
          <div className="grid gap-3 sm:grid-cols-3">
            <input type="number" min={1} value={hallForm.capacity} onChange={(event) => setHallForm((current) => ({ ...current, capacity: Number(event.target.value) }))} placeholder="Sức chứa" className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none" required />
            <input type="number" min={1} value={hallForm.rows} onChange={(event) => setHallForm((current) => ({ ...current, rows: Number(event.target.value) }))} placeholder="Số hàng" className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none" required />
            <input type="number" min={1} value={hallForm.seatsPerRow} onChange={(event) => setHallForm((current) => ({ ...current, seatsPerRow: Number(event.target.value) }))} placeholder="Ghế/hàng" className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none" required />
          </div>

          <button type="submit" disabled={loading || !selectedCinemaId} className="rounded-2xl bg-white px-4 py-3 font-semibold text-slate-950 disabled:opacity-60">
            {loading ? 'Đang lưu...' : 'Lưu phòng và tạo ghế'}
          </button>
        </form>

        <form onSubmit={handleHallUpdate} className="space-y-4 rounded-[28px] border border-white/10 bg-slate-950/70 p-6 shadow-glow backdrop-blur-xl">
          <div>
            <h3 className="text-xl font-semibold text-white">Chỉnh sửa phòng</h3>
            <p className="mt-2 text-sm text-slate-300">Đổi tên, sức chứa hoặc xóa phòng chiếu.</p>
          </div>

          <select value={selectedHallId} onChange={(event) => syncSelectedHall(event.target.value)} className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none">
            <option value="" className="bg-slate-950">Chọn phòng</option>
            {(selectedCinema?.halls ?? []).map((hall) => (
              <option key={hall.id} value={hall.id} className="bg-slate-950">
                {hall.name}
              </option>
            ))}
          </select>

          <input value={editHallForm.name} onChange={(event) => setEditHallForm((current) => ({ ...current, name: event.target.value }))} placeholder="Tên phòng" className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none" required />
          <input type="number" min={1} value={editHallForm.capacity} onChange={(event) => setEditHallForm((current) => ({ ...current, capacity: Number(event.target.value) }))} placeholder="Sức chứa" className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none" required />

          <div className="flex flex-wrap gap-3">
            <button type="submit" disabled={loading || !selectedHallId} className="rounded-2xl bg-white px-4 py-3 font-semibold text-slate-950 disabled:opacity-60">
              Cập nhật phòng
            </button>
            <button type="button" onClick={handleHallDelete} disabled={loading || !selectedHallId} className="rounded-2xl border border-rose-400/40 px-4 py-3 font-semibold text-rose-200 disabled:opacity-50">
              Xóa phòng
            </button>
          </div>
        </form>
      </div>

      <section className="rounded-[28px] border border-white/10 bg-white/5 p-6">
        <h3 className="text-lg font-semibold text-white">Quản lý ghế theo phòng</h3>
        <p className="mt-2 text-sm text-slate-300">Bật/tắt trạng thái hoạt động của từng ghế trong phòng đang chọn.</p>
        {selectedHall ? (
          <div className="mt-4 grid gap-2 sm:grid-cols-3 xl:grid-cols-5">
            {selectedHall.seats.map((seat) => (
              <button
                key={seat.id}
                type="button"
                onClick={() => toggleSeatActive(seat.id, seat.isActive)}
                disabled={loading}
                className={`rounded-xl border px-3 py-2 text-sm transition ${
                  seat.isActive ? 'border-emerald-400/50 bg-emerald-500/10 text-emerald-100' : 'border-slate-600 bg-slate-900/60 text-slate-400'
                }`}
              >
                {seat.code} · {seat.type} · {seat.isActive ? 'ON' : 'OFF'}
              </button>
            ))}
          </div>
        ) : (
          <p className="mt-4 text-sm text-slate-400">Chọn một phòng để xem danh sách ghế.</p>
        )}

        {message ? <p className="mt-4 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-200">{message}</p> : null}
      </section>
    </div>
  );
}
