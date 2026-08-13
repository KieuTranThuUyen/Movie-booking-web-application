import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import {
  BookingStatus,
  PaymentStatus,
} from '@prisma/client';

import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { SEAT_PRICES } from '@/lib/seat-pricing';

const ONLINE_PAYMENT_METHODS = [
  'VNPAY',
  'MOMO',
  'ZALOPAY',
] as const;

type OnlinePaymentMethod =
  (typeof ONLINE_PAYMENT_METHODS)[number];

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
      paymentMethod: booking.paymentMethod,
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
    // ============================================================
    // KIỂM TRA ĐĂNG NHẬP
    // ============================================================

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

    // ============================================================
    // ĐỌC REQUEST
    // ============================================================

    const body =
      (await request.json()) as {
        paymentMethod?: string;
        showtimeId?: string;
        seats?: string;
        bookingFee?: number;
        note?: string;
      };

    // ============================================================
    // KIỂM TRA PHƯƠNG THỨC THANH TOÁN
    // ============================================================

    const paymentMethod =
      String(
        body.paymentMethod ?? ''
      ).toUpperCase();

    if (
      !ONLINE_PAYMENT_METHODS.includes(
        paymentMethod as OnlinePaymentMethod
      )
    ) {
      return NextResponse.json(
        {
          message:
            'Vui lòng chọn một phương thức thanh toán online.',
        },
        {
          status: 400,
        }
      );
    }

    // ============================================================
    // KIỂM TRA SUẤT CHIẾU + GHẾ
    // ============================================================

    const showtimeId =
      String(body.showtimeId ?? '');

    const selectedSeatCodes =
      String(body.seats ?? '')
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

    // ============================================================
    // LẤY SUẤT CHIẾU
    // ============================================================

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

    // ============================================================
    // KIỂM TRA THỜI GIAN
    // ============================================================

    if (
      showtime.startTime <= new Date()
    ) {
      return NextResponse.json(
        {
          message:
            'Suất chiếu đã bắt đầu. Không thể thanh toán.',
        },
        {
          status: 400,
        }
      );
    }

    // ============================================================
    // LẤY GHẾ
    // ============================================================

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

    // ============================================================
    // KIỂM TRA GHẾ ACTIVE
    // ============================================================

    const inactiveSeats =
      selectedSeats.filter(
        (seat) => !seat.isActive
      );

    if (
      inactiveSeats.length > 0
    ) {
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

    // ============================================================
    // XÓA HOLD HẾT HẠN
    // ============================================================

    await prisma.seatHold.deleteMany({
      where: {
        showtimeId,
        expiresAt: {
          lte: now,
        },
      },
    });

    // ============================================================
    // KIỂM TRA GHẾ ĐÃ BÁN
    // ============================================================

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

    // ============================================================
    // KIỂM TRA USER ĐANG GIỮ GHẾ
    // ============================================================

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

    // ============================================================
    // TÍNH GIÁ GHẾ
    // ============================================================

    const getSeatPrice = (
      seatType: string
    ) => {
      switch (
        seatType.toUpperCase()
      ) {
        case 'VIP':
          return SEAT_PRICES.VIP;

        case 'COUPLE':
          return SEAT_PRICES.COUPLE;

        case 'STANDARD':
        default:
          return SEAT_PRICES.STANDARD;
      }
    };

    const subtotal =
      selectedSeats.reduce(
        (total, seat) =>
          total +
          getSeatPrice(
            String(seat.type)
          ),
        0
      );

    const bookingFee = Number(
      body.bookingFee ?? 0
    );

    const totalPrice =
      subtotal + bookingFee;

    // ============================================================
    // TẠO BOOKING CODE
    // ============================================================

    const bookingCode =
      `BK${Date.now()
        .toString()
        .slice(-8)}${Math.floor(
        Math.random() * 900 + 100
      )}`;

    // ============================================================
    // THÔNG TIN USER ĐĂNG NHẬP
    // ============================================================

    const customerName =
      session.user?.name ||
      'Khách hàng';

    const customerEmail =
      session.user?.email ||
      '';

    const customerPhone =
      session.user?.phone ||
      '';

    // ============================================================
    // TRANSACTION
    // ============================================================

    const booking =
      await prisma.$transaction(
        async (tx) => {
          // ------------------------------------------------------
          // KIỂM TRA GHẾ LẦN CUỐI
          // ------------------------------------------------------

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

          // ------------------------------------------------------
          // TẠO BOOKING
          // ------------------------------------------------------

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

          // ------------------------------------------------------
          // TẠO TICKET
          // ------------------------------------------------------

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
                  getSeatPrice(
                    String(seat.type)
                  ),

                qrCode:
                  `${createdBooking.bookingCode}-${seat.code}`,
              })
            ),
          });

          // ------------------------------------------------------
          // TẠO PAYMENT
          // ------------------------------------------------------

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

          // ------------------------------------------------------
          // XÓA HOLD
          // ------------------------------------------------------

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

    // ============================================================
    // TRẢ KẾT QUẢ
    // ============================================================

    return NextResponse.json({
      message:
        'Đơn đặt vé đã được tạo. Vui lòng hoàn tất thanh toán.',

      redirectTo:
        `/thanh-toan/${booking.id}`,

      bookingId:
        booking.id,

      bookingCode:
        booking.bookingCode,

      paymentMethod,

      amount: totalPrice,
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