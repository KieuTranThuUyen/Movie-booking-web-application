import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';

import {
  BookingStatus,
  PaymentStatus,
} from '@prisma/client';

import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

const ONLINE_PAYMENT_METHODS = [
  'VNPAY',
  'MOMO',
  'ZALOPAY',
] as const;

type OnlinePaymentMethod =
  (typeof ONLINE_PAYMENT_METHODS)[number];

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    const user = session?.user;

    if (!user?.id) {
      return NextResponse.json(
        {
          message:
            'Bạn cần đăng nhập để xem đơn đặt vé.',
        },
        { status: 401 },
      );
    }

    const bookings = await prisma.booking.findMany({
      where:
        user.role === 'ADMIN'
          ? undefined
          : {
              userId: user.id,
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

    const result = bookings.map((booking) => ({
      id: booking.id,
      bookingCode: booking.bookingCode,

      customerName: booking.customerName,
      customerEmail: booking.customerEmail,
      customerPhone: booking.customerPhone,

      status: booking.status,
      paymentStatus: booking.paymentStatus,
      paymentMethod: booking.paymentMethod,

      totalPrice: booking.totalPrice,
      createdAt: booking.createdAt,

      movieTitle: booking.showtime.movie.title,

      showtimeLabel:
        `${booking.showtime.movie.title} · ` +
        `${booking.showtime.hall.cinema.name} · ` +
        `${booking.showtime.hall.name} · ` +
        `${new Date(
          booking.showtime.startTime,
        ).toLocaleString('vi-VN')}`,

      seats: booking.tickets.map(
        (ticket) => ticket.seatCode,
      ),

      payment: booking.payment
        ? {
            id: booking.payment.id,
            provider: booking.payment.provider,
            amount: booking.payment.amount,
            status: booking.payment.status,
            transactionCode:
              booking.payment.transactionCode,
            paidAt: booking.payment.paidAt,
          }
        : null,
    }));

    return NextResponse.json(result, {
      status: 200,
    });
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
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    const user = session?.user;

    if (!user?.id) {
      return NextResponse.json(
        {
          message:
            'Bạn cần đăng nhập trước khi thanh toán.',
        },
        { status: 401 },
      );
    }

    const userId = user.id;

    const body = (await request.json()) as {
      paymentMethod?: string;
      showtimeId?: string;
      seats?: string;
      note?: string;
    };

    const paymentMethod = String(
      body.paymentMethod ?? '',
    ).toUpperCase();

    if (
      !ONLINE_PAYMENT_METHODS.includes(
        paymentMethod as OnlinePaymentMethod,
      )
    ) {
      return NextResponse.json(
        {
          message:
            'Vui lòng chọn một phương thức thanh toán online.',
        },
        { status: 400 },
      );
    }

    const showtimeId = String(
      body.showtimeId ?? '',
    ).trim();

    const selectedSeatCodes = String(
      body.seats ?? '',
    )
      .split(',')
      .map((seatCode) => seatCode.trim())
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
        { status: 400 },
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
        { status: 404 },
      );
    }

    const now = new Date();

    if (showtime.startTime <= now) {
      return NextResponse.json(
        {
          message:
            'Suất chiếu đã bắt đầu. Không thể đặt vé.',
        },
        { status: 400 },
      );
    }

    const selectedSeats =
      showtime.hall.seats.filter((seat) =>
        uniqueSeatCodes.includes(seat.code),
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
        { status: 400 },
      );
    }

    const inactiveSeats =
      selectedSeats.filter(
        (seat) => !seat.isActive,
      );

    if (inactiveSeats.length > 0) {
      return NextResponse.json(
        {
          message:
            `Ghế ${inactiveSeats
              .map((seat) => seat.code)
              .join(', ')} đang bị khóa bởi quản trị viên.`,
        },
        { status: 409 },
      );
    }

    await prisma.seatHold.deleteMany({
      where: {
        showtimeId,
        expiresAt: {
          lte: now,
        },
      },
    });

    const occupiedTickets =
      await prisma.ticket.findMany({
        where: {
          seatId: {
            in: selectedSeats.map(
              (seat) => seat.id,
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
              .map((ticket) => ticket.seatCode)
              .join(', ')} đã được đặt.`,
        },
        { status: 409 },
      );
    }

    const myHolds =
      await prisma.seatHold.findMany({
        where: {
          showtimeId,
          userId,

          seatId: {
            in: selectedSeats.map(
              (seat) => seat.id,
            ),
          },

          bookingId: null,

          expiresAt: {
            gt: now,
          },
        },

        select: {
          id: true,
          seatId: true,
          expiresAt: true,
        },
      });

    const heldSeatIds = new Set(
      myHolds.map(
        (hold) => hold.seatId,
      ),
    );

    const missingHeldSeats =
      selectedSeats.filter(
        (seat) =>
          !heldSeatIds.has(seat.id),
      );

    if (missingHeldSeats.length > 0) {
      return NextResponse.json(
        {
          message:
            `Ghế ${missingHeldSeats
              .map((seat) => seat.code)
              .join(', ')} không còn được bạn giữ. Vui lòng quay lại chọn ghế.`,
        },
        { status: 409 },
      );
    }

    if (
      myHolds.length !==
      selectedSeats.length
    ) {
      return NextResponse.json(
        {
          message:
            'Thông tin ghế không hợp lệ. Vui lòng chọn lại ghế.',
        },
        { status: 409 },
      );
    }

    const getSeatPrice = (
      seatType: string,
    ): number => {
      switch (seatType.toUpperCase()) {
        case 'VIP':
          return showtime.vipPrice;

        case 'COUPLE':
          return showtime.couplePrice;

        case 'STANDARD':
        default:
          return showtime.standardPrice;
      }
    };

    const subtotal =
      selectedSeats.reduce(
        (total, seat) =>
          total +
          getSeatPrice(String(seat.type)),
        0,
      );

    const bookingFee = 0;
    const totalPrice = subtotal + bookingFee;

    const bookingCode =
      `BK${Date.now()
        .toString()
        .slice(-8)}${Math.floor(
        Math.random() * 900 + 100,
      )}`;

    const customerName =
      user.name || 'Khách hàng';

    const customerEmail =
      user.email || '';

    const customerPhone =
      user.phone || '';

    const booking =
      await prisma.$transaction(
        async (tx) => {
          const latestHolds =
            await tx.seatHold.findMany({
              where: {
                id: {
                  in: myHolds.map(
                    (hold) => hold.id,
                  ),
                },

                showtimeId,
                userId,
                bookingId: null,

                expiresAt: {
                  gt: new Date(),
                },
              },

              select: {
                id: true,
                seatId: true,
              },
            });

          if (
            latestHolds.length !==
            selectedSeats.length
          ) {
            throw new Error(
              'SEAT_HOLD_EXPIRED',
            );
          }

          const latestOccupiedTickets =
            await tx.ticket.findMany({
              where: {
                seatId: {
                  in: selectedSeats.map(
                    (seat) => seat.id,
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
            latestOccupiedTickets.length > 0
          ) {
            throw new Error(
              `SEAT_ALREADY_SOLD:${latestOccupiedTickets
                .map(
                  (ticket) => ticket.seatCode,
                )
                .join(',')}`,
            );
          }

          const createdBooking =
            await tx.booking.create({
              data: {
                bookingCode,
                userId,
                showtimeId,

                customerName,
                customerPhone,
                customerEmail,

                note: body.note
                  ? String(body.note)
                  : null,

                paymentMethod,
                totalPrice,

                status:
                  BookingStatus.PENDING,

                paymentStatus:
                  PaymentStatus.UNPAID,
              },
            });

          const updatedHolds =
            await tx.seatHold.updateMany({
              where: {
                id: {
                  in: latestHolds.map(
                    (hold) => hold.id,
                  ),
                },

                bookingId: null,
                userId,
                showtimeId,
              },

              data: {
                bookingId:
                  createdBooking.id,
              },
            });

          if (
            updatedHolds.count !==
            latestHolds.length
          ) {
            throw new Error(
              'SEAT_HOLD_ASSIGN_FAILED',
            );
          }

          await tx.payment.create({
            data: {
              bookingId:
                createdBooking.id,

              provider:
                paymentMethod,

              amount: totalPrice,

              status: 'PENDING',
            },
          });

          return createdBooking;
        },
      );

    return NextResponse.json(
      {
        message:
          'Đơn đặt vé đã được tạo. Vui lòng hoàn tất thanh toán.',

        redirectTo:
          `/thanh-toan/${booking.id}`,

        bookingId: booking.id,

        bookingCode:
          booking.bookingCode,

        paymentMethod,

        amount: totalPrice,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error(
      'POST /api/bookings error:',
      error,
    );

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
        { status: 409 },
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
        { status: 409 },
      );
    }

    if (
      error instanceof Error &&
      error.message ===
        'SEAT_HOLD_ASSIGN_FAILED'
    ) {
      return NextResponse.json(
        {
          message:
            'Không thể xác nhận ghế cho đơn đặt vé. Vui lòng chọn lại ghế.',
        },
        { status: 409 },
      );
    }

    return NextResponse.json(
      {
        message:
          'Không thể tạo đơn đặt vé. Vui lòng thử lại.',
      },
      { status: 500 },
    );
  }
}