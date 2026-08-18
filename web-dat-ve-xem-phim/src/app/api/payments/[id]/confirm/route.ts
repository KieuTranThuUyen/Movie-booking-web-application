import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';

import {
  BookingStatus,
  PaymentStatus,
} from '@prisma/client';

import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

/* ============================================================
   POST - CONFIRM DEMO PAYMENT
   ============================================================ */

export async function POST(
  request: Request,
  context: RouteContext,
) {
  try {
    const session =
      await getServerSession(authOptions);

    const userId =
      session?.user?.id;

    if (!userId) {
      return NextResponse.json(
        {
          message:
            'Bạn cần đăng nhập.',
        },
        {
          status: 401,
        },
      );
    }

    const { id } =
      await context.params;

    if (!id) {
      return NextResponse.json(
        {
          message:
            'Thiếu mã đơn đặt vé.',
        },
        {
          status: 400,
        },
      );
    }

    /* ========================================================
       TRANSACTION
       ======================================================== */

    const result =
      await prisma.$transaction(
        async (tx) => {
          /* ==================================================
             BOOKING
             ================================================== */

          const booking =
            await tx.booking.findUnique({
              where: {
                id,
              },

              include: {
                payment: true,

                tickets: true,

                seatHolds: {
                  include: {
                    seat: true,
                  },
                },

                showtime: {
                  include: {
                    movie: true,

                    hall: {
                      include: {
                        seats: true,
                        cinema: true,
                      },
                    },
                  },
                },
              },
            });

          if (!booking) {
            throw new Error(
              'BOOKING_NOT_FOUND',
            );
          }

          /* ==================================================
             QUYỀN
             ================================================== */

          if (
            booking.userId !==
            userId
          ) {
            throw new Error(
              'FORBIDDEN',
            );
          }

          /* ==================================================
             IDEMPOTENCY
             ================================================== */

          if (
            booking.paymentStatus ===
              PaymentStatus.PAID &&
            booking.status ===
              BookingStatus.CONFIRMED
          ) {
            return {
              booking,
              alreadyPaid: true,
            };
          }

          /* ==================================================
             BOOKING STATUS
             ================================================== */

          if (
            booking.status ===
            BookingStatus.CANCELED
          ) {
            throw new Error(
              'BOOKING_CANCELED',
            );
          }

          if (
            booking.status !==
            BookingStatus.PENDING
          ) {
            throw new Error(
              'BOOKING_NOT_PENDING',
            );
          }

          /* ==================================================
             PAYMENT
             ================================================== */

          if (!booking.payment) {
            throw new Error(
              'PAYMENT_NOT_FOUND',
            );
          }

          if (
            booking.payment.status !==
            'PENDING'
          ) {
            throw new Error(
              'PAYMENT_NOT_PENDING',
            );
          }

          if (
            booking.payment.amount !==
            booking.totalPrice
          ) {
            throw new Error(
              'PAYMENT_AMOUNT_INVALID',
            );
          }

          /* ==================================================
             SHOWTIME
             ================================================== */

          const now =
            new Date();

          if (
            booking.showtime.startTime <=
            now
          ) {
            throw new Error(
              'SHOWTIME_STARTED',
            );
          }

          /* ==================================================
             SEAT HOLD

             QUAN TRỌNG:
             Chỉ lấy SeatHold thuộc booking này.
             ================================================== */

          const seatHolds =
            await tx.seatHold.findMany({
              where: {
                bookingId:
                  booking.id,

                showtimeId:
                  booking.showtimeId,

                userId,

                expiresAt: {
                  gt: now,
                },
              },

              include: {
                seat: true,
              },

              orderBy: {
                seatId: 'asc',
              },
            });

          if (
            seatHolds.length === 0
          ) {
            throw new Error(
              'SEAT_HOLD_EXPIRED',
            );
          }

          /* ==================================================
             GHẾ ACTIVE
             ================================================== */

          const inactiveSeats =
            seatHolds.filter(
              (hold) =>
                !hold.seat.isActive,
            );

          if (
            inactiveSeats.length > 0
          ) {
            throw new Error(
              `SEAT_INACTIVE:${inactiveSeats
                .map(
                  (hold) =>
                    hold.seat.code,
                )
                .join(',')}`,
            );
          }

          /* ==================================================
             TÍNH GIÁ
             ================================================== */

          const getSeatPrice =
            (seatType: string) => {
              switch (
                seatType.toUpperCase()
              ) {
                case 'VIP':
                  return booking
                    .showtime
                    .vipPrice;

                case 'COUPLE':
                  return booking
                    .showtime
                    .couplePrice;

                case 'STANDARD':
                default:
                  return booking
                    .showtime
                    .standardPrice;
              }
            };

          const calculatedSubtotal =
            seatHolds.reduce(
              (
                total,
                hold,
              ) =>
                total +
                getSeatPrice(
                  String(
                    hold.seat.type,
                  ),
                ),
              0,
            );

          const bookingFee = 0;

          const calculatedTotal =
            calculatedSubtotal +
            bookingFee;

          if (
            calculatedTotal !==
            booking.totalPrice
          ) {
            throw new Error(
              'TOTAL_INVALID',
            );
          }

          /* ==================================================
             GHẾ ĐÃ BÁN
             ================================================== */

          const occupiedTickets =
            await tx.ticket.findMany({
              where: {
                seatId: {
                  in: seatHolds.map(
                    (hold) =>
                      hold.seatId,
                  ),
                },

                booking: {
                  showtimeId:
                    booking.showtimeId,

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
            occupiedTickets.length > 0
          ) {
            throw new Error(
              `SEAT_ALREADY_SOLD:${occupiedTickets
                .map(
                  (ticket) =>
                    ticket.seatCode,
                )
                .join(',')}`,
            );
          }

          /* ==================================================
             TICKET ĐÃ TỒN TẠI
             ================================================== */

          if (
            booking.tickets.length > 0
          ) {
            throw new Error(
              'TICKETS_ALREADY_EXIST',
            );
          }

          /* ==================================================
             TẠO TICKET
             ================================================== */

          await tx.ticket.createMany({
            data: seatHolds.map(
              (hold) => {
                const price =
                  getSeatPrice(
                    String(
                      hold.seat.type,
                    ),
                  );

                return {
                  bookingId:
                    booking.id,

                  seatId:
                    hold.seatId,

                  seatCode:
                    hold.seat.code,

                  price,

                  qrCode:
                    `${booking.bookingCode}-${hold.seat.code}`,
                };
              },
            ),
          });

          /* ==================================================
             PAYMENT -> PAID
             ================================================== */

          await tx.payment.update({
            where: {
              id:
                booking.payment.id,
            },

            data: {
              status:
                'PAID',

              paidAt:
                new Date(),

              transactionCode:
                `DEMO-${Date.now()}`,
            },
          });

          /* ==================================================
             BOOKING -> CONFIRMED
             ================================================== */

          const updatedBooking =
            await tx.booking.update({
              where: {
                id:
                  booking.id,
              },

              data: {
                status:
                  BookingStatus.CONFIRMED,

                paymentStatus:
                  PaymentStatus.PAID,
              },
            });

          /* ==================================================
             XÓA HOLD
             ================================================== */

          await tx.seatHold.deleteMany({
            where: {
              bookingId:
                booking.id,
            },
          });

          return {
            booking:
              updatedBooking,

            alreadyPaid: false,
          };
        },
      );

    /* ========================================================
       ALREADY PAID
       ======================================================== */

    if (
      result.alreadyPaid
    ) {
      return NextResponse.json(
        {
          message:
            'Đơn vé đã được thanh toán.',

          bookingId:
            result.booking.id,

          bookingCode:
            result.booking
              .bookingCode,

          status:
            result.booking.status,

          paymentStatus:
            result.booking
              .paymentStatus,

          redirectTo:
            `/ve/${result.booking.id}`,
        },
        {
          status: 200,
        },
      );
    }

    /* ========================================================
       SUCCESS
       ======================================================== */

    return NextResponse.json(
      {
        message:
          'Thanh toán Demo thành công.',

        bookingId:
          result.booking.id,

        bookingCode:
          result.booking
            .bookingCode,

        status:
          result.booking.status,

        paymentStatus:
          result.booking
            .paymentStatus,

        redirectTo:
          `/ve/${result.booking.id}`,
      },
      {
        status: 200,
      },
    );
  } catch (error) {
    console.error(
      'POST /api/payments/[id]/confirm error:',
      error,
    );

    if (
      error instanceof Error &&
      error.message ===
        'BOOKING_NOT_FOUND'
    ) {
      return NextResponse.json(
        {
          message:
            'Không tìm thấy đơn đặt vé.',
        },
        {
          status: 404,
        },
      );
    }

    if (
      error instanceof Error &&
      error.message ===
        'FORBIDDEN'
    ) {
      return NextResponse.json(
        {
          message:
            'Bạn không có quyền thanh toán đơn này.',
        },
        {
          status: 403,
        },
      );
    }

    if (
      error instanceof Error &&
      error.message ===
        'BOOKING_CANCELED'
    ) {
      return NextResponse.json(
        {
          message:
            'Đơn đặt vé đã bị hủy.',
        },
        {
          status: 409,
        },
      );
    }

    if (
      error instanceof Error &&
      error.message ===
        'BOOKING_NOT_PENDING'
    ) {
      return NextResponse.json(
        {
          message:
            'Đơn đặt vé không còn ở trạng thái chờ thanh toán.',
        },
        {
          status: 409,
        },
      );
    }

    if (
      error instanceof Error &&
      error.message ===
        'PAYMENT_NOT_FOUND'
    ) {
      return NextResponse.json(
        {
          message:
            'Không tìm thấy giao dịch thanh toán.',
        },
        {
          status: 409,
        },
      );
    }

    if (
      error instanceof Error &&
      error.message ===
        'PAYMENT_NOT_PENDING'
    ) {
      return NextResponse.json(
        {
          message:
            'Giao dịch không còn ở trạng thái chờ thanh toán.',
        },
        {
          status: 409,
        },
      );
    }

    if (
      error instanceof Error &&
      error.message ===
        'PAYMENT_AMOUNT_INVALID'
    ) {
      return NextResponse.json(
        {
          message:
            'Số tiền thanh toán không hợp lệ.',
        },
        {
          status: 409,
        },
      );
    }

    if (
      error instanceof Error &&
      error.message ===
        'SHOWTIME_STARTED'
    ) {
      return NextResponse.json(
        {
          message:
            'Suất chiếu đã bắt đầu. Không thể thanh toán.',
        },
        {
          status: 409,
        },
      );
    }

    if (
      error instanceof Error &&
      error.message ===
        'SEAT_HOLD_EXPIRED'
    ) {
      return NextResponse.json(
        {
          message:
            'Thời gian giữ ghế đã hết. Vui lòng quay lại chọn ghế.',
        },
        {
          status: 409,
        },
      );
    }

    if (
      error instanceof Error &&
      error.message.startsWith(
        'SEAT_INACTIVE:',
      )
    ) {
      const seats =
        error.message.replace(
          'SEAT_INACTIVE:',
          '',
        );

      return NextResponse.json(
        {
          message:
            `Ghế ${seats} hiện không thể sử dụng.`,
        },
        {
          status: 409,
        },
      );
    }

    if (
      error instanceof Error &&
      error.message.startsWith(
        'SEAT_ALREADY_SOLD:',
      )
    ) {
      const seats =
        error.message.replace(
          'SEAT_ALREADY_SOLD:',
          '',
        );

      return NextResponse.json(
        {
          message:
            `Ghế ${seats} vừa được người khác đặt. Vui lòng chọn ghế khác.`,
        },
        {
          status: 409,
        },
      );
    }

    if (
      error instanceof Error &&
      error.message ===
        'TICKETS_ALREADY_EXIST'
    ) {
      return NextResponse.json(
        {
          message:
            'Vé của đơn hàng đã tồn tại. Không thể tạo vé trùng.',
        },
        {
          status: 409,
        },
      );
    }

    if (
      error instanceof Error &&
      error.message ===
        'TOTAL_INVALID'
    ) {
      return NextResponse.json(
        {
          message:
            'Tổng tiền đơn hàng không hợp lệ. Vui lòng tạo lại đơn.',
        },
        {
          status: 409,
        },
      );
    }

    return NextResponse.json(
      {
        message:
          'Không thể xác nhận thanh toán. Vui lòng thử lại.',
      },
      {
        status: 500,
      },
    );
  }
}
