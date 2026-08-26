import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const showtimeId = searchParams.get('showtimeId');

    if (!showtimeId) {
      return NextResponse.json(
        { message: 'Thiếu showtimeId.' },
        { status: 400 },
      );
    }

    const showtime = await prisma.showtime.findUnique({
      where: {
        id: showtimeId,
      },
      select: {
        id: true,

        hall: {
          select: {
            id: true,
            name: true,
            capacity: true,

            // Kích thước sơ đồ do admin thiết lập
            layoutWidth: true,
            layoutHeight: true,
            layoutPreset: true,

            // Các khối Lối đi / Khoảng trống
            layoutBlocks: true,

            // Ghế + vị trí admin đã kéo
            seats: {
              select: {
                id: true,
                code: true,
                isActive: true,
                rowLabel: true,
                seatNumber: true,
                type: true,

                positionX: true,
                positionY: true,
              },

              orderBy: [
                {
                  rowLabel: 'asc',
                },
                {
                  seatNumber: 'asc',
                },
              ],
            },
          },
        },
      },
    });

    if (!showtime) {
      return NextResponse.json(
        { message: 'Không tìm thấy suất chiếu.' },
        { status: 404 },
      );
    }

    if (!showtime.hall) {
      return NextResponse.json(
        { message: 'Không tìm thấy phòng chiếu.' },
        { status: 404 },
      );
    }

    return NextResponse.json({
      hall: {
        id: showtime.hall.id,
        name: showtime.hall.name,
        capacity: showtime.hall.capacity,
        layoutWidth: showtime.hall.layoutWidth,
        layoutHeight: showtime.hall.layoutHeight,
        layoutPreset: showtime.hall.layoutPreset,
        layoutBlocks: showtime.hall.layoutBlocks,
      },

      seats: showtime.hall.seats,
    });
  } catch (error) {
    console.error(
      'GET /api/seat-holds/seats error:',
      error,
    );

    return NextResponse.json(
      { message: 'Không thể lấy sơ đồ ghế.' },
      { status: 500 },
    );
  }
}