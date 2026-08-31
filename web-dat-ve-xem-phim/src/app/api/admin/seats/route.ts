import { NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import type { NextRequest } from 'next/server';
import { prisma } from '@/lib/db/prisma';

const SEAT_TYPES = ['STANDARD', 'VIP', 'COUPLE'] as const;

async function isAdmin(request: Request) {
  const token = await getToken({
    req: request as NextRequest,
    secret: process.env.NEXTAUTH_SECRET,
  });
  return token?.role === 'ADMIN';
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
      hallId?: string;
      code?: string;
      rowLabel?: string;
      seatNumber?: number;
      type?: string;
      isActive?: boolean;
      positionX?: number;
      positionY?: number;
    };

    const hallId = body.hallId?.trim();
    const code = body.code?.trim();
    const rowLabel = (body.rowLabel?.trim() || code?.match(/^[A-Z]+/)?.[0] || 'A').toUpperCase();
    const seatNumber = Number(body.seatNumber);
    const type = (body.type?.trim() || 'STANDARD').toUpperCase();
    const isActive = body.isActive !== false;
    const positionX = Number(body.positionX);
    const positionY = Number(body.positionY);

    if (!hallId || !code) {
      return NextResponse.json(
        { message: 'Thiếu hallId hoặc mã ghế.' },
        { status: 400 },
      );
    }

    if (!SEAT_TYPES.includes(type as (typeof SEAT_TYPES)[number])) {
      return NextResponse.json({ message: 'Loại ghế không hợp lệ.' }, { status: 400 });
    }

    if (!Number.isInteger(seatNumber) || seatNumber < 1) {
      return NextResponse.json({ message: 'Số ghế không hợp lệ.' }, { status: 400 });
    }

    if (!Number.isInteger(positionX) || !Number.isInteger(positionY)) {
      return NextResponse.json({ message: 'Tọa độ ghế không hợp lệ.' }, { status: 400 });
    }

    const hall = await prisma.hall.findUnique({ where: { id: hallId } });
    if (!hall) {
      return NextResponse.json({ message: 'Không tìm thấy phòng chiếu.' }, { status: 404 });
    }

    if (
      positionX < 0 ||
      positionY < 0 ||
      positionX >= hall.layoutWidth ||
      positionY >= hall.layoutHeight
    ) {
      return NextResponse.json(
        { message: 'Vị trí ghế nằm ngoài sơ đồ.' },
        { status: 400 },
      );
    }

    const duplicate = await prisma.seat.findUnique({
      where: { hallId_code: { hallId, code } },
    });
    if (duplicate) {
      return NextResponse.json(
        { message: `Ghế ${code} đã tồn tại trong phòng.` },
        { status: 409 },
      );
    }

    const seat = await prisma.$transaction(async (tx) => {
      const created = await tx.seat.create({
        data: {
          hallId,
          code,
          rowLabel,
          seatNumber,
          type,
          isActive,
          positionX,
          positionY,
        },
      });

      await tx.hall.update({
        where: { id: hallId },
        data: { capacity: { increment: 1 } },
      });

      return created;
    });

    return NextResponse.json(
      { message: 'Thêm ghế thành công.', seat },
      { status: 201 },
    );
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: 'Không thể thêm ghế.' }, { status: 500 });
  }
}