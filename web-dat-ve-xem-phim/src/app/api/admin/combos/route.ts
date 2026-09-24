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
  return NextResponse.json(await prisma.combo.findMany({ orderBy: { createdAt: 'desc' } }));
}

export async function POST(request: Request) {
  if (!(await admin(request))) return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
  try {
    const body = await request.json() as Record<string, unknown>;
    const combo = await prisma.combo.create({ data: {
      name: String(body.name ?? '').trim(),
      description: String(body.description ?? '').trim() || null,
      price: Number(body.price ?? 0),
      stock: Number(body.stock ?? 0),
    } });
    return NextResponse.json(combo, { status: 201 });
  } catch (error) {
    return NextResponse.json({ message: 'Không thể tạo combo.', error: String(error) }, { status: 400 });
  }
}
