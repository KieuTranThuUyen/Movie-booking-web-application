import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(
  request: Request,
  context: RouteContext
) {
  const params = await context.params;

  const body = (await request.json()) as {
    isActive?: boolean;
    type?: string;
  };

  try {
    // Tìm ghế
    const seat = await prisma.seat.findUnique({
      where: {
        id: params.id
      }
    });

    if (!seat) {
      return NextResponse.json(
        {
          message: 'Không tìm thấy ghế.'
        },
        {
          status: 404
        }
      );
    }

    // ==========================================
    // ADMIN ĐANG MUỐN TẮT GHẾ
    // ==========================================
    if (body.isActive === false) {
      // Kiểm tra xem ghế này có vé nào hay không
      const bookedTicket = await prisma.ticket.findFirst({
        where: {
          seatId: seat.id,

          booking: {
            status: {
              in: ['PENDING', 'CONFIRMED']
            }
          }
        }
      });

      // Đã có người đặt -> không cho tắt
      if (bookedTicket) {
        return NextResponse.json(
          {
            message:
              `Không thể tắt ghế ${seat.code} vì ghế đã được đặt ở một suất chiếu.`
          },
          {
            status: 400
          }
        );
      }
    }

    // ==========================================
    // CHO PHÉP BẬT / TẮT
    // ==========================================
    const updatedSeat = await prisma.seat.update({
      where: {
        id: seat.id
      },
      data: {
        ...(body.isActive !== undefined && {
          isActive: body.isActive
        }),

        ...(body.type !== undefined && {
          type: body.type
        })
      }
    });

    return NextResponse.json({
      message: body.isActive === false
        ? `Đã tắt ghế ${seat.code}.`
        : `Đã bật ghế ${seat.code}.`,
      seat: updatedSeat
    });
  } catch (error) {
    console.error('Lỗi cập nhật ghế:', error);

    return NextResponse.json(
      {
        message: 'Không thể cập nhật ghế.'
      },
      {
        status: 500
      }
    );
  }
}