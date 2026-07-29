import { compare } from 'bcryptjs';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: Request) {
  const body = (await request.json()) as { name?: string; password?: string };

  if (!body.name || !body.password) {
    return NextResponse.json({ message: 'Vui lòng nhập đầy đủ tên người dùng và mật khẩu.' }, { status: 400 });
  }

  const user = await prisma.user.findFirst({
    where: {
      OR: [{ email: body.name }, { phone: body.name }]
    }
  });

  if (!user) {
    return NextResponse.json({ message: 'Không tìm thấy tài khoản.' }, { status: 401 });
  }

  const passwordValid = await compare(body.password, user.password);

  if (!passwordValid) {
    return NextResponse.json({ message: 'Mật khẩu không đúng.' }, { status: 401 });
  }

  return NextResponse.json({
    message: 'Đăng nhập thành công.',
    redirectTo: '/tai-khoan',
    user: { id: user.id, name: user.name, email: user.email, role: user.role }
  });
}