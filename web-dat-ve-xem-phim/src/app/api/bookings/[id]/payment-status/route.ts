import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';

import {
  BookingStatus,
  PaymentStatus,
} from '@prisma/client';

import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db/prisma';

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(
  _request: Request,
  context: RouteContext,
) {
  try {
    /* ========================================================
       1. SESSION
       ======================================================== */

    const session =
      await getServerSession(
        authOptions,
      );

    const user =
      session?.user;

    if (!user?.id) {
      return NextResponse.json(
        {
          success: false,
          message:
            'Bạn cần đăng nhập.',
        },
        {
          status: 401,
        },
      );
    }

    /* ========================================================
       2. PARAM
       ======================================================== */

    const { id } =
      await context.params;

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          message:
            'Thiếu id booking.',
        },
        {
          status: 400,
        },
      );
    }

    /* ========================================================
       3. BOOKING
       ======================================================== */

    const booking =
      await prisma.booking.findUnique({
        where: {
          id,
        },

        include: {
          payment: true,

          seatHolds: {
            include: {
              seat: true,
            },
          },

          tickets: {
            orderBy: {
              seatCode: 'asc',
            },
          },
        },
      });

    if (!booking) {
      return NextResponse.json(
        {
          success: false,
          message:
            'Không tìm thấy booking.',
        },
        {
          status: 404,
        },
      );
    }

    /* ========================================================
       4. PERMISSION
       ======================================================== */

    if (
      booking.userId !== user.id &&
      user.role !== 'ADMIN'
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            'Bạn không có quyền xem booking này.',
        },
        {
          status: 403,
        },
      );
    }

    /* ========================================================
       5. AUTO CANCEL EXPIRED BOOKING
       
       Booking chỉ được coi là hợp lệ khi:
       - PENDING
       - UNPAID
       - Có ít nhất 1 SeatHold
       - TẤT CẢ SeatHold còn hạn
       - Tất cả ghế còn active
       ======================================================== */

    if (
      booking.status ===
        BookingStatus.PENDING &&
      booking.paymentStatus ===
        PaymentStatus.UNPAID
    ) {
      const now =
        new Date();

      const validHolds =
        booking.seatHolds.filter(
          (hold) =>
            hold.expiresAt > now &&
            hold.seat.isActive,
        );

      const allHoldsValid =
        booking.seatHolds.length >
          0 &&
        validHolds.length ===
          booking.seatHolds.length;

      /* ======================================================
         HẾT HẠN
         ====================================================== */

      if (!allHoldsValid) {
        await prisma.$transaction(
          async (tx) => {
            /*
             * Giải phóng toàn bộ SeatHold
             */

            await tx.seatHold.deleteMany({
              where: {
                bookingId:
                  booking.id,
              },
            });

            /*
             * Hủy booking
             */

            await tx.booking.update({
              where: {
                id:
                  booking.id,
              },

              data: {
                status:
                  BookingStatus.CANCELED,
              },
            });
          },
        );

        console.log(
          '[Payment Status] Booking expired:',
          {
            bookingId:
              booking.id,

            bookingCode:
              booking.bookingCode,

            heldSeats:
              booking.seatHolds.map(
                (hold) =>
                  hold.seat.code,
              ),
          },
        );

        return NextResponse.json({
          success: true,

          expired: true,

          booking: {
            id:
              booking.id,

            bookingCode:
              booking.bookingCode,

            status:
              BookingStatus.CANCELED,

            paymentStatus:
              booking.paymentStatus,

            totalPrice:
              Number(
                booking.totalPrice,
              ),
          },

          tickets: [],

          payment:
            booking.payment
              ? {
                  status:
                    booking.payment
                      .status,

                  paidAt:
                    booking.payment
                      .paidAt,

                  transactionCode:
                    booking.payment
                      .transactionCode,
                }
              : null,

          message:
            'Thời gian giữ ghế đã hết. Phiên thanh toán đã bị hủy và ghế đã được giải phóng.',
        });
      }
    }

    /* ========================================================
       6. NORMAL RESPONSE
       ======================================================== */

    return NextResponse.json({
      success: true,

      expired: false,

      booking: {
        id:
          booking.id,

        bookingCode:
          booking.bookingCode,

        status:
          booking.status,

        paymentStatus:
          booking.paymentStatus,

        totalPrice:
          Number(
            booking.totalPrice,
          ),
      },

      tickets:
        booking.tickets.map(
          (ticket) => ({
            id:
              ticket.id,

            seatCode:
              ticket.seatCode,

            price:
              Number(
                ticket.price,
              ),

            status:
              ticket.status,
          }),
        ),

      payment:
        booking.payment
          ? {
              status:
                booking.payment
                  .status,

              paidAt:
                booking.payment
                  .paidAt,

              transactionCode:
                booking.payment
                  .transactionCode,
            }
          : null,
    });
  } catch (error) {
    console.error(
      'GET /api/bookings/[id]/payment-status error:',
      error,
    );

    return NextResponse.json(
      {
        success: false,
        message:
          'Không thể lấy trạng thái thanh toán.',
      },
      {
        status: 500,
      },
    );
  }
}