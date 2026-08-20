import { NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import type { NextRequest } from 'next/server';

import { prisma } from '@/lib/prisma';

type RouteContext = {
  params: Promise<{ id: string }>;
};

async function isAdmin(request: Request) {
  const token = await getToken({
    req: request as NextRequest,
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

    const body = (await request.json()) as {
      isActive?: boolean;
      type?: string;
    };

    const seat = await prisma.seat.findUnique({
      where: {
        id,
      },
    });

    if (!seat) {
      return NextResponse.json(
        { message: 'Không tìm thấy ghế.' },
        { status: 404 },
      );
    }

    if (
      body.isActive === undefined &&
      body.type === undefined
    ) {
      return NextResponse.json(
        { message: 'Không có dữ liệu cần cập nhật.' },
        { status: 400 },
      );
    }

    if (
      body.type !== undefined &&
      !body.type.trim()
    ) {
      return NextResponse.json(
        { message: 'Loại ghế không được để trống.' },
        { status: 400 },
      );
    }

    if (body.isActive === false) {
      const bookedTicket = await prisma.ticket.findFirst({
        where: {
          seatId: seat.id,
          status: 'ACTIVE',
          booking: {
            status: {
              in: ['PENDING', 'CONFIRMED'],
            },
          },
        },
      });

      if (bookedTicket) {
        return NextResponse.json(
          {
            message:
              `Không thể tắt ghế ${seat.code} vì ghế đã được đặt.`,
          },
          { status: 400 },
        );
      }
    }

    const updatedSeat = await prisma.seat.update({
      where: {
        id: seat.id,
      },
      data: {
        ...(body.isActive !== undefined && {
          isActive: body.isActive,
        }),
        ...(body.type !== undefined && {
          type: body.type.trim(),
        }),
      },
    });

    return NextResponse.json({
      message: 'Cập nhật ghế thành công.',
      seat: updatedSeat,
    });
  } catch {
    return NextResponse.json(
      { message: 'Không thể cập nhật ghế.' },
      { status: 500 },
    );
  }
}