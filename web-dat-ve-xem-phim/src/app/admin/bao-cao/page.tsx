import { ReportsPreview } from '@/components/admin/reports-preview';

export default function AdminReportsPage() {
  return <section className="rounded-[28px] border border-white/10 bg-slate-950/70 p-6 shadow-glow"><h1 className="text-2xl font-bold text-white">Báo cáo / Export</h1><p className="mt-2 text-sm text-slate-400">Xem preview báo cáo và xuất dữ liệu booking sang Excel hoặc CSV.</p><div className="mt-6"><ReportsPreview /></div></section>;
}
