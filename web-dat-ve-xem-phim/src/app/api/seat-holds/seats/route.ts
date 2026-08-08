
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const showtimeId = searchParams.get('showtimeId');

    if (!showtimeId) {
      return NextResponse.json(
        { message: 'Thiếu showtimeId.' },
        { status: 400 }
      );
    }

    const showtime = await prisma.showtime.findUnique({
      where: {
        id: showtimeId
      },
      select: {
        id: true,
        hallId: true
      }
    });

    if (!showtime) {
      return NextResponse.json(
        { message: 'Không tìm thấy suất chiếu.' },
        { status: 404 }
      );
    }

    const seats = await prisma.seat.findMany({
      where: {
        hallId: showtime.hallId
      },
      select: {
        id: true,
        code: true,
        isActive: true,
        rowLabel: true,
        seatNumber: true,
        type: true
      },
      orderBy: [
        {
          rowLabel: 'asc'
        },
        {
          seatNumber: 'asc'
        }
      ]
    });

    return NextResponse.json(seats);
  } catch (error) {
    console.error('GET /api/seat-holds/seats error:', error);

    return NextResponse.json(
      { message: 'Không thể lấy danh sách ghế.' },
      { status: 500 }
    );
  }
}