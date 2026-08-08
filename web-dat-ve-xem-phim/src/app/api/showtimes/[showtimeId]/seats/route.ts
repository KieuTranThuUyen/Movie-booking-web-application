import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

type RouteContext = {
  params: Promise<{
    showtimeId: string;
  }>;
};

export async function GET(
  request: Request,
  context: RouteContext
) {
  try {
    const { showtimeId } = await context.params;

    if (!showtimeId) {
      return NextResponse.json(
        { message: 'Thiếu showtimeId.' },
        { status: 400 }
      );
    }

    /*
     * Tìm suất chiếu để lấy hallId.
     */
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

    /*
     * Lấy toàn bộ ghế thuộc phòng chiếu.
     */
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
    console.error(
      'GET /api/showtimes/[showtimeId]/seats error:',
      error
    );

    return NextResponse.json(
      {
        message: 'Không thể lấy danh sách ghế.'
      },
      {
        status: 500
      }
    );
  }
}