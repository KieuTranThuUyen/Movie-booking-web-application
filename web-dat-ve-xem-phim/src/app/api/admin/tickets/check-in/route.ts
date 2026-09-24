import { NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import type { NextRequest } from 'next/server';
import { TicketStatus } from '@prisma/client';

import { prisma } from '@/lib/db/prisma';

type CheckInBody = {
  code?: string;
};

async function isAdmin(request: Request) {
  const token = await getToken({
    req: request as NextRequest,
    secret: process.env.NEXTAUTH_SECRET,
  });

  return token?.role === 'ADMIN';
}

export async function POST(request: Request) {
  if (!(await isAdmin(request))) {
    return NextResponse.json(
      { success: false, message: 'Chỉ quản trị viên mới được check-in vé.' },
      { status: 403 },
    );
  }

  try {
    const body = (await request.json()) as CheckInBody;
    const code = body.code?.trim();

    if (!code) {
      return NextResponse.json(
        { success: false, message: 'Vui lòng nhập hoặc quét mã QR.' },
        { status: 400 },
      );
    }

    const result = await prisma.$transaction(async (tx) => {
      const ticket = await tx.ticket.findFirst({
        where: {
          OR: [{ qrCode: code }, { id: code }],
        },
        include: {
          booking: {
            include: {
              showtime: {
                include: {
                  movie: true,
                  hall: { include: { cinema: true } },
                },
              },
            },
          },
        },
      });

      if (!ticket) {
        throw new Error('TICKET_NOT_FOUND');
      }

      if (ticket.status === TicketStatus.USED) {
        throw new Error('TICKET_ALREADY_USED');
      }

      if (ticket.status === TicketStatus.CANCELED) {
        throw new Error('TICKET_CANCELED');
      }

      if (
        ticket.status === TicketStatus.EXPIRED ||
        ticket.booking.status !== 'CONFIRMED' ||
        ticket.booking.showtime.endTime <= new Date()
      ) {
        await tx.ticket.update({
          where: { id: ticket.id },
          data: { status: TicketStatus.EXPIRED },
        });
        return { expired: true as const };
      }

      const claimed = await tx.ticket.updateMany({
        where: {
          id: ticket.id,
          status: TicketStatus.ACTIVE,
        },
        data: {
          status: TicketStatus.USED,
          checkedInAt: new Date(),
        },
      });

      if (claimed.count !== 1) {
        throw new Error('TICKET_ALREADY_USED');
      }

      return { expired: false as const, ticket };
    });

    if (result.expired) {
      return NextResponse.json(
        { success: false, message: 'Vé đã hết hạn hoặc đơn chưa được xác nhận.' },
        { status: 409 },
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Check-in vé thành công.',
      ticket: {
        id: result.ticket.id,
        seatCode: result.ticket.seatCode,
        status: TicketStatus.USED,
        bookingCode: result.ticket.booking.bookingCode,
        movieTitle: result.ticket.booking.showtime.movie.title,
        showtime: result.ticket.booking.showtime.startTime,
        cinema: result.ticket.booking.showtime.hall.cinema.name,
        hall: result.ticket.booking.showtime.hall.name,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : '';
    const knownErrors: Record<string, { message: string; status: number }> = {
      TICKET_NOT_FOUND: { message: 'Không tìm thấy vé từ mã QR này.', status: 404 },
      TICKET_ALREADY_USED: { message: 'Vé đã được sử dụng trước đó.', status: 409 },
      TICKET_CANCELED: { message: 'Vé đã bị hủy, không thể check-in.', status: 409 },
      TICKET_EXPIRED: { message: 'Vé đã hết hạn hoặc đơn chưa được xác nhận.', status: 409 },
    };

    const known = knownErrors[message];
    if (known) {
      return NextResponse.json({ success: false, message: known.message }, { status: known.status });
    }

    console.error('[POST /api/admin/tickets/check-in]', error);
    return NextResponse.json(
      { success: false, message: 'Không thể check-in vé.' },
      { status: 500 },
    );
  }
}