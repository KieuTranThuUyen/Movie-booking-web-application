import { TicketLookupForm } from '@/components/forms/ticket-lookup-form';

export default function AdminTicketLookupPage() {
  return (
    <section className="rounded-[28px] border border-white/10 bg-slate-950/70 p-6 shadow-glow backdrop-blur-xl">
      <h2 className="text-xl font-semibold text-white">Tra cứu & in vé</h2>
      <p className="mt-3 text-sm leading-7 text-slate-300">
        Nhập mã đơn hoặc số điện thoại khách để tìm nhanh và in vé tại quầy.
      </p>
      <div className="mt-6">
        <TicketLookupForm />
      </div>
    </section>
  );
}
