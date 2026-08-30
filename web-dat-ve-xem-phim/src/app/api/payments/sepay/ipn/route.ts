import { NextResponse } from 'next/server';

import {
  BookingStatus,
  PaymentStatus,
} from '@prisma/client';

import { prisma } from '@/lib/db/prisma';

import {
  confirmBookingPayment,
} from '@/lib/payment/confirm-booking-payment';

type SepayIPNPayload = {
  timestamp?: number;

  notification_type?: string;

  order?: {
    id?: string;
    order_id?: string;
    order_status?: string;
    order_currency?: string;
    order_amount?: string | number;
    order_invoice_number?: string;
    order_description?: string;

    custom_data?: {
      test_mode?: boolean;
      webhook_test?: boolean;
      bookingCode?: string;
      booking_code?: string;
    };
  };

  transaction?: {
    id?: string;
    payment_method?: string;
    transaction_id?: string;
    transaction_type?: string;
    transaction_date?: string;
    transaction_status?: string;
    transaction_amount?: string | number;
    transaction_currency?: string;
    authentication_status?: string;
  };
};

export async function POST(
  request: Request,
) {
  try {
    /*
     * ==========================================================
     * 1. PARSE BODY
     *
     * SePay Dashboard hiện tại:
     *
     * Auth Type = Không có
     *
     * Vì vậy KHÔNG kiểm tra x-secret-key ở đây.
     * ==========================================================
     */

    const payload =
      (await request.json()) as SepayIPNPayload;

    console.log(
      '[SePay Payment Gateway IPN] REQUEST RECEIVED',
    );

    console.log(
      '[SePay IPN] Payload:',
      JSON.stringify(
        payload,
        null,
        2,
      ),
    );

    /*
     * ==========================================================
     * 2. TEST IPN
     * ==========================================================
     */

    if (
      payload.order
        ?.custom_data
        ?.webhook_test === true
    ) {
      console.log(
        '[SePay IPN] TEST IPN RECEIVED',
      );

      return NextResponse.json({
        success: true,

        test: true,

        message:
          'SePay test IPN received successfully.',
      });
    }

    /*
     * ==========================================================
     * 3. CHỈ XỬ LÝ ORDER_PAID
     * ==========================================================
     */

    if (
      payload.notification_type !==
      'ORDER_PAID'
    ) {
      console.log(
        '[SePay IPN] Ignored notification:',
        payload.notification_type,
      );

      return NextResponse.json({
        success: true,

        ignored: true,

        reason:
          'NOT_ORDER_PAID',

        notificationType:
          payload.notification_type ??
          null,
      });
    }

    /*
     * ==========================================================
     * 4. ORDER
     * ==========================================================
     */

    const order =
      payload.order;

    if (!order) {
      return NextResponse.json(
        {
          success: false,

          message:
            'Missing order.',
        },
        {
          status: 400,
        },
      );
    }

    /*
     * ==========================================================
     * 5. BOOKING CODE
     *
     * Ưu tiên:
     *
     * order_invoice_number
     *
     * vì checkout của bạn gửi:
     *
     * BKxxxxxxxxxxx
     * ==========================================================
     */

    const bookingCode =
      String(
        order.order_invoice_number ??
          order.custom_data
            ?.bookingCode ??
          order.custom_data
            ?.booking_code ??
          '',
      ).trim();

    if (!bookingCode) {
      console.error(
        '[SePay IPN] Missing booking code.',
      );

      return NextResponse.json(
        {
          success: false,

          message:
            'Missing booking code.',
        },
        {
          status: 400,
        },
      );
    }

    console.log(
      '[SePay IPN] Booking code:',
      bookingCode,
    );

    /*
     * ==========================================================
     * 6. ORDER STATUS
     * ==========================================================
     */

    if (
      order.order_status &&
      order.order_status !==
        'CAPTURED'
    ) {
      console.log(
        '[SePay IPN] Order not captured:',
        order.order_status,
      );

      return NextResponse.json({
        success: true,

        ignored: true,

        reason:
          'ORDER_NOT_CAPTURED',

        orderStatus:
          order.order_status,
      });
    }

    /*
     * ==========================================================
     * 7. TRANSACTION
     * ==========================================================
     */

    const transaction =
      payload.transaction;

    if (
      transaction?.transaction_status &&
      transaction.transaction_status !==
        'APPROVED'
    ) {
      console.log(
        '[SePay IPN] Transaction not approved:',
        transaction.transaction_status,
      );

      return NextResponse.json({
        success: true,

        ignored: true,

        reason:
          'TRANSACTION_NOT_APPROVED',

        transactionStatus:
          transaction.transaction_status,
      });
    }

    /*
     * ==========================================================
     * 8. FIND BOOKING
     * ==========================================================
     */

    const booking =
      await prisma.booking.findUnique({
        where: {
          bookingCode,
        },

        include: {
          payment: true,
        },
      });

    if (!booking) {
      console.warn(
        '[SePay IPN] Booking not found:',
        bookingCode,
      );

      /*
       * Booking không tồn tại thì trả 200
       * để tránh SePay retry vô hạn.
       */

      return NextResponse.json({
        success: true,

        ignored: true,

        reason:
          'BOOKING_NOT_FOUND',
      });
    }

    console.log(
      '[SePay IPN] Booking found:',
      {
        bookingId:
          booking.id,

        bookingCode:
          booking.bookingCode,

        status:
          booking.status,

        paymentStatus:
          booking.paymentStatus,

        totalPrice:
          booking.totalPrice,
      },
    );

    /*
     * ==========================================================
     * 9. IDEMPOTENCY
     * ==========================================================
     */

    if (
      booking.paymentStatus ===
        PaymentStatus.PAID &&
      booking.status ===
        BookingStatus.CONFIRMED
    ) {
      console.log(
        '[SePay IPN] Already processed:',
        bookingCode,
      );

      return NextResponse.json({
        success: true,

        alreadyPaid: true,

        bookingId:
          booking.id,

        bookingCode,
      });
    }

    /*
     * ==========================================================
     * 10. PAYMENT
     * ==========================================================
     */

    if (!booking.payment) {
      console.error(
        '[SePay IPN] Payment not found:',
        bookingCode,
      );

      return NextResponse.json(
        {
          success: false,

          message:
            'Payment not found.',
        },
        {
          status: 409,
        },
      );
    }

    /*
     * ==========================================================
     * 11. AMOUNT
     * ==========================================================
     */

    const paidAmount =
      Number(
        transaction
          ?.transaction_amount ??
          order.order_amount ??
          0,
      );

    const requiredAmount =
      Number(
        booking.totalPrice,
      );

    console.log(
      '[SePay IPN] Amount check:',
      {
        bookingCode,

        paidAmount,

        requiredAmount,
      },
    );

    /*
     * Chỉ xác nhận nếu số tiền chính xác.
     */

    if (
      !Number.isFinite(
        paidAmount,
      ) ||
      paidAmount !==
        requiredAmount
    ) {
      console.warn(
        '[SePay IPN] Amount mismatch:',
        {
          bookingCode,

          paidAmount,

          requiredAmount,
        },
      );

      return NextResponse.json({
        success: true,

        amountMismatch: true,

        paidAmount,

        requiredAmount,
      });
    }

    /*
     * ==========================================================
     * 12. TRANSACTION CODE
     * ==========================================================
     */

    const transactionCode =
      transaction?.transaction_id ??
      transaction?.id ??
      order.order_id ??
      undefined;

    /*
     * ==========================================================
     * 13. PAID AT
     * ==========================================================
     */

    let paidAt =
      new Date();

    if (
      transaction?.transaction_date
    ) {
      const parsed =
        new Date(
          transaction.transaction_date,
        );

      if (
        !Number.isNaN(
          parsed.getTime(),
        )
      ) {
        paidAt =
          parsed;
      }
    }

    /*
     * ==========================================================
     * 14. CONFIRM PAYMENT
     *
     * confirmBookingPayment() sẽ thực hiện:
     *
     * Payment  -> PAID
     * Booking  -> CONFIRMED
     * Ticket   -> CREATE ACTIVE
     * SeatHold  -> DELETE
     * ==========================================================
     */

    console.log(
      '[SePay IPN] Confirming payment:',
      {
        bookingId:
          booking.id,

        bookingCode:
          booking.bookingCode,

        transactionCode,

        paidAt,
      },
    );

    const result =
      await confirmBookingPayment({
        bookingId:
          booking.id,

        transactionCode,

        paidAt,
      });

    /*
     * ==========================================================
     * 15. SUCCESS LOG
     * ==========================================================
     */

    console.log(
      '[SePay IPN] Payment confirmed:',
      {
        bookingId:
          result.booking.id,

        bookingCode:
          result.booking.bookingCode,

        status:
          result.booking.status,

        paymentStatus:
          result.booking.paymentStatus,

        alreadyPaid:
          result.alreadyPaid,
      },
    );

    /*
     * ==========================================================
     * 16. ACK SEPAY
     * ==========================================================
     */

    return NextResponse.json({
      success: true,

      paid: true,

      alreadyPaid:
        result.alreadyPaid,

      bookingId:
        result.booking.id,

      bookingCode:
        result.booking.bookingCode,

      paymentStatus:
        result.booking.paymentStatus,

      status:
        result.booking.status,
    });
  } catch (error) {
    console.error(
      '[SePay IPN] Processing failed:',
      error,
    );

    /*
     * 500 để SePay biết xử lý thất bại
     * và có thể retry.
     */

    return NextResponse.json(
      {
        success: false,

        message:
          'Không thể xử lý thanh toán SePay.',
      },
      {
        status: 500,
      },
    );
  }
}