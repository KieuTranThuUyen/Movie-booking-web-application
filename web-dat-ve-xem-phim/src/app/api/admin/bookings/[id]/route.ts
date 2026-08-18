import {
  BookingStatus,
  PaymentStatus,
  TicketStatus,
} from '@prisma/client';

import { NextResponse } from 'next/server';

import { prisma } from '@/lib/prisma';

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

type UpdateBookingBody = {
  status?: BookingStatus;
  paymentStatus?: PaymentStatus;
};

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
        seatCode: 'asc' as const,
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
  context: RouteContext
) {
  try {
    const { id } = await context.params;

    const body =
      (await request.json()) as UpdateBookingBody;

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
        }
      );
    }

    const now = new Date();

    if (
      booking.showtime.startTime <= now
    ) {
      return NextResponse.json(
        {
          message:
            'Suất chiếu đã bắt đầu hoặc đã kết thúc. Không thể sửa đơn này.',
        },
        {
          status: 400,
        }
      );
    }

    /*
     * Không cho xác nhận lại booking đã hủy.
     */
    if (
      booking.status ===
        BookingStatus.CANCELED &&
      body.status ===
        BookingStatus.CONFIRMED
    ) {
      return NextResponse.json(
        {
          message:
            'Đơn đã hủy không thể chuyển sang xác nhận.',
        },
        {
          status: 400,
        }
      );
    }

    /*
     * ============================
     * HỦY TOÀN BỘ BOOKING
     * ============================
     */
    if (
      body.status ===
      BookingStatus.CANCELED
    ) {
      const activeTickets =
        booking.tickets.filter(
          (ticket) =>
            ticket.status ===
            TicketStatus.ACTIVE
        );

      /*
       * Chỉ hoàn tiền nếu booking
       * đã thanh toán.
       */
      const refundAmount =
        booking.paymentStatus ===
          PaymentStatus.PAID ||
        booking.paymentStatus ===
          PaymentStatus.PARTIALLY_REFUNDED
          ? activeTickets.reduce(
              (sum, ticket) =>
                sum + ticket.price,
              0
            )
          : 0;

      const nextRefundedAmount =
        booking.refundedAmount +
        refundAmount;

      const nextPaymentStatus =
        booking.paymentStatus ===
          PaymentStatus.UNPAID
          ? PaymentStatus.UNPAID
          : PaymentStatus.REFUNDED;

      const updated =
        await prisma.$transaction(
          async (tx) => {
            /*
             * Giữ Ticket.
             * Chỉ đổi status.
             */
            if (
              activeTickets.length > 0
            ) {
              await tx.ticket.updateMany({
                where: {
                  bookingId: id,
                  status:
                    TicketStatus.ACTIVE,
                },

                data: {
                  status:
                    TicketStatus.CANCELED,

                  canceledAt: now,
                },
              });
            }

            const updatedBooking =
              await tx.booking.update({
                where: {
                  id,
                },

                data: {
                  status:
                    BookingStatus.CANCELED,

                  totalPrice: 0,

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

                            paidAt: null,
                          },
                        },
                      }
                    : {}),
                },

                include:
                  getBookingInclude(),
              });

            return updatedBooking;
          }
        );

      return NextResponse.json({
        message:
          refundAmount > 0
            ? `Đã hủy toàn bộ đơn và hoàn ${refundAmount.toLocaleString(
                'vi-VN'
              )} đ.`
            : 'Đã hủy toàn bộ đơn đặt vé.',

        booking: updated,
      });
    }

    /*
     * ============================
     * CẬP NHẬT THÔNG THƯỜNG
     * ============================
     */

    const nextStatus =
      body.status ??
      booking.status;

    const nextPaymentStatus =
      body.paymentStatus ??
      booking.paymentStatus;

    const updated =
      await prisma.booking.update({
        where: {
          id,
        },

        data: {
          status: nextStatus,

          paymentStatus:
            nextPaymentStatus,

          ...(body.paymentStatus !==
            undefined &&
          booking.payment
            ? {
                payment: {
                  update: {
                    status:
                      nextPaymentStatus ===
                      PaymentStatus.PAID
                        ? 'PAID'
                        : nextPaymentStatus ===
                            PaymentStatus.REFUNDED
                          ? 'REFUNDED'
                          : nextPaymentStatus ===
                              PaymentStatus.PARTIALLY_REFUNDED
                            ? 'PARTIALLY_REFUNDED'
                            : 'PENDING',

                    paidAt:
                      nextPaymentStatus ===
                      PaymentStatus.PAID
                        ? new Date()
                        : booking.payment
                            .paidAt,
                  },
                },
              }
            : {}),
        },

        include:
          getBookingInclude(),
      });

    return NextResponse.json({
      message:
        'Cập nhật đơn đặt vé thành công.',

      booking: updated,
    });
  } catch (error) {
    console.error(
      'PATCH /api/admin/bookings/[id] error:',
      error
    );

    return NextResponse.json(
      {
        message:
          'Có lỗi xảy ra khi cập nhật đơn đặt vé.',
      },
      {
        status: 500,
      }
    );
  }
}