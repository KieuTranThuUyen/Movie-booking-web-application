import { NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import type { NextRequest } from 'next/server';

import { prisma } from '@/lib/db/prisma';

async function isAdmin(request: Request) {
  const token = await getToken({
    req: request as NextRequest,
    secret: process.env.NEXTAUTH_SECRET,
  });

  return token?.role === 'ADMIN';
}

export async function GET(request: Request) {
  if (!(await isAdmin(request))) {
    return NextResponse.json(
      { message: 'Bạn không có quyền thực hiện thao tác này.' },
      { status: 403 },
    );
  }

  try {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get('q')?.trim() ?? '';

    // MySQL không hỗ trợ mode: 'insensitive' của Prisma.
    // Collation utf8mb4_unicode_ci thường đã case-insensitive sẵn.
    const bookings = await prisma.booking.findMany({
      where: q
        ? {
            OR: [
              {
                bookingCode: {
                  contains: q,
                },
              },
              {
                customerPhone: {
                  contains: q,
                },
              },
              {
                customerName: {
                  contains: q,
                },
              },
              {
                customerEmail: {
                  contains: q,
                },
              },
            ],
          }
        : undefined,
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
    console.error('[GET /api/admin/bookings]', error);

    return NextResponse.json(
      {
        message: 'Không thể tải danh sách đơn đặt vé.',
      },
      { status: 500 },
    );
  }
}
