import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const body = (await request.json()) as Record<string, string | number | undefined>;
  const requiredFields = ['fullName', 'phone', 'email', 'address', 'city', 'district', 'paymentMethod'] as const;
  const missingField = requiredFields.find((field) => !body[field]);

  if (missingField) {
    return NextResponse.json({ message: 'Vui lòng hoàn tất thông tin thanh toán.' }, { status: 400 });
  }

  return NextResponse.json({
    message: 'Tạo đơn đặt vé thành công.',
    redirectTo: '/don-hang'
  });
}