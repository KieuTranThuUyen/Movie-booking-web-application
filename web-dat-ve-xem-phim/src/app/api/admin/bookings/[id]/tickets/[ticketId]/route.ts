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
    ticketId: string;
  }>;
};

export async function DELETE(
  _request: Request,
  context: RouteContext
) {
  try {
    const { id, ticketId } =
      await context.params;

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
            'Suất chiếu đã bắt đầu hoặc đã kết thúc. Không thể hủy vé.',
        },
        {
          status: 400,
        }
      );
    }

    if (
      booking.status ===
      BookingStatus.CANCELED
    ) {
      return NextResponse.json(
        {
          message:
            'Đơn đặt vé này đã bị hủy.',
        },
        {
          status: 400,
        }
      );
    }

    const ticket =
      booking.tickets.find(
        (item) =>
          item.id === ticketId
      );

    if (!ticket) {
      return NextResponse.json(
        {
          message:
            'Không tìm thấy vé trong đơn đặt vé.',
        },
        {
          status: 404,
        }
      );
    }

    if (
      ticket.status ===
      TicketStatus.CANCELED
    ) {
      return NextResponse.json(
        {
          message:
            `Vé ghế ${ticket.seatCode} đã được hủy trước đó.`,
        },
        {
          status: 400,
        }
      );
    }

    const remainingActiveTickets =
      booking.tickets.filter(
        (item) =>
          item.status ===
            TicketStatus.ACTIVE &&
          item.id !== ticketId
      );

    /*
     * Chỉ hoàn tiền nếu booking
     * đã thanh toán.
     */
    const shouldRefund =
      booking.paymentStatus ===
        PaymentStatus.PAID ||
      booking.paymentStatus ===
        PaymentStatus.PARTIALLY_REFUNDED;

    const refundAmount =
      shouldRefund
        ? ticket.price
        : 0;

    const nextRefundedAmount =
      booking.refundedAmount +
      refundAmount;

    const remainingTotalPrice =
      remainingActiveTickets.reduce(
        (sum, item) =>
          sum + item.price,
        0
      );

    const nextBookingStatus =
      remainingActiveTickets.length ===
      0
        ? BookingStatus.CANCELED
        : booking.status;

    let nextPaymentStatus =
      booking.paymentStatus;

    if (shouldRefund) {
      nextPaymentStatus =
        remainingActiveTickets.length ===
        0
          ? PaymentStatus.REFUNDED
          : PaymentStatus.PARTIALLY_REFUNDED;
    }

    const updated =
      await prisma.$transaction(
        async (tx) => {
          /*
           * KHÔNG DELETE.
           */
          await tx.ticket.update({
            where: {
              id: ticketId,
            },

            data: {
              status:
                TicketStatus.CANCELED,

              canceledAt: now,
            },
          });

          const updatedBooking =
            await tx.booking.update({
              where: {
                id,
              },

              data: {
                status:
                  nextBookingStatus,

                totalPrice:
                  remainingTotalPrice,

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
                            nextPaymentStatus ===
                            PaymentStatus.REFUNDED
                              ? 'REFUNDED'
                              : 'PARTIALLY_REFUNDED',

                          paidAt:
                            nextPaymentStatus ===
                            PaymentStatus.REFUNDED
                              ? null
                              : booking
                                  .payment
                                  .paidAt,
                        },
                      },
                    }
                  : {}),
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

                tickets: {
                  orderBy: {
                    seatCode: 'asc',
                  },
                },
              },
            });

          return updatedBooking;
        }
      );

    return NextResponse.json({
      message:
        refundAmount > 0
          ? `Đã hủy vé ghế ${ticket.seatCode} và hoàn ${refundAmount.toLocaleString(
              'vi-VN'
            )} đ.`
          : `Đã hủy vé ghế ${ticket.seatCode}.`,

      booking: updated,
    });
  } catch (error) {
    console.error(
      'DELETE ticket error:',
      error
    );

    return NextResponse.json(
      {
        message:
          'Có lỗi xảy ra khi hủy vé.',
      },
      {
        status: 500,
      }
    );
  }
}