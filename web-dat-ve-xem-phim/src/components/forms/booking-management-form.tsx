'use client';

import Link from 'next/link';
import { BookingStatus, PaymentStatus } from '@prisma/client';
import { useEffect, useMemo, useState } from 'react';

type BookingItem = {
  id: string;
  bookingCode: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  status: BookingStatus;
  paymentStatus: PaymentStatus;
  totalPrice: number;
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
  tickets: Array<{
    seatCode: string;
  }>;
};

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

function getPaymentStatusLabel(status: PaymentStatus) {
  switch (status) {
    case PaymentStatus.UNPAID:
      return 'Chưa thanh toán';

    case PaymentStatus.PAID:
      return 'Đã thanh toán';

    case PaymentStatus.REFUNDED:
      return 'Đã hoàn tiền';

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

    case BookingStatus.PENDING:
    default:
      return 'border-amber-400/30 bg-amber-500/10 text-amber-200';
  }
}

export function BookingManagementForm() {
  const [bookings, setBookings] = useState<BookingItem[]>([]);
  const [statusFilter, setStatusFilter] = useState<
    'ALL' | BookingStatus
  >('ALL');

  const [message, setMessage] = useState('');
  const [loadingId, setLoadingId] = useState('');

  const fetchBookings = async () => {
    try {
      const response = await fetch('/api/admin/bookings');

      if (!response.ok) {
        setMessage('Không thể tải danh sách đơn đặt vé.');
        return;
      }

      const data = (await response.json()) as BookingItem[];

      setBookings(data);
    } catch (error) {
      console.error(error);
      setMessage('Có lỗi xảy ra khi tải danh sách đơn đặt vé.');
    }
  };

  useEffect(() => {
    fetchBookings();
  }, []);

  const filteredBookings = useMemo(() => {
    if (statusFilter === 'ALL') {
      return bookings;
    }

    return bookings.filter(
      (booking) => booking.status === statusFilter
    );
  }, [bookings, statusFilter]);

  const updateBooking = async (
    bookingId: string,
    payload: {
      status?: BookingStatus;
      paymentStatus?: PaymentStatus;
    }
  ) => {
    setLoadingId(bookingId);
    setMessage('');

    try {
      const response = await fetch(
        `/api/admin/bookings/${bookingId}`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        }
      );

      const data = (await response.json()) as {
        message: string;
        booking?: BookingItem;
      };

      setMessage(data.message);

      if (response.ok && data.booking) {
        setBookings((current) =>
          current.map((booking) =>
            booking.id === bookingId
              ? data.booking!
              : booking
          )
        );
      }
    } catch (error) {
      console.error(error);
      setMessage('Có lỗi xảy ra khi cập nhật đơn đặt vé.');
    } finally {
      setLoadingId('');
    }
  };

  return (
    <div className="space-y-4">
      {/* =========================
          BỘ LỌC
          ========================= */}

      <div className="flex flex-wrap items-center gap-3">
        <div className="text-sm text-slate-300">
          Lọc theo trạng thái:
        </div>

        <select
          value={statusFilter}
          onChange={(event) =>
            setStatusFilter(
              event.target.value as 'ALL' | BookingStatus
            )
          }
          className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white outline-none"
        >
          <option
            value="ALL"
            className="bg-slate-950"
          >
            Tất cả
          </option>

          <option
            value={BookingStatus.PENDING}
            className="bg-slate-950"
          >
            Chờ xử lý
          </option>

          <option
            value={BookingStatus.CONFIRMED}
            className="bg-slate-950"
          >
            Đã xác nhận
          </option>

          <option
            value={BookingStatus.CANCELED}
            className="bg-slate-950"
          >
            Đã hủy
          </option>
        </select>
      </div>

      {/* =========================
          DANH SÁCH BOOKING
          ========================= */}

      <div className="grid gap-3">
        {filteredBookings.length === 0 ? (
          <p className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-slate-400">
            Chưa có booking phù hợp bộ lọc.
          </p>
        ) : (
          filteredBookings.map((booking) => (
            <article
              key={booking.id}
              className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-slate-200"
            >
              {/* =========================
                  THÔNG TIN BOOKING
                  ========================= */}

              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="font-semibold text-white">
                    {booking.bookingCode}
                  </div>

                  <div className="mt-1 text-slate-400">
                    {booking.showtime.movie.title} ·{' '}
                    {booking.showtime.hall.cinema.name} ·{' '}
                    {booking.showtime.hall.name}
                  </div>
                </div>

                <div className="text-slate-300">
                  {new Date(
                    booking.createdAt
                  ).toLocaleString('vi-VN')}
                </div>
              </div>

              {/* =========================
                  KHÁCH HÀNG
                  ========================= */}

              <div className="mt-3 text-slate-300">
                {booking.customerName} · {booking.customerPhone} ·{' '}
                {booking.customerEmail}
              </div>

              {/* =========================
                  CHI TIẾT
                  ========================= */}

              <div className="mt-2 text-slate-400">
                Ghế:{' '}
                {booking.tickets.length > 0
                  ? booking.tickets
                      .map((ticket) => ticket.seatCode)
                      .join(', ')
                  : 'Không có'}
              </div>

              <div className="mt-2 text-slate-300">
                Tổng tiền:{' '}
                {booking.totalPrice.toLocaleString('vi-VN')} đ
              </div>

              <div className="mt-2 text-slate-400">
                Suất chiếu:{' '}
                {new Date(
                  booking.showtime.startTime
                ).toLocaleString('vi-VN')}
              </div>

              {/* =========================
                  TRẠNG THÁI
                  ========================= */}

              <div className="mt-3 flex flex-wrap gap-2">
                <span
                  className={`rounded-xl border px-3 py-2 text-xs ${getBookingStatusClass(
                    booking.status
                  )}`}
                >
                  {getBookingStatusLabel(booking.status)}
                </span>

                <span className="rounded-xl bg-slate-900/70 px-3 py-2 text-xs text-slate-300">
                  Thanh toán:{' '}
                  {getPaymentStatusLabel(
                    booking.paymentStatus
                  )}
                </span>
              </div>

              {/* =========================
                  NÚT THAO TÁC
                  ========================= */}

              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() =>
                    updateBooking(booking.id, {
                      status: BookingStatus.CONFIRMED,
                      paymentStatus: PaymentStatus.PAID,
                    })
                  }
                  disabled={loadingId === booking.id}
                  className="rounded-xl border border-emerald-400/40 px-3 py-2 text-xs font-semibold text-emerald-200 transition hover:bg-emerald-400/10 disabled:opacity-50"
                >
                  Xác nhận + đã thanh toán
                </button>

                <button
                  type="button"
                  onClick={() =>
                    updateBooking(booking.id, {
                      status: BookingStatus.CANCELED,
                      paymentStatus:
                        booking.paymentStatus ===
                        PaymentStatus.PAID
                          ? PaymentStatus.REFUNDED
                          : PaymentStatus.UNPAID,
                    })
                  }
                  disabled={loadingId === booking.id}
                  className="rounded-xl border border-rose-400/40 px-3 py-2 text-xs font-semibold text-rose-200 transition hover:bg-rose-400/10 disabled:opacity-50"
                >
                  Hủy đơn
                </button>

                <button
                  type="button"
                  onClick={() =>
                    updateBooking(booking.id, {
                      paymentStatus:
                        PaymentStatus.REFUNDED,
                    })
                  }
                  disabled={loadingId === booking.id}
                  className="rounded-xl border border-amber-400/40 px-3 py-2 text-xs font-semibold text-amber-200 transition hover:bg-amber-400/10 disabled:opacity-50"
                >
                  Đánh dấu hoàn tiền
                </button>

                {/* =========================
                    XEM / IN VÉ
                    ========================= */}

                <Link
                  href={`/ve/${booking.id}`}
                  className="rounded-xl border border-sky-400/40 px-3 py-2 text-xs font-semibold text-sky-200 transition hover:bg-sky-400/10"
                >
                  Xem vé / In vé
                </Link>
              </div>
            </article>
          ))
        )}
      </div>

      {message ? (
        <p className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-200">
          {message}
        </p>
      ) : null}
    </div>
  );
}