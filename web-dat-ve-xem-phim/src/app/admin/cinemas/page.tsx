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
      <div className="mt-6">
        <CinemaManagementForm cinemas={cinemas} />
      </div>
    </section>
  );
}
