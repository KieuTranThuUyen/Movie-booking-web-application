import {
  BookingStatus,
  PaymentStatus,
  TicketStatus,
} from '@prisma/client';

import { NextResponse } from 'next/server';
import {
  getToken,
} from 'next-auth/jwt';
import type {
  NextRequest,
} from 'next/server';

import { prisma } from '@/lib/db/prisma';

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

type UpdateBookingBody = {
  status?: BookingStatus;
  paymentStatus?: PaymentStatus;
};

async function isAdmin(
  request: Request,
) {
  const token =
    await getToken({
      req:
        request as NextRequest,

      secret:
        process.env
          .NEXTAUTH_SECRET,
    });

  return (
    token?.role ===
    'ADMIN'
  );
}

function getBookingInclude() {
  return {
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

    tickets: {
      orderBy: {
        seatCode:
          'asc' as const,
      },
    },

    user: {
      select: {
        id: true,
        name: true,
        email: true,
      },
    },
  };
}

export async function PATCH(
  request: Request,
  context: RouteContext,
) {
  /* ==========================================================
     1. ADMIN CHECK
     ========================================================== */

  if (
    !(await isAdmin(
      request,
    ))
  ) {
    return NextResponse.json(
      {
        message:
          'Bạn không có quyền thực hiện thao tác này.',
      },
      {
        status: 403,
      },
    );
  }

  try {
    const { id } =
      await context.params;

    if (!id) {
      return NextResponse.json(
        {
          message:
            'Thiếu id đơn đặt vé.',
        },
        {
          status: 400,
        },
      );
    }

    const body =
      (await request.json()) as UpdateBookingBody;

    /* ========================================================
       2. KHÔNG CHO ADMIN ĐỔI PAYMENT STATUS
       ======================================================== */

    if (
      body.paymentStatus !==
      undefined
    ) {
      return NextResponse.json(
        {
          success: false,

          message:
            'Admin không được phép cập nhật trạng thái thanh toán. Thanh toán chỉ được xác nhận tự động qua SePay IPN.',
        },
        {
          status: 403,
        },
      );
    }

    /* ========================================================
       3. KHÔNG CHO ADMIN CONFIRM BOOKING
       ======================================================== */

    if (
      body.status ===
      BookingStatus.CONFIRMED
    ) {
      return NextResponse.json(
        {
          success: false,

          message:
            'Admin không được phép xác nhận thanh toán hoặc xác nhận booking. SePay IPN sẽ tự động xác nhận sau khi thanh toán thành công.',
        },
        {
          status: 403,
        },
      );
    }

    /* ========================================================
       4. BOOKING
       ======================================================== */

    const booking =
      await prisma.booking.findUnique({
        where: {
          id,
        },

        include: {
          showtime: true,

          tickets: true,

          payment: true,
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

    /* ========================================================
       5. SHOWTIME
       ======================================================== */

    const now =
      new Date();

    if (
      booking.showtime.startTime <=
      now
    ) {
      return NextResponse.json(
        {
          message:
            'Suất chiếu đã bắt đầu hoặc đã kết thúc. Không thể sửa đơn này.',
        },
        {
          status: 400,
        },
      );
    }

    /* ========================================================
       6. KHÔNG CHO HỦY LẠI
       ======================================================== */

    if (
      booking.status ===
        BookingStatus.CANCELED &&
      body.status ===
        BookingStatus.CANCELED
    ) {
      return NextResponse.json(
        {
          message:
            'Đơn đặt vé này đã bị hủy.',
        },
        {
          status: 400,
        },
      );
    }

    /* ========================================================
       7. HỦY TOÀN BỘ BOOKING
       ======================================================== */

    if (
      body.status ===
      BookingStatus.CANCELED
    ) {
      const activeTickets =
        booking.tickets.filter(
          (ticket) =>
            ticket.status ===
            TicketStatus.ACTIVE,
        );

      /*
       * Chỉ hoàn tiền nếu đã thực sự
       * được SePay xác nhận PAID.
       */

      const shouldRefund =
        booking.paymentStatus ===
          PaymentStatus.PAID ||
        booking.paymentStatus ===
          PaymentStatus.PARTIALLY_REFUNDED;

      const refundAmount =
        shouldRefund
          ? activeTickets.reduce(
              (sum, ticket) =>
                sum +
                Number(
                  ticket.price,
                ),
              0,
            )
          : 0;

      const nextRefundedAmount =
        Number(
          booking.refundedAmount,
        ) +
        refundAmount;

      const nextPaymentStatus =
        shouldRefund
          ? PaymentStatus.REFUNDED
          : booking.paymentStatus;

      const updated =
        await prisma.$transaction(
          async (tx) => {
            /*
             * Hủy ticket nếu có.
             */

            if (
              activeTickets.length >
              0
            ) {
              await tx.ticket.updateMany({
                where: {
                  bookingId:
                    id,

                  status:
                    TicketStatus.ACTIVE,
                },

                data: {
                  status:
                    TicketStatus.CANCELED,

                  canceledAt:
                    now,
                },
              });
            }

            /*
             * Giải phóng SeatHold
             * nếu vẫn còn.
             */

            await tx.seatHold.deleteMany({
              where: {
                bookingId:
                  id,
              },
            });

            /*
             * Hủy booking.
             */

            const updatedBooking =
              await tx.booking.update({
                where: {
                  id,
                },

                data: {
                  status:
                    BookingStatus.CANCELED,

                  totalPrice:
                    0,

                  refundedAmount:
                    nextRefundedAmount,

                  paymentStatus:
                    nextPaymentStatus,

                  ...(booking.payment &&
                  refundAmount > 0
                    ? {
                        payment: {
                          update: {
                            status:
                              'REFUNDED',

                            paidAt:
                              null,
                          },
                        },
                      }
                    : {}),
                },

                include:
                  getBookingInclude(),
              });

            return updatedBooking;
          },
        );

      return NextResponse.json({
        success: true,

        message:
          refundAmount > 0
            ? `Đã hủy toàn bộ đơn và hoàn ${refundAmount.toLocaleString(
                'vi-VN',
              )} đ.`
            : 'Đã hủy toàn bộ đơn đặt vé.',

        booking:
          updated,
      });
    }

    /* ========================================================
       8. ADMIN KHÔNG CÓ THAO TÁC
       NGOÀI HỦY BOOKING
       ======================================================== */

    return NextResponse.json(
      {
        success: false,

        message:
          'Không có thao tác quản trị hợp lệ. Thanh toán được xác nhận tự động bởi SePay IPN.',
      },
      {
        status: 400,
      },
    );
  } catch (error) {
    console.error(
      'PATCH /api/admin/bookings/[id] error:',
      error,
    );

    return NextResponse.json(
      {
        message:
          'Có lỗi xảy ra khi cập nhật đơn đặt vé.',
      },
      {
        status: 500,
      },
    );
  }
}