import { NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import type { NextRequest } from 'next/server';

import { prisma } from '@/lib/prisma';

type RouteContext = {
  params: Promise<{ id: string }>;
};

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
        { message: 'ID phòng chiếu không hợp lệ.' },
        { status: 400 },
      );
    }

    const body = (await request.json()) as {
      name?: string;
      rows?: number;
      seatsPerRow?: number;
      seatTypes?: SeatTypeInput[];
    };

    const existingHall = await prisma.hall.findUnique({
      where: { id },
      include: {
        seats: {
          orderBy: [
            { rowLabel: 'asc' },
            { seatNumber: 'asc' },
          ],
        },
      },
    });

    if (!existingHall) {
      return NextResponse.json(
        { message: 'Không tìm thấy phòng chiếu.' },
        { status: 404 },
      );
    }

    const name =
      body.name !== undefined
        ? body.name.trim()
        : undefined;

    if (body.name !== undefined && !name) {
      return NextResponse.json(
        { message: 'Tên phòng không được để trống.' },
        { status: 400 },
      );
    }

    const currentRows =
      existingHall.seats.length > 0
        ? Math.max(
            ...existingHall.seats.map(
              (seat) =>
                seat.rowLabel.charCodeAt(0) - 64,
            ),
          )
        : 6;

    const currentSeatsPerRow =
      existingHall.seats.length > 0
        ? Math.max(
            ...existingHall.seats.map(
              (seat) => seat.seatNumber,
            ),
          )
        : 8;

    const rows = Number(
      body.rows !== undefined
        ? body.rows
        : currentRows,
    );

    const seatsPerRow = Number(
      body.seatsPerRow !== undefined
        ? body.seatsPerRow
        : currentSeatsPerRow,
    );

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
      const currentTypeCount = new Map<string, number>();

      for (const seat of existingHall.seats) {
        currentTypeCount.set(
          seat.type,
          (currentTypeCount.get(seat.type) ?? 0) + 1,
        );
      }

      normalizedSeatTypes = Array.from(
        currentTypeCount.entries(),
      ).map(([type, quantity]) => ({
        type,
        quantity,
      }));

      if (normalizedSeatTypes.length === 0) {
        normalizedSeatTypes = [
          {
            type: 'STANDARD',
            quantity: totalSeats,
          },
        ];
      }

      const oldTypeTotal = normalizedSeatTypes.reduce(
        (total, item) => total + item.quantity,
        0,
      );

      if (oldTypeTotal !== totalSeats) {
        normalizedSeatTypes = [
          {
            type: 'STANDARD',
            quantity: totalSeats,
          },
        ];
      }
    }

    const changingLayout =
      body.rows !== undefined ||
      body.seatsPerRow !== undefined ||
      body.seatTypes !== undefined;

    if (changingLayout) {
      const ticketCount = await prisma.ticket.count({
        where: {
          seat: {
            hallId: id,
          },
        },
      });

      if (ticketCount > 0) {
        return NextResponse.json(
          {
            message:
              'Phòng đã có vé được đặt nên không thể thay đổi số hàng, số ghế hoặc loại ghế. Bạn chỉ có thể đổi tên phòng.',
          },
          { status: 400 },
        );
      }
    }

    const updatedHall = await prisma.$transaction(
      async (tx) => {
        const hall = await tx.hall.update({
          where: { id },
          data: {
            name,
            capacity: totalSeats,
          },
        });

        if (changingLayout) {
          await tx.seat.deleteMany({
            where: {
              hallId: id,
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
            const rowLabel = String.fromCharCode(
              65 + rowIndex,
            );

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
                hallId: id,
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
        }

        return hall;
      },
    );

    const result = await prisma.hall.findUnique({
      where: {
        id: updatedHall.id,
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

    return NextResponse.json({
      message: 'Cập nhật phòng chiếu thành công.',
      hall: result,
    });
  } catch {
    return NextResponse.json(
      { message: 'Không thể cập nhật phòng chiếu.' },
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

    const hall = await prisma.hall.findUnique({
      where: { id },
    });

    if (!hall) {
      return NextResponse.json(
        { message: 'Không tìm thấy phòng chiếu.' },
        { status: 404 },
      );
    }

    const ticketCount = await prisma.ticket.count({
      where: {
        seat: {
          hallId: id,
        },
      },
    });

    if (ticketCount > 0) {
      return NextResponse.json(
        {
          message:
            'Không thể xóa phòng vì đã có dữ liệu vé liên quan.',
        },
        { status: 400 },
      );
    }

    await prisma.hall.delete({
      where: { id },
    });

    return NextResponse.json({
      message: 'Xóa phòng chiếu thành công.',
    });
  } catch {
    return NextResponse.json(
      {
        message:
          'Không thể xóa phòng do đang có dữ liệu liên quan.',
      },
      { status: 400 },
    );
  }
}