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

type CancelBody = {
  ticketIds?: string[];
  comboIds?: string[];
};

export async function POST(
  request: Request,
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

    let body: CancelBody = {};
    try {
      const text = await request.text();
      if (text) {
        body = JSON.parse(text) as CancelBody;
      }
    } catch {
      body = {};
    }

    const selectedTicketIds = Array.isArray(body.ticketIds)
      ? body.ticketIds.filter(Boolean)
      : [];
    const selectedComboIds = Array.isArray(body.comboIds)
      ? body.comboIds.filter(Boolean)
      : [];
    const isPartial =
      selectedTicketIds.length > 0 || selectedComboIds.length > 0;

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

    if (activeTickets.length === 0 && activeCombos.length === 0) {
      return NextResponse.json(
        {
          success: false,
          message: 'Đơn không còn vé hoặc combo hiệu lực để hủy.',
        },
        { status: 400 },
      );
    }

    // Validate partial selection
    let ticketsToCancel = activeTickets;
    let combosToCancel = activeCombos;

    if (isPartial) {
      const activeTicketIdSet = new Set(activeTickets.map((t) => t.id));
      const activeComboIdSet = new Set(activeCombos.map((c) => c.id));

      for (const tid of selectedTicketIds) {
        if (!activeTicketIdSet.has(tid)) {
          return NextResponse.json(
            {
              success: false,
              message: 'Có vé không hợp lệ hoặc đã bị hủy.',
            },
            { status: 400 },
          );
        }
      }
      for (const cid of selectedComboIds) {
        if (!activeComboIdSet.has(cid)) {
          return NextResponse.json(
            {
              success: false,
              message: 'Có combo không hợp lệ hoặc đã bị hủy.',
            },
            { status: 400 },
          );
        }
      }

      ticketsToCancel = activeTickets.filter((t) =>
        selectedTicketIds.includes(t.id),
      );
      combosToCancel = activeCombos.filter((c) =>
        selectedComboIds.includes(c.id),
      );

      if (ticketsToCancel.length === 0 && combosToCancel.length === 0) {
        return NextResponse.json(
          {
            success: false,
            message: 'Vui lòng chọn ít nhất một vé hoặc combo để hủy.',
          },
          { status: 400 },
        );
      }
    }

    const remainingActiveTickets = activeTickets.filter(
      (t) => !ticketsToCancel.some((x) => x.id === t.id),
    );
    const remainingActiveCombos = activeCombos.filter(
      (c) => !combosToCancel.some((x) => x.id === c.id),
    );

    const isFullCancel =
      remainingActiveTickets.length === 0 &&
      remainingActiveCombos.length === 0;

    const shouldRefund =
      booking.paymentStatus === PaymentStatus.PAID ||
      booking.paymentStatus === PaymentStatus.PARTIALLY_REFUNDED;

    const ticketRefund = shouldRefund
      ? ticketsToCancel.reduce((sum, t) => sum + Number(t.price), 0)
      : 0;

    const comboRefund = shouldRefund
      ? combosToCancel.reduce(
          (sum, c) => sum + Number(c.unitPrice) * Number(c.quantity),
          0,
        )
      : 0;

    const refundAmount = ticketRefund + comboRefund;
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

    if (isFullCancel) {
      nextPaymentStatus = shouldRefund
        ? PaymentStatus.REFUNDED
        : booking.paymentStatus;
      paymentRecordStatus = shouldRefund ? 'REFUNDED' : 'PENDING';
    } else if (shouldRefund && refundAmount > 0) {
      nextPaymentStatus = PaymentStatus.PARTIALLY_REFUNDED;
      paymentRecordStatus = 'PARTIALLY_REFUNDED';
    }

    await prisma.$transaction(async (tx) => {
      if (ticketsToCancel.length > 0) {
        await tx.ticket.updateMany({
          where: {
            id: { in: ticketsToCancel.map((t) => t.id) },
            status: TicketStatus.ACTIVE,
          },
          data: {
            status: TicketStatus.CANCELED,
            canceledAt: now,
          },
        });
      }

      if (combosToCancel.length > 0) {
        await tx.bookingCombo.updateMany({
          where: {
            id: { in: combosToCancel.map((c) => c.id) },
            status: TicketStatus.ACTIVE,
          },
          data: {
            status: TicketStatus.CANCELED,
          },
        });
      }

      if (isFullCancel) {
        await tx.seatHold.deleteMany({
          where: { bookingId: id },
        });
      }

      await tx.booking.update({
        where: { id },
        data: {
          status: isFullCancel
            ? BookingStatus.CANCELED
            : booking.status,
          totalPrice: isFullCancel ? 0 : remainingTotalPrice,
          refundedAmount: nextRefundedAmount,
          paymentStatus: nextPaymentStatus,
          ...(booking.payment && refundAmount > 0
            ? {
                payment: {
                  update: {
                    status: paymentRecordStatus,
                    ...(isFullCancel ? { paidAt: null } : {}),
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

    const itemNote = isPartial
      ? `Đã hủy ${ticketsToCancel.length} vé và ${combosToCancel.length} combo.`
      : 'Đã hủy đơn đặt vé thành công.';

    return NextResponse.json({
      success: true,
      message: `${itemNote}${refundNote}`,
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
