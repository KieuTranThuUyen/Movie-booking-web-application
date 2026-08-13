import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';

import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function POST(
  request: Request,
  context: RouteContext
) {
  try {
    const session =
      await getServerSession(authOptions);

    const userId =
      session?.user?.id;

    if (!userId) {
      return NextResponse.json(
        {
          message:
            'Bạn cần đăng nhập.',
        },
        {
          status: 401,
        }
      );
    }

    const { id } =
      await context.params;

    const booking =
      await prisma.booking.findUnique({
        where: {
          id,
        },
        include: {
          payment: true,
        },
      });

    if (!booking) {
      return NextResponse.json(
        {
          message:
            'Không tìm thấy đơn đặt vé.',
        },
        {
          status: 404,
        }
      );
    }

    // Không cho xác nhận đơn của người khác
    if (booking.userId !== userId) {
      return NextResponse.json(
        {
          message:
            'Bạn không có quyền xác nhận đơn này.',
        },
        {
          status: 403,
        }
      );
    }

    // Đã thanh toán rồi
    if (
      booking.paymentStatus === 'PAID' &&
      booking.status === 'CONFIRMED'
    ) {
      return NextResponse.json({
        message:
          'Đơn vé đã được thanh toán.',
      });
    }

    const updatedBooking =
      await prisma.$transaction(
        async (tx) => {
          const updated =
            await tx.booking.update({
              where: {
                id: booking.id,
              },
              data: {
                paymentStatus: 'PAID',
                status: 'CONFIRMED',
              },
            });

          if (booking.payment) {
            await tx.payment.update({
              where: {
                id: booking.payment.id,
              },
              data: {
                status: 'PAID',
                paidAt: new Date(),
                transactionCode:
                  `DEMO-${Date.now()}`,
              },
            });
          }

          return updated;
        }
      );

    return NextResponse.json({
      message:
        'Thanh toán thành công.',
      bookingId:
        updatedBooking.id,
      bookingCode:
        updatedBooking.bookingCode,
      status:
        updatedBooking.status,
      paymentStatus:
        updatedBooking.paymentStatus,
    });
  } catch (error) {
    console.error(
      'POST /api/payments/[id]/confirm error:',
      error
    );

    return NextResponse.json(
      {
        message:
          'Không thể xác nhận thanh toán.',
      },
      {
        status: 500,
      }
    );
  }
}