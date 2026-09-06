'use client';

import Link from 'next/link';

import {
  BookingStatus,
  PaymentStatus,
  TicketStatus,
} from '@prisma/client';

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';

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

type UpdateBookingPayload = {
  status?: BookingStatus;
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

function isShowtimeStarted(startTime: string, now: number) {
  return new Date(startTime).getTime() <= now;
}

export function BookingManagementForm() {
  const [bookings, setBookings] = useState<BookingItem[]>([]);
  const [statusFilter, setStatusFilter] = useState<'ALL' | BookingStatus>(
    'ALL',
  );
  const [paymentFilter, setPaymentFilter] = useState<'ALL' | PaymentStatus>(
    'ALL',
  );
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loadingId, setLoadingId] = useState('');
  const [loadingTicketId, setLoadingTicketId] = useState('');
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(Date.now());
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000);

    return () => {
      window.clearInterval(timer);
    };
  }, []);

  const fetchBookings = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/admin/bookings', {
        method: 'GET',
        cache: 'no-store',
      });

      const data = (await response.json()) as {
        bookings?: BookingItem[];
        message?: string;
      };

      if (!response.ok) {
        setError(data.message || 'Không thể tải danh sách đơn đặt vé.');
        return;
      }

      setBookings(data.bookings ?? []);
    } catch (err) {
      console.error(err);
      setError('Có lỗi xảy ra khi tải danh sách đơn đặt vé.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchBookings();
  }, [fetchBookings]);

  const filteredBookings = useMemo(() => {
    return bookings.filter((booking) => {
      const matchesStatus =
        statusFilter === 'ALL' || booking.status === statusFilter;
      const matchesPayment =
        paymentFilter === 'ALL' || booking.paymentStatus === paymentFilter;
      return matchesStatus && matchesPayment;
    });
  }, [bookings, statusFilter, paymentFilter]);

  const updateBooking = async (
    bookingId: string,
    payload: UpdateBookingPayload,
  ) => {
    setLoadingId(bookingId);
    setMessage('');
    setError('');

    try {
      const response = await fetch(`/api/admin/bookings/${bookingId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = (await response.json()) as {
        message?: string;
        booking?: BookingItem;
      };

      if (!response.ok) {
        setError(data.message || 'Không thể cập nhật đơn đặt vé.');
        return;
      }

      if (data.booking) {
        setBookings((current) =>
          current.map((booking) =>
            booking.id === bookingId ? data.booking! : booking,
          ),
        );
      }

      setMessage(data.message || 'Cập nhật đơn đặt vé thành công.');
    } catch (err) {
      console.error(err);
      setError('Có lỗi xảy ra khi cập nhật đơn đặt vé.');
    } finally {
      setLoadingId('');
    }
  };

  const handleCancelBooking = (booking: BookingItem) => {
    if (isShowtimeStarted(booking.showtime.startTime, currentTime)) {
      setError(
        'Suất chiếu đã bắt đầu hoặc đã kết thúc. Không thể hủy đơn này.',
      );
      return;
    }

    if (booking.status === BookingStatus.CANCELED) {
      return;
    }

    if (
      !window.confirm(
        `Bạn có chắc muốn hủy toàn bộ đơn ${booking.bookingCode}?`,
      )
    ) {
      return;
    }

    void updateBooking(booking.id, {
      status: BookingStatus.CANCELED,
    });
  };

  const handleCancelTicket = async (
    booking: BookingItem,
    ticket: BookingTicket,
  ) => {
    if (isShowtimeStarted(booking.showtime.startTime, currentTime)) {
      setError('Suất chiếu đã bắt đầu hoặc đã kết thúc. Không thể hủy vé.');
      return;
    }

    if (ticket.status === TicketStatus.CANCELED) {
      return;
    }

    const activeTickets = booking.tickets.filter(
      (item) => item.status === TicketStatus.ACTIVE,
    );

    if (activeTickets.length <= 1) {
      setError(
        'Đây là vé cuối cùng còn hiệu lực. Hãy dùng chức năng Hủy đơn.',
      );
      return;
    }

    if (
      !window.confirm(`Bạn có chắc muốn hủy vé ghế ${ticket.seatCode}?`)
    ) {
      return;
    }

    setLoadingTicketId(ticket.id);
    setMessage('');
    setError('');

    try {
      const response = await fetch(
        `/api/admin/bookings/${booking.id}/tickets/${ticket.id}`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            status: TicketStatus.CANCELED,
          }),
        },
      );

      const data = (await response.json()) as {
        message?: string;
        booking?: BookingItem;
      };

      if (!response.ok) {
        setError(data.message || 'Không thể hủy vé.');
        return;
      }

      if (data.booking) {
        setBookings((current) =>
          current.map((item) =>
            item.id === booking.id ? data.booking! : item,
          ),
        );
      }

      setMessage(
        data.message || `Đã hủy vé ghế ${ticket.seatCode}.`,
      );
    } catch (err) {
      console.error(err);
      setError('Có lỗi xảy ra khi hủy vé.');
    } finally {
      setLoadingTicketId('');
    }
  };

  const toggleExpand = (id: string) => {
    setExpandedId((current) => (current === id ? null : id));
  };

  return (
    <div className="space-y-4">
      {/* HEADER + FILTERS */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-white">
            Quản lý đơn đặt vé
          </h2>
          <p className="mt-1 text-sm text-slate-400">
            Hiển thị {filteredBookings.length} / {bookings.length} đơn
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <select
            value={statusFilter}
            onChange={(event) =>
              setStatusFilter(
                event.target.value as 'ALL' | BookingStatus,
              )
            }
            className="rounded-2xl border border-white/10 bg-slate-900 px-4 py-2 text-sm text-white outline-none"
          >
            <option value="ALL">Tất cả đơn</option>
            <option value={BookingStatus.PENDING}>Chờ xử lý</option>
            <option value={BookingStatus.CONFIRMED}>Đã xác nhận</option>
            <option value={BookingStatus.CANCELED}>Đã hủy</option>
          </select>

          <select
            value={paymentFilter}
            onChange={(event) =>
              setPaymentFilter(
                event.target.value as 'ALL' | PaymentStatus,
              )
            }
            className="rounded-2xl border border-white/10 bg-slate-900 px-4 py-2 text-sm text-white outline-none"
          >
            <option value="ALL">Tất cả thanh toán</option>
            <option value={PaymentStatus.UNPAID}>Chưa thanh toán</option>
            <option value={PaymentStatus.PAID}>Đã thanh toán</option>
            <option value={PaymentStatus.PARTIALLY_REFUNDED}>
              Đã hoàn tiền một phần
            </option>
            <option value={PaymentStatus.REFUNDED}>Đã hoàn tiền</option>
          </select>

          <button
            type="button"
            onClick={fetchBookings}
            disabled={loading}
            className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/10 disabled:opacity-50"
          >
            {loading ? 'Đang tải...' : 'Làm mới'}
          </button>
        </div>
      </div>

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

      {!loading && filteredBookings.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-center text-sm text-slate-400">
          Không có đơn phù hợp bộ lọc.
        </div>
      ) : null}

      {/* COMPACT LIST */}
      <div className="grid gap-2">
        {filteredBookings.map((booking) => {
          const isLoading = loadingId === booking.id;
          const showtimeStarted = isShowtimeStarted(
            booking.showtime.startTime,
            currentTime,
          );
          const canEdit =
            !showtimeStarted &&
            booking.status !== BookingStatus.CANCELED;
          const activeTickets = booking.tickets.filter(
            (ticket) => ticket.status === TicketStatus.ACTIVE,
          );
          const canceledTickets = booking.tickets.filter(
            (ticket) => ticket.status === TicketStatus.CANCELED,
          );
          const originalTotal =
            booking.totalPrice + booking.refundedAmount;
          const isExpanded = expandedId === booking.id;

          return (
            <article
              key={booking.id}
              className="rounded-2xl border border-white/10 bg-white/5 text-sm"
            >
              {/* SUMMARY ROW */}
              <div className="flex flex-wrap items-center gap-3 p-4">
                <div className="min-w-[120px] flex-1">
                  <div className="font-semibold text-white">
                    {booking.bookingCode}
                  </div>
                  <div className="mt-0.5 truncate text-xs text-slate-400">
                    {booking.showtime.movie.title}
                  </div>
                </div>

                <div className="min-w-[140px] flex-1">
                  <div className="text-slate-200">{booking.customerName}</div>
                  <div className="text-xs text-slate-500">
                    {booking.customerPhone}
                  </div>
                </div>

                <div className="text-xs text-slate-400">
                  {new Date(booking.showtime.startTime).toLocaleString(
                    'vi-VN',
                    {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    },
                  )}
                </div>

                <div className="flex flex-wrap gap-1.5">
                  <span
                    className={`rounded-full border px-2.5 py-0.5 text-xs font-medium ${getBookingStatusClass(booking.status)}`}
                  >
                    {getBookingStatusLabel(booking.status)}
                  </span>
                  <span
                    className={`rounded-full border px-2.5 py-0.5 text-xs font-medium ${getPaymentStatusClass(booking.paymentStatus)}`}
                  >
                    {getPaymentStatusLabel(booking.paymentStatus)}
                  </span>
                </div>

                <div className="text-xs text-slate-400">
                  <span className="font-medium text-emerald-300">
                    {activeTickets.length}
                  </span>
                  /{booking.tickets.length} vé
                </div>

                <div className="font-semibold text-white">
                  {formatMoney(booking.totalPrice)}
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => toggleExpand(booking.id)}
                    className="rounded-xl border border-sky-400/40 px-3 py-1.5 text-xs font-semibold text-sky-200 transition hover:bg-sky-400/10"
                  >
                    {isExpanded ? 'Thu gọn' : 'Xem chi tiết'}
                  </button>
                  <Link
                    href={`/ve/${booking.id}`}
                    className="rounded-xl border border-white/15 px-3 py-1.5 text-xs font-semibold text-slate-200 transition hover:bg-white/10"
                  >
                    In vé
                  </Link>
                </div>
              </div>

              {/* DETAIL PANEL */}
              {isExpanded ? (
                <div className="border-t border-white/10 bg-slate-950/40 p-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="rounded-xl bg-white/5 p-3">
                      <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Khách hàng
                      </div>
                      <div className="mt-2 space-y-1 text-slate-300">
                        <div>
                          <span className="text-slate-500">Họ tên:</span>{' '}
                          {booking.customerName}
                        </div>
                        <div>
                          <span className="text-slate-500">Điện thoại:</span>{' '}
                          {booking.customerPhone}
                        </div>
                        <div>
                          <span className="text-slate-500">Email:</span>{' '}
                          {booking.customerEmail}
                        </div>
                      </div>
                    </div>

                    <div className="rounded-xl bg-white/5 p-3">
                      <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Suất chiếu & thanh toán
                      </div>
                      <div className="mt-2 space-y-1 text-slate-300">
                        <div>
                          {booking.showtime.hall.cinema.name} ·{' '}
                          {booking.showtime.hall.name}
                        </div>
                        <div>
                          {new Date(
                            booking.showtime.startTime,
                          ).toLocaleString('vi-VN')}
                        </div>
                        <div>
                          Ngày đặt:{' '}
                          {new Date(booking.createdAt).toLocaleString(
                            'vi-VN',
                          )}
                        </div>
                        <div className="pt-1">
                          Giá trị ban đầu: {formatMoney(originalTotal)}
                          {booking.refundedAmount > 0 ? (
                            <span className="ml-2 text-rose-300">
                              (hoàn {formatMoney(booking.refundedAmount)})
                            </span>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4">
                    <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Danh sách vé ({activeTickets.length} còn hiệu lực
                      {canceledTickets.length > 0
                        ? `, ${canceledTickets.length} đã hủy`
                        : ''}
                      )
                    </div>
                    <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                      {booking.tickets.map((ticket) => {
                        const isCanceled =
                          ticket.status === TicketStatus.CANCELED;
                        const ticketLoading =
                          loadingTicketId === ticket.id;

                        return (
                          <div
                            key={ticket.id}
                            className={`flex items-center justify-between gap-2 rounded-xl border px-3 py-2 ${
                              isCanceled
                                ? 'border-rose-400/20 bg-rose-500/5'
                                : 'border-white/10 bg-white/5'
                            }`}
                          >
                            <div>
                              <div
                                className={`font-semibold ${
                                  isCanceled
                                    ? 'text-rose-300 line-through'
                                    : 'text-white'
                                }`}
                              >
                                {ticket.seatCode}
                              </div>
                              <div className="text-xs text-slate-400">
                                {formatMoney(ticket.price)}
                                {isCanceled && ticket.canceledAt ? (
                                  <span className="ml-1">
                                    · hủy{' '}
                                    {new Date(
                                      ticket.canceledAt,
                                    ).toLocaleString('vi-VN')}
                                  </span>
                                ) : null}
                              </div>
                            </div>

                            {canEdit &&
                            !isCanceled &&
                            activeTickets.length > 1 ? (
                              <button
                                type="button"
                                onClick={() =>
                                  handleCancelTicket(booking, ticket)
                                }
                                disabled={ticketLoading || isLoading}
                                className="rounded-lg border border-rose-400/40 px-2 py-1 text-xs font-semibold text-rose-200 transition hover:bg-rose-400/10 disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                {ticketLoading ? '...' : 'Hủy'}
                              </button>
                            ) : null}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    {canEdit ? (
                      <button
                        type="button"
                        onClick={() => handleCancelBooking(booking)}
                        disabled={isLoading}
                        className="rounded-xl border border-rose-400/40 px-3 py-2 text-xs font-semibold text-rose-200"
                      >
                        {isLoading ? 'Đang xử lý...' : 'Hủy đơn'}
                      </button>
                    ) : null}

                    <Link
                      href={`/ve/${booking.id}`}
                      className="rounded-xl border border-sky-400/40 px-3 py-2 text-xs font-semibold text-sky-200"
                    >
                      Xem / In vé
                    </Link>
                  </div>
                </div>
              ) : null}
            </article>
          );
        })}
      </div>
    </div>
  );
}
