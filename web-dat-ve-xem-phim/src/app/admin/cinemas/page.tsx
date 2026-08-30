import { prisma } from '@/lib/db/prisma';
import { CinemaManagementForm } from '@/components/forms/cinema-management-form';

export default async function AdminCinemasPage() {
  const cinemas = await prisma.cinema.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      halls: {
        orderBy: { name: 'asc' },
        include: {
          seats: {
            orderBy: [{ positionY: 'asc' }, { positionX: 'asc' }],
          },
          layoutBlocks: {
            orderBy: [{ y: 'asc' }, { x: 'asc' }],
          },
        },
      },
    },
  });

  return (
    <section className="rounded-[28px] border border-white/10 bg-slate-950/70 p-6 shadow-glow backdrop-blur-xl">
      <h2 className="text-xl font-semibold text-white">
        Quản lý rạp chiếu và sơ đồ ghế
      </h2>
      <p className="mt-3 text-sm leading-7 text-slate-300">
        Tạo ghế theo số lượng Standard / VIP / Couple. Kéo thả, khóa ghế, đổi loại
        (không khóa/đổi loại khi đã có người đặt vé). Xóa phòng/rạp khi còn suất
        chiếu sẽ bị chặn và hiện thông báo. Sơ đồ thu nhỏ tỉ lệ để thấy toàn cảnh.
      </p>
      <div className="mt-6">
        <CinemaManagementForm cinemas={cinemas} />
      </div>
    </section>
  );
}
