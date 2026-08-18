import { NextResponse } from 'next/server';

import { prisma } from '@/lib/prisma';

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

        tickets: {
          orderBy: {
            seatCode: 'asc',
          },
        },

        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    return NextResponse.json({
      bookings,
    });
  } catch (error) {
    console.error(
      'GET /api/admin/bookings error:',
      error
    );

    return NextResponse.json(
      {
        message:
          'Không thể tải danh sách đơn đặt vé.',
      },
      {
        status: 500,
      }
    );
  }
}