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
   POST - XÁC NHẬN THANH TOÁN DEMO

   Flow:

   Booking PENDING
       +
   Payment PENDING
       +
   SeatHold còn hạn
       ↓
   kiểm tra lại
       ↓
   tạo Ticket
       ↓
   Payment PAID
       ↓
   Booking CONFIRMED
       ↓
   xóa SeatHold
   ============================================================ */

export async function POST(
  request: Request,
  context: RouteContext,
) {
  try {
    /* ==========================================================
       KIỂM TRA ĐĂNG NHẬP
       ========================================================== */

    const session =
      await getServerSession(
        authOptions,
      );

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

    /* ==========================================================
       LẤY BOOKING ID
       ========================================================== */

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

    /* ==========================================================
       LẤY BOOKING
       ========================================================== */

    const booking =
      await prisma.booking.findUnique({
        where: {
          id,
        },

        include: {
          payment: true,

          tickets: true,

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

    /* ==========================================================
       KIỂM TRA QUYỀN

       Customer chỉ được thanh toán đơn của mình.
       ========================================================== */

    if (
      booking.userId !== userId
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

    /* ==========================================================
       ĐÃ THANH TOÁN

       Cho phép gọi API nhiều lần mà không tạo Ticket trùng.
       ========================================================== */

    if (
      booking.paymentStatus ===
        PaymentStatus.PAID &&
      booking.status ===
        BookingStatus.CONFIRMED
    ) {
      return NextResponse.json(
        {
          message:
            'Đơn vé đã được thanh toán.',
          bookingId:
            booking.id,
          bookingCode:
            booking.bookingCode,
          status:
            booking.status,
          paymentStatus:
            booking.paymentStatus,
          redirectTo:
            `/ve/${booking.id}`,
        },
        {
          status: 200,
        },
      );
    }

    /* ==========================================================
       KIỂM TRA BOOKING STATUS
       ========================================================== */

    if (
      booking.status ===
      BookingStatus.CANCELED
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

    /* ==========================================================
       KIỂM TRA PAYMENT
       ========================================================== */

    if (!booking.payment) {
      return NextResponse.json(
        {
          message:
            'Đơn đặt vé chưa có giao dịch thanh toán.',
        },
        {
          status: 409,
        },
      );
    }

    if (
      booking.payment.status !==
      'PENDING'
    ) {
      return NextResponse.json(
        {
          message:
            'Giao dịch thanh toán không còn ở trạng thái chờ xử lý.',
        },
        {
          status: 409,
        },
      );
    }

    /* ==========================================================
       KIỂM TRA SỐ TIỀN

       Payment.amount phải đúng Booking.totalPrice.
       ========================================================== */

    if (
      booking.payment.amount !==
      booking.totalPrice
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

    /* ==========================================================
       KIỂM TRA SHOWTIME
       ========================================================== */

    const now =
      new Date();

    if (
      booking.showtime.startTime <=
      now
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

    /* ==========================================================
       LẤY GHẾ TỪ SEAT HOLD

       Đây là nguồn xác nhận ghế trong lúc thanh toán.
       ========================================================== */

    const seatHolds =
      await prisma.seatHold.findMany({
        where: {
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
      });

    if (
      seatHolds.length === 0
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

    /* ==========================================================
       XÁC ĐỊNH GHẾ CỦA BOOKING

       Booking chưa có Ticket vì Ticket chỉ được tạo
       sau khi thanh toán.

       Vì vậy sử dụng SeatHold của user + showtime.
       ========================================================== */

    const heldSeatIds =
      seatHolds.map(
        (hold) =>
          hold.seatId,
      );

    /* ==========================================================
       KIỂM TRA GHẾ CÒN HOẠT ĐỘNG
       ========================================================== */

    const inactiveHeldSeats =
      seatHolds.filter(
        (hold) =>
          !hold.seat.isActive,
      );

    if (
      inactiveHeldSeats.length >
      0
    ) {
      return NextResponse.json(
        {
          message:
            `Ghế ${inactiveHeldSeats
              .map(
                (hold) =>
                  hold.seat.code,
              )
              .join(', ')} hiện không thể sử dụng.`,
        },
        {
          status: 409,
        },
      );
    }

    /* ==========================================================
       KIỂM TRA GHẾ ĐÃ BỊ BÁN

       Kiểm tra lần cuối trước transaction.
       ========================================================== */

    const occupiedTickets =
      await prisma.ticket.findMany({
        where: {
          seatId: {
            in: heldSeatIds,
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
      occupiedTickets.length >
      0
    ) {
      return NextResponse.json(
        {
          message:
            `Ghế ${occupiedTickets
              .map(
                (ticket) =>
                  ticket.seatCode,
              )
              .join(', ')} đã được người khác đặt.`,
        },
        {
          status: 409,
        },
      );
    }

    /* ==========================================================
       TÍNH LẠI GIÁ

       Không tin giá từ frontend.
       ========================================================== */

    const getSeatPrice = (
      seatType: string,
    ): number => {
      switch (
        seatType.toUpperCase()
      ) {
        case 'VIP':
          return booking.showtime
            .vipPrice;

        case 'COUPLE':
          return booking.showtime
            .couplePrice;

        case 'STANDARD':
        default:
          return booking.showtime
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

    /* ==========================================================
       KIỂM TRA TOTAL
       ========================================================== */

    if (
      calculatedTotal !==
      booking.totalPrice
    ) {
      return NextResponse.json(
        {
          message:
            'Tổng tiền đơn hàng không khớp với giá hiện tại. Vui lòng tạo lại đơn.',
        },
        {
          status: 409,
        },
      );
    }

    /* ==========================================================
       TRANSACTION

       Đây là bước hoàn tất thanh toán.
       ========================================================== */

    const result =
      await prisma.$transaction(
        async (tx) => {
          /* ----------------------------------------------------
             LẤY LẠI BOOKING
             ---------------------------------------------------- */

          const latestBooking =
            await tx.booking.findUnique({
              where: {
                id: booking.id,
              },

              include: {
                payment: true,

                showtime: {
                  include: {
                    hall: {
                      include: {
                        seats: true,
                      },
                    },
                  },
                },
              },
            });

          if (!latestBooking) {
            throw new Error(
              'BOOKING_NOT_FOUND',
            );
          }

          /* ----------------------------------------------------
             KIỂM TRA LẠI STATUS
             ---------------------------------------------------- */

          if (
            latestBooking.paymentStatus ===
              PaymentStatus.PAID &&
            latestBooking.status ===
              BookingStatus.CONFIRMED
          ) {
            return latestBooking;
          }

          if (
            latestBooking.status ===
            BookingStatus.CANCELED
          ) {
            throw new Error(
              'BOOKING_CANCELED',
            );
          }

          if (
            !latestBooking.payment
          ) {
            throw new Error(
              'PAYMENT_NOT_FOUND',
            );
          }

          if (
            latestBooking.payment.status !==
            'PENDING'
          ) {
            throw new Error(
              'PAYMENT_NOT_PENDING',
            );
          }

          /* ----------------------------------------------------
             KIỂM TRA HOLD LẠI TRONG TRANSACTION
             ---------------------------------------------------- */

          const latestHolds =
            await tx.seatHold.findMany({
              where: {
                showtimeId:
                  latestBooking.showtimeId,

                userId,

                expiresAt: {
                  gt: new Date(),
                },
              },

              include: {
                seat: true,
              },
            });

          if (
            latestHolds.length !==
            seatHolds.length
          ) {
            throw new Error(
              'SEAT_HOLD_EXPIRED',
            );
          }

          /* ----------------------------------------------------
             KIỂM TRA GHẾ ĐÃ BÁN LẠI
             ---------------------------------------------------- */

          const latestOccupiedTickets =
            await tx.ticket.findMany({
              where: {
                seatId: {
                  in: latestHolds.map(
                    (hold) =>
                      hold.seatId,
                  ),
                },

                booking: {
                  showtimeId:
                    latestBooking.showtimeId,

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
                    ticket.seatCode,
                )
                .join(',')}`,
            );
          }

          /* ----------------------------------------------------
             TẠO TICKET
             ---------------------------------------------------- */

          await tx.ticket.createMany({
            data: latestHolds.map(
              (hold) => ({
                bookingId:
                  latestBooking.id,

                seatId:
                  hold.seatId,

                seatCode:
                  hold.seat.code,

                price:
                  getSeatPrice(
                    String(
                      hold.seat.type,
                    ),
                  ),

                qrCode:
                  `${latestBooking.bookingCode}-${hold.seat.code}`,
              }),
            ),
          });

          /* ----------------------------------------------------
             PAYMENT -> PAID
             ---------------------------------------------------- */

          await tx.payment.update({
            where: {
              id:
                latestBooking
                  .payment.id,
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

          /* ----------------------------------------------------
             BOOKING -> CONFIRMED
             ---------------------------------------------------- */

          const updatedBooking =
            await tx.booking.update({
              where: {
                id:
                  latestBooking.id,
              },

              data: {
                status:
                  BookingStatus.CONFIRMED,

                paymentStatus:
                  PaymentStatus.PAID,
              },
            });

          /* ----------------------------------------------------
             XÓA SEAT HOLD
             ---------------------------------------------------- */

          await tx.seatHold.deleteMany({
            where: {
              showtimeId:
                latestBooking.showtimeId,

              userId,

              seatId: {
                in: latestHolds.map(
                  (hold) =>
                    hold.seatId,
                ),
              },
            },
          });

          return updatedBooking;
        },
      );

    /* ==========================================================
       SUCCESS
       ========================================================== */

    return NextResponse.json(
      {
        message:
          'Thanh toán Demo thành công.',

        bookingId:
          result.id,

        bookingCode:
          result.bookingCode,

        status:
          result.status,

        paymentStatus:
          result.paymentStatus,

        redirectTo:
          `/ve/${result.id}`,
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

    /* ==========================================================
       BOOKING NOT FOUND
       ========================================================== */

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

    /* ==========================================================
       BOOKING CANCELED
       ========================================================== */

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

    /* ==========================================================
       PAYMENT
       ========================================================== */

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

    /* ==========================================================
       SEAT HOLD
       ========================================================== */

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

    /* ==========================================================
       SEAT SOLD
       ========================================================== */

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

    /* ==========================================================
       LỖI CHUNG
       ========================================================== */

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