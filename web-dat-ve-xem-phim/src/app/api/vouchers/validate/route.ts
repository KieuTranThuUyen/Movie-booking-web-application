import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';

import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db/prisma';

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ message: 'Bạn cần đăng nhập.' }, { status: 401 });
  }

  try {
    const body = (await request.json()) as { code?: string; amount?: number };
    const code = body.code?.trim().toUpperCase();
    const amount = Number(body.amount ?? 0);
    if (!code || !Number.isFinite(amount) || amount < 0) {
      return NextResponse.json({ message: 'Mã voucher hoặc giá trị đơn không hợp lệ.' }, { status: 400 });
    }

    const voucher = await prisma.voucher.findUnique({
      where: { code },
      include: { redemptions: { where: { userId: session.user.id }, select: { id: true } } },
    });
    const now = new Date();
    if (!voucher || !voucher.isActive || now < voucher.startsAt || now > voucher.endsAt) {
      return NextResponse.json({ message: 'Voucher không tồn tại hoặc đã hết hạn.' }, { status: 400 });
    }
    if (amount < voucher.minOrderAmount) {
      return NextResponse.json({ message: `Đơn tối thiểu ${voucher.minOrderAmount.toLocaleString('vi-VN')} đ.` }, { status: 400 });
    }
    if (voucher.usageLimit !== null && voucher.usedCount >= voucher.usageLimit) {
      return NextResponse.json({ message: 'Voucher đã hết lượt sử dụng.' }, { status: 400 });
    }
    if (voucher.redemptions.length >= voucher.perUserLimit) {
      return NextResponse.json({ message: 'Bạn đã dùng hết lượt voucher này.' }, { status: 400 });
    }

    const discount = voucher.discountType === 'PERCENT'
      ? Math.min(amount, Math.floor(amount * voucher.discountValue / 100))
      : Math.min(amount, voucher.discountValue);
    return NextResponse.json({
      voucher: { code: voucher.code, discountType: voucher.discountType, discountValue: voucher.discountValue },
      discount,
      total: amount - discount,
    });
  } catch (error) {
    console.error('[POST /api/vouchers/validate]', error);
    return NextResponse.json({ message: 'Không thể kiểm tra voucher.' }, { status: 500 });
  }
}
