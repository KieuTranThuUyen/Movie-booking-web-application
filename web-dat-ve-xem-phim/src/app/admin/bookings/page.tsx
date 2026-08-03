import { BookingManagementForm } from '@/components/forms/booking-management-form';

export default function AdminBookingsPage() {
  return (
    <section className="rounded-[28px] border border-white/10 bg-slate-950/70 p-6 shadow-glow backdrop-blur-xl">
      <h2 className="text-xl font-semibold text-white">Quản lý đặt vé</h2>
      <p className="mt-3 text-sm leading-7 text-slate-300">Theo dõi booking, ghế đã bán, trạng thái thanh toán và cập nhật tình trạng đơn.</p>
      <div className="mt-6">
        <BookingManagementForm />
      </div>
    </section>
  );
}
