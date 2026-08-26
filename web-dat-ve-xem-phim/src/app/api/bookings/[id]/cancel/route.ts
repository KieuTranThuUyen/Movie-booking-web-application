import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';

import {
  BookingStatus,
} from '@prisma/client';

import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function POST(
  request: Request,
  context: RouteContext,
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
          success: false,
          message:
            'Bạn cần đăng nhập.',
        },
        {
          status: 401,
        },
      );
    }

    const {
      id,
    } = await context.params;

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          message:
            'Thiếu id booking.',
        },
        {
          status: 400,
        },
      );
    }

    await prisma.$transaction(
      async (tx) => {
        const booking =
          await tx.booking.findUnique({
            where: {
              id,
            },

            select: {
              id: true,
              userId: true,
              status: true,
            },
          });

        if (!booking) {
          throw new Error(
            'BOOKING_NOT_FOUND',
          );
        }

        if (
          booking.userId !==
            user.id &&
          user.role !== 'ADMIN'
        ) {
          throw new Error(
            'FORBIDDEN',
          );
        }

        /*
         * Không cho hủy booking đã xác nhận
         * bằng endpoint này.
         */
        if (
          booking.status ===
          BookingStatus.CONFIRMED
        ) {
          throw new Error(
            'BOOKING_ALREADY_CONFIRMED',
          );
        }

        /*
         * Nếu đã canceled thì vẫn
         * giải phóng SeatHold.
         */
        if (
          booking.status ===
          BookingStatus.CANCELED
        ) {
          await tx.seatHold.deleteMany({
            where: {
              bookingId: id,
            },
          });

          return;
        }

        /*
         * PENDING → CANCELED
         */
        await tx.booking.update({
          where: {
            id,
          },

          data: {
            status:
              BookingStatus.CANCELED,
          },
        });

        /*
         * Giải phóng ghế.
         */
        await tx.seatHold.deleteMany({
          where: {
            bookingId: id,
          },
        });
      },
    );

    return NextResponse.json({
      success: true,

      message:
        'Đã hủy đơn và giải phóng ghế.',
    });
  } catch (error) {
    console.error(
      'POST /api/bookings/[id]/cancel error:',
      error,
    );

    if (
      error instanceof Error
    ) {
      switch (
        error.message
      ) {
        case 'BOOKING_NOT_FOUND':
          return NextResponse.json(
            {
              success: false,
              message:
                'Không tìm thấy đơn đặt vé.',
            },
            {
              status: 404,
            },
          );

        case 'FORBIDDEN':
          return NextResponse.json(
            {
              success: false,
              message:
                'Bạn không có quyền hủy đơn này.',
            },
            {
              status: 403,
            },
          );

        case 'BOOKING_ALREADY_CONFIRMED':
          return NextResponse.json(
            {
              success: false,
              message:
                'Đơn đã thanh toán và không thể hủy tại đây.',
            },
            {
              status: 409,
            },
          );
      }
    }

    return NextResponse.json(
      {
        success: false,
        message:
          'Không thể hủy đơn đặt vé.',
      },
      {
        status: 500,
      },
    );
  }
}