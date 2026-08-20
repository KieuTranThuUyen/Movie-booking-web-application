import { NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import type { NextRequest } from 'next/server';

import { prisma } from '@/lib/prisma';

type SeatTypeInput = {
  type: string;
  quantity: number;
};

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
      cinemaId?: string;
      name?: string;
      rows?: number;
      seatsPerRow?: number;
      seatTypes?: SeatTypeInput[];
    };

    const cinemaId = body.cinemaId?.trim();
    const name = body.name?.trim();

    if (!cinemaId || !name) {
      return NextResponse.json(
        { message: 'Vui lòng nhập đầy đủ tên phòng và rạp chiếu.' },
        { status: 400 },
      );
    }

    const cinema = await prisma.cinema.findUnique({
      where: { id: cinemaId },
    });

    if (!cinema) {
      return NextResponse.json(
        { message: 'Không tìm thấy rạp chiếu.' },
        { status: 404 },
      );
    }

    const rows = Number(body.rows ?? 6);
    const seatsPerRow = Number(body.seatsPerRow ?? 8);

    if (
      !Number.isInteger(rows) ||
      rows < 1 ||
      rows > 26
    ) {
      return NextResponse.json(
        { message: 'Số hàng ghế không hợp lệ.' },
        { status: 400 },
      );
    }

    if (
      !Number.isInteger(seatsPerRow) ||
      seatsPerRow < 1
    ) {
      return NextResponse.json(
        { message: 'Số ghế mỗi hàng không hợp lệ.' },
        { status: 400 },
      );
    }

    const totalSeats = rows * seatsPerRow;

    const seatTypes =
      body.seatTypes?.filter(
        (item) =>
          item.type?.trim() &&
          Number.isInteger(Number(item.quantity)) &&
          Number(item.quantity) > 0,
      ) ?? [];

    let normalizedSeatTypes: SeatTypeInput[];

    if (seatTypes.length > 0) {
      const typeTotal = seatTypes.reduce(
        (total, item) => total + Number(item.quantity),
        0,
      );

      if (typeTotal !== totalSeats) {
        return NextResponse.json(
          {
            message: `Tổng số ghế theo loại phải bằng ${totalSeats} ghế.`,
          },
          { status: 400 },
        );
      }

      normalizedSeatTypes = seatTypes.map((item) => ({
        type: item.type.trim(),
        quantity: Number(item.quantity),
      }));
    } else {
      normalizedSeatTypes = [
        {
          type: 'STANDARD',
          quantity: totalSeats,
        },
      ];
    }

    const existingHall = await prisma.hall.findFirst({
      where: {
        cinemaId,
        name,
      },
    });

    if (existingHall) {
      return NextResponse.json(
        { message: 'Tên phòng trong rạp này đã tồn tại.' },
        { status: 409 },
      );
    }

    const result = await prisma.$transaction(async (tx) => {
      const hall = await tx.hall.create({
        data: {
          cinemaId,
          name,
          capacity: totalSeats,
        },
      });

      const seatRecords: {
        hallId: string;
        code: string;
        rowLabel: string;
        seatNumber: number;
        type: string;
      }[] = [];

      let seatIndex = 0;

      for (let rowIndex = 0; rowIndex < rows; rowIndex++) {
        const rowLabel = String.fromCharCode(65 + rowIndex);

        for (
          let seatNumber = 1;
          seatNumber <= seatsPerRow;
          seatNumber++
        ) {
          let currentType = 'STANDARD';
          let accumulated = 0;

          for (const seatType of normalizedSeatTypes) {
            accumulated += seatType.quantity;

            if (seatIndex < accumulated) {
              currentType = seatType.type;
              break;
            }
          }

          seatRecords.push({
            hallId: hall.id,
            code: `${rowLabel}${seatNumber}`,
            rowLabel,
            seatNumber,
            type: currentType,
          });

          seatIndex++;
        }
      }

      await tx.seat.createMany({
        data: seatRecords,
      });

      return hall;
    });

    const createdHall = await prisma.hall.findUnique({
      where: {
        id: result.id,
      },
      include: {
        seats: {
          orderBy: [
            { rowLabel: 'asc' },
            { seatNumber: 'asc' },
          ],
        },
      },
    });

    return NextResponse.json(
      {
        message: 'Tạo phòng chiếu và sơ đồ ghế thành công.',
        hall: createdHall,
      },
      { status: 201 },
    );
  } catch {
    return NextResponse.json(
      { message: 'Không thể tạo phòng chiếu.' },
      { status: 500 },
    );
  }
}