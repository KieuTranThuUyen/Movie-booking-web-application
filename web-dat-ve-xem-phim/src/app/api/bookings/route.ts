import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';

import {
  BookingStatus,
  PaymentStatus,
} from '@prisma/client';

import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

const PAYMENT_METHOD = 'SEPAY';

type CreateBookingBody = {
  showtimeId?: string;
  seats?: string;
  note?: string;
};

function createBookingCode(): string {
  return `BK${Date.now()
    .toString()
    .slice(-8)}${Math.floor(
    Math.random() * 900 + 100,
  )}`;
}

/* ============================================================
   GET
   ============================================================ */

export async function GET() {
  try {
    const session =
      await getServerSession(
        authOptions,
      );

    const user =
      session?.user;

    if (!user?.id) {
      return NextResponse.json(
        {
          message:
            'Bạn cần đăng nhập để xem đơn đặt vé.',
        },
        {
          status: 401,
        },
      );
    }

    const bookings =
      await prisma.booking.findMany({
        where:
          user.role === 'ADMIN'
            ? undefined
            : {
                userId:
                  user.id,
              },

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

          payment: true,
        },
      });

    const result =
      bookings.map(
        (booking) => ({
          id:
            booking.id,

          bookingCode:
            booking.bookingCode,

          customerName:
            booking.customerName,

          customerEmail:
            booking.customerEmail,

          customerPhone:
            booking.customerPhone,

          status:
            booking.status,

          paymentStatus:
            booking.paymentStatus,

          paymentMethod:
            booking.paymentMethod,

          totalPrice:
            booking.totalPrice,

          createdAt:
            booking.createdAt,

          movieTitle:
            booking.showtime
              .movie.title,

          showtimeLabel:
            `${booking.showtime.movie.title} · ` +
            `${booking.showtime.hall.cinema.name} · ` +
            `${booking.showtime.hall.name} · ` +
            `${new Date(
              booking.showtime.startTime,
            ).toLocaleString(
              'vi-VN',
            )}`,

          seats:
            booking.tickets.map(
              (ticket) =>
                ticket.seatCode,
            ),

          payment:
            booking.payment
              ? {
                  id:
                    booking.payment
                      .id,

                  provider:
                    booking.payment
                      .provider,

                  amount:
                    booking.payment
                      .amount,

                  status:
                    booking.payment
                      .status,

                  transactionCode:
                    booking.payment
                      .transactionCode,

                  paidAt:
                    booking.payment
                      .paidAt,
                }
              : null,
        }),
      );

    return NextResponse.json(
      result,
    );
  } catch (error) {
    console.error(
      'GET /api/bookings error:',
      error,
    );

    return NextResponse.json(
      {
        message:
          'Không thể lấy danh sách đơn đặt vé.',
      },
      {
        status: 500,
      },
    );
  }
}

/* ============================================================
   POST
   ============================================================ */

export async function POST(
  request: Request,
) {
  try {
    const session =
      await getServerSession(
        authOptions,
      );

    const user =
      session?.user;

    if (!user?.id) {
      return NextResponse.json(
        {
          message:
            'Bạn cần đăng nhập trước khi đặt vé.',
        },
        {
          status: 401,
        },
      );
    }

    const body =
      (await request.json()) as CreateBookingBody;

    const showtimeId =
      String(
        body.showtimeId ?? '',
      ).trim();

    const requestedSeatCodes = [
      ...new Set(
        String(
          body.seats ?? '',
        )
          .split(',')
          .map((seat) =>
            seat.trim(),
          )
          .filter(Boolean),
      ),
    ];

    if (
      !showtimeId ||
      requestedSeatCodes.length === 0
    ) {
      return NextResponse.json(
        {
          message:
            'Vui lòng chọn suất chiếu và ghế trước khi thanh toán.',
        },
        {
          status: 400,
        },
      );
    }

    const now =
      new Date();

    /* ========================================================
       1. SHOWTIME
       ======================================================== */

    const showtime =
      await prisma.showtime.findUnique({
        where: {
          id: showtimeId,
        },

        include: {
          movie: true,

          hall: {
            include: {
              seats: true,

              cinema: true,
            },
          },
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
        },
      );
    }

    if (
      showtime.startTime <=
      now
    ) {
      return NextResponse.json(
        {
          message:
            'Suất chiếu đã bắt đầu. Không thể đặt vé.',
        },
        {
          status: 400,
        },
      );
    }

    /* ========================================================
       2. GHẾ
       ======================================================== */

    const selectedSeats =
      showtime.hall.seats.filter(
        (seat) =>
          requestedSeatCodes.includes(
            seat.code,
          ),
      );

    if (
      selectedSeats.length !==
      requestedSeatCodes.length
    ) {
      return NextResponse.json(
        {
          message:
            'Có ghế không tồn tại trong phòng chiếu này.',
        },
        {
          status: 400,
        },
      );
    }

    /* ========================================================
       3. GHẾ ACTIVE
       ======================================================== */

    const inactiveSeats =
      selectedSeats.filter(
        (seat) =>
          !seat.isActive,
      );

    if (
      inactiveSeats.length > 0
    ) {
      return NextResponse.json(
        {
          message:
            `Ghế ${inactiveSeats
              .map(
                (seat) =>
                  seat.code,
              )
              .join(', ')} đang bị khóa bởi quản trị viên.`,
        },
        {
          status: 409,
        },
      );
    }

    /* ========================================================
       4. XÓA HOLD HẾT HẠN
       ======================================================== */

    await prisma.seatHold.deleteMany({
      where: {
        showtimeId,

        expiresAt: {
          lte: now,
        },
      },
    });

    /* ========================================================
       5. HỦY CÁC BOOKING PENDING ĐÃ HẾT HOLD
       ======================================================== */

    const expiredPendingBookings =
      await prisma.booking.findMany({
        where: {
          userId:
            user.id,

          showtimeId,

          status:
            BookingStatus.PENDING,

          seatHolds: {
            none: {
              expiresAt: {
                gt: now,
              },
            },
          },
        },

        select: {
          id: true,
        },
      });

    if (
      expiredPendingBookings.length >
      0
    ) {
      await prisma.booking.updateMany({
        where: {
          id: {
            in:
              expiredPendingBookings.map(
                (booking) =>
                  booking.id,
              ),
          },

          status:
            BookingStatus.PENDING,
        },

        data: {
          status:
            BookingStatus.CANCELED,
        },
      });

      await prisma.seatHold.deleteMany({
        where: {
          bookingId: {
            in:
              expiredPendingBookings.map(
                (booking) =>
                  booking.id,
              ),
          },
        },
      });
    }

    /* ========================================================
       6. KIỂM TRA GHẾ ĐÃ BÁN
       ======================================================== */

    const soldTickets =
      await prisma.ticket.findMany({
        where: {
          seatId: {
            in:
              selectedSeats.map(
                (seat) =>
                  seat.id,
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
      soldTickets.length >
      0
    ) {
      return NextResponse.json(
        {
          message:
            `Ghế ${soldTickets
              .map(
                (ticket) =>
                  ticket.seatCode,
              )
              .join(', ')} đã được đặt.`,
        },
        {
          status: 409,
        },
      );
    }

    /* ========================================================
       7. LẤY HOLD CỦA USER
       ======================================================== */

    const selectedSeatIds =
      selectedSeats.map(
        (seat) =>
          seat.id,
      );

    const userHolds =
      await prisma.seatHold.findMany({
        where: {
          showtimeId,

          userId:
            user.id,

          seatId: {
            in:
              selectedSeatIds,
          },

          expiresAt: {
            gt: now,
          },

          bookingId: null,
        },

        select: {
          id: true,

          seatId: true,

          bookingId: true,

          expiresAt: true,
        },
      });

    /* ========================================================
       8. KIỂM TRA ĐỦ HOLD
       ======================================================== */

    const heldIds =
      new Set(
        userHolds.map(
          (hold) =>
            hold.seatId,
        ),
      );

    const missingSeats =
      selectedSeats.filter(
        (seat) =>
          !heldIds.has(
            seat.id,
          ),
      );

    if (
      missingSeats.length >
      0
    ) {
      return NextResponse.json(
        {
          message:
            `Ghế ${missingSeats
              .map(
                (seat) =>
                  seat.code,
              )
              .join(', ')} không còn được bạn giữ. Vui lòng chọn lại ghế.`,
        },
        {
          status: 409,
        },
      );
    }

    /* ========================================================
       9. TÍNH TIỀN
       ======================================================== */

    const getSeatPrice =
      (type: string) => {
        switch (
          type.toUpperCase()
        ) {
          case 'VIP':
            return Number(
              showtime.vipPrice,
            );

          case 'COUPLE':
            return Number(
              showtime.couplePrice,
            );

          default:
            return Number(
              showtime.standardPrice,
            );
        }
      };

    const totalPrice =
      selectedSeats.reduce(
        (
          total,
          seat,
        ) =>
          total +
          getSeatPrice(
            String(
              seat.type,
            ),
          ),
        0,
      );

    /* ========================================================
       10. TẠO BOOKING MỚI
       
       QUAN TRỌNG:
       KHÔNG TÌM existingBooking
       KHÔNG UPDATE booking cũ
       MỖI LẦN BẤM THANH TOÁN = BOOKING MỚI
       ======================================================== */

    const booking =
      await prisma.$transaction(
        async (tx) => {
          const bookingRecord =
            await tx.booking.create({
              data: {
                bookingCode:
                  createBookingCode(),

                userId:
                  user.id,

                showtimeId,

                customerName:
                  user.name ??
                  'Khách hàng',

                customerEmail:
                  user.email ??
                  '',

                customerPhone:
                  user.phone ??
                  '',

                note:
                  body.note ??
                  null,

                paymentMethod:
                  PAYMENT_METHOD,

                totalPrice,

                status:
                  BookingStatus.PENDING,

                paymentStatus:
                  PaymentStatus.UNPAID,
              },
            });

          /* ==================================================
             GẮN HOLD VÀO BOOKING MỚI
             ================================================== */

          await tx.seatHold.updateMany({
            where: {
              showtimeId,

              userId:
                user.id,

              bookingId: null,

              seatId: {
                in:
                  selectedSeatIds,
              },

              expiresAt: {
                gt:
                  new Date(),
              },
            },

            data: {
              bookingId:
                bookingRecord.id,
            },
          });

          /* ==================================================
             KIỂM TRA LẠI HOLD
             ================================================== */

          const finalHolds =
            await tx.seatHold.findMany({
              where: {
                bookingId:
                  bookingRecord.id,

                seatId: {
                  in:
                    selectedSeatIds,
                },

                expiresAt: {
                  gt:
                    new Date(),
                },
              },

              select: {
                seatId: true,
              },
            });

          if (
            finalHolds.length !==
            selectedSeats.length
          ) {
            throw new Error(
              'SEAT_HOLD_ASSIGN_FAILED',
            );
          }

          /* ==================================================
             PAYMENT MỚI
             ================================================== */

          await tx.payment.create({
            data: {
              bookingId:
                bookingRecord.id,

              provider:
                PAYMENT_METHOD,

              amount:
                totalPrice,

              status:
                'PENDING',
            },
          });

          return tx.booking.findUniqueOrThrow({
            where: {
              id:
                bookingRecord.id,
            },

            include: {
              payment: true,
            },
          });
        },
      );

    /* ========================================================
       11. RESPONSE
       ======================================================== */

    console.log(
      '[Create Booking] NEW BOOKING CREATED',
      {
        bookingId:
          booking.id,

        bookingCode:
          booking.bookingCode,

        totalPrice:
          booking.totalPrice,
      },
    );

    return NextResponse.json(
      {
        success: true,

        message:
          'Đơn đặt vé đã được tạo mới.',

        id:
          booking.id,

        bookingId:
          booking.id,

        bookingCode:
          booking.bookingCode,

        paymentMethod:
          PAYMENT_METHOD,

        amount:
          totalPrice,

        paymentDescription:
          `${
            process.env
              .SEPAY_PAYMENT_PREFIX ??
            'MOVIE'
          } ${booking.bookingCode}`,

        redirectTo:
          `/api/payments/sepay/checkout/${encodeURIComponent(
            booking.id,
          )}`,
      },
      {
        status: 201,
      },
    );
  } catch (error) {
    console.error(
      'POST /api/bookings error:',
      error,
    );

    if (
      error instanceof Error
    ) {
      if (
        error.message ===
        'SEAT_HOLD_ASSIGN_FAILED'
      ) {
        return NextResponse.json(
          {
            message:
              'Không thể cập nhật ghế cho đơn. Vui lòng chọn lại ghế.',
          },
          {
            status: 409,
          },
        );
      }
    }

    return NextResponse.json(
      {
        message:
          'Không thể tạo đơn đặt vé.',
      },
      {
        status: 500,
      },
    );
  }
}