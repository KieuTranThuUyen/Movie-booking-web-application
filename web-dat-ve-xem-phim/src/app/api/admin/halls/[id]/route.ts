import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

type SeatTypeInput = {
  type: string;
  quantity: number;
};

/*
 * ==============================
 * PATCH - SỬA PHÒNG
 * ==============================
 */
export async function PATCH(
  request: Request,
  context: RouteContext
) {
  const params = await context.params;

  try {
    const body = (await request.json()) as {
      name?: string;
      rows?: number;
      seatsPerRow?: number;
      seatTypes?: SeatTypeInput[];
    };

    const hallId = params.id;

    /*
     * ==============================
     * KIỂM TRA PHÒNG
     * ==============================
     */

    const existingHall = await prisma.hall.findUnique({
      where: {
        id: hallId,
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

    if (!existingHall) {
      return NextResponse.json(
        {
          message: 'Không tìm thấy phòng chiếu.',
        },
        {
          status: 404,
        }
      );
    }

    /*
     * ==============================
     * XÁC ĐỊNH SỐ HÀNG
     * ==============================
     */

    const currentRows =
      existingHall.seats.length > 0
        ? existingHall.seats.reduce(
            (max, seat) => {
              const match =
                seat.rowLabel.match(/^[A-Z]+/);

              if (!match) {
                return max;
              }

              const value =
                match[0].charCodeAt(0) - 64;

              return Math.max(max, value);
            },
            0
          )
        : 6;

    const rows = Math.max(
      1,
      Number(
        body.rows !== undefined
          ? body.rows
          : currentRows
      )
    );

    /*
     * ==============================
     * XÁC ĐỊNH SỐ GHẾ MỖI HÀNG
     * ==============================
     */

    const currentSeatsPerRow =
      existingHall.seats.length > 0
        ? existingHall.seats.reduce(
            (max, seat) =>
              Math.max(
                max,
                seat.seatNumber
              ),
            0
          )
        : 8;

    const seatsPerRow = Math.max(
      1,
      Number(
        body.seatsPerRow !== undefined
          ? body.seatsPerRow
          : currentSeatsPerRow
      )
    );

    /*
     * ==============================
     * TỔNG SỐ GHẾ
     * ==============================
     */

    const totalSeats =
      rows * seatsPerRow;

    /*
     * ==============================
     * XỬ LÝ LOẠI GHẾ
     * ==============================
     *
     * Ví dụ:
     *
     * STANDARD = 32
     * VIP      = 16
     * COUPLE   = 8
     *
     * Tổng = 56
     */

    const seatTypes =
      body.seatTypes?.filter(
        (item) =>
          item.type &&
          Number(item.quantity) > 0
      ) ?? [];

    let normalizedSeatTypes: SeatTypeInput[];

    if (seatTypes.length > 0) {
      const typeTotal =
        seatTypes.reduce(
          (total, item) =>
            total +
            Number(item.quantity),
          0
        );

      if (typeTotal !== totalSeats) {
        return NextResponse.json(
          {
            message: `Tổng số ghế theo loại phải bằng ${totalSeats} ghế.`,
          },
          {
            status: 400,
          }
        );
      }

      normalizedSeatTypes =
        seatTypes.map((item) => ({
          type: item.type,
          quantity: Number(
            item.quantity
          ),
        }));
    } else {
      /*
       * Nếu frontend không gửi loại ghế
       * thì giữ nguyên loại ghế hiện tại.
       */

      const currentTypeCount =
        new Map<string, number>();

      for (const seat of existingHall.seats) {
        currentTypeCount.set(
          seat.type,
          (currentTypeCount.get(
            seat.type
          ) ?? 0) + 1
        );
      }

      normalizedSeatTypes =
        Array.from(
          currentTypeCount.entries()
        ).map(([type, quantity]) => ({
          type,
          quantity,
        }));

      /*
       * Nếu phòng chưa có ghế
       * thì mặc định STANDARD.
       */

      if (
        normalizedSeatTypes.length === 0
      ) {
        normalizedSeatTypes = [
          {
            type: 'STANDARD',
            quantity: totalSeats,
          },
        ];
      }

      /*
       * Nếu số lượng ghế cũ không khớp
       * với sơ đồ mới thì chuyển toàn bộ
       * thành STANDARD.
       */

      const oldTypeTotal =
        normalizedSeatTypes.reduce(
          (total, item) =>
            total + item.quantity,
          0
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

    /*
     * ==============================
     * KIỂM TRA VÉ ĐÃ ĐẶT
     * ==============================
     *
     * Nếu ghế đã được dùng trong vé
     * thì không cho thay đổi sơ đồ.
     */

    const ticketCount =
      await prisma.ticket.count({
        where: {
          seat: {
            hallId: hallId,
          },
        },
      });

    const changingLayout =
      body.rows !== undefined ||
      body.seatsPerRow !== undefined ||
      body.seatTypes !== undefined;

    if (
      ticketCount > 0 &&
      changingLayout
    ) {
      return NextResponse.json(
        {
          message:
            'Phòng đã có vé được đặt nên không thể thay đổi số hàng, số ghế hoặc loại ghế. Bạn chỉ có thể đổi tên phòng.',
        },
        {
          status: 400,
        }
      );
    }

    /*
     * ==============================
     * CẬP NHẬT PHÒNG
     * ==============================
     */

    const hall = await prisma.hall.update({
      where: {
        id: hallId,
      },
      data: {
        name:
          body.name !== undefined
            ? body.name
            : undefined,

        capacity: totalSeats,
      },
    });

    /*
     * ==============================
     * TẠO LẠI SƠ ĐỒ GHẾ
     * ==============================
     */

    if (changingLayout) {
      /*
       * Xóa ghế cũ
       */

      await prisma.seat.deleteMany({
        where: {
          hallId: hallId,
        },
      });

      /*
       * Tạo ghế mới
       */

      const seatRecords: {
        hallId: string;
        code: string;
        rowLabel: string;
        seatNumber: number;
        type: string;
      }[] = [];

      let seatIndex = 0;

      for (
        let rowIndex = 0;
        rowIndex < rows;
        rowIndex++
      ) {
        const rowLabel =
          String.fromCharCode(
            65 + rowIndex
          );

        for (
          let seatNumber = 1;
          seatNumber <= seatsPerRow;
          seatNumber++
        ) {
          let currentType =
            'STANDARD';

          let accumulated = 0;

          for (
            const seatType of normalizedSeatTypes
          ) {
            accumulated +=
              seatType.quantity;

            if (
              seatIndex <
              accumulated
            ) {
              currentType =
                seatType.type;

              break;
            }
          }

          seatRecords.push({
            hallId: hallId,
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
    }

    /*
     * ==============================
     * LẤY LẠI PHÒNG SAU KHI UPDATE
     * ==============================
     */

    const updatedHall =
      await prisma.hall.findUnique({
        where: {
          id: hallId,
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

    return NextResponse.json({
      message:
        'Cập nhật phòng chiếu thành công.',
      hall: updatedHall,
    });
  } catch (error) {
    console.error(
      'PATCH /api/admin/halls/[id] error:',
      error
    );

    return NextResponse.json(
      {
        message:
          'Không thể cập nhật phòng chiếu.',
      },
      {
        status: 500,
      }
    );
  }
}

/*
 * ==============================
 * DELETE - XÓA PHÒNG
 * ==============================
 */

export async function DELETE(
  _request: Request,
  context: RouteContext
) {
  const params = await context.params;

  try {
    const hall =
      await prisma.hall.findUnique({
        where: {
          id: params.id,
        },
      });

    if (!hall) {
      return NextResponse.json(
        {
          message:
            'Không tìm thấy phòng chiếu.',
        },
        {
          status: 404,
        }
      );
    }

    await prisma.hall.delete({
      where: {
        id: params.id,
      },
    });

    return NextResponse.json({
      message:
        'Xóa phòng chiếu thành công.',
    });
  } catch (error) {
    console.error(
      'DELETE /api/admin/halls/[id] error:',
      error
    );

    return NextResponse.json(
      {
        message:
          'Không thể xóa phòng do đang có dữ liệu đặt vé liên quan.',
      },
      {
        status: 400,
      }
    );
  }
}