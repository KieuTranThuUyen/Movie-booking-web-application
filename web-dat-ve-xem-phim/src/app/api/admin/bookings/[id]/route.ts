import { BookingStatus, PaymentStatus } from '@prisma/client';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  const params = await context.params;
  const body = (await request.json()) as {
    status?: BookingStatus;
    paymentStatus?: PaymentStatus;
  };

  const booking = await prisma.booking.findUnique({ where: { id: params.id } });

  if (!booking) {
    return NextResponse.json({ message: 'Không tìm thấy đơn đặt vé.' }, { status: 404 });
  }

  if (booking.status === BookingStatus.CANCELED && body.status === BookingStatus.CONFIRMED) {
    return NextResponse.json({ message: 'Đơn đã hủy không thể chuyển sang xác nhận.' }, { status: 400 });
  }

  const nextStatus = body.status ?? booking.status;
  const nextPaymentStatus = body.paymentStatus ?? booking.paymentStatus;

  const updated = await prisma.booking.update({
    where: { id: params.id },
    data: {
      status: nextStatus,
      paymentStatus: nextPaymentStatus,
      payment:
        body.paymentStatus !== undefined
          ? {
              update: {
                status:
                  nextPaymentStatus === PaymentStatus.PAID
                    ? 'PAID'
                    : nextPaymentStatus === PaymentStatus.REFUNDED
                      ? 'REFUNDED'
                      : 'PENDING',
                paidAt: nextPaymentStatus === PaymentStatus.PAID ? new Date() : null
              }
            }
          : undefined
    },
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

  return NextResponse.json({ message: 'Cập nhật đơn đặt vé thành công.', booking: updated });
}
