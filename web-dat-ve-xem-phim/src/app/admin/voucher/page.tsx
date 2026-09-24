import { VoucherManagement } from '@/components/admin/commerce-management';

export default function AdminVoucherPage() {
  return <section className="rounded-[28px] border border-white/10 bg-slate-950/70 p-6 shadow-glow"><h1 className="text-2xl font-bold text-white">Voucher / khuyến mãi</h1><p className="mt-2 text-sm text-slate-400">Tạo mã giảm giá theo phần trăm hoặc số tiền, giới hạn lượt dùng và thời gian.</p><div className="mt-6"><VoucherManagement /></div></section>;
}
