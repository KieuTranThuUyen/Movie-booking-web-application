import { NextResponse } from 'next/server';

import { prisma } from '@/lib/prisma';

export async function GET(
  request: Request,
) {
  const { searchParams } =
    new URL(request.url);

  const id =
    searchParams.get('id');

  const appUrl =
    (
      process.env.NEXT_PUBLIC_APP_URL ??
      process.env.NEXTAUTH_URL ??
      new URL(request.url).origin
    ).replace(/\/+$/, '');

  if (!id) {
    return NextResponse.redirect(
      new URL(
        '/don-hang',
        appUrl,
      ),
    );
  }

  const booking =
    await prisma.booking.findUnique({
      where: {
        id,
      },

      select: {
        id: true,
      },
    });

  if (!booking) {
    return NextResponse.redirect(
      new URL(
        '/don-hang',
        appUrl,
      ),
    );
  }

  /*
   * Chỉ redirect.
   *
   * KHÔNG:
   * - PAID
   * - CONFIRMED
   * - CREATE TICKET
   *
   * Những việc đó chỉ do IPN làm.
   */

  return NextResponse.redirect(
    new URL(
      `/ve/${booking.id}?checking=1`,
      appUrl,
    ),
  );
}