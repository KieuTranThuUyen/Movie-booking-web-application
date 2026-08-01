import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { BookingStatus, PaymentStatus } from '@prisma/client';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const bookings = await prisma.booking.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      showtime: {
        include: {
          movie: true,
          hall: {
            include: {
              cinema: true
            }
          }
        }
      },
      tickets: true
    }
  });

  type BookingResponse = {
    id: string;
    bookingCode: string;
    customerName: string;
    customerEmail: string;
    customerPhone: string;
    status: string;
    paymentStatus: string;
    totalPrice: number;
    createdAt: Date;
    movieTitle: string;
      showtimeLabel: string;
      seats: string[];
  };

  type BookingRecordFromPrisma = {
    id: string;
    bookingCode: string;
    customerName: string;
    customerEmail: string;
    customerPhone: string;
    status: string;
    paymentStatus: string;
    totalPrice: number;
    createdAt: Date;
    showtime: {
      movie: {
        title: string;
      };
        hall: {
          cinema: {
            name: string;
          };
          name: string;
        };
      startTime: Date;
    };
      tickets: {
        seatCode: string;
      }[];
  };

  return NextResponse.json(
    bookings.map((booking: BookingRecordFromPrisma): BookingResponse => ({
      id: booking.id,
      bookingCode: booking.bookingCode,
      customerName: booking.customerName,
      customerEmail: booking.customerEmail,
      customerPhone: booking.customerPhone,
      status: booking.status,
      paymentStatus: booking.paymentStatus,
      totalPrice: booking.totalPrice,
      createdAt: booking.createdAt,
      movieTitle: booking.showtime.movie.title,
        showtimeLabel: `${booking.showtime.movie.title} · ${booking.showtime.hall.cinema.name} · ${booking.showtime.hall.name} · ${new Date(booking.showtime.startTime).toLocaleString('vi-VN')}`,
        seats: booking.tickets.map((ticket) => ticket.seatCode)
    }))
  );
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  const body = (await request.json()) as Record<string, string | number | undefined>;
  const requiredFields = ['fullName', 'phone', 'email', 'address', 'city', 'district', 'paymentMethod', 'showtimeId', 'seats'] as const;
  const missingField = requiredFields.find((field) => !body[field]);

  if (missingField) {
    return NextResponse.json({ message: 'Vui lòng hoàn tất thông tin thanh toán.' }, { status: 400 });
  }

  const showtimeId = String(body.showtimeId ?? '');
  const selectedSeatCodes = String(body.seats ?? '')
    .split(',')
    .map((seatCode) => seatCode.trim())
    .filter(Boolean);

  if (!showtimeId || selectedSeatCodes.length === 0) {
    return NextResponse.json({ message: 'Vui lòng chọn suất chiếu và ghế trước khi thanh toán.' }, { status: 400 });
  }

  const showtime = await prisma.showtime.findUnique({
    where: { id: showtimeId },
    include: {
      hall: {
        include: {
          seats: true,
          cinema: true
        }
      },
      movie: true
    }
  });

  if (!showtime) {
    return NextResponse.json({ message: 'Không tìm thấy suất chiếu tương ứng.' }, { status: 404 });
  }

  const selectedSeats = showtime.hall.seats.filter((seat) => selectedSeatCodes.includes(seat.code));

  if (selectedSeats.length !== selectedSeatCodes.length) {
    return NextResponse.json({ message: 'Có ghế không tồn tại trong phòng chiếu này.' }, { status: 400 });
  }

  const occupiedTickets = await prisma.ticket.findMany({
    where: {
      seatId: {
        in: selectedSeats.map((seat) => seat.id)
      },
      booking: {
        showtimeId
      }
    },
    select: {
      seatCode: true
    }
  });

  if (occupiedTickets.length > 0) {
    return NextResponse.json({ message: `Ghế ${occupiedTickets.map((ticket) => ticket.seatCode).join(', ')} đã được đặt.` }, { status: 409 });
  }

  const bookingCode = `BK${Date.now().toString().slice(-8)}${Math.floor(Math.random() * 900 + 100)}`;
  const totalPrice = Number(body.total ?? 0);
  const paymentMethod = String(body.paymentMethod ?? 'COD');

  const booking = await prisma.$transaction(async (tx) => {
    const createdBooking = await tx.booking.create({
      data: {
        bookingCode,
        userId: session?.user.id ?? null,
        showtimeId,
        customerName: String(body.fullName ?? session?.user.name ?? ''),
        customerPhone: String(body.phone ?? session?.user.phone ?? ''),
        customerEmail: String(body.email ?? session?.user.email ?? ''),
        note: body.note ? String(body.note) : null,
        paymentMethod,
        totalPrice,
        status: BookingStatus.PENDING,
        paymentStatus: PaymentStatus.UNPAID
      }
    });

    await tx.ticket.createMany({
      data: selectedSeats.map((seat) => ({
        bookingId: createdBooking.id,
        seatId: seat.id,
        seatCode: seat.code,
        price: showtime.basePrice,
        qrCode: `${createdBooking.bookingCode}-${seat.code}`
      }))
    });

    await tx.payment.create({
      data: {
        bookingId: createdBooking.id,
        provider: paymentMethod,
        amount: totalPrice,
        status: 'PENDING'
      }
    });

    return createdBooking;
  });

  return NextResponse.json({
    message: 'Tạo đơn đặt vé thành công.',
    redirectTo: `/don-hang?booking=${booking.id}`,
    bookingId: booking.id,
    bookingCode: booking.bookingCode
  });
}