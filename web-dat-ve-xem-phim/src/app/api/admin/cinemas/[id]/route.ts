import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  const params = await context.params;
  const body = (await request.json()) as { name?: string; city?: string; address?: string };

  const cinema = await prisma.cinema.update({
    where: { id: params.id },
    data: {
      name: body.name,
      city: body.city,
      address: body.address
    }
  });

  return NextResponse.json({ message: 'Cập nhật rạp thành công.', cinema });
}

export async function DELETE(_request: Request, context: RouteContext) {
  const params = await context.params;

  try {
    await prisma.cinema.delete({ where: { id: params.id } });
  } catch {
    return NextResponse.json({ message: 'Không thể xóa rạp do đang có dữ liệu đặt vé liên quan.' }, { status: 400 });
  }

  return NextResponse.json({ message: 'Xóa rạp thành công.' });
}
