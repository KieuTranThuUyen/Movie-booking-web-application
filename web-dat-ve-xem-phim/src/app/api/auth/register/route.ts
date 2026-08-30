import { hash } from 'bcryptjs';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';

export async function POST(request: Request) {
  const body = (await request.json()) as {
    name?: string;
    email?: string;
    phone?: string;
    password?: string;
    confirmPassword?: string;
  };

  if (!body.name || !body.email || !body.phone || !body.password || !body.confirmPassword) {
    return NextResponse.json({ message: 'Vui lòng điền đầy đủ thông tin.' }, { status: 400 });
  }

  if (body.password !== body.confirmPassword) {
    return NextResponse.json({ message: 'Mật khẩu và xác nhận mật khẩu không khớp.' }, { status: 400 });
  }

  const existingUser = await prisma.user.findFirst({
    where: {
      OR: [{ email: body.email }, { phone: body.phone }]
    }
  });

  if (existingUser) {
    return NextResponse.json({ message: 'Email hoặc số điện thoại đã được sử dụng.' }, { status: 409 });
  }

  const hashedPassword = await hash(body.password, 10);

  await prisma.user.create({
    data: {
      name: body.name,
      email: body.email,
      phone: body.phone,
      password: hashedPassword
    }
  });

  return NextResponse.json({ message: 'Tạo tài khoản thành công.', redirectTo: '/dang-nhap' });
}