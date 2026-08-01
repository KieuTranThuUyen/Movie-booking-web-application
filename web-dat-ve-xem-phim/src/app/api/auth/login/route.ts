import { NextResponse } from 'next/server';
import { findAuthenticatedUser } from '@/lib/auth';

export async function POST(request: Request) {
  const body = (await request.json()) as { name?: string; password?: string };

  if (!body.name || !body.password) {
    return NextResponse.json({ message: 'Vui lòng nhập đầy đủ tên người dùng và mật khẩu.' }, { status: 400 });
  }

  const user = await findAuthenticatedUser(body.name, body.password);

  if (!user) {
    return NextResponse.json({ message: 'Không tìm thấy tài khoản.' }, { status: 401 });
  }

  return NextResponse.json({
    message: 'Đăng nhập thành công.',
    redirectTo: '/tai-khoan',
    user: { id: user.id, name: user.name, email: user.email, role: user.role }
  });
}