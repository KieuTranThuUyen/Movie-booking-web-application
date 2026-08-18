import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';

import { BookingStatus } from '@prisma/client';

import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

const HOLD_MINUTES = 10;

/* ============================================================
   GET
   ============================================================ */

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    const { searchParams } = new URL(request.url);
    const showtimeId = searchParams.get('showtimeId');

    if (!showtimeId) {
      return NextResponse.json(
        {
          message: 'Thiếu showtimeId.',
        },
        {
          status: 400,
        },
      );
    }

    const currentUserId = session?.user?.id ?? null;
    const now = new Date();

    /*
     * Xóa hold hết hạn.
     */
    await prisma.seatHold.deleteMany({
      where: {
        showtimeId,
        expiresAt: {
          lte: now,
        },
      },
    });

    /*
     * Lấy hold còn hiệu lực.
     */
    const holds = await prisma.seatHold.findMany({
      where: {
        showtimeId,
        expiresAt: {
          gt: now,
        },
      },

      select: {
        id: true,
        seatId: true,
        expiresAt: true,
        userId: true,
        bookingId: true,

        seat: {
          select: {
            code: true,
            isActive: true,
          },
        },
      },

      orderBy: {
        expiresAt: 'asc',
      },
    });

    return NextResponse.json(
      holds.map((hold) => ({
        id: hold.id,
        seatId: hold.seatId,
        seatCode: hold.seat.code,
        isActive: hold.seat.isActive,
        expiresAt: hold.expiresAt,
        userId: hold.userId,

        /*
         * BookingId không cần gửi cho frontend.
         */

        isMine:
          currentUserId !== null &&
          hold.userId === currentUserId,
      })),
    );
  } catch (error) {
    console.error(
      'GET /api/seat-holds error:',
      error,
    );

    return NextResponse.json(
      {
        message:
          'Không thể lấy trạng thái giữ ghế.',
      },
      {
        status: 500,
      },
    );
  }
}

/* ============================================================
   POST - GIỮ GHẾ
   ============================================================ */

export async function POST(request: Request) {
  try {
    const session =
      await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        {
          message:
            'Bạn cần đăng nhập để giữ ghế.',
        },
        {
          status: 401,
        },
      );
    }

    const userId = session.user.id;

    const body =
      (await request.json()) as {
        showtimeId?: string;
        seatIds?: string[];
      };

    const showtimeId =
      String(body.showtimeId ?? '').trim();

    const seatIds = Array.isArray(body.seatIds)
      ? [
          ...new Set(
            body.seatIds
              .map(String)
              .map((id) => id.trim())
              .filter(Boolean),
          ),
        ]
      : [];

    if (
      !showtimeId ||
      seatIds.length === 0
    ) {
      return NextResponse.json(
        {
          message:
            'Vui lòng chọn suất chiếu và ít nhất một ghế.',
        },
        {
          status: 400,
        },
      );
    }

    const now = new Date();

    /*
     * Xóa hold hết hạn.
     */
    await prisma.seatHold.deleteMany({
      where: {
        showtimeId,
        expiresAt: {
          lte: now,
        },
      },
    });

    /*
     * Lấy suất chiếu.
     */
    const showtime =
      await prisma.showtime.findUnique({
        where: {
          id: showtimeId,
        },

        include: {
          hall: {
            include: {
              seats: true,
            },
          },
        },
      });

    if (!showtime) {
      return NextResponse.json(
        {
          message:
            'Không tìm thấy suất chiếu.',
        },
        {
          status: 404,
        },
      );
    }

    if (showtime.startTime <= now) {
      return NextResponse.json(
        {
          message:
            'Suất chiếu đã bắt đầu. Không thể giữ ghế.',
        },
        {
          status: 409,
        },
      );
    }

    /*
     * Kiểm tra ghế.
     */
    const selectedSeats =
      showtime.hall.seats.filter((seat) =>
        seatIds.includes(seat.id),
      );

    if (
      selectedSeats.length !==
      seatIds.length
    ) {
      return NextResponse.json(
        {
          message:
            'Có ghế không tồn tại trong phòng chiếu.',
        },
        {
          status: 400,
        },
      );
    }

    /*
     * Ghế bị khóa.
     */
    const inactiveSeats =
      selectedSeats.filter(
        (seat) => !seat.isActive,
      );

    if (inactiveSeats.length > 0) {
      return NextResponse.json(
        {
          message:
            `Ghế ${inactiveSeats
              .map((seat) => seat.code)
              .join(', ')} đang bị khóa bởi quản trị viên.`,
        },
        {
          status: 409,
        },
      );
    }

    /*
     * Ghế đã bán.
     */
    const soldTickets =
      await prisma.ticket.findMany({
        where: {
          seatId: {
            in: seatIds,
          },

          booking: {
            showtimeId,

            status: {
              not: BookingStatus.CANCELED,
            },
          },
        },

        select: {
          seatCode: true,
        },
      });

    if (soldTickets.length > 0) {
      return NextResponse.json(
        {
          message:
            `Ghế ${soldTickets
              .map((ticket) => ticket.seatCode)
              .join(', ')} đã được đặt.`,
        },
        {
          status: 409,
        },
      );
    }

    /*
     * Lấy hold hiện tại.
     */
    const activeHolds =
      await prisma.seatHold.findMany({
        where: {
          showtimeId,

          seatId: {
            in: seatIds,
          },

          expiresAt: {
            gt: now,
          },
        },

        include: {
          seat: {
            select: {
              code: true,
            },
          },
        },
      });

    /*
     * Nếu hold đã thuộc booking khác,
     * không cho chọn lại.
     */
    const holdsBelongToBooking =
      activeHolds.filter(
        (hold) =>
          hold.bookingId !== null &&
          hold.userId === userId,
      );

    if (holdsBelongToBooking.length > 0) {
      return NextResponse.json(
        {
          message:
            'Một hoặc nhiều ghế đã thuộc đơn đặt vé đang chờ thanh toán. Vui lòng hoàn tất đơn đó.',
        },
        {
          status: 409,
        },
      );
    }

    /*
     * Hold của người khác.
     */
    const holdsByOthers =
      activeHolds.filter(
        (hold) =>
          hold.userId !== userId,
      );

    if (holdsByOthers.length > 0) {
      return NextResponse.json(
        {
          message:
            `Ghế ${holdsByOthers
              .map((hold) => hold.seat.code)
              .join(', ')} đang được người khác giữ.`,
        },
        {
          status: 409,
        },
      );
    }

    /*
     * Hold của chính user nhưng chưa gắn booking.
     */
    const myExistingHolds =
      activeHolds.filter(
        (hold) =>
          hold.userId === userId &&
          hold.bookingId === null,
      );

    const newSeatIds =
      seatIds.filter(
        (seatId) =>
          !myExistingHolds.some(
            (hold) =>
              hold.seatId === seatId,
          ),
      );

    const expiresAt =
      new Date(
        now.getTime() +
          HOLD_MINUTES *
            60 *
            1000,
      );

    /*
     * Tạo hold mới.
     *
     * bookingId = null
     * vì chưa tạo booking.
     */
    const createdHolds =
      await prisma.$transaction(
        async (tx) => {
          const holds = [];

          for (
            const seatId of newSeatIds
          ) {
            try {
              const hold =
                await tx.seatHold.create({
                  data: {
                    seatId,
                    showtimeId,
                    userId,
                    bookingId: null,
                    expiresAt,
                  },

                  include: {
                    seat: {
                      select: {
                        code: true,
                      },
                    },
                  },
                });

              holds.push(hold);
            } catch (error) {
              console.error(
                'Create SeatHold conflict:',
                error,
              );

              throw new Error(
                `SEAT_HOLD_CONFLICT:${seatId}`,
              );
            }
          }

          return holds;
        },
      );

    const allMyHolds = [
      ...myExistingHolds,
      ...createdHolds,
    ];

    return NextResponse.json({
      message:
        newSeatIds.length === 0
          ? 'Các ghế đã được bạn giữ trước đó.'
          : `Đã giữ ghế trong ${HOLD_MINUTES} phút.`,

      expiresAt,

      holds: allMyHolds.map(
        (hold) => ({
          id: hold.id,
          seatId: hold.seatId,
          seatCode: hold.seat.code,
          expiresAt: hold.expiresAt,
          userId: hold.userId,
          isMine: true,
        }),
      ),
    });
  } catch (error) {
    console.error(
      'POST /api/seat-holds error:',
      error,
    );

    if (
      error instanceof Error &&
      error.message.startsWith(
        'SEAT_HOLD_CONFLICT:',
      )
    ) {
      return NextResponse.json(
        {
          message:
            'Một hoặc nhiều ghế vừa được người khác giữ. Vui lòng chọn ghế khác.',
        },
        {
          status: 409,
        },
      );
    }

    return NextResponse.json(
      {
        message:
          'Không thể giữ ghế. Vui lòng thử lại.',
      },
      {
        status: 500,
      },
    );
  }
}

/* ============================================================
   DELETE - BỎ GIỮ GHẾ
   ============================================================ */

export async function DELETE(
  request: Request,
) {
  try {
    const session =
      await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        {
          message:
            'Bạn cần đăng nhập để bỏ giữ ghế.',
        },
        {
          status: 401,
        },
      );
    }

    const userId = session.user.id;

    const body =
      (await request.json()) as {
        showtimeId?: string;
        seatIds?: string[];
      };

    const showtimeId =
      String(body.showtimeId ?? '').trim();

    const seatIds =
      Array.isArray(body.seatIds)
        ? [
            ...new Set(
              body.seatIds
                .map(String)
                .map((id) => id.trim())
                .filter(Boolean),
            ),
          ]
        : [];

    if (
      !showtimeId ||
      seatIds.length === 0
    ) {
      return NextResponse.json(
        {
          message:
            'Thiếu thông tin ghế cần bỏ giữ.',
        },
        {
          status: 400,
        },
      );
    }

    /*
     * Chỉ cho bỏ hold chưa thuộc booking.
     *
     * Nếu đã tạo Booking thì không được
     * tự ý xóa SeatHold của booking.
     */
    const deleted =
      await prisma.seatHold.deleteMany({
        where: {
          showtimeId,

          seatId: {
            in: seatIds,
          },

          userId,

          bookingId: null,
        },
      });

    return NextResponse.json({
      message:
        deleted.count > 0
          ? 'Đã bỏ giữ ghế.'
          : 'Không tìm thấy ghế đang được bạn giữ.',

      deletedCount:
        deleted.count,
    });
  } catch (error) {
    console.error(
      'DELETE /api/seat-holds error:',
      error,
    );

    return NextResponse.json(
      {
        message:
          'Không thể bỏ giữ ghế.',
      },
      {
        status: 500,
      },
    );
  }
}