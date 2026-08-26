import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';

import {
  BookingStatus,
  PaymentStatus,
} from '@prisma/client';

import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

import {
  createSepayCheckoutFields,
} from '@/lib/sepay';

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

function escapeHtml(
  value: string,
): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll(
      '<',
      '&lt;',
    )
    .replaceAll(
      '>',
      '&gt;',
    )
    .replaceAll(
      '"',
      '&quot;',
    )
    .replaceAll(
      "'",
      '&#039;',
    );
}

export async function GET(
  _request: Request,
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
          message:
            'Bạn cần đăng nhập.',
        },
        {
          status: 401,
        },
      );
    }

    const { id } =
      await context.params;

    if (!id) {
      return NextResponse.json(
        {
          message:
            'Thiếu id booking.',
        },
        {
          status: 400,
        },
      );
    }

    const booking =
      await prisma.booking.findUnique({
        where: {
          id,
        },

        include: {
          payment: true,

          seatHolds: {
            include: {
              seat: true,
            },
          },
        },
      });

    if (!booking) {
      return NextResponse.json(
        {
          message:
            'Không tìm thấy booking.',
        },
        {
          status: 404,
        },
      );
    }

    if (
      booking.userId !==
        user.id &&
      user.role !== 'ADMIN'
    ) {
      return NextResponse.json(
        {
          message:
            'Bạn không có quyền thanh toán booking này.',
        },
        {
          status: 403,
        },
      );
    }

    if (
      booking.status !==
      BookingStatus.PENDING
    ) {
      return NextResponse.json(
        {
          message:
            'Booking không còn ở trạng thái chờ thanh toán.',
        },
        {
          status: 409,
        },
      );
    }

    if (
      booking.paymentStatus ===
      PaymentStatus.PAID
    ) {
      return NextResponse.json(
        {
          message:
            'Booking đã thanh toán.',
        },
        {
          status: 409,
        },
      );
    }

    if (!booking.payment) {
      return NextResponse.json(
        {
          message:
            'Không tìm thấy payment.',
        },
        {
          status: 409,
        },
      );
    }

    /* ========================================================
       KIỂM TRA HOLD
       ======================================================== */

    const now =
      new Date();

    const validHolds =
      booking.seatHolds.filter(
        (hold) =>
          hold.expiresAt >
            now &&
          hold.seat.isActive,
      );

    if (
      validHolds.length === 0
    ) {
      await prisma.$transaction(
        async (tx) => {
          await tx.seatHold.deleteMany({
            where: {
              bookingId:
                booking.id,
            },
          });

          await tx.booking.update({
            where: {
              id:
                booking.id,
            },

            data: {
              status:
                BookingStatus.CANCELED,
            },
          });
        },
      );

      return NextResponse.json(
        {
          success: false,

          expired: true,

          message:
            'Thời gian giữ ghế đã hết. Phiên thanh toán đã bị hủy. Vui lòng quay lại chọn ghế.',
        },
        {
          status: 409,
        },
      );
    }

    /* ========================================================
       APP URL
       ======================================================== */

    const appUrl = (
      process.env.NEXT_PUBLIC_APP_URL ??
      process.env.NEXTAUTH_URL ??
      ''
    ).replace(
      /\/+$/,
      '',
    );

    if (!appUrl) {
      throw new Error(
        'MISSING_APP_URL',
      );
    }

    /* ========================================================
       CALLBACK
       ======================================================== */

    const successUrl =
      `${appUrl}/api/payments/sepay/success?id=${encodeURIComponent(
        booking.id,
      )}`;

    const errorUrl =
      `${appUrl}/api/payments/sepay/error?id=${encodeURIComponent(
        booking.id,
      )}`;

    const cancelUrl =
      `${appUrl}/api/payments/sepay/cancel?id=${encodeURIComponent(
        booking.id,
      )}`;

    /* ========================================================
       CREATE CHECKOUT
       ======================================================== */

    const checkout =
      createSepayCheckoutFields({
        amount:
          Number(
            booking.totalPrice,
          ),

        bookingCode:
          booking.bookingCode,

        customerId:
          booking.userId ??
          booking.id,

        successUrl,

        errorUrl,

        cancelUrl,
      });

    console.log(
      '[SePay Checkout]',
      {
        bookingId:
          booking.id,

        bookingCode:
          booking.bookingCode,

        amount:
          booking.totalPrice,

        invoice:
          checkout.fields
            .order_invoice_number,

        holdExpiresAt:
          validHolds.map(
            (hold) =>
              hold.expiresAt,
          ),
      },
    );

    const fields: Record<
      string,
      string
    > = {
      ...checkout.fields,

      signature:
        checkout.signature,
    };

    const inputs =
      Object.entries(fields)
        .map(
          ([name, value]) =>
            `<input type="hidden" name="${escapeHtml(
              name,
            )}" value="${escapeHtml(
              String(value),
            )}" />`,
        )
        .join('');

    const html = `
<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8" />

  <meta
    name="viewport"
    content="width=device-width, initial-scale=1.0"
  />

  <title>SePay Sandbox</title>

  <style>
    body {
      margin: 0;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #020617;
      color: white;
      font-family: Arial, sans-serif;
    }

    .box {
      text-align: center;
      padding: 40px;
    }

    .spinner {
      width: 40px;
      height: 40px;
      margin: 0 auto 20px;
      border: 4px solid rgba(255,255,255,.15);
      border-top-color: #38bdf8;
      border-radius: 50%;
      animation: spin 1s linear infinite;
    }

    @keyframes spin {
      to {
        transform: rotate(360deg);
      }
    }
  </style>
</head>

<body>
  <div class="box">
    <div class="spinner"></div>

    <h2>
      Đang chuyển đến SePay Sandbox...
    </h2>

    <p>
      Booking:
      ${escapeHtml(
        booking.bookingCode,
      )}
    </p>

    <form
      id="sepay-form"
      method="POST"
      action="${escapeHtml(
        checkout.checkoutUrl,
      )}"
    >
      ${inputs}
    </form>
  </div>

  <script>
    document
      .getElementById('sepay-form')
      .submit();
  </script>
</body>
</html>
`;

    return new NextResponse(
      html,
      {
        status: 200,

        headers: {
          'Content-Type':
            'text/html; charset=utf-8',

          'Cache-Control':
            'no-store, no-cache, must-revalidate',

          Pragma:
            'no-cache',

          Expires:
            '0',
        },
      },
    );
  } catch (error) {
    console.error(
      'GET /api/payments/sepay/checkout error:',
      error,
    );

    return NextResponse.json(
      {
        message:
          'Không thể khởi tạo thanh toán SePay Sandbox.',
      },
      {
        status: 500,
      },
    );
  }
}