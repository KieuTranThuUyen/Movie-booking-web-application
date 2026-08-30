'use client';

import {
  useEffect,
  useState,
} from 'react';

import { useRouter } from 'next/navigation';

type PaymentStatusResponse = {
  success: boolean;

  expired?: boolean;

  booking?: {
    id: string;
    bookingCode: string;
    status: string;
    paymentStatus: string;
    totalPrice: number;
  };

  tickets?: Array<{
    id: string;
    seatCode: string;
    price: number;
    status: string;
  }>;

  payment?: {
    status: string;
    paidAt: string | null;
    transactionCode: string | null;
  } | null;

  message?: string;
};

type TicketPaymentWaiterProps = {
  bookingId: string;
  showtimeId: string;
};

export function TicketPaymentWaiter({
  bookingId,
  showtimeId,
}: TicketPaymentWaiterProps) {
  const router =
    useRouter();

  const [message, setMessage] =
    useState(
      'Hệ thống đang chờ SePay xác nhận...',
    );

  const [expired, setExpired] =
    useState(false);

  const [
    redirecting,
    setRedirecting,
  ] = useState(false);

  useEffect(() => {
    let stopped = false;

    let attempts = 0;

    const checkStatus =
      async () => {
        if (stopped) {
          return;
        }

        attempts += 1;

        try {
          const response =
            await fetch(
              `/api/bookings/${encodeURIComponent(
                bookingId,
              )}/payment-status`,
              {
                method: 'GET',

                cache: 'no-store',

                headers: {
                  'Cache-Control':
                    'no-cache',
                },
              },
            );

          if (!response.ok) {
            return;
          }

          const data =
            (await response.json()) as PaymentStatusResponse;

          if (
            stopped ||
            !data.success ||
            !data.booking
          ) {
            return;
          }

          /* ==================================================
             HẾT HẠN GIỮ GHẾ
             ================================================== */

          if (
            data.expired === true ||
            data.booking.status ===
              'CANCELED'
          ) {
            stopped = true;

            setExpired(true);

            setMessage(
              data.message ??
                'Thời gian giữ ghế đã hết. Phiên thanh toán đã bị hủy và ghế đã được giải phóng.',
            );

            setRedirecting(true);

            window.setTimeout(
              () => {
                router.replace(
                  `/dat-ve?showtime=${encodeURIComponent(
                    showtimeId,
                  )}`,
                );
              },
              1800,
            );

            return;
          }

          /* ==================================================
             ĐÃ THANH TOÁN + ĐÃ CÓ VÉ
             ================================================== */

          const hasTickets =
            Array.isArray(
              data.tickets,
            ) &&
            data.tickets.length >
              0;

          if (
            data.booking
              .paymentStatus ===
              'PAID' &&
            data.booking.status ===
              'CONFIRMED' &&
            hasTickets
          ) {
            stopped = true;

            setMessage(
              'Thanh toán thành công. Vé điện tử đã được tạo.',
            );

            setRedirecting(true);

            window.setTimeout(
              () => {
                router.replace(
                  `/ve/${encodeURIComponent(
                    bookingId,
                  )}`,
                );

                router.refresh();
              },
              300,
            );

            return;
          }

          /* ==================================================
             VẪN CHỜ IPN
             ================================================== */

          setMessage(
            'Thanh toán đã được thực hiện. Hệ thống đang nhận xác nhận từ SePay và tạo vé cho bạn...',
          );

          /* ==================================================
             TIMEOUT BẢO VỆ
             
             60 lần × 2 giây = khoảng 2 phút
             ================================================== */

          if (
            attempts >= 60
          ) {
            stopped = true;

            setExpired(true);

            setMessage(
              'Không nhận được xác nhận thanh toán trong thời gian cho phép. Phiên đặt vé sẽ được hủy.',
            );

            setRedirecting(true);

            window.setTimeout(
              () => {
                router.replace(
                  `/dat-ve?showtime=${encodeURIComponent(
                    showtimeId,
                  )}`,
                );
              },
              1800,
            );
          }
        } catch (error) {
          console.error(
            'Ticket payment waiter error:',
            error,
          );
        }
      };

    /*
     * Kiểm tra ngay
     */

    void checkStatus();

    /*
     * Sau đó mỗi 2 giây
     */

    const timer =
      window.setInterval(
        () => {
          void checkStatus();
        },
        2000,
      );

    return () => {
      stopped = true;

      window.clearInterval(
        timer,
      );
    };
  }, [
    bookingId,
    showtimeId,
    router,
  ]);

  return (
    <section className="rounded-[28px] border border-white/10 bg-slate-900 p-8 text-center shadow-2xl">
      <div className="text-5xl">
        {expired
          ? '⏰'
          : '⏳'}
      </div>

      <h1 className="mt-5 text-2xl font-bold text-white">
        {expired
          ? 'Phiên thanh toán đã hết hạn'
          : 'Đang tạo vé điện tử'}
      </h1>

      <p className="mt-3 text-slate-400">
        {message}
      </p>

      {expired ? (
        <div className="mt-5 space-y-2">
          <p className="text-sm text-amber-300">
            Ghế đã được giải phóng.
          </p>

          {redirecting ? (
            <p className="text-sm text-slate-500">
              Đang quay lại chọn ghế...
            </p>
          ) : null}
        </div>
      ) : (
        <p className="mt-4 text-sm text-slate-500">
          Vui lòng không đóng trang.
        </p>
      )}
    </section>
  );
}