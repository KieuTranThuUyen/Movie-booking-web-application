import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

export async function GET() {
  const users = await prisma.user.findMany({
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      role: true,
      createdAt: true
    }
  });

  return NextResponse.json(users);
}

export async function POST(request: Request) {
  const body = (await request.json()) as { name?: string; email?: string; password?: string; phone?: string; role?: string };

  if (!body.name || !body.email || !body.password) {
    return NextResponse.json({ message: 'Vui lòng cung cấp tên, email và mật khẩu.' }, { status: 400 });
  }

  const hashed = await bcrypt.hash(body.password, 10);

  const user = await prisma.user.create({
    data: {
      name: body.name,
      email: body.email,
      password: hashed,
      phone: body.phone || null,
      role: body.role === 'ADMIN' ? 'ADMIN' : 'CUSTOMER'
    },
    select: { id: true, name: true, email: true, phone: true, role: true, createdAt: true }
  });

  return NextResponse.json({ message: 'Tạo người dùng thành công.', user });
}
