import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  const params = await context.params;
  const body = (await request.json()) as { name?: string; capacity?: number };

  const hall = await prisma.hall.update({
    where: { id: params.id },
    data: {
      name: body.name,
      capacity: body.capacity !== undefined ? Number(body.capacity) : undefined
    }
  });

  return NextResponse.json({ message: 'Cập nhật phòng chiếu thành công.', hall });
}

export async function DELETE(_request: Request, context: RouteContext) {
  const params = await context.params;

  try {
    await prisma.hall.delete({ where: { id: params.id } });
  } catch {
    return NextResponse.json({ message: 'Không thể xóa phòng do đang có dữ liệu đặt vé liên quan.' }, { status: 400 });
  }

  return NextResponse.json({ message: 'Xóa phòng chiếu thành công.' });
}
