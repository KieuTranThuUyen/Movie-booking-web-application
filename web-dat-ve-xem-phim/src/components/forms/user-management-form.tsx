'use client';

import { useEffect, useState } from 'react';

type UserItem = {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  role: 'CUSTOMER' | 'ADMIN';
  createdAt: string;
};

export function UserManagementForm() {
  const [users, setUsers] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const fetchUsers = async () => {
    const res = await fetch('/api/admin/users');
    const data = (await res.json()) as UserItem[];
    setUsers(data);
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleSave = async (user: UserItem) => {
    setLoading(true);
    setMessage('');

    const res = await fetch(`/api/admin/users/${user.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: user.name, phone: user.phone, role: user.role })
    });

    const data = await res.json();
    setLoading(false);
    setMessage(data.message ?? 'Đã lưu.');
    if (res.ok) fetchUsers();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Xác nhận xóa người dùng này?')) return;
    setLoading(true);
    const res = await fetch(`/api/admin/users/${id}`, { method: 'DELETE' });
    const data = await res.json();
    setLoading(false);
    setMessage(data.message ?? 'Đã xóa.');
    if (res.ok) setUsers((s) => s.filter((u) => u.id !== id));
  };

  return (
    <div className="rounded-[28px] border border-white/10 bg-white/5 p-4">
      <div className="text-sm font-semibold text-white">Danh sách người dùng</div>
      <div className="mt-4 max-h-[480px] space-y-2 overflow-auto pr-1">
        {users.length === 0 ? (
          <div className="text-sm text-slate-400">Không có người dùng nào.</div>
        ) : (
          users.map((user) => (
            <div key={user.id} className="flex items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-sm text-slate-200">
              <div className="flex-1">
                <div className="font-semibold text-white">{user.name}</div>
                <div className="mt-1 text-slate-400">{user.email} {user.phone ? `· ${user.phone}` : ''}</div>
              </div>
              <div className="flex items-center gap-2">
                <select value={user.role} onChange={(e) => setUsers((cur) => cur.map((u) => (u.id === user.id ? { ...u, role: e.target.value as any } : u)))} className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none">
                  <option value="CUSTOMER">Customer</option>
                  <option value="ADMIN">Admin</option>
                </select>
                <button onClick={() => handleSave(user)} disabled={loading} className="rounded-2xl bg-white px-3 py-2 text-sm font-semibold text-slate-950 disabled:opacity-60">
                  Lưu
                </button>
                <button onClick={() => handleDelete(user.id)} disabled={loading} className="rounded-2xl border border-rose-400/40 px-3 py-2 text-sm font-semibold text-rose-200 disabled:opacity-50">
                  Xóa
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {message ? <p className="mt-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-200">{message}</p> : null}
    </div>
  );
}
