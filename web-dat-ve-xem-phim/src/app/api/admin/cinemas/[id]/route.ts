import { NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';

import { prisma } from '@/lib/prisma';

type RouteContext = {
  params: Promise<{ id: string }>;
};

async function isAdmin(request: Request) {
  const token = await getToken({
    req: request as never,
    secret: process.env.NEXTAUTH_SECRET,
  });

  return token?.role === 'ADMIN';
}

export async function PATCH(
  request: Request,
  context: RouteContext,
) {
  if (!(await isAdmin(request))) {
    return NextResponse.json(
      { message: 'Bạn không có quyền thực hiện thao tác này.' },
      { status: 403 },
    );
  }

  try {
    const { id } = await context.params;

    if (!id) {
      return NextResponse.json(
        { message: 'ID rạp không hợp lệ.' },
        { status: 400 },
      );
    }

    const body = (await request.json()) as {
      name?: string;
      city?: string;
      address?: string;
    };

    const existingCinema = await prisma.cinema.findUnique({
      where: { id },
    });

    if (!existingCinema) {
      return NextResponse.json(
        { message: 'Không tìm thấy rạp.' },
        { status: 404 },
      );
    }

    const name =
      body.name !== undefined
        ? body.name.trim()
        : undefined;

    const city =
      body.city !== undefined
        ? body.city.trim()
        : undefined;

    const address =
      body.address !== undefined
        ? body.address.trim()
        : undefined;

    if (
      body.name !== undefined &&
      !name
    ) {
      return NextResponse.json(
        { message: 'Tên rạp không được để trống.' },
        { status: 400 },
      );
    }

    if (
      body.city !== undefined &&
      !city
    ) {
      return NextResponse.json(
        { message: 'Thành phố không được để trống.' },
        { status: 400 },
      );
    }

    if (
      body.address !== undefined &&
      !address
    ) {
      return NextResponse.json(
        { message: 'Địa chỉ không được để trống.' },
        { status: 400 },
      );
    }

    const cinema = await prisma.cinema.update({
      where: { id },
      data: {
        name,
        city,
        address,
      },
    });

    return NextResponse.json({
      message: 'Cập nhật rạp thành công.',
      cinema,
    });
  } catch {
    return NextResponse.json(
      { message: 'Không thể cập nhật rạp.' },
      { status: 500 },
    );
  }
}

export async function DELETE(
  request: Request,
  context: RouteContext,
) {
  if (!(await isAdmin(request))) {
    return NextResponse.json(
      { message: 'Bạn không có quyền thực hiện thao tác này.' },
      { status: 403 },
    );
  }

  try {
    const { id } = await context.params;

    if (!id) {
      return NextResponse.json(
        { message: 'ID rạp không hợp lệ.' },
        { status: 400 },
      );
    }

    const cinema = await prisma.cinema.findUnique({
      where: { id },
    });

    if (!cinema) {
      return NextResponse.json(
        { message: 'Không tìm thấy rạp.' },
        { status: 404 },
      );
    }

    await prisma.cinema.delete({
      where: { id },
    });

    return NextResponse.json({
      message: 'Xóa rạp thành công.',
    });
  } catch {
    return NextResponse.json(
      {
        message:
          'Không thể xóa rạp do đang có dữ liệu đặt vé liên quan.',
      },
      { status: 400 },
    );
  }
}