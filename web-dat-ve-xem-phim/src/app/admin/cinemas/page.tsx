import { prisma } from '@/lib/prisma';
import { CinemaManagementForm } from '@/components/forms/cinema-management-form';

export default async function AdminCinemasPage() {
  const cinemas = await prisma.cinema.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      halls: {
        include: {
          seats: true
        }
      }
    }
  });

  return (
    <section className="rounded-[28px] border border-white/10 bg-slate-950/70 p-6 shadow-glow backdrop-blur-xl">
      <h2 className="text-xl font-semibold text-white">Quản lý rạp chiếu và sơ đồ ghế</h2>
      <p className="mt-3 text-sm leading-7 text-slate-300">Tạo, chỉnh sửa, xóa rạp và phòng chiếu, đồng thời bật/tắt ghế theo từng phòng.</p>
      <div className="mt-6">
        <CinemaManagementForm cinemas={cinemas} />
      </div>
    </section>
  );
}
