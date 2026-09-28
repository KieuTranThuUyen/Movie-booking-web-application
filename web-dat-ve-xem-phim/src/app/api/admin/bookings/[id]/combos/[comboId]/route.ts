import {
  BookingStatus,
  PaymentStatus,
  TicketStatus,
} from '@prisma/client';

import { NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import type { NextRequest } from 'next/server';

import { prisma } from '@/lib/db/prisma';

type RouteContext = {
  params: Promise<{
    id: string;
    comboId: string;
  }>;
};

async function isAdmin(request: Request) {
  const token = await getToken({
    req: request as NextRequest,
    secret: process.env.NEXTAUTH_SECRET,
  });

  return token?.role === 'ADMIN';
}

function getBookingInclude() {
  return {
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
        seatCode: 'asc' as const,
      },
    },
    combos: {
      include: {
        combo: true,
      },
      orderBy: {
        id: 'asc' as const,
      },
    },
    payment: true,
    user: {
      select: {
        id: true,
        name: true,
        email: true,
      },
    },
  };
}

export async function DELETE(
  request: Request,
  context: RouteContext,
) {
  if (!(await isAdmin(request))) {
    return NextResponse.json(
      { message: 'Bạn không có quyền thực hiện thao tác này.' },
      { status: 403 },
    );
  }

  try {
    const { id, comboId } = await context.params;

    if (!id || !comboId) {
      return NextResponse.json(
        { message: 'Thông tin combo không hợp lệ.' },
        { status: 400 },
      );
    }

    const booking = await prisma.booking.findUnique({
      where: { id },
      include: {
        showtime: true,
        tickets: true,
        combos: true,
        payment: true,
      },
    });

    if (!booking) {
      return NextResponse.json(
        { message: 'Không tìm thấy đơn đặt vé.' },
        { status: 404 },
      );
    }

    const now = new Date();

    if (booking.showtime.startTime <= now) {
      return NextResponse.json(
        {
          message:
            'Suất chiếu đã bắt đầu hoặc đã kết thúc. Không thể hủy combo.',
        },
        { status: 400 },
      );
    }

    if (booking.status === BookingStatus.CANCELED) {
      return NextResponse.json(
        { message: 'Đơn đặt vé này đã bị hủy.' },
        { status: 400 },
      );
    }

    const bookingCombo = booking.combos.find((c) => c.id === comboId);

    if (!bookingCombo) {
      return NextResponse.json(
        { message: 'Không tìm thấy combo trong đơn này.' },
        { status: 404 },
      );
    }

    if (bookingCombo.status === TicketStatus.CANCELED) {
      return NextResponse.json(
        { message: 'Combo này đã bị hủy trước đó.' },
        { status: 400 },
      );
    }

    const remainingActiveTickets = booking.tickets.filter(
      (t) => t.status === TicketStatus.ACTIVE,
    );
    const remainingActiveCombos = booking.combos.filter(
      (c) => c.status === TicketStatus.ACTIVE && c.id !== comboId,
    );

    if (
      remainingActiveTickets.length === 0 &&
      remainingActiveCombos.length === 0
    ) {
      return NextResponse.json(
        {
          message:
            'Đây là mục cuối cùng còn hiệu lực. Hãy dùng chức năng Hủy đơn.',
        },
        { status: 400 },
      );
    }

    const wasPaid =
      booking.paymentStatus === PaymentStatus.PAID ||
      booking.paymentStatus === PaymentStatus.PARTIALLY_REFUNDED;

    const refundAmount = wasPaid
      ? Number(bookingCombo.unitPrice) * Number(bookingCombo.quantity)
      : 0;

    const nextRefundedAmount =
      Number(booking.refundedAmount) + refundAmount;

    const remainingTicketsTotal = remainingActiveTickets.reduce(
      (sum, t) => sum + Number(t.price),
      0,
    );
    const remainingCombosTotal = remainingActiveCombos.reduce(
      (sum, c) => sum + Number(c.unitPrice) * Number(c.quantity),
      0,
    );
    const remainingTotalPrice =
      remainingTicketsTotal + remainingCombosTotal;

    let nextPaymentStatus = booking.paymentStatus;
    let paymentRecordStatus:
      | 'PENDING'
      | 'PAID'
      | 'PARTIALLY_REFUNDED'
      | 'REFUNDED' = 'PENDING';

    if (booking.paymentStatus === PaymentStatus.PAID) {
      nextPaymentStatus = PaymentStatus.PARTIALLY_REFUNDED;
      paymentRecordStatus = 'PARTIALLY_REFUNDED';
    } else if (
      booking.paymentStatus === PaymentStatus.PARTIALLY_REFUNDED
    ) {
      nextPaymentStatus = PaymentStatus.PARTIALLY_REFUNDED;
      paymentRecordStatus = 'PARTIALLY_REFUNDED';
    } else if (booking.paymentStatus === PaymentStatus.UNPAID) {
      nextPaymentStatus = PaymentStatus.UNPAID;
      paymentRecordStatus = 'PENDING';
    }

    const updated = await prisma.$transaction(async (tx) => {
      await tx.bookingCombo.update({
        where: { id: comboId },
        data: {
          status: TicketStatus.CANCELED,
        },
      });

      const updatedBooking = await tx.booking.update({
        where: { id },
        data: {
          totalPrice: remainingTotalPrice,
          refundedAmount: nextRefundedAmount,
          paymentStatus: nextPaymentStatus,
          ...(booking.payment && refundAmount > 0
            ? {
                payment: {
                  update: {
                    status: paymentRecordStatus,
                  },
                },
              }
            : {}),
        },
        include: getBookingInclude(),
      });

      return updatedBooking;
    });

    return NextResponse.json({
      success: true,
      message:
        refundAmount > 0
          ? `Đã hủy combo và hoàn ${refundAmount.toLocaleString('vi-VN')} đ.`
          : 'Đã hủy combo thành công.',
      booking: updated,
    });
  } catch (error) {
    console.error(
      '[DELETE /api/admin/bookings/[id]/combos/[comboId]]',
      error,
    );

    return NextResponse.json(
      { message: 'Không thể hủy combo.' },
      { status: 500 },
    );
  }
}
