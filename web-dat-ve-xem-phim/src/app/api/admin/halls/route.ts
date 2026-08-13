import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

type SeatTypeInput = {
  type: string;
  quantity: number;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      cinemaId?: string;
      name?: string;
      rows?: number;
      seatsPerRow?: number;
      seatTypes?: SeatTypeInput[];
    };

    if (!body.cinemaId || !body.name) {
      return NextResponse.json(
        {
          message:
            'Vui lòng nhập đầy đủ tên phòng và rạp chiếu.',
        },
        { status: 400 }
      );
    }

    const rows = Math.max(1, Number(body.rows ?? 6));
    const seatsPerRow = Math.max(
      1,
      Number(body.seatsPerRow ?? 8)
    );

    const totalSeats = rows * seatsPerRow;

    /*
     * Nếu frontend gửi loại ghế thì dùng số lượng đó.
     * Nếu chưa gửi thì mặc định toàn bộ là STANDARD.
     */
    const seatTypes =
      body.seatTypes?.filter(
        (item) =>
          item.type &&
          Number(item.quantity) > 0
      ) ?? [];

    let normalizedSeatTypes: SeatTypeInput[];

    if (seatTypes.length > 0) {
      const typeTotal = seatTypes.reduce(
        (total, item) =>
          total + Number(item.quantity),
        0
      );

      if (typeTotal !== totalSeats) {
        return NextResponse.json(
          {
            message: `Tổng số ghế theo loại phải bằng ${totalSeats} ghế.`,
          },
          { status: 400 }
        );
      }

      normalizedSeatTypes = seatTypes.map(
        (item) => ({
          type: item.type,
          quantity: Number(item.quantity),
        })
      );
    } else {
      normalizedSeatTypes = [
        {
          type: 'STANDARD',
          quantity: totalSeats,
        },
      ];
    }

    /*
     * Tạo phòng
     */
    const hall = await prisma.hall.create({
      data: {
        cinemaId: body.cinemaId,
        name: body.name,
        capacity: totalSeats,
      },
    });

    /*
     * Tạo danh sách ghế
     *
     * Ví dụ:
     * STANDARD = 40
     * VIP      = 12
     * COUPLE   = 4
     *
     * Tổng = 56
     */
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
        65 + rowIndex
      );

      for (
        let seatNumber = 1;
        seatNumber <= seatsPerRow;
        seatNumber++
      ) {
        /*
         * Xác định loại ghế dựa trên vị trí
         * trong tổng danh sách.
         */
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

    await prisma.seat.createMany({
      data: seatRecords,
    });

    /*
     * Lấy lại phòng kèm toàn bộ ghế
     */
    const createdHall =
      await prisma.hall.findUnique({
        where: {
          id: hall.id,
        },
        include: {
          seats: {
            orderBy: [
              {
                rowLabel: 'asc',
              },
              {
                seatNumber: 'asc',
              },
            ],
          },
        },
      });

    return NextResponse.json(
      {
        message:
          'Tạo phòng chiếu và sơ đồ ghế thành công.',
        hall: createdHall,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error(
      'POST /api/admin/halls error:',
      error
    );

    return NextResponse.json(
      {
        message:
          'Không thể tạo phòng chiếu.',
      },
      { status: 500 }
    );
  }
}