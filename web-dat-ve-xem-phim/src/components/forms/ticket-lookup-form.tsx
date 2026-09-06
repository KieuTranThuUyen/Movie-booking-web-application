'use client';

import Link from 'next/link';
import {
  BookingStatus,
  PaymentStatus,
  TicketStatus,
} from '@prisma/client';
import { FormEvent, useState } from 'react';

type BookingTicket = {
  id: string;
  seatCode: string;
  price: number;
  seatId: string;
  status: TicketStatus;
  canceledAt: string | null;
};

type BookingItem = {
  id: string;
  bookingCode: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  status: BookingStatus;
  paymentStatus: PaymentStatus;
  totalPrice: number;
  refundedAmount: number;
  createdAt: string;
  showtime: {
    startTime: string;
    movie: {
      title: string;
    };
    hall: {
      name: string;
      cinema: {
        name: string;
      };
    };
  };
  tickets: BookingTicket[];
};

function formatMoney(value: number) {
  return `${value.toLocaleString('vi-VN')} đ`;
}

function getBookingStatusLabel(status: BookingStatus) {
  switch (status) {
    case BookingStatus.PENDING:
      return 'Chờ xử lý';
    case BookingStatus.CONFIRMED:
      return 'Đã xác nhận';
    case BookingStatus.CANCELED:
      return 'Đã hủy';
    default:
      return status;
  }
}

function getBookingStatusClass(status: BookingStatus) {
  switch (status) {
    case BookingStatus.CONFIRMED:
      return 'border-emerald-400/30 bg-emerald-500/10 text-emerald-200';
    case BookingStatus.CANCELED:
      return 'border-rose-400/30 bg-rose-500/10 text-rose-200';
    default:
      return 'border-amber-400/30 bg-amber-500/10 text-amber-200';
  }
}

function getPaymentStatusLabel(status: PaymentStatus) {
  switch (status) {
    case PaymentStatus.UNPAID:
      return 'Chưa thanh toán';
    case PaymentStatus.PAID:
      return 'Đã thanh toán';
    case PaymentStatus.PARTIALLY_REFUNDED:
      return 'Đã hoàn tiền một phần';
    case PaymentStatus.REFUNDED:
      return 'Đã hoàn tiền';
    default:
      return status;
  }
}

function getPaymentStatusClass(status: PaymentStatus) {
  switch (status) {
    case PaymentStatus.PAID:
      return 'border-emerald-400/30 bg-emerald-500/10 text-emerald-200';
    case PaymentStatus.PARTIALLY_REFUNDED:
      return 'border-orange-400/30 bg-orange-500/10 text-orange-200';
    case PaymentStatus.REFUNDED:
      return 'border-purple-400/30 bg-purple-500/10 text-purple-200';
    default:
      return 'border-amber-400/30 bg-amber-500/10 text-amber-200';
  }
}

export function TicketLookupForm() {
  const [query, setQuery] = useState('');
  const [bookings, setBookings] = useState<BookingItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const handleSearch = async (event?: FormEvent) => {
    event?.preventDefault();

    const q = query.trim();
    if (!q) {
      setError('Vui lòng nhập mã đơn hoặc số điện thoại.');
      setBookings([]);
      setSearched(false);
      return;
    }

    setLoading(true);
    setError('');
    setMessage('');
    setSearched(true);

    try {
      const response = await fetch(
        `/api/admin/bookings?q=${encodeURIComponent(q)}`,
        {
          method: 'GET',
          cache: 'no-store',
        },
      );

      const data = (await response.json()) as {
        bookings?: BookingItem[];
        message?: string;
      };

      if (!response.ok) {
        setError(data.message || 'Không thể tìm đơn đặt vé.');
        setBookings([]);
        return;
      }

      const list = data.bookings ?? [];
      setBookings(list);

      if (list.length === 0) {
        setMessage('Không tìm thấy đơn nào khớp với từ khóa.');
      } else {
        setMessage(`Tìm thấy ${list.length} đơn.`);
      }
    } catch (err) {
      console.error(err);
      setError('Có lỗi xảy ra khi tìm kiếm.');
      setBookings([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-5">
      <form
        onSubmit={handleSearch}
        className="rounded-2xl border border-white/10 bg-white/5 p-4"
      >
        <label className="block text-sm font-medium text-slate-300">
          Mã đơn hoặc số điện thoại
        </label>
        <div className="mt-2 flex flex-col gap-3 sm:flex-row">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="VD: BK-ABC123 hoặc 09xxxxxxxx"
            className="min-w-0 flex-1 rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500 focus:border-sky-400/40"
            autoFocus
          />
          <button
            type="submit"
            disabled={loading}
            className="rounded-2xl bg-sky-500 px-6 py-3 text-sm font-semibold text-white transition hover:bg-sky-400 disabled:opacity-50"
          >
            {loading ? 'Đang tìm...' : 'Tra cứu'}
          </button>
        </div>
        <p className="mt-2 text-xs text-slate-500">
          Nhập mã đơn, SĐT, tên hoặc email khách để tìm nhanh và in vé.
        </p>
      </form>

      {message ? (
        <div className="rounded-2xl border border-emerald-400/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
          {message}
        </div>
      ) : null}

      {error ? (
        <div className="rounded-2xl border border-rose-400/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
          {error}
        </div>
      ) : null}

      {searched && !loading && bookings.length === 0 && !error ? (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-8 text-center text-sm text-slate-400">
          Không có đơn phù hợp. Kiểm tra lại mã đơn hoặc số điện thoại.
        </div>
      ) : null}

      <div className="grid gap-4">
        {bookings.map((booking) => {
          const activeTickets = booking.tickets.filter(
            (t) => t.status === TicketStatus.ACTIVE,
          );
          const canPrint =
            booking.status !== BookingStatus.CANCELED &&
            activeTickets.length > 0;

          return (
            <article
              key={booking.id}
              className="rounded-2xl border border-white/10 bg-white/5 p-5"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="text-lg font-bold text-white">
                    {booking.bookingCode}
                  </div>
                  <div className="mt-1 text-sm text-slate-300">
                    {booking.showtime.movie.title}
                  </div>
                  <div className="mt-1 text-xs text-slate-500">
                    {booking.showtime.hall.cinema.name} ·{' '}
                    {booking.showtime.hall.name}
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <span
                    className={`rounded-full border px-3 py-1 text-xs font-medium ${getBookingStatusClass(booking.status)}`}
                  >
                    {getBookingStatusLabel(booking.status)}
                  </span>
                  <span
                    className={`rounded-full border px-3 py-1 text-xs font-medium ${getPaymentStatusClass(booking.paymentStatus)}`}
                  >
                    {getPaymentStatusLabel(booking.paymentStatus)}
                  </span>
                </div>
              </div>

              <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
                <div>
                  <div className="text-xs text-slate-500">Khách hàng</div>
                  <div className="mt-0.5 font-medium text-slate-200">
                    {booking.customerName}
                  </div>
                  <div className="text-slate-400">{booking.customerPhone}</div>
                </div>
                <div>
                  <div className="text-xs text-slate-500">Suất chiếu</div>
                  <div className="mt-0.5 text-slate-200">
                    {new Date(booking.showtime.startTime).toLocaleString(
                      'vi-VN',
                    )}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-slate-500">Ghế còn hiệu lực</div>
                  <div className="mt-0.5 font-semibold text-emerald-300">
                    {activeTickets.length > 0
                      ? activeTickets.map((t) => t.seatCode).join(', ')
                      : '—'}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-slate-500">Tổng tiền</div>
                  <div className="mt-0.5 font-bold text-white">
                    {formatMoney(booking.totalPrice)}
                  </div>
                </div>
              </div>

              <div className="mt-5 flex flex-wrap gap-2">
                {canPrint ? (
                  <Link
                    href={`/ve/${booking.id}`}
                    className="inline-flex items-center rounded-xl bg-sky-500 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-sky-400"
                  >
                    🖨 In vé
                  </Link>
                ) : (
                  <span className="inline-flex items-center rounded-xl border border-white/10 bg-white/5 px-5 py-2.5 text-sm text-slate-500">
                    Không thể in (đơn đã hủy / hết vé)
                  </span>
                )}
                <Link
                  href={`/ve/${booking.id}`}
                  className="inline-flex items-center rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 text-sm font-medium text-slate-200 transition hover:bg-white/10"
                >
                  Xem chi tiết vé
                </Link>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
