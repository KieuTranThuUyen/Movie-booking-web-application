'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';

import { PAGE_SIZE, Pagination } from '@/components/ui/pagination';

export type HistoryBooking = {
  id: string;
  bookingCode: string;
  status: string;
  paymentStatus: string;
  totalPrice: number;
  showtime: {
    startTime: string | Date;
    movie: { title: string };
    hall: {
      name: string;
      cinema: { name: string };
    };
  };
  tickets: { seatCode: string }[];
};

function getBookingStatusLabel(status: string) {
  switch (status) {
    case 'PENDING':
      return 'Chờ xử lý';
    case 'CONFIRMED':
      return 'Đã xác nhận';
    case 'CANCELED':
      return 'Đã hủy';
    default:
      return status;
  }
}

function getPaymentStatusLabel(status: string) {
  switch (status) {
    case 'UNPAID':
      return 'Chưa thanh toán';
    case 'PAID':
      return 'Đã thanh toán';
    case 'REFUNDED':
      return 'Đã hoàn tiền';
    case 'PARTIALLY_REFUNDED':
      return 'Đã hoàn tiền một phần';
    default:
      return status;
  }
}

type Props = {
  bookings: HistoryBooking[];
};

export function BookingHistoryList({ bookings }: Props) {
  const [page, setPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(bookings.length / PAGE_SIZE));
  const paged = useMemo(() => {
    const safe = Math.min(page, totalPages);
    const start = (safe - 1) * PAGE_SIZE;
    return bookings.slice(start, start + PAGE_SIZE);
  }, [bookings, page, totalPages]);

  if (bookings.length === 0) {
    return (
      <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
        <p className="text-sm text-slate-400">Chưa có đơn đặt vé nào.</p>
        <Link
          href="/suat-chieu"
          className="mt-4 inline-flex rounded-xl border border-sky-400/30 px-4 py-2 text-sm font-semibold text-sky-300 transition hover:bg-sky-400/10"
        >
          Đặt vé ngay
        </Link>
      </div>
    );
  }

  return (
    <div>
      <div className="space-y-4">
        {paged.map((booking) => (
          <div
            key={booking.id}
            className="rounded-3xl border border-white/10 bg-white/5 p-4 text-sm text-slate-200"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-semibold text-white">
                {booking.showtime.movie.title}
              </span>
              <span className="text-slate-400">{booking.bookingCode}</span>
            </div>

            <div className="mt-2 text-slate-400">
              {booking.showtime.hall.cinema.name} ·{' '}
              {booking.showtime.hall.name} ·{' '}
              {new Date(booking.showtime.startTime).toLocaleString('vi-VN')}
            </div>

            <div className="mt-3 flex flex-wrap gap-2 text-xs">
              <span className="rounded-full bg-sky-500/10 px-3 py-1 text-sky-300">
                {getBookingStatusLabel(booking.status)}
              </span>
              <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-emerald-300">
                {getPaymentStatusLabel(booking.paymentStatus)}
              </span>
              <span className="rounded-full bg-white/10 px-3 py-1 text-slate-300">
                Ghế:{' '}
                {booking.tickets.map((t) => t.seatCode).join(', ') || '—'}
              </span>
              <span className="rounded-full bg-white/10 px-3 py-1 text-slate-300">
                {booking.totalPrice.toLocaleString('vi-VN')} đ
              </span>
            </div>

            <div className="mt-4">
              <Link
                href={`/ve/${booking.id}`}
                className="inline-flex rounded-xl border border-sky-400/30 px-4 py-2 text-xs font-semibold text-sky-300 transition hover:bg-sky-400/10"
              >
                Xem vé điện tử
              </Link>
            </div>
          </div>
        ))}
      </div>

      <Pagination
        page={Math.min(page, totalPages)}
        totalPages={totalPages}
        onChange={setPage}
      />
    </div>
  );
}
