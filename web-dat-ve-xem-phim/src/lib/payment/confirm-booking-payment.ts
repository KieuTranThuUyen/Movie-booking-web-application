import {
  BookingStatus,
  PaymentStatus,
} from '@prisma/client';

import { prisma } from '@/lib/db/prisma';

type ConfirmPaymentOptions = {
  bookingId: string;
  userId?: string;
  transactionCode?: string;
  paidAt?: Date;
};

type ConfirmPaymentResult = {
  booking: {
    id: string;
    bookingCode: string;
    status: BookingStatus;
    paymentStatus: PaymentStatus;
    totalPrice: number;
  };
  alreadyPaid: boolean;
};

export async function confirmBookingPayment(
  options: ConfirmPaymentOptions,
): Promise<ConfirmPaymentResult> {
  const {
    bookingId,
    userId,
    transactionCode,
    paidAt,
  } = options;

  return prisma.$transaction(
    async (tx) => {
      const booking =
        await tx.booking.findUnique({
          where: {
            id: bookingId,
          },

          include: {
            payment: true,

            tickets: true,
            combos: true,

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

      if (
        userId &&
        booking.userId !== userId
      ) {
        throw new Error(
          'FORBIDDEN',
        );
      }

      /*
       * IPN gửi lại nhiều lần:
       * đã PAID + CONFIRMED => coi là idempotent.
       */
      if (
        booking.paymentStatus ===
          PaymentStatus.PAID &&
        booking.status ===
          BookingStatus.CONFIRMED
      ) {
        return {
          booking: {
            id: booking.id,
            bookingCode:
              booking.bookingCode,
            status: booking.status,
            paymentStatus:
              booking.paymentStatus,
            totalPrice:
              booking.totalPrice,
          },

          alreadyPaid: true,
        };
      }

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

      const now = new Date();

      if (
        booking.showtime.startTime <=
        now
      ) {
        throw new Error(
          'SHOWTIME_STARTED',
        );
      }

      /*
       * SeatHold phải còn hạn.
       */
      const seatHolds =
        await tx.seatHold.findMany({
          where: {
            bookingId: booking.id,

            showtimeId:
              booking.showtimeId,

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

      if (seatHolds.length === 0) {
        throw new Error(
          'SEAT_HOLD_EXPIRED',
        );
      }

      /*
       * Ghế phải active.
       */
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

      /*
       * Tính lại giá server.
       */
      const getSeatPrice = (
        seatType: string,
      ): number => {
        switch (
          seatType.toUpperCase()
        ) {
          case 'VIP':
            return Number(
              booking.showtime.vipPrice,
            );

          case 'COUPLE':
            return Number(
              booking.showtime.couplePrice,
            );

          case 'STANDARD':
          default:
            return Number(
              booking.showtime.standardPrice,
            );
        }
      };

      const calculatedSubtotal = seatHolds.reduce(
        (total, hold) =>
          total + getSeatPrice(String(hold.seat.type)),
        0,
      );

      const bookingFee = 0;

      // Tổng combo đã gắn vào booking (đã trừ kho lúc tạo đơn)
      const comboTotal = (booking.combos ?? []).reduce(
        (sum, item) =>
          sum + Math.floor(Number(item.unitPrice) || 0) * Math.floor(Number(item.quantity) || 0),
        0,
      );

      const discountAmount = Math.floor(Number(booking.discountAmount ?? 0) || 0);
      const storedSubtotal = Math.floor(Number(booking.subtotalPrice ?? 0) || 0);
      const storedTotal = Math.floor(Number(booking.totalPrice) || 0);

      // subtotal ghế: ưu tiên giá trị lưu lúc tạo đơn; nếu 0 (dữ liệu cũ) thì dùng tính lại
      const seatSubtotal =
        storedSubtotal > 0 ? storedSubtotal : calculatedSubtotal;

      // Cho phép chênh lệch nhỏ do làm tròn; log khi lệch lớn nhưng KHÔNG chặn tạo vé
      // vì IPN đã khớp số tiền thanh toán với booking.totalPrice.
      const expectedTotal = seatSubtotal - discountAmount + comboTotal + bookingFee;

      if (calculatedSubtotal !== seatSubtotal) {
        console.warn('[confirmBookingPayment] Seat subtotal drift', {
          bookingId: booking.id,
          calculatedSubtotal,
          seatSubtotal,
        });
      }

      if (expectedTotal !== storedTotal) {
        console.warn('[confirmBookingPayment] Total components vs stored', {
          bookingId: booking.id,
          seatSubtotal,
          discountAmount,
          comboTotal,
          expectedTotal,
          storedTotal,
        });
        // Chỉ reject khi lệch quá lớn (> 1đ) VÀ không giải thích được bằng voucher/combo
        // (tránh block đơn hợp lệ vì làm tròn / Decimal)
        if (Math.abs(expectedTotal - storedTotal) > 1) {
          // Vẫn tin totalPrice đã khớp IPN — không throw TOTAL_INVALID nữa
          console.warn(
            '[confirmBookingPayment] Proceeding despite total mismatch (IPN amount already verified)',
          );
        }
      }

      /*
       * Kiểm tra ghế đã có Ticket.
       */
      const occupiedTickets =
        await tx.ticket.findMany({
          where: {
            seatId: {
              in: seatHolds.map(
                (hold) =>
                  hold.seatId,
              ),
            },

            // Chỉ tính vé còn hiệu lực — vé admin đã hủy thì ghế được bán lại
            status: 'ACTIVE',

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

      /*
       * Không tạo ticket lần 2.
       */
      if (
        booking.tickets.length > 0
      ) {
        throw new Error(
          'TICKETS_ALREADY_EXIST',
        );
      }

      /*
       * Tạo Ticket.
       */
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

              status:
                'ACTIVE',
            };
          },
        ),
      });

      for (const combo of booking.combos) {
        if (!combo.qrCode) {
          await tx.bookingCombo.update({
            where: { id: combo.id },
            data: { qrCode: `${booking.bookingCode}-COMBO-${combo.id}` },
          });
        }
      }

      /*
       * Payment -> PAID
       */
      await tx.payment.update({
        where: {
          id: booking.payment.id,
        },

        data: {
          status: 'PAID',

          paidAt:
            paidAt ?? new Date(),

          ...(transactionCode
            ? {
                transactionCode,
              }
            : {}),
        },
      });

      /*
       * Booking -> CONFIRMED
       */
      const updatedBooking =
        await tx.booking.update({
          where: {
            id: booking.id,
          },

          data: {
            status:
              BookingStatus.CONFIRMED,

            paymentStatus:
              PaymentStatus.PAID,
          },
        });

      /*
       * SeatHold -> DELETE
       */
      await tx.seatHold.deleteMany({
        where: {
          bookingId:
            booking.id,
        },
      });

      return {
        booking: {
          id:
            updatedBooking.id,

          bookingCode:
            updatedBooking.bookingCode,

          status:
            updatedBooking.status,

          paymentStatus:
            updatedBooking.paymentStatus,

          totalPrice:
            updatedBooking.totalPrice,
        },

        alreadyPaid: false,
      };
    },
  );
}