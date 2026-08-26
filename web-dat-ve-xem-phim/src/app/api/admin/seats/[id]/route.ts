import { NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import type { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';

type RouteContext = { params: Promise<{ id: string }> };

async function isAdmin(request: Request) {
  const token = await getToken({
    req: request as NextRequest,
    secret: process.env.NEXTAUTH_SECRET,
  });
  return token?.role === 'ADMIN';
}

export async function PATCH(request: Request, context: RouteContext) {
  if (!(await isAdmin(request))) {
    return NextResponse.json({ message: 'Bạn không có quyền thực hiện thao tác này.' }, { status: 403 });
  }

  try {
    const { id } = await context.params;
    const body = await request.json() as {
      isActive?: boolean;
      type?: string;
      code?: string;
      rowLabel?: string;
      seatNumber?: number;
      positionX?: number;
      positionY?: number;
    };

    const seat = await prisma.seat.findUnique({ where: { id } });
    if (!seat) return NextResponse.json({ message: 'Không tìm thấy ghế.' }, { status: 404 });

    if (body.isActive === undefined && body.type === undefined && body.code === undefined &&
        body.rowLabel === undefined && body.seatNumber === undefined &&
        body.positionX === undefined && body.positionY === undefined) {
      return NextResponse.json({ message: 'Không có dữ liệu cần cập nhật.' }, { status: 400 });
    }

    const type = body.type?.trim().toUpperCase();
    if (type !== undefined && !['STANDARD', 'VIP', 'COUPLE'].includes(type)) {
      return NextResponse.json({ message: 'Loại ghế không hợp lệ.' }, { status: 400 });
    }

    const nextCode = body.code?.trim();
    if (nextCode !== undefined && !nextCode) {
      return NextResponse.json({ message: 'Tên ghế không được để trống.' }, { status: 400 });
    }

    if (nextCode && nextCode !== seat.code) {
      const duplicate = await prisma.seat.findUnique({
        where: { hallId_code: { hallId: seat.hallId, code: nextCode } },
      });
      if (duplicate) return NextResponse.json({ message: `Ghế ${nextCode} đã tồn tại.` }, { status: 409 });
    }

    const hall = await prisma.hall.findUnique({ where: { id: seat.hallId } });
    if (!hall) return NextResponse.json({ message: 'Không tìm thấy phòng chiếu.' }, { status: 404 });

    const x = body.positionX ?? seat.positionX;
    const y = body.positionY ?? seat.positionY;
    if (!Number.isInteger(x) || !Number.isInteger(y) || x < 0 || y < 0 || x >= hall.layoutWidth || y >= hall.layoutHeight) {
      return NextResponse.json({ message: 'Vị trí ghế nằm ngoài sơ đồ.' }, { status: 400 });
    }

    if (body.isActive === false) {
      const bookedTicket = await prisma.ticket.findFirst({
        where: {
          seatId: seat.id,
          status: 'ACTIVE',
          booking: { status: { in: ['PENDING', 'CONFIRMED'] } },
        },
      });
      if (bookedTicket) {
        return NextResponse.json({ message: `Không thể tắt ghế ${seat.code} vì ghế đã được đặt.` }, { status: 400 });
      }
    }

    const updatedSeat = await prisma.seat.update({
      where: { id },
      data: {
        ...(body.isActive !== undefined ? { isActive: body.isActive } : {}),
        ...(type !== undefined ? { type } : {}),
        ...(nextCode !== undefined ? { code: nextCode } : {}),
        ...(body.rowLabel !== undefined ? { rowLabel: body.rowLabel.trim() || seat.rowLabel } : {}),
        ...(body.seatNumber !== undefined ? { seatNumber: body.seatNumber } : {}),
        positionX: x,
        positionY: y,
      },
    });

    return NextResponse.json({ message: 'Cập nhật ghế thành công.', seat: updatedSeat });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: 'Không thể cập nhật ghế.' }, { status: 500 });
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  if (!(await isAdmin(request))) {
    return NextResponse.json({ message: 'Bạn không có quyền thực hiện thao tác này.' }, { status: 403 });
  }

  try {
    const { id } = await context.params;
    const seat = await prisma.seat.findUnique({ where: { id } });
    if (!seat) return NextResponse.json({ message: 'Không tìm thấy ghế.' }, { status: 404 });

    const ticketCount = await prisma.ticket.count({ where: { seatId: id } });
    if (ticketCount > 0) {
      return NextResponse.json({ message: `Không thể xóa ghế ${seat.code} vì ghế đã có dữ liệu vé.` }, { status: 400 });
    }

    await prisma.seat.delete({ where: { id } });
    await prisma.hall.update({
      where: { id: seat.hallId },
      data: { capacity: { decrement: 1 } },
    });

    return NextResponse.json({ message: `Đã xóa ghế ${seat.code}.` });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: 'Không thể xóa ghế.' }, { status: 500 });
  }
}
