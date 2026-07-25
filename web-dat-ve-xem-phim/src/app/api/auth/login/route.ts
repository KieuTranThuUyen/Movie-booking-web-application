import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const body = (await request.json()) as { name?: string; password?: string };

  if (!body.name || !body.password) {
    return NextResponse.json({ message: 'Vui lòng nhập đầy đủ tên người dùng và mật khẩu.' }, { status: 400 });
  }

  return NextResponse.json({ message: 'Đăng nhập thành công.', redirectTo: '/tai-khoan' });
}