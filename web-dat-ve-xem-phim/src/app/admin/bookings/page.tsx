import { BookingManagementForm } from '@/components/forms/booking-management-form';

export default function AdminBookingsPage() {
  return (
    <section className="rounded-[28px] border border-white/10 bg-slate-950/70 p-6 shadow-glow backdrop-blur-xl">
      <h2 className="text-xl font-semibold text-white">Quản lý đặt vé</h2>
      <div className="mt-6">
        <BookingManagementForm />
      </div>
    </section>
  );
}
