import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  const params = await context.params;
  const body = (await request.json()) as { name?: string; email?: string; password?: string; phone?: string; role?: string };

  const data: any = {};

  if (body.name !== undefined) data.name = body.name;
  if (body.email !== undefined) data.email = body.email;
  if (body.phone !== undefined) data.phone = body.phone;
  if (body.role !== undefined) data.role = body.role;
  if (body.password) {
    data.password = await bcrypt.hash(body.password, 10);
  }

  const user = await prisma.user.update({
    where: { id: params.id },
    data,
    select: { id: true, name: true, email: true, phone: true, role: true, createdAt: true }
  });

  return NextResponse.json({ message: 'Cập nhật người dùng thành công.', user });
}

export async function DELETE(_request: Request, context: RouteContext) {
  const params = await context.params;

  await prisma.user.delete({ where: { id: params.id } });

  return NextResponse.json({ message: 'Xóa người dùng thành công.' });
}
