'use client';

import { useEffect, useState } from 'react';

type Voucher = {
  id: string;
  code: string;
  discountType: string;
  discountValue: number;
  minOrderAmount: number;
  usedCount: number;
  usageLimit: number | null;
  perUserLimit: number;
  startsAt: string;
  endsAt: string;
  isActive: boolean;
};

type Combo = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  stock: number;
  isActive: boolean;
};

function toLocalInput(value?: string) {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function VoucherManagement() {
  const emptyForm = {
    code: '',
    discountType: 'FIXED',
    discountValue: '50000',
    minOrderAmount: '0',
    usageLimit: '',
    perUserLimit: '1',
    startsAt: new Date().toISOString().slice(0, 16),
    endsAt: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 16),
    isActive: true,
  };

  const [items, setItems] = useState<Voucher[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    const res = await fetch('/api/admin/vouchers');
    const data = await res.json();
    setItems(Array.isArray(data) ? data : []);
  };

  useEffect(() => {
    void load();
  }, []);

  const resetForm = () => {
    setForm(emptyForm);
    setEditingId(null);
  };

  const startEdit = (item: Voucher) => {
    setEditingId(item.id);
    setForm({
      code: item.code,
      discountType: item.discountType === 'PERCENT' ? 'PERCENT' : 'FIXED',
      discountValue: String(item.discountValue),
      minOrderAmount: String(item.minOrderAmount),
      usageLimit: item.usageLimit == null ? '' : String(item.usageLimit),
      perUserLimit: String(item.perUserLimit ?? 1),
      startsAt: toLocalInput(item.startsAt),
      endsAt: toLocalInput(item.endsAt),
      isActive: item.isActive,
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    try {
      const payload = {
        ...(editingId ? { id: editingId } : {}),
        code: form.code,
        discountType: form.discountType,
        discountValue: Number(form.discountValue),
        minOrderAmount: Number(form.minOrderAmount),
        usageLimit: form.usageLimit === '' ? null : Number(form.usageLimit),
        perUserLimit: Number(form.perUserLimit),
        startsAt: form.startsAt,
        endsAt: form.endsAt,
        isActive: form.isActive,
      };
      const res = await fetch('/api/admin/vouchers', {
        method: editingId ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        alert(err.message || 'Không thể lưu voucher.');
        return;
      }
      resetForm();
      await load();
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id: string, code: string) => {
    if (!confirm(`Xóa / tắt voucher "${code}"?`)) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/vouchers?id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        alert(data.message || 'Không thể xóa voucher.');
        return;
      }
      if (data.softDeleted) {
        alert(data.message || 'Voucher đã được dùng — đã tắt thay vì xóa.');
      }
      if (editingId === id) resetForm();
      await load();
    } finally {
      setBusy(false);
    }
  };

  const toggleActive = async (item: Voucher) => {
    setBusy(true);
    try {
      const res = await fetch('/api/admin/vouchers', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: item.id, isActive: !item.isActive }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        alert(err.message || 'Không thể cập nhật trạng thái.');
        return;
      }
      await load();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <form
        onSubmit={submit}
        className="grid gap-3 rounded-2xl border border-white/10 bg-white/5 p-4 md:grid-cols-4"
      >
        <div className="md:col-span-4 flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-semibold text-white">
            {editingId ? 'Chỉnh sửa voucher' : 'Tạo voucher mới'}
          </p>
          {editingId ? (
            <button
              type="button"
              onClick={resetForm}
              className="rounded-lg border border-white/20 px-3 py-1 text-sm text-slate-300 hover:bg-white/5"
            >
              Hủy chỉnh sửa
            </button>
          ) : null}
        </div>

        {(
          [
            ['code', 'Mã voucher'],
            ['discountValue', 'Mức giảm'],
            ['minOrderAmount', 'Đơn tối thiểu'],
            ['usageLimit', 'Tổng lượt (trống = không giới hạn)'],
            ['perUserLimit', 'Lượt / user'],
          ] as const
        ).map(([name, label]) => (
          <label key={name} className="text-sm text-slate-300">
            {label}
            <input
              name={name}
              value={form[name]}
              onChange={(event) => setForm({ ...form, [name]: event.target.value })}
              className="mt-1 w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-white"
              required={name === 'code' || name === 'discountValue'}
            />
          </label>
        ))}

        <label className="text-sm text-slate-300">
          Loại
          <select
            value={form.discountType}
            onChange={(event) => setForm({ ...form, discountType: event.target.value })}
            className="mt-1 w-full rounded-xl bg-slate-950 px-3 py-2 text-white"
          >
            <option value="FIXED">Số tiền</option>
            <option value="PERCENT">Phần trăm</option>
          </select>
        </label>

        <label className="text-sm text-slate-300">
          Bắt đầu
          <input
            type="datetime-local"
            value={form.startsAt}
            onChange={(event) => setForm({ ...form, startsAt: event.target.value })}
            className="mt-1 w-full rounded-xl bg-slate-950 px-3 py-2 text-white"
            required
          />
        </label>

        <label className="text-sm text-slate-300">
          Kết thúc
          <input
            type="datetime-local"
            value={form.endsAt}
            onChange={(event) => setForm({ ...form, endsAt: event.target.value })}
            className="mt-1 w-full rounded-xl bg-slate-950 px-3 py-2 text-white"
            required
          />
        </label>

        <label className="flex items-center gap-2 text-sm text-slate-300">
          <input
            type="checkbox"
            checked={form.isActive}
            onChange={(event) => setForm({ ...form, isActive: event.target.checked })}
            className="rounded"
          />
          Đang bật
        </label>

        <button
          type="submit"
          disabled={busy}
          className="rounded-xl bg-sky-500 px-4 py-2 font-semibold text-white disabled:opacity-50"
        >
          {busy ? 'Đang lưu...' : editingId ? 'Cập nhật voucher' : 'Tạo voucher'}
        </button>
      </form>

      <div className="grid gap-3">
        {items.length === 0 ? (
          <p className="text-sm text-slate-400">Chưa có voucher nào.</p>
        ) : (
          items.map((item) => (
            <div
              key={item.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 p-4 text-sm text-slate-300"
            >
              <div className="min-w-[120px]">
                <b className="text-white">{item.code}</b>
                <p className="mt-1 text-xs text-slate-500">
                  {item.isActive ? 'Đang bật' : 'Đã tắt'} · Đã dùng {item.usedCount}
                  {item.usageLimit != null ? `/${item.usageLimit}` : ''}
                </p>
              </div>
              <span>
                {item.discountType === 'PERCENT'
                  ? `${item.discountValue}%`
                  : `${Number(item.discountValue).toLocaleString('vi-VN')} đ`}
              </span>
              <span className="text-xs text-slate-400">
                Min {Number(item.minOrderAmount).toLocaleString('vi-VN')} đ
              </span>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => startEdit(item)}
                  className="rounded-lg border border-sky-400/40 px-3 py-1.5 text-sky-300 hover:bg-sky-500/10"
                >
                  Sửa
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void toggleActive(item)}
                  className="rounded-lg border border-white/20 px-3 py-1.5 text-slate-300 hover:bg-white/5"
                >
                  {item.isActive ? 'Tắt' : 'Bật'}
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void remove(item.id, item.code)}
                  className="rounded-lg border border-rose-400/40 px-3 py-1.5 text-rose-300 hover:bg-rose-500/10"
                >
                  Xóa
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export function ComboManagement() {
  const emptyForm = {
    name: '',
    description: '',
    price: '79000',
    stock: '50',
    isActive: true,
  };

  const [items, setItems] = useState<Combo[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    const res = await fetch('/api/admin/combos');
    const data = await res.json();
    setItems(Array.isArray(data) ? data : []);
  };

  useEffect(() => {
    void load();
  }, []);

  const resetForm = () => {
    setForm(emptyForm);
    setEditingId(null);
  };

  const startEdit = (item: Combo) => {
    setEditingId(item.id);
    setForm({
      name: item.name,
      description: item.description ?? '',
      price: String(item.price),
      stock: String(item.stock),
      isActive: item.isActive,
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    try {
      const payload = {
        ...(editingId ? { id: editingId } : {}),
        name: form.name,
        description: form.description,
        price: Number(form.price),
        stock: Number(form.stock),
        isActive: form.isActive,
      };
      const res = await fetch('/api/admin/combos', {
        method: editingId ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        alert(err.message || 'Không thể lưu combo.');
        return;
      }
      resetForm();
      await load();
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id: string, name: string) => {
    if (!confirm(`Xóa / tắt combo "${name}"?`)) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/combos?id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        alert(data.message || 'Không thể xóa combo.');
        return;
      }
      if (data.softDeleted) {
        alert(data.message || 'Combo đã dùng trong đơn — đã tắt thay vì xóa.');
      }
      if (editingId === id) resetForm();
      await load();
    } finally {
      setBusy(false);
    }
  };

  const toggleActive = async (item: Combo) => {
    setBusy(true);
    try {
      const res = await fetch('/api/admin/combos', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: item.id, isActive: !item.isActive }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        alert(err.message || 'Không thể cập nhật trạng thái.');
        return;
      }
      await load();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <form
        onSubmit={submit}
        className="grid gap-3 rounded-2xl border border-white/10 bg-white/5 p-4 md:grid-cols-2 lg:grid-cols-5"
      >
        <div className="lg:col-span-5 flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-semibold text-white">
            {editingId ? 'Chỉnh sửa combo' : 'Thêm combo mới'}
          </p>
          {editingId ? (
            <button
              type="button"
              onClick={resetForm}
              className="rounded-lg border border-white/20 px-3 py-1 text-sm text-slate-300 hover:bg-white/5"
            >
              Hủy chỉnh sửa
            </button>
          ) : null}
        </div>

        <input
          required
          placeholder="Tên combo"
          value={form.name}
          onChange={(event) => setForm({ ...form, name: event.target.value })}
          className="rounded-xl bg-slate-950 px-3 py-2 text-white"
        />
        <input
          placeholder="Mô tả"
          value={form.description}
          onChange={(event) => setForm({ ...form, description: event.target.value })}
          className="rounded-xl bg-slate-950 px-3 py-2 text-white"
        />
        <input
          type="number"
          min={0}
          required
          placeholder="Giá (đ)"
          value={form.price}
          onChange={(event) => setForm({ ...form, price: event.target.value })}
          className="rounded-xl bg-slate-950 px-3 py-2 text-white"
        />
        <input
          type="number"
          min={0}
          required
          placeholder="Số lượng tồn"
          value={form.stock}
          onChange={(event) => setForm({ ...form, stock: event.target.value })}
          className="rounded-xl bg-slate-950 px-3 py-2 text-white"
        />
        <label className="flex items-center gap-2 text-sm text-slate-300">
          <input
            type="checkbox"
            checked={form.isActive}
            onChange={(event) => setForm({ ...form, isActive: event.target.checked })}
            className="rounded"
          />
          Đang bán
        </label>
        <button
          type="submit"
          disabled={busy}
          className="rounded-xl bg-sky-500 px-4 py-2 font-semibold text-white disabled:opacity-50 lg:col-span-5"
        >
          {busy ? 'Đang lưu...' : editingId ? 'Cập nhật combo' : 'Thêm combo'}
        </button>
      </form>

      <div className="grid gap-3">
        {items.length === 0 ? (
          <p className="text-sm text-slate-400">Chưa có combo nào.</p>
        ) : (
          items.map((item) => (
            <div
              key={item.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 p-4 text-slate-300"
            >
              <div className="min-w-[100px]">
                <span className="font-semibold text-white">{item.name}</span>
                {item.description ? (
                  <p className="mt-1 text-xs text-slate-500">{item.description}</p>
                ) : null}
                <p className="mt-1 text-xs text-slate-500">
                  {item.isActive ? 'Đang bán' : 'Đã tắt'} · Tồn: {item.stock}
                </p>
              </div>
              <span>{Number(item.price).toLocaleString('vi-VN')} đ</span>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => startEdit(item)}
                  className="rounded-lg border border-sky-400/40 px-3 py-1.5 text-sm text-sky-300 hover:bg-sky-500/10"
                >
                  Sửa
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void toggleActive(item)}
                  className="rounded-lg border border-white/20 px-3 py-1.5 text-sm text-slate-300 hover:bg-white/5"
                >
                  {item.isActive ? 'Tắt' : 'Bật'}
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void remove(item.id, item.name)}
                  className="rounded-lg border border-rose-400/40 px-3 py-1.5 text-sm text-rose-300 hover:bg-rose-500/10"
                >
                  Xóa
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
