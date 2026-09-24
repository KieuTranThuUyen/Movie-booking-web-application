import { NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import type { NextRequest } from 'next/server';
import { prisma } from '@/lib/db/prisma';

async function admin(request: Request) {
  const token = await getToken({ req: request as NextRequest, secret: process.env.NEXTAUTH_SECRET });
  return token?.role === 'ADMIN';
}

export async function GET(request: Request) {
  if (!(await admin(request))) return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
  return NextResponse.json(await prisma.voucher.findMany({ orderBy: { createdAt: 'desc' } }));
}

export async function POST(request: Request) {
  if (!(await admin(request))) return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
  try {
    const body = await request.json() as Record<string, unknown>;
    const voucher = await prisma.voucher.create({ data: {
      code: String(body.code ?? '').trim().toUpperCase(),
      discountType: body.discountType === 'PERCENT' ? 'PERCENT' : 'FIXED',
      discountValue: Number(body.discountValue ?? 0),
      minOrderAmount: Number(body.minOrderAmount ?? 0),
      usageLimit: body.usageLimit === '' || body.usageLimit == null ? null : Number(body.usageLimit),
      perUserLimit: Number(body.perUserLimit ?? 1),
      startsAt: new Date(String(body.startsAt)),
      endsAt: new Date(String(body.endsAt)),
    } });
    return NextResponse.json(voucher, { status: 201 });
  } catch (error) {
    return NextResponse.json({ message: 'Không thể tạo voucher.', error: String(error) }, { status: 400 });
  }
}
