import { NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';

import { prisma } from '@/lib/db/prisma';

async function isAdmin(request: Request) {
  const token = await getToken({
    req: request as never,
    secret: process.env.NEXTAUTH_SECRET,
  });

  return token?.role === 'ADMIN';
}

export async function GET(request: Request) {
  if (!(await isAdmin(request))) {
    return NextResponse.json(
      { message: 'Bạn không có quyền thực hiện thao tác này.' },
      { status: 403 },
    );
  }

  try {
    const cinemas = await prisma.cinema.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        halls: {
          include: {
            seats: true,
          },
        },
      },
    });

    return NextResponse.json(cinemas);
  } catch {
    return NextResponse.json(
      { message: 'Không thể tải danh sách rạp.' },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  if (!(await isAdmin(request))) {
    return NextResponse.json(
      { message: 'Bạn không có quyền thực hiện thao tác này.' },
      { status: 403 },
    );
  }

  try {
    const body = (await request.json()) as {
      name?: string;
      city?: string;
      address?: string;
    };

    const name = body.name?.trim();
    const city = body.city?.trim();
    const address = body.address?.trim();

    if (!name || !city || !address) {
      return NextResponse.json(
        { message: 'Vui lòng nhập đầy đủ thông tin rạp.' },
        { status: 400 },
      );
    }

    const cinema = await prisma.cinema.create({
      data: {
        name,
        city,
        address,
      },
    });

    return NextResponse.json(
      {
        message: 'Tạo rạp chiếu thành công.',
        cinema,
      },
      { status: 201 },
    );
  } catch {
    return NextResponse.json(
      { message: 'Không thể tạo rạp chiếu.' },
      { status: 500 },
    );
  }
}