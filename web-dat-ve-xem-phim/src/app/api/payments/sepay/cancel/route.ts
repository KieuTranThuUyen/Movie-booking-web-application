import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';

export async function GET(
  request: Request,
) {
  try {
    const { searchParams } =
      new URL(request.url);

    const id =
      searchParams.get('id');

    if (!id) {
      return NextResponse.redirect(
        new URL(
          '/don-hang',
          request.url,
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
          status: true,
        },
      });

    if (
      !booking
    ) {
      return NextResponse.redirect(
        new URL(
          '/don-hang',
          request.url,
        ),
      );
    }

    if (
      booking.status ===
      'PENDING'
    ) {
      await prisma.$transaction(
        async (tx) => {
          await tx.booking.update({
            where: {
              id,
            },

            data: {
              status:
                'CANCELED',
            },
          });

          await tx.seatHold.deleteMany({
            where: {
              bookingId: id,
            },
          });
        },
      );
    }

    return NextResponse.redirect(
      new URL(
        `/dat-ve`,
        request.url,
      ),
    );
  } catch (error) {
    console.error(
      'SePay cancel error:',
      error,
    );

    return NextResponse.redirect(
      new URL(
        '/don-hang',
        request.url,
      ),
    );
  }
}