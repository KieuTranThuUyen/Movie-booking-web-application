export function SiteFooter() {
  return (
    <footer className="mt-20 border-t border-white/10 bg-slate-950/90">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 text-sm text-slate-400 sm:px-6 lg:grid-cols-3 lg:px-8">
        <div>
          <div className="text-lg font-semibold text-white">DatVeXemPhim</div>
          <p className="mt-3 max-w-sm leading-7">
            Hệ thống đặt vé xem phim trực tuyến với luồng chọn phim, chọn ghế, đặt vé và thanh toán nhanh gọn.
          </p>
        </div>
        <div>
          <div className="text-base font-semibold text-white">Chức năng chính</div>
          <ul className="mt-3 space-y-2 leading-7">
            <li>Phim đang chiếu và sắp chiếu</li>
            <li>Chọn rạp, suất chiếu, ghế ngồi</li>
            <li>Quản lý tài khoản và lịch sử đặt vé</li>
          </ul>
        </div>
        <div>
          <div className="text-base font-semibold text-white">Công nghệ</div>
          <ul className="mt-3 space-y-2 leading-7">
            <li>Next.js + TypeScript</li>
            <li>PostgreSQL + Prisma</li>
            <li>Docker + Docker Compose</li>
          </ul>
        </div>
      </div>
    </footer>
  );
}