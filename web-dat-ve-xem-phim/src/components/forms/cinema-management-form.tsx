'use client';

import type { FormEvent } from 'react';
import { useState } from 'react';

type CinemaOption = {
  id: string;
  name: string;
  city: string;
  address: string;
};

type HallOption = {
  id: string;
  name: string;
  capacity: number;
  seatsCount: number;
};

type CinemaManagementFormProps = {
  cinemas: CinemaOption[];
};

export function CinemaManagementForm({ cinemas }: CinemaManagementFormProps) {
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedCinemaId, setSelectedCinemaId] = useState(cinemas[0]?.id ?? '');
  const [cinemaForm, setCinemaForm] = useState({ name: '', city: '', address: '' });
  const [hallForm, setHallForm] = useState({ name: '', capacity: 80, rows: 6, seatsPerRow: 8 });
  const [createdHalls, setCreatedHalls] = useState<HallOption[]>([]);

  const handleCinemaSubmit = async (event: FormEvent<HTMLFormElement>) => {
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
      setCinemaForm({ name: '', city: '', address: '' });
      setSelectedCinemaId(data.cinema.id);
    }
  };

  const handleHallSubmit = async (event: FormEvent<HTMLFormElement>) => {
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
      const createdHall = data.hall;
      setHallForm({ name: '', capacity: 80, rows: 6, seatsPerRow: 8 });
      setCreatedHalls((current) => [
        ...current,
        { id: createdHall.id, name: createdHall.name, capacity: createdHall.capacity, seatsCount: hallForm.rows * hallForm.seatsPerRow }
      ]);
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <form onSubmit={handleCinemaSubmit} className="space-y-4 rounded-[28px] border border-white/10 bg-slate-950/70 p-6 shadow-glow backdrop-blur-xl">
        <div>
          <h3 className="text-xl font-semibold text-white">Thêm rạp chiếu</h3>
          <p className="mt-2 text-sm text-slate-300">Quản lý rạp, địa chỉ và thành phố.</p>
        </div>

        <input value={cinemaForm.name} onChange={(event) => setCinemaForm((current) => ({ ...current, name: event.target.value }))} placeholder="Tên rạp" className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none" required />
        <input value={cinemaForm.city} onChange={(event) => setCinemaForm((current) => ({ ...current, city: event.target.value }))} placeholder="Thành phố" className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none" required />
        <input value={cinemaForm.address} onChange={(event) => setCinemaForm((current) => ({ ...current, address: event.target.value }))} placeholder="Địa chỉ" className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none" required />

        <button type="submit" disabled={loading} className="rounded-2xl bg-white px-4 py-3 font-semibold text-slate-950 disabled:opacity-60">
          {loading ? 'Đang lưu...' : 'Lưu rạp'}
        </button>
      </form>

      <form onSubmit={handleHallSubmit} className="space-y-4 rounded-[28px] border border-white/10 bg-slate-950/70 p-6 shadow-glow backdrop-blur-xl">
        <div>
          <h3 className="text-xl font-semibold text-white">Thêm phòng chiếu và sơ đồ ghế</h3>
          <p className="mt-2 text-sm text-slate-300">Mỗi phòng có capacity, số hàng và số ghế mỗi hàng khác nhau.</p>
        </div>

        <select value={selectedCinemaId} onChange={(event) => setSelectedCinemaId(event.target.value)} className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none">
          {cinemas.map((cinema) => (
            <option key={cinema.id} value={cinema.id} className="bg-slate-950">
              {cinema.name} - {cinema.city}
            </option>
          ))}
        </select>
        <input value={hallForm.name} onChange={(event) => setHallForm((current) => ({ ...current, name: event.target.value }))} placeholder="Tên phòng" className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none" required />
        <div className="grid gap-3 sm:grid-cols-3">
          <input type="number" min={1} value={hallForm.capacity} onChange={(event) => setHallForm((current) => ({ ...current, capacity: Number(event.target.value) }))} placeholder="Sức chứa" className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none" required />
          <input type="number" min={1} value={hallForm.rows} onChange={(event) => setHallForm((current) => ({ ...current, rows: Number(event.target.value) }))} placeholder="Số hàng" className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none" required />
          <input type="number" min={1} value={hallForm.seatsPerRow} onChange={(event) => setHallForm((current) => ({ ...current, seatsPerRow: Number(event.target.value) }))} placeholder="Ghế/hàng" className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none" required />
        </div>

        <button type="submit" disabled={loading} className="rounded-2xl bg-white px-4 py-3 font-semibold text-slate-950 disabled:opacity-60">
          {loading ? 'Đang lưu...' : 'Lưu phòng và tạo ghế'}
        </button>
      </form>

      <div className="lg:col-span-2 rounded-[28px] border border-white/10 bg-white/5 p-6 text-sm text-slate-200">
        <div className="font-semibold text-white">Kết quả vừa tạo</div>
        {createdHalls.length === 0 ? (
          <p className="mt-2 text-slate-400">Chưa có phòng chiếu nào được tạo trong phiên này.</p>
        ) : (
          <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {createdHalls.map((hall) => (
              <div key={hall.id} className="rounded-2xl border border-white/10 bg-slate-950/60 p-4">
                <div className="font-semibold text-white">{hall.name}</div>
                <div className="mt-1 text-slate-400">Sức chứa: {hall.capacity}</div>
                <div className="text-slate-400">Sơ đồ ghế: {hall.seatsCount} ghế</div>
              </div>
            ))}
          </div>
        )}
        {message ? <p className="mt-4 rounded-2xl border border-white/10 bg-white/5 px-4 py-3">{message}</p> : null}
      </div>
    </div>
  );
}
