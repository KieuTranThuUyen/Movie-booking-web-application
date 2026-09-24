import { TicketQrCheckin } from '@/components/admin/ticket-qr-checkin';

export default function AdminQrCheckinPage() {
  return (
    <section className="rounded-[28px] border border-white/10 bg-slate-950/70 p-6 shadow-glow">
      <p className="text-sm uppercase tracking-[0.3em] text-sky-300">Vé điện tử</p>
      <h1 className="mt-2 text-3xl font-bold text-white">Quét QR check-in</h1>
      <p className="mt-3 text-sm text-slate-400">Chỉ admin được xác nhận vé vào rạp. Mỗi vé chỉ check-in thành công một lần.</p>
      <div className="mt-8">
        <TicketQrCheckin />
      </div>
    </section>
  );
}