const stats = [
  { label: 'Phim', value: 18 },
  { label: 'Suất chiếu hôm nay', value: 42 },
  { label: 'Đơn đặt', value: 256 },
  { label: 'Người dùng', value: 1480 }
];

export default function AdminPage() {
  return (
    <main className="page-shell py-12 lg:py-16">
      <div className="space-y-3">
        <p className="text-sm uppercase tracking-[0.35em] text-sky-300/80">Admin</p>
        <h1 className="text-4xl font-bold text-white">Bảng điều khiển quản trị</h1>
      </div>

      <div className="mt-10 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => (
          <div key={stat.label} className="rounded-[24px] border border-white/10 bg-white/5 p-5 shadow-glow">
            <div className="text-sm text-slate-400">{stat.label}</div>
            <div className="mt-2 text-3xl font-semibold text-white">{stat.value}</div>
          </div>
        ))}
      </div>

      <div className="mt-10 grid gap-6 lg:grid-cols-2">
        <section className="rounded-[28px] border border-white/10 bg-slate-950/70 p-6 shadow-glow backdrop-blur-xl">
          <h2 className="text-xl font-semibold text-white">Quản lý phim</h2>
          <p className="mt-3 text-sm leading-7 text-slate-300">
            Thêm, sửa, xóa phim; cập nhật poster, trailer, thể loại, thời lượng và trạng thái đang chiếu / sắp chiếu.
          </p>
        </section>
        <section className="rounded-[28px] border border-white/10 bg-slate-950/70 p-6 shadow-glow backdrop-blur-xl">
          <h2 className="text-xl font-semibold text-white">Quản lý đặt vé</h2>
          <p className="mt-3 text-sm leading-7 text-slate-300">
            Theo dõi booking, ghế đã bán, tình trạng thanh toán, xử lý hủy vé và xác nhận đơn.
          </p>
        </section>
      </div>
    </main>
  );
}