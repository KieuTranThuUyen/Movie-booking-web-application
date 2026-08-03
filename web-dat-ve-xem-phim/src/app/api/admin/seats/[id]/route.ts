import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  const params = await context.params;
  const body = (await request.json()) as { isActive?: boolean; type?: string };

  const seat = await prisma.seat.update({
    where: { id: params.id },
    data: {
      isActive: body.isActive,
      type: body.type
    }
  });

  return NextResponse.json({ message: 'Cập nhật ghế thành công.', seat });
}
