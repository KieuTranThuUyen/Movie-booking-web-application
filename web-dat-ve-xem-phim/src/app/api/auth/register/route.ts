import { NextResponse } from 'next/server';

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

  return NextResponse.json({ message: 'Tạo tài khoản thành công.', redirectTo: '/dang-nhap' });
}