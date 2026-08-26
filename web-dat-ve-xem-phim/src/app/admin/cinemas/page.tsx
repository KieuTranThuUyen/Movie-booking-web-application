import { prisma } from '@/lib/prisma';
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
        Kéo thả ghế tự do, tạo lối đi/khoảng trống, đổi loại ghế, thêm/xóa/đổi tên
        ghế, chọn nhiều ghế và áp dụng mẫu bố cục.
      </p>
      <div className="mt-6">
        <CinemaManagementForm cinemas={cinemas} />
      </div>
    </section>
  );
}
