'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';

import { PAGE_SIZE, Pagination } from '@/components/ui/pagination';

export type OrdersBooking = {
  id: string;
  bookingCode: string;
  customerName: string;
  status: string;
  paymentStatus: string;
  totalPrice: number;
  refundedAmount: number;
  showtime: {
    movie: { title: string };
    hall: {
      cinema: { name: string };
      name: string;
    };
    startTime: string;
  };
  tickets: {
    id: string;
    seatCode: string;
    status: string;
  }[];
};

function getBookingStatusLabel(status: string) {
  switch (status) {
    case 'PENDING':
      return 'Chờ thanh toán';
    case 'CONFIRMED':
      return 'Đã xác nhận';
    case 'CANCELED':
      return 'Đã hủy';
    default:
      return 'Không xác định';
  }
}

function getPaymentStatusLabel(status: string) {
  switch (status) {
    case 'UNPAID':
      return 'Chưa thanh toán';
    case 'PAID':
      return 'Đã thanh toán';
    case 'PARTIALLY_REFUNDED':
      return 'Đã hoàn tiền một phần';
    case 'REFUNDED':
      return 'Đã hoàn tiền';
    default:
      return 'Không xác định';
  }
}

function getBookingStatusClass(status: string) {
  switch (status) {
    case 'CONFIRMED':
      return 'border-emerald-400/20 bg-emerald-500/10 text-emerald-300';
    case 'CANCELED':
      return 'border-rose-400/20 bg-rose-500/10 text-rose-300';
    case 'PENDING':
    default:
      return 'border-amber-400/20 bg-amber-500/10 text-amber-300';
  }
}

function getPaymentStatusClass(status: string) {
  switch (status) {
    case 'PAID':
      return 'bg-emerald-500/10 text-emerald-300';
    case 'PARTIALLY_REFUNDED':
      return 'bg-orange-500/10 text-orange-300';
    case 'REFUNDED':
      return 'bg-purple-500/10 text-purple-300';
    case 'UNPAID':
    default:
      return 'bg-amber-500/10 text-amber-300';
  }
}

type Props = { bookings: OrdersBooking[] };

export function OrdersBookingList({ bookings }: Props) {
  const [page, setPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(bookings.length / PAGE_SIZE));
  const paged = useMemo(() => {
    const safe = Math.min(page, totalPages);
    const start = (safe - 1) * PAGE_SIZE;
    return bookings.slice(start, start + PAGE_SIZE);
  }, [bookings, page, totalPages]);

  if (bookings.length === 0) {
    return (
      <div className="rounded-[28px] border border-white/10 bg-slate-950/70 p-6 shadow-glow backdrop-blur-xl">
        <p className="text-sm text-slate-300">
          Bạn chưa có đơn đặt vé nào được ghi nhận.
        </p>
        <Link
          href="/suat-chieu"
          className="mt-4 inline-flex rounded-xl bg-sky-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky-400"
        >
          Đặt vé ngay
        </Link>
      </div>
    );
  }

  return (
    <div>
      <div className="grid gap-4">
        {paged.map((booking) => {
          const activeTickets = booking.tickets.filter(
            (ticket) => ticket.status === 'ACTIVE',
          );
          const canceledTickets = booking.tickets.filter(
            (ticket) => ticket.status === 'CANCELED',
          );
          const canViewElectronicTicket =
            booking.status === 'CONFIRMED' && activeTickets.length > 0;
          const canPay =
            booking.status === 'PENDING' &&
            booking.paymentStatus === 'UNPAID';
          return (
            <article
              key={booking.id}
              className="rounded-[28px] border border-white/10 bg-slate-950/70 p-6 shadow-glow backdrop-blur-xl"
            >
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-semibold text-white">
                    {booking.showtime.movie.title}
                  </h2>
                  <p className="mt-1 text-sm text-slate-400">
                    {booking.customerName} ·{' '}
                    {new Date(booking.showtime.startTime).toLocaleString(
                      'vi-VN',
                    )}
                  </p>
                </div>
                <div
                  className={`rounded-full border px-4 py-2 text-sm ${getBookingStatusClass(
                    booking.status,
                  )}`}
                >
                  {getBookingStatusLabel(booking.status)}
                </div>
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-slate-300">
                <span className="rounded-full bg-white/5 px-3 py-1">
                  Mã đơn: {booking.bookingCode}
                </span>
                <span
                  className={`rounded-full px-3 py-1 ${getPaymentStatusClass(
                    booking.paymentStatus,
                  )}`}
                >
                  Thanh toán: {getPaymentStatusLabel(booking.paymentStatus)}
                </span>
                <span className="rounded-full bg-white/5 px-3 py-1">
                  Tổng tiền:{' '}
                  {Number(booking.totalPrice).toLocaleString('vi-VN')} đ
                </span>
                <span className="rounded-full bg-white/5 px-3 py-1">
                  Ghế:{' '}
                  {booking.tickets.length > 0
                    ? booking.tickets.map((t) => t.seatCode).join(', ')
                    : 'Đang giữ ghế'}
                </span>
              </div>

              {booking.tickets.length > 0 ? (
                <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div className="flex flex-wrap gap-4 text-sm">
                    <span className="text-slate-400">
                      Tổng vé:{' '}
                      <strong className="text-white">
                        {booking.tickets.length}
                      </strong>
                    </span>
                    <span className="text-slate-400">
                      Còn hiệu lực:{' '}
                      <strong className="text-emerald-300">
                        {activeTickets.length}
                      </strong>
                    </span>
                    <span className="text-slate-400">
                      Đã hủy:{' '}
                      <strong className="text-rose-300">
                        {canceledTickets.length}
                      </strong>
                    </span>
                    {Number(booking.refundedAmount) > 0 ? (
                      <span className="text-slate-400">
                        Đã hoàn:{' '}
                        <strong className="text-purple-300">
                          {Number(booking.refundedAmount).toLocaleString(
                            'vi-VN',
                          )}{' '}
                          đ
                        </strong>
                      </span>
                    ) : null}
                  </div>
                  {booking.paymentStatus === 'PARTIALLY_REFUNDED' &&
                  activeTickets.length > 0 ? (
                    <p className="mt-3 text-xs text-orange-300">
                      Một phần vé trong đơn đã được hoàn tiền. Các vé còn hiệu
                      lực vẫn có thể sử dụng bình thường.
                    </p>
                  ) : null}
                </div>
              ) : null}

              <div className="mt-5 flex flex-wrap gap-3">
                {canPay ? (
                  <Link
                    href={`/thanh-toan/${booking.id}`}
                    className="inline-flex items-center justify-center rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-emerald-400"
                  >
                    Thanh toán
                  </Link>
                ) : null}
                {canViewElectronicTicket ? (
                  <Link
                    href={`/ve/${booking.id}`}
                    className="inline-flex items-center justify-center rounded-xl bg-sky-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-sky-400"
                  >
                    Xem vé điện tử
                  </Link>
                ) : null}
                {booking.status === 'CANCELED' ? (
                  <span className="inline-flex items-center justify-center rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-slate-400">
                    Đơn đã hủy
                  </span>
                ) : null}
              </div>
            </article>
          );
        })}
      </div>

      <Pagination
        page={Math.min(page, totalPages)}
        totalPages={totalPages}
        onChange={setPage}
      />
    </div>
  );
}
