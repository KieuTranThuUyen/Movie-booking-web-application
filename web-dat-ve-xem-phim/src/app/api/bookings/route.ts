import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import {
  BookingStatus,
  PaymentStatus,
} from '@prisma/client';

import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const bookings = await prisma.booking.findMany({
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        showtime: {
          include: {
            movie: true,
            hall: {
              include: {
                cinema: true,
              },
            },
          },
        },
        tickets: true,
      },
    });

    const result = bookings.map((booking) => ({
      id: booking.id,
      bookingCode: booking.bookingCode,
      customerName: booking.customerName,
      customerEmail: booking.customerEmail,
      customerPhone: booking.customerPhone,
      status: booking.status,
      paymentStatus: booking.paymentStatus,
      totalPrice: booking.totalPrice,
      createdAt: booking.createdAt,

      movieTitle: booking.showtime.movie.title,

      showtimeLabel:
        `${booking.showtime.movie.title} · ` +
        `${booking.showtime.hall.cinema.name} · ` +
        `${booking.showtime.hall.name} · ` +
        `${new Date(
          booking.showtime.startTime
        ).toLocaleString('vi-VN')}`,

      seats: booking.tickets.map(
        (ticket) => ticket.seatCode
      ),
    }));

    return NextResponse.json(result);
  } catch (error) {
    console.error(
      'GET /api/bookings error:',
      error
    );

    return NextResponse.json(
      {
        message:
          'Không thể lấy danh sách đơn đặt vé.',
      },
      {
        status: 500,
      }
    );
  }
}

export async function POST(request: Request) {
  try {
    const session =
      await getServerSession(authOptions);

    const userId =
      session?.user?.id ?? null;

    if (!userId) {
      return NextResponse.json(
        {
          message:
            'Bạn cần đăng nhập trước khi thanh toán.',
        },
        {
          status: 401,
        }
      );
    }

    const body =
      (await request.json()) as Record<
        string,
        string | number | undefined
      >;

    const requiredFields = [
      'fullName',
      'phone',
      'email',
      'address',
      'city',
      'district',
      'paymentMethod',
      'showtimeId',
      'seats',
    ] as const;

    const missingField =
      requiredFields.find(
        (field) => !body[field]
      );

    if (missingField) {
      return NextResponse.json(
        {
          message:
            'Vui lòng hoàn tất thông tin thanh toán.',
        },
        {
          status: 400,
        }
      );
    }

    const showtimeId = String(
      body.showtimeId ?? ''
    );

    const selectedSeatCodes = String(
      body.seats ?? ''
    )
      .split(',')
      .map((seatCode) =>
        seatCode.trim()
      )
      .filter(Boolean);

    const uniqueSeatCodes = [
      ...new Set(selectedSeatCodes),
    ];

    if (
      !showtimeId ||
      uniqueSeatCodes.length === 0
    ) {
      return NextResponse.json(
        {
          message:
            'Vui lòng chọn suất chiếu và ghế trước khi thanh toán.',
        },
        {
          status: 400,
        }
      );
    }

    const showtime =
      await prisma.showtime.findUnique({
        where: {
          id: showtimeId,
        },
        include: {
          hall: {
            include: {
              seats: true,
              cinema: true,
            },
          },
          movie: true,
        },
      });

    if (!showtime) {
      return NextResponse.json(
        {
          message:
            'Không tìm thấy suất chiếu tương ứng.',
        },
        {
          status: 404,
        }
      );
    }

    const selectedSeats =
      showtime.hall.seats.filter(
        (seat) =>
          uniqueSeatCodes.includes(
            seat.code
          )
      );

    if (
      selectedSeats.length !==
      uniqueSeatCodes.length
    ) {
      return NextResponse.json(
        {
          message:
            'Có ghế không tồn tại trong phòng chiếu này.',
        },
        {
          status: 400,
        }
      );
    }

    const inactiveSeats =
      selectedSeats.filter(
        (seat) => !seat.isActive
      );

    if (inactiveSeats.length > 0) {
      return NextResponse.json(
        {
          message:
            `Ghế ${inactiveSeats
              .map(
                (seat) => seat.code
              )
              .join(
                ', '
              )} đang bị khóa bởi quản trị viên.`,
        },
        {
          status: 409,
        }
      );
    }

    const now = new Date();

    await prisma.seatHold.deleteMany({
      where: {
        showtimeId,
        expiresAt: {
          lte: now,
        },
      },
    });

    /*
     * Kiểm tra ghế đã bán.
     */
    const occupiedTickets =
      await prisma.ticket.findMany({
        where: {
          seatId: {
            in: selectedSeats.map(
              (seat) => seat.id
            ),
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

    if (occupiedTickets.length > 0) {
      return NextResponse.json(
        {
          message:
            `Ghế ${occupiedTickets
              .map(
                (ticket) =>
                  ticket.seatCode
              )
              .join(
                ', '
              )} đã được đặt.`,
        },
        {
          status: 409,
        }
      );
    }

    /*
     * Chỉ lấy SeatHold của chính user
     * cho đúng các ghế đang thanh toán.
     */
    const myHolds =
      await prisma.seatHold.findMany({
        where: {
          showtimeId,
          userId,
          seatId: {
            in: selectedSeats.map(
              (seat) => seat.id
            ),
          },
          expiresAt: {
            gt: now,
          },
        },
        select: {
          seatId: true,
          expiresAt: true,
        },
      });

    const heldSeatIds = new Set(
      myHolds.map(
        (hold) => hold.seatId
      )
    );

    /*
     * Nếu frontend gửi A,B,C,G
     * nhưng user chỉ đang giữ B,C,G
     * thì không cho thanh toán A.
     */
    const missingHeldSeats =
      selectedSeats.filter(
        (seat) =>
          !heldSeatIds.has(
            seat.id
          )
      );

    if (
      missingHeldSeats.length > 0
    ) {
      return NextResponse.json(
        {
          message:
            `Ghế ${missingHeldSeats
              .map(
                (seat) =>
                  seat.code
              )
              .join(
                ', '
              )} không còn được bạn giữ. Vui lòng quay lại chọn ghế.`,
        },
        {
          status: 409,
        }
      );
    }

    /*
     * Tính tiền từ database.
     */
    const subtotal =
      selectedSeats.length *
      Number(showtime.basePrice);

    const bookingFee = Number(
      body.bookingFee ?? 0
    );

    const totalPrice =
      subtotal + bookingFee;

    const paymentMethod =
      String(
        body.paymentMethod ?? 'COD'
      );

    const bookingCode =
      `BK${Date.now()
        .toString()
        .slice(-8)}${Math.floor(
        Math.random() * 900 + 100
      )}`;

    const booking =
      await prisma.$transaction(
        async (tx) => {
          /*
           * Kiểm tra lại ghế trong transaction.
           */
          const latestOccupiedTickets =
            await tx.ticket.findMany({
              where: {
                seatId: {
                  in: selectedSeats.map(
                    (seat) =>
                      seat.id
                  ),
                },
                booking: {
                  showtimeId,
                  status: {
                    not:
                      BookingStatus.CANCELED,
                  },
                },
              },
              select: {
                seatCode: true,
              },
            });

          if (
            latestOccupiedTickets.length >
            0
          ) {
            throw new Error(
              `SEAT_ALREADY_SOLD:${latestOccupiedTickets
                .map(
                  (ticket) =>
                    ticket.seatCode
                )
                .join(',')}`
            );
          }

          /*
           * Tạo booking mới.
           */
          const createdBooking =
            await tx.booking.create({
              data: {
                bookingCode,
                userId,
                showtimeId,

                customerName:
                  String(
                    body.fullName ??
                      session.user?.name ??
                      ''
                  ),

                customerPhone:
                  String(
                    body.phone ??
                      session.user?.phone ??
                      ''
                  ),

                customerEmail:
                  String(
                    body.email ??
                      session.user?.email ??
                      ''
                  ),

                note: body.note
                  ? String(
                      body.note
                    )
                  : null,

                paymentMethod,
                totalPrice,

                status:
                  BookingStatus.PENDING,

                paymentStatus:
                  PaymentStatus.UNPAID,
              },
            });

          /*
           * Chỉ tạo ticket cho ghế
           * của booking hiện tại.
           */
          await tx.ticket.createMany({
            data: selectedSeats.map(
              (seat) => ({
                bookingId:
                  createdBooking.id,

                seatId:
                  seat.id,

                seatCode:
                  seat.code,

                price:
                  Number(
                    showtime.basePrice
                  ),

                qrCode:
                  `${createdBooking.bookingCode}-${seat.code}`,
              })
            ),
          });

          /*
           * Tạo payment.
           */
          await tx.payment.create({
            data: {
              bookingId:
                createdBooking.id,

              provider:
                paymentMethod,

              amount:
                totalPrice,

              status:
                'PENDING',
            },
          });

          /*
           * Xóa CHỈ các SeatHold
           * của booking hiện tại.
           */
          await tx.seatHold.deleteMany({
            where: {
              showtimeId,
              userId,
              seatId: {
                in: selectedSeats.map(
                  (seat) =>
                    seat.id
                ),
              },
            },
          });

          return createdBooking;
        }
      );

    return NextResponse.json({
      message:
        'Tạo đơn đặt vé thành công.',

      redirectTo:
        `/don-hang?booking=${booking.id}`,

      bookingId:
        booking.id,

      bookingCode:
        booking.bookingCode,
    });
  } catch (error) {
    console.error(
      'POST /api/bookings error:',
      error
    );

    if (
      error instanceof Error &&
      error.message.startsWith(
        'SEAT_ALREADY_SOLD:'
      )
    ) {
      const seats =
        error.message.replace(
          'SEAT_ALREADY_SOLD:',
          ''
        );

      return NextResponse.json(
        {
          message:
            `Ghế ${seats} vừa được người khác đặt. Vui lòng chọn ghế khác.`,
        },
        {
          status: 409,
        }
      );
    }

    return NextResponse.json(
      {
        message:
          'Không thể tạo đơn đặt vé. Vui lòng thử lại.',
      },
      {
        status: 500,
      }
    );
  }
}