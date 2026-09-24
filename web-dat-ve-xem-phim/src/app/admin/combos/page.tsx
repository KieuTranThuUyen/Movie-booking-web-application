import { ComboManagement } from '@/components/admin/commerce-management';

export default function AdminCombosPage() {
  return <section className="rounded-[28px] border border-white/10 bg-slate-950/70 p-6 shadow-glow"><h1 className="text-2xl font-bold text-white">Combo bắp nước</h1><p className="mt-2 text-sm text-slate-400">Quản lý giá và tồn kho combo bán cùng vé phim.</p><div className="mt-6"><ComboManagement /></div></section>;
}
