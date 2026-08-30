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

    if (
      id
    ) {
      const booking =
        await prisma.booking.findUnique({
          where: {
            id,
          },

          select: {
            status: true,
          },
        });

      if (
        booking?.status ===
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
    }

    return NextResponse.redirect(
      new URL(
        '/don-hang',
        request.url,
      ),
    );
  } catch (error) {
    console.error(
      'SePay error callback:',
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