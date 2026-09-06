import { BookingManagementForm } from '@/components/forms/booking-management-form';

export default function AdminBookingsPage() {
  return (
    <section className="rounded-[28px] border border-white/10 bg-slate-950/70 p-6 shadow-glow backdrop-blur-xl">
      <h2 className="text-xl font-semibold text-white">Quản lý đặt vé</h2>
      <p className="mt-3 text-sm leading-7 text-slate-300">
        Danh sách đơn gọn: mã đơn, khách, suất chiếu, trạng thái. Bấm &quot;Xem chi tiết&quot; để hủy vé/đơn. Tra cứu in vé nhanh tại mục Tra cứu &amp; in vé.
      </p>
      <div className="mt-6">
        <BookingManagementForm />
      </div>
    </section>
  );
}
