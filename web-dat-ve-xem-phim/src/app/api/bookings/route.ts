import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const bookings = await prisma.booking.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      showtime: {
        include: {
          movie: true
        }
      }
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
      startTime: Date;
    };
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
      showtimeLabel: `${booking.showtime.movie.title} · ${new Date(booking.showtime.startTime).toLocaleString('vi-VN')}`
    }))
  );
}

export async function POST(request: Request) {
  const body = (await request.json()) as Record<string, string | number | undefined>;
  const requiredFields = ['fullName', 'phone', 'email', 'address', 'city', 'district', 'paymentMethod'] as const;
  const missingField = requiredFields.find((field) => !body[field]);

  if (missingField) {
    return NextResponse.json({ message: 'Vui lòng hoàn tất thông tin thanh toán.' }, { status: 400 });
  }

  const bookingCode = `BK${Date.now()}`;
  const totalPrice = Number(body.total ?? 0);

  const fallbackShowtime = await prisma.showtime.findFirst();

  if (!fallbackShowtime) {
    return NextResponse.json({
      message: 'Tạo đơn đặt vé thành công, nhưng chưa có suất chiếu nào trong cơ sở dữ liệu.' ,
      redirectTo: '/don-hang',
      bookingId: null
    });
  }

  const booking = await prisma.booking.create({
    data: {
      bookingCode,
      customerName: String(body.fullName ?? ''),
      customerPhone: String(body.phone ?? ''),
      customerEmail: String(body.email ?? ''),
      note: body.note ? String(body.note) : null,
      paymentMethod: String(body.paymentMethod ?? 'COD'),
      totalPrice,
      status: 'PENDING',
      paymentStatus: 'UNPAID',
      showtime: {
        connect: { id: fallbackShowtime.id }
      }
    }
  });

  return NextResponse.json({
    message: 'Tạo đơn đặt vé thành công.',
    redirectTo: '/don-hang',
    bookingId: booking.id,
    bookingCode: booking.bookingCode
  });
}