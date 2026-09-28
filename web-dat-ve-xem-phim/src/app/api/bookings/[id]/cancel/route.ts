import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import {
  BookingStatus,
  PaymentStatus,
  TicketStatus,
} from '@prisma/client';

import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db/prisma';

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

/** Khách chỉ được hủy khi còn ít nhất 30 phút trước giờ chiếu */
const MIN_MINUTES_BEFORE_SHOWTIME = 30;

export async function POST(
  _request: Request,
  context: RouteContext,
) {
  try {
    const session = await getServerSession(authOptions);
    const user = session?.user;

    if (!user?.id) {
      return NextResponse.json(
        {
          success: false,
          message: 'Bạn cần đăng nhập.',
        },
        { status: 401 },
      );
    }

    const { id } = await context.params;

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          message: 'Thiếu id booking.',
        },
        { status: 400 },
      );
    }

    const booking = await prisma.booking.findUnique({
      where: { id },
      select: {
        id: true,
        userId: true,
        status: true,
        paymentStatus: true,
        refundedAmount: true,
        totalPrice: true,
        payment: {
          select: { id: true, status: true },
        },
        showtime: {
          select: { startTime: true },
        },
        tickets: {
          select: {
            id: true,
            status: true,
            price: true,
          },
        },
        combos: {
          select: {
            id: true,
            status: true,
            quantity: true,
            unitPrice: true,
          },
        },
      },
    });

    if (!booking) {
      return NextResponse.json(
        {
          success: false,
          message: 'Không tìm thấy đơn đặt vé.',
        },
        { status: 404 },
      );
    }

    const isAdmin = user.role === 'ADMIN';
    const isOwner = booking.userId === user.id;

    if (!isAdmin && !isOwner) {
      return NextResponse.json(
        {
          success: false,
          message: 'Bạn không có quyền hủy đơn này.',
        },
        { status: 403 },
      );
    }

    if (booking.status === BookingStatus.CANCELED) {
      await prisma.seatHold.deleteMany({
        where: { bookingId: id },
      });

      return NextResponse.json({
        success: true,
        message: 'Đơn đã được hủy trước đó.',
      });
    }

    const now = new Date();
    const showtimeStart = new Date(booking.showtime.startTime);
    const msUntilShow = showtimeStart.getTime() - now.getTime();
    const minutesUntilShow = msUntilShow / (60 * 1000);

    // Khách: chỉ hủy khi còn ≥ 30 phút trước giờ chiếu
    if (!isAdmin && minutesUntilShow < MIN_MINUTES_BEFORE_SHOWTIME) {
      return NextResponse.json(
        {
          success: false,
          message:
            minutesUntilShow <= 0
              ? 'Suất chiếu đã bắt đầu hoặc đã kết thúc. Không thể hủy vé.'
              : `Chỉ được hủy vé trước giờ chiếu ít nhất ${MIN_MINUTES_BEFORE_SHOWTIME} phút.`,
        },
        { status: 400 },
      );
    }

    // Admin: không hủy khi suất đã bắt đầu
    if (isAdmin && minutesUntilShow <= 0) {
      return NextResponse.json(
        {
          success: false,
          message:
            'Suất chiếu đã bắt đầu hoặc đã kết thúc. Không thể hủy đơn này.',
        },
        { status: 400 },
      );
    }

    const activeTickets = booking.tickets.filter(
      (t) => t.status === TicketStatus.ACTIVE,
    );

    const activeCombos = booking.combos.filter(
      (c) => c.status === TicketStatus.ACTIVE,
    );

    const shouldRefund =
      booking.paymentStatus === PaymentStatus.PAID ||
      booking.paymentStatus === PaymentStatus.PARTIALLY_REFUNDED;

    const ticketRefund = shouldRefund
      ? activeTickets.reduce((sum, t) => sum + Number(t.price), 0)
      : 0;

    const comboRefund = shouldRefund
      ? activeCombos.reduce(
          (sum, c) => sum + Number(c.unitPrice) * Number(c.quantity),
          0,
        )
      : 0;

    const refundAmount = ticketRefund + comboRefund;
    const nextRefundedAmount =
      Number(booking.refundedAmount) + refundAmount;
    const nextPaymentStatus = shouldRefund
      ? PaymentStatus.REFUNDED
      : booking.paymentStatus;

    await prisma.$transaction(async (tx) => {
      if (activeTickets.length > 0) {
        await tx.ticket.updateMany({
          where: {
            bookingId: id,
            status: TicketStatus.ACTIVE,
          },
          data: {
            status: TicketStatus.CANCELED,
            canceledAt: now,
          },
        });
      }

      if (activeCombos.length > 0) {
        await tx.bookingCombo.updateMany({
          where: {
            bookingId: id,
            status: TicketStatus.ACTIVE,
          },
          data: {
            status: TicketStatus.CANCELED,
          },
        });
      }

      await tx.seatHold.deleteMany({
        where: { bookingId: id },
      });

      await tx.booking.update({
        where: { id },
        data: {
          status: BookingStatus.CANCELED,
          totalPrice: shouldRefund ? 0 : booking.totalPrice,
          refundedAmount: nextRefundedAmount,
          paymentStatus: nextPaymentStatus,
          ...(booking.payment && refundAmount > 0
            ? {
                payment: {
                  update: {
                    status: 'REFUNDED',
                    paidAt: null,
                  },
                },
              }
            : {}),
        },
      });
    });

    const refundNote =
      refundAmount > 0
        ? ` Hệ thống ghi nhận hoàn ${refundAmount.toLocaleString('vi-VN')} đ (hoàn tiền thực tế qua cổng thanh toán cần xử lý thủ công).`
        : '';

    return NextResponse.json({
      success: true,
      message: `Đã hủy đơn đặt vé thành công.${refundNote}`,
      refundAmount,
    });
  } catch (error) {
    console.error('POST /api/bookings/[id]/cancel error:', error);

    return NextResponse.json(
      {
        success: false,
        message: 'Không thể hủy đơn đặt vé.',
      },
      { status: 500 },
    );
  }
}
