'use client';

import { useEffect, useState } from 'react';

type ReportRow = {
  'Mã đơn': string;
  'Ngày tạo': string;
  Phim: string;
  Rạp: string;
  Trạng_thái: string;
  Thanh_toán: string;
  'Số vé': number;
  'Doanh thu': number;
  'Đã hoàn': number;
};

type ReportResponse = {
  rows: ReportRow[];
  summary: { bookings: number; tickets: number; revenue: number; canceled: number };
};

const money = (value: number) => `${value.toLocaleString('vi-VN')} đ`;

export function ReportsPreview() {
  const [filters, setFilters] = useState({ from: '', to: '' });
  const [data, setData] = useState<ReportResponse>({ rows: [], summary: { bookings: 0, tickets: 0, revenue: 0, canceled: 0 } });
  const [loading, setLoading] = useState(false);

  const query = new URLSearchParams({ format: 'json' });
  if (filters.from) query.set('from', filters.from);
  if (filters.to) query.set('to', filters.to);

  const load = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/admin/reports/bookings?${query.toString()}`, { cache: 'no-store' });
      if (response.ok) setData((await response.json()) as ReportResponse);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  const exportFile = (format: 'xlsx' | 'csv') => {
    const exportQuery = new URLSearchParams(query);
    exportQuery.set('format', format);
    window.location.href = `/api/admin/reports/bookings?${exportQuery.toString()}`;
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-4 rounded-2xl border border-white/10 bg-white/5 p-5 sm:grid-cols-2 lg:grid-cols-4">
        <label className="text-sm text-slate-300">Từ ngày<input type="date" value={filters.from} onChange={(event) => setFilters({ ...filters, from: event.target.value })} className="mt-2 w-full rounded-xl bg-slate-950 px-3 py-2 text-white" /></label>
        <label className="text-sm text-slate-300">Đến ngày<input type="date" value={filters.to} onChange={(event) => setFilters({ ...filters, to: event.target.value })} className="mt-2 w-full rounded-xl bg-slate-950 px-3 py-2 text-white" /></label>
        <button type="button" onClick={() => void load()} className="self-end rounded-xl bg-sky-500 px-4 py-2.5 font-semibold text-white">{loading ? 'Đang tải...' : 'Xem báo cáo'}</button>
        <div className="flex gap-2 self-end"><button type="button" onClick={() => exportFile('xlsx')} className="flex-1 rounded-xl bg-emerald-500 px-3 py-2.5 text-sm font-semibold text-slate-950">Excel</button><button type="button" onClick={() => exportFile('csv')} className="flex-1 rounded-xl border border-white/10 px-3 py-2.5 text-sm text-slate-200">CSV</button></div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {([['Tổng booking', data.summary.bookings.toLocaleString('vi-VN')], ['Tổng vé', data.summary.tickets.toLocaleString('vi-VN')], ['Doanh thu', money(data.summary.revenue)], ['Đơn hủy', data.summary.canceled.toLocaleString('vi-VN')]] as const).map(([label, value]) => <div key={label} className="rounded-2xl border border-white/10 bg-slate-950/60 p-4"><p className="text-sm text-slate-500">{label}</p><p className="mt-2 text-xl font-bold text-white">{value}</p></div>)}
      </div>

      <div className="overflow-x-auto rounded-2xl border border-white/10"><table className="w-full min-w-[900px] text-left text-sm"><thead className="bg-white/5 text-slate-400"><tr>{['Mã đơn', 'Ngày tạo', 'Phim', 'Rạp', 'Trạng thái', 'Thanh toán', 'Số vé', 'Doanh thu', 'Đã hoàn'].map((heading) => <th key={heading} className="px-4 py-3 font-medium">{heading}</th>)}</tr></thead><tbody>{data.rows.map((row) => <tr key={row['Mã đơn']} className="border-t border-white/10 text-slate-300"><td className="px-4 py-3 font-semibold text-white">{row['Mã đơn']}</td><td className="px-4 py-3">{new Date(row['Ngày tạo']).toLocaleString('vi-VN')}</td><td className="px-4 py-3">{row.Phim}</td><td className="px-4 py-3">{row.Rạp}</td><td className="px-4 py-3">{row.Trạng_thái}</td><td className="px-4 py-3">{row.Thanh_toán}</td><td className="px-4 py-3">{row['Số vé']}</td><td className="px-4 py-3">{money(row['Doanh thu'])}</td><td className="px-4 py-3">{money(row['Đã hoàn'])}</td></tr>)}</tbody></table>{data.rows.length === 0 ? <p className="p-8 text-center text-sm text-slate-500">Không có dữ liệu trong khoảng lọc.</p> : null}</div>
    </div>
  );
}
