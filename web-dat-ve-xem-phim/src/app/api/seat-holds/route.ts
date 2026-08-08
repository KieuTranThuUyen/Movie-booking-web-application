import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

const HOLD_MINUTES = 10;

/**
 * GET
 *
 * Lấy danh sách ghế đang được giữ của một suất chiếu.
 *
 * Có thêm:
 * - userId
 * - isMine
 *
 * isMine = true nếu SeatHold thuộc user hiện tại.
 */
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    const { searchParams } = new URL(request.url);
    const showtimeId = searchParams.get('showtimeId');

    if (!showtimeId) {
      return NextResponse.json(
        {
          message: 'Thiếu showtimeId.'
        },
        {
          status: 400
        }
      );
    }

    const currentUserId = session?.user?.id ?? null;

    const now = new Date();

    /**
     * Xóa các hold đã hết hạn.
     */
    await prisma.seatHold.deleteMany({
      where: {
        showtimeId,
        expiresAt: {
          lte: now
        }
      }
    });

    /**
     * Lấy các hold còn hiệu lực.
     */
    const holds = await prisma.seatHold.findMany({
      where: {
        showtimeId,
        expiresAt: {
          gt: now
        }
      },
      select: {
        id: true,
        seatId: true,
        expiresAt: true,
        userId: true,
        seat: {
          select: {
            code: true,
            isActive: true
          }
        }
      },
      orderBy: {
        expiresAt: 'asc'
      }
    });

    /**
     * Trả về isMine để frontend biết:
     *
     * true  = ghế do chính mình giữ
     * false = ghế do người khác giữ
     */
    return NextResponse.json(
      holds.map((hold) => ({
        id: hold.id,
        seatId: hold.seatId,
        seatCode: hold.seat.code,
        isActive: hold.seat.isActive,
        expiresAt: hold.expiresAt,
        userId: hold.userId,

        isMine:
          currentUserId !== null &&
          hold.userId === currentUserId
      }))
    );
  } catch (error) {
    console.error(
      'GET /api/seat-holds error:',
      error
    );

    return NextResponse.json(
      {
        message:
          'Không thể lấy trạng thái giữ ghế.'
      },
      {
        status: 500
      }
    );
  }
}

/**
 * POST
 *
 * Giữ ghế.
 *
 * Nếu:
 * - Ghế chưa có hold → tạo hold mới.
 * - Ghế do chính user đang giữ → sử dụng lại hold hiện tại.
 * - Ghế do user khác giữ → từ chối.
 */
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    const body = (await request.json()) as {
      showtimeId?: string;
      seatIds?: string[];
    };

    const showtimeId = String(
      body.showtimeId ?? ''
    );

    const seatIds = Array.isArray(body.seatIds)
      ? [
          ...new Set(
            body.seatIds
              .map(String)
              .filter(Boolean)
          )
        ]
      : [];

    if (!showtimeId || seatIds.length === 0) {
      return NextResponse.json(
        {
          message:
            'Vui lòng chọn suất chiếu và ít nhất một ghế.'
        },
        {
          status: 400
        }
      );
    }

    const now = new Date();

    /**
     * User hiện tại.
     *
     * Nếu chưa đăng nhập thì userId = null.
     */
    const userId = session?.user?.id ?? null;

    /**
     * Xóa hold hết hạn của suất chiếu.
     */
    await prisma.seatHold.deleteMany({
      where: {
        showtimeId,
        expiresAt: {
          lte: now
        }
      }
    });

    /**
     * Lấy thông tin suất chiếu + phòng + ghế.
     */
    const showtime =
      await prisma.showtime.findUnique({
        where: {
          id: showtimeId
        },
        include: {
          hall: {
            include: {
              seats: true
            }
          }
        }
      });

    if (!showtime) {
      return NextResponse.json(
        {
          message:
            'Không tìm thấy suất chiếu.'
        },
        {
          status: 404
        }
      );
    }

    /**
     * Kiểm tra các ghế có thuộc phòng chiếu.
     */
    const selectedSeats =
      showtime.hall.seats.filter((seat) =>
        seatIds.includes(seat.id)
      );

    if (
      selectedSeats.length !== seatIds.length
    ) {
      return NextResponse.json(
        {
          message:
            'Có ghế không tồn tại trong phòng chiếu.'
        },
        {
          status: 400
        }
      );
    }

    /**
     * Kiểm tra ghế có đang hoạt động.
     */
    const inactiveSeats =
      selectedSeats.filter(
        (seat) => !seat.isActive
      );

    if (inactiveSeats.length > 0) {
      return NextResponse.json(
        {
          message: `Ghế ${inactiveSeats
            .map((seat) => seat.code)
            .join(
              ', '
            )} đang bị khóa bởi quản trị viên.`
        },
        {
          status: 409
        }
      );
    }

    /**
     * Kiểm tra ghế đã bán.
     */
    const soldTickets =
      await prisma.ticket.findMany({
        where: {
          seatId: {
            in: seatIds
          },
          booking: {
            showtimeId,
            status: {
              not: 'CANCELED'
            }
          }
        },
        select: {
          seatCode: true
        }
      });

    if (soldTickets.length > 0) {
      return NextResponse.json(
        {
          message: `Ghế ${soldTickets
            .map(
              (ticket) => ticket.seatCode
            )
            .join(
              ', '
            )} đã được đặt.`
        },
        {
          status: 409
        }
      );
    }

    /**
     * Lấy các hold đang còn hiệu lực.
     */
    const activeHolds =
      await prisma.seatHold.findMany({
        where: {
          showtimeId,
          seatId: {
            in: seatIds
          },
          expiresAt: {
            gt: now
          }
        },
        include: {
          seat: {
            select: {
              code: true
            }
          }
        }
      });

    /**
     * Chỉ xem là conflict nếu hold thuộc
     * người khác.
     *
     * Ví dụ:
     *
     * A giữ A1
     *
     * A request A1:
     * → OK
     *
     * B request A1:
     * → Conflict
     */
    const holdsByOthers =
      activeHolds.filter(
        (hold) => hold.userId !== userId
      );

    if (holdsByOthers.length > 0) {
      return NextResponse.json(
        {
          message: `Ghế ${holdsByOthers
            .map(
              (hold) => hold.seat.code
            )
            .join(
              ', '
            )} đang được người khác giữ.`
        },
        {
          status: 409
        }
      );
    }

    /**
     * Các hold hiện tại thuộc chính user.
     */
    const myExistingHolds =
      activeHolds.filter(
        (hold) => hold.userId === userId
      );

    /**
     * Chỉ tạo hold cho những ghế chưa được
     * chính user giữ.
     */
    const newSeatIds = seatIds.filter(
      (seatId) =>
        !myExistingHolds.some(
          (hold) =>
            hold.seatId === seatId
        )
    );

    /**
     * Thời gian hết hạn.
     *
     * Nếu user đã có hold thì giữ nguyên
     * expiresAt cũ.
     *
     * Không reset lại 10 phút mỗi lần click.
     */
    const expiresAt = new Date(
      now.getTime() +
        HOLD_MINUTES * 60 * 1000
    );

    /**
     * Tạo các hold mới.
     */
    const createdHolds =
      await prisma.$transaction(
        async (tx) => {
          const holds = [];

          for (const seatId of newSeatIds) {
            try {
              const hold =
                await tx.seatHold.create({
                  data: {
                    seatId,
                    showtimeId,
                    userId,
                    expiresAt
                  },
                  include: {
                    seat: {
                      select: {
                        code: true
                      }
                    }
                  }
                });

              holds.push(hold);
            } catch (error) {
              console.error(
                'Create SeatHold conflict:',
                error
              );

              throw new Error(
                `SEAT_HOLD_CONFLICT:${seatId}`
              );
            }
          }

          return holds;
        }
      );

    /**
     * Gộp:
     *
     * - hold cũ của chính user
     * - hold mới vừa tạo
     */
    const allMyHolds = [
      ...myExistingHolds,
      ...createdHolds
    ];

    return NextResponse.json({
      message:
        newSeatIds.length === 0
          ? 'Các ghế đã được bạn giữ trước đó.'
          : `Đã giữ ghế trong ${HOLD_MINUTES} phút.`,

      expiresAt,

      holds: allMyHolds.map((hold) => ({
        id: hold.id,
        seatId: hold.seatId,
        seatCode: hold.seat.code,
        expiresAt: hold.expiresAt,
        userId: hold.userId,

        isMine:
          userId !== null &&
          hold.userId === userId
      }))
    });
  } catch (error) {
    console.error(
      'POST /api/seat-holds error:',
      error
    );

    if (
      error instanceof Error &&
      error.message.startsWith(
        'SEAT_HOLD_CONFLICT:'
      )
    ) {
      return NextResponse.json(
        {
          message:
            'Một hoặc nhiều ghế vừa được người khác giữ. Vui lòng chọn ghế khác.'
        },
        {
          status: 409
        }
      );
    }

    return NextResponse.json(
      {
        message:
          'Không thể giữ ghế. Vui lòng thử lại.'
      },
      {
        status: 500
      }
    );
  }
}

/**
 * DELETE
 *
 * Bỏ giữ ghế.
 *
 * Chỉ user đang đăng nhập và chính là
 * người tạo SeatHold mới được xóa.
 */
export async function DELETE(
  request: Request
) {
  try {
    const session =
      await getServerSession(authOptions);

    const body =
      (await request.json()) as {
        showtimeId?: string;
        seatIds?: string[];
      };

    const showtimeId = String(
      body.showtimeId ?? ''
    );

    const seatIds = Array.isArray(
      body.seatIds
    )
      ? [
          ...new Set(
            body.seatIds
              .map(String)
              .filter(Boolean)
          )
        ]
      : [];

    if (
      !showtimeId ||
      seatIds.length === 0
    ) {
      return NextResponse.json(
        {
          message:
            'Thiếu thông tin ghế cần bỏ giữ.'
        },
        {
          status: 400
        }
      );
    }

    const userId =
      session?.user?.id ?? null;

    /**
     * Không đăng nhập → không cho bỏ hold.
     */
    if (!userId) {
      return NextResponse.json(
        {
          message:
            'Bạn cần đăng nhập để bỏ giữ ghế.'
        },
        {
          status: 401
        }
      );
    }

    /**
     * Chỉ xóa SeatHold của chính user.
     */
    const deleted =
      await prisma.seatHold.deleteMany({
        where: {
          showtimeId,
          seatId: {
            in: seatIds
          },
          userId
        }
      });

    return NextResponse.json({
      message:
        deleted.count > 0
          ? 'Đã bỏ giữ ghế.'
          : 'Không tìm thấy ghế đang được bạn giữ.',
      deletedCount: deleted.count
    });
  } catch (error) {
    console.error(
      'DELETE /api/seat-holds error:',
      error
    );

    return NextResponse.json(
      {
        message:
          'Không thể bỏ giữ ghế.'
      },
      {
        status: 500
      }
    );
  }
}