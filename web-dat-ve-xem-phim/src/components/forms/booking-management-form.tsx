'use client';

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

import { PAGE_SIZE, Pagination } from '@/components/ui/pagination';

type BookingTicket = {
  id: string;
  seatCode: string;
  price: number;
  seatId: string;
  status: TicketStatus;
  canceledAt: string | null;
};

type BookingComboItem = {
  id: string;
  quantity: number;
  unitPrice: number;
  status: TicketStatus;
  qrCode?: string | null;
  combo: {
    id: string;
    name: string;
  };
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
  combos?: BookingComboItem[];
};

type UpdateBookingPayload = {
  status?: BookingStatus;
};

function formatMoney(value: number) {
  return `${value.toLocaleString('vi-VN')} đ`;
}

function getBookingStatusLabel(
  status: BookingStatus,
) {
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

function getBookingStatusClass(
  status: BookingStatus,
) {
  switch (status) {
    case BookingStatus.CONFIRMED:
      return 'border-emerald-400/30 bg-emerald-500/10 text-emerald-200';

    case BookingStatus.CANCELED:
      return 'border-rose-400/30 bg-rose-500/10 text-rose-200';

    default:
      return 'border-amber-400/30 bg-amber-500/10 text-amber-200';
  }
}

function getPaymentStatusLabel(
  status: PaymentStatus,
) {
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

function getPaymentStatusClass(
  status: PaymentStatus,
) {
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


function getItemStatusLabel(status: TicketStatus) {
  switch (status) {
    case TicketStatus.ACTIVE:
      return 'Còn hiệu lực';
    case TicketStatus.USED:
      return 'Đã sử dụng';
    case TicketStatus.CANCELED:
      return 'Đã hủy';
    case TicketStatus.EXPIRED:
      return 'Hết hạn';
    default:
      return status;
  }
}

function getItemStatusBadgeClass(status: TicketStatus) {
  switch (status) {
    case TicketStatus.ACTIVE:
      return 'border-emerald-400/30 bg-emerald-500/10 text-emerald-300';
    case TicketStatus.USED:
      return 'border-sky-400/30 bg-sky-500/10 text-sky-300';
    case TicketStatus.CANCELED:
      return 'border-rose-400/30 bg-rose-500/10 text-rose-300';
    case TicketStatus.EXPIRED:
      return 'border-slate-400/30 bg-slate-500/10 text-slate-300';
    default:
      return 'border-white/10 bg-white/5 text-slate-300';
  }
}

function getItemRowClass(status: TicketStatus) {
  switch (status) {
    case TicketStatus.CANCELED:
      return 'border-rose-400/20 bg-rose-500/5';
    case TicketStatus.USED:
      return 'border-sky-400/20 bg-sky-500/5';
    case TicketStatus.EXPIRED:
      return 'border-slate-400/20 bg-slate-500/5';
    default:
      return 'border-white/10 bg-slate-950/40';
  }
}

function isShowtimeStarted(
  startTime: string,
  now: number,
) {
  return (
    new Date(startTime).getTime() <= now
  );
}

export function BookingManagementForm() {
  const [bookings, setBookings] =
    useState<BookingItem[]>([]);

  const [statusFilter, setStatusFilter] =
    useState<'ALL' | BookingStatus>('ALL');

  const [paymentFilter, setPaymentFilter] =
    useState<'ALL' | PaymentStatus>('ALL');

  const [message, setMessage] =
    useState('');

  const [error, setError] =
    useState('');

  const [loadingId, setLoadingId] =
    useState('');

  const [
    loadingTicketId,
    setLoadingTicketId,
  ] = useState('');

  const [
    loadingComboId,
    setLoadingComboId,
  ] = useState('');

  const [loading, setLoading] =
    useState(true);

  const [currentTime, setCurrentTime] =
    useState(Date.now());

  // Booking đang được mở chi tiết
  const [expandedBookingId, setExpandedBookingId] =
    useState<string | null>(null);

  const [listPage, setListPage] = useState(1);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000);

    return () => {
      window.clearInterval(timer);
    };
  }, []);

  const fetchBookings =
    useCallback(async () => {
      setLoading(true);
      setError('');

      try {
        const response =
          await fetch(
            '/api/admin/bookings',
            {
              method: 'GET',
              cache: 'no-store',
            },
          );

        const rawText = await response.text();
        let data: {
          bookings?: BookingItem[];
          message?: string;
        } = {};

        if (rawText) {
          try {
            data = JSON.parse(rawText) as {
              bookings?: BookingItem[];
              message?: string;
            };
          } catch {
            setError(
              `Máy chủ trả về phản hồi không hợp lệ (HTTP ${response.status}). Kiểm tra lại file API /api/admin/bookings/route.ts.`,
            );
            return;
          }
        }

        if (!response.ok) {
          setError(
            data.message ||
              `Không thể tải danh sách đơn đặt vé. (HTTP ${response.status})`,
          );

          return;
        }

        setBookings(
          data.bookings ?? [],
        );
      } catch (error) {
        console.error(error);

        setError(
          'Có lỗi xảy ra khi tải danh sách đơn đặt vé.',
        );
      } finally {
        setLoading(false);
      }
    }, []);

  useEffect(() => {
    void fetchBookings();
  }, [fetchBookings]);

  const filteredBookings =
    useMemo(() => {
      return bookings.filter(
        (booking) => {
          const matchesStatus =
            statusFilter === 'ALL' ||
            booking.status === statusFilter;

          const matchesPayment =
            paymentFilter === 'ALL' ||
            booking.paymentStatus ===
              paymentFilter;

          return (
            matchesStatus &&
            matchesPayment
          );
        },
      );
    }, [
      bookings,
      statusFilter,
      paymentFilter,
    ]);

  const totalListPages = Math.max(
    1,
    Math.ceil(filteredBookings.length / PAGE_SIZE),
  );

  const pagedBookings = useMemo(() => {
    const page = Math.min(listPage, totalListPages);
    const start = (page - 1) * PAGE_SIZE;
    return filteredBookings.slice(start, start + PAGE_SIZE);
  }, [filteredBookings, listPage, totalListPages]);

  useEffect(() => {
    setListPage(1);
  }, [statusFilter, paymentFilter]);

  const updateBooking =
    async (
      bookingId: string,
      payload: UpdateBookingPayload,
    ) => {
      setLoadingId(bookingId);
      setMessage('');
      setError('');

      try {
        const response =
          await fetch(
            `/api/admin/bookings/${bookingId}`,
            {
              method: 'PATCH',

              headers: {
                'Content-Type':
                  'application/json',
              },

              body: JSON.stringify(
                payload,
              ),
            },
          );

        const data =
          (await response.json()) as {
            message?: string;
            booking?: BookingItem;
          };

        if (!response.ok) {
          setError(
            data.message ||
              'Không thể cập nhật đơn đặt vé.',
          );

          return;
        }

        if (data.booking) {
          setBookings(
            (current) =>
              current.map(
                (booking) =>
                  booking.id ===
                  bookingId
                    ? data.booking!
                    : booking,
              ),
          );
        }

        setMessage(
          data.message ||
            'Cập nhật đơn đặt vé thành công.',
        );
      } catch (error) {
        console.error(error);

        setError(
          'Có lỗi xảy ra khi cập nhật đơn đặt vé.',
        );
      } finally {
        setLoadingId('');
      }
    };

  /* ==========================================================
     HỦY BOOKING
     ========================================================== */

  const handleCancelBooking = (
    booking: BookingItem,
  ) => {
    if (
      isShowtimeStarted(
        booking.showtime.startTime,
        currentTime,
      )
    ) {
      setError(
        'Suất chiếu đã bắt đầu hoặc đã kết thúc. Không thể hủy đơn này.',
      );

      return;
    }

    if (
      booking.status ===
      BookingStatus.CANCELED
    ) {
      return;
    }

    if (
      !window.confirm(
        `Bạn có chắc muốn hủy toàn bộ đơn ${booking.bookingCode}?`,
      )
    ) {
      return;
    }

    void updateBooking(
      booking.id,
      {
        status:
          BookingStatus.CANCELED,
      },
    );
  };

  /* ==========================================================
     HỦY TỪNG VÉ
     ========================================================== */

  const handleCancelTicket =
    async (
      booking: BookingItem,
      ticket: BookingTicket,
    ) => {
      if (
        isShowtimeStarted(
          booking.showtime.startTime,
          currentTime,
        )
      ) {
        setError(
          'Suất chiếu đã bắt đầu hoặc đã kết thúc. Không thể hủy vé.',
        );

        return;
      }

      if (
        ticket.status ===
        TicketStatus.CANCELED
      ) {
        return;
      }

      if (
        ticket.status !==
        TicketStatus.ACTIVE
      ) {
        setError(
          'Chỉ có thể hủy vé còn hiệu lực. Vé đã sử dụng / hết hạn không thể hủy.',
        );
        return;
      }

      const activeTickets =
        booking.tickets.filter(
          (item) =>
            item.status ===
            TicketStatus.ACTIVE,
        );

      const activeCombos =
        (booking.combos ?? []).filter(
          (item) =>
            item.status ===
            TicketStatus.ACTIVE,
        );

      if (
        activeTickets.length <= 1 &&
        activeCombos.length === 0
      ) {
        setError(
          'Đây là mục cuối cùng còn hiệu lực. Hãy dùng chức năng Hủy đơn.',
        );

        return;
      }

      if (
        !window.confirm(
          `Bạn có chắc muốn hủy vé ghế ${ticket.seatCode}?`,
        )
      ) {
        return;
      }

      setLoadingTicketId(
        ticket.id,
      );

      setMessage('');
      setError('');

      try {
        const response =
          await fetch(
            `/api/admin/bookings/${booking.id}/tickets/${ticket.id}`,
            {
              method: 'DELETE',
            },
          );

        const data =
          (await response.json()) as {
            message?: string;
            booking?: BookingItem;
          };

        if (!response.ok) {
          setError(
            data.message ||
              'Không thể hủy vé.',
          );

          return;
        }

        if (data.booking) {
          setBookings(
            (current) =>
              current.map(
                (item) =>
                  item.id ===
                  booking.id
                    ? data.booking!
                    : item,
              ),
          );
        }

        setMessage(
          data.message ||
            `Đã hủy vé ghế ${ticket.seatCode}.`,
        );
      } catch (error) {
        console.error(error);

        setError(
          'Có lỗi xảy ra khi hủy vé.',
        );
      } finally {
        setLoadingTicketId('');
      }
    };


  /* ==========================================================
     HỦY TỪNG COMBO
     ========================================================== */

  const handleCancelCombo =
    async (
      booking: BookingItem,
      bookingCombo: BookingComboItem,
    ) => {
      if (
        isShowtimeStarted(
          booking.showtime.startTime,
          currentTime,
        )
      ) {
        setError(
          'Suất chiếu đã bắt đầu hoặc đã kết thúc. Không thể hủy combo.',
        );

        return;
      }

      if (
        bookingCombo.status ===
        TicketStatus.CANCELED
      ) {
        return;
      }

      if (
        bookingCombo.status !==
        TicketStatus.ACTIVE
      ) {
        setError(
          'Chỉ có thể hủy combo còn hiệu lực. Combo đã sử dụng / hết hạn không thể hủy.',
        );
        return;
      }

      const activeTickets =
        booking.tickets.filter(
          (item) =>
            item.status ===
            TicketStatus.ACTIVE,
        );

      const activeCombos =
        (booking.combos ?? []).filter(
          (item) =>
            item.status ===
            TicketStatus.ACTIVE,
        );

      if (
        activeTickets.length === 0 &&
        activeCombos.length <= 1
      ) {
        setError(
          'Đây là mục cuối cùng còn hiệu lực. Hãy dùng chức năng Hủy đơn.',
        );

        return;
      }

      if (
        !window.confirm(
          `Bạn có chắc muốn hủy combo ${bookingCombo.combo.name} (x${bookingCombo.quantity})?`,
        )
      ) {
        return;
      }

      setLoadingComboId(
        bookingCombo.id,
      );

      setMessage('');
      setError('');

      try {
        const response =
          await fetch(
            `/api/admin/bookings/${booking.id}/combos/${bookingCombo.id}`,
            {
              method: 'DELETE',
            },
          );

        const data =
          (await response.json()) as {
            message?: string;
            booking?: BookingItem;
          };

        if (!response.ok) {
          setError(
            data.message ||
              'Không thể hủy combo.',
          );

          return;
        }

        if (data.booking) {
          setBookings(
            (current) =>
              current.map(
                (item) =>
                  item.id ===
                  booking.id
                    ? data.booking!
                    : item,
              ),
          );
        }

        setMessage(
          data.message ||
            `Đã hủy combo ${bookingCombo.combo.name}.`,
        );
      } catch (error) {
        console.error(error);

        setError(
          'Có lỗi xảy ra khi hủy combo.',
        );
      } finally {
        setLoadingComboId('');
      }
    };

  return (
    <div className="space-y-4">
      {/* ======================================================
          HEADER
          ====================================================== */}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-white">
            Quản lý đơn đặt vé
          </h2>

          <p className="mt-1 text-sm text-slate-400">
            Hiển thị{' '}
            {filteredBookings.length} /{' '}
            {bookings.length} đơn
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <select
            value={statusFilter}
            onChange={(event) =>
              setStatusFilter(
                event.target.value as
                  | 'ALL'
                  | BookingStatus,
              )
            }
            className="rounded-2xl border border-white/10 bg-slate-900 px-4 py-2 text-sm text-white outline-none"
          >
            <option value="ALL">
              Tất cả đơn
            </option>

            <option
              value={
                BookingStatus.PENDING
              }
            >
              Chờ xử lý
            </option>

            <option
              value={
                BookingStatus.CONFIRMED
              }
            >
              Đã xác nhận
            </option>

            <option
              value={
                BookingStatus.CANCELED
              }
            >
              Đã hủy
            </option>
          </select>

          <select
            value={paymentFilter}
            onChange={(event) =>
              setPaymentFilter(
                event.target.value as
                  | 'ALL'
                  | PaymentStatus,
              )
            }
            className="rounded-2xl border border-white/10 bg-slate-900 px-4 py-2 text-sm text-white outline-none"
          >
            <option value="ALL">
              Tất cả thanh toán
            </option>

            <option
              value={
                PaymentStatus.UNPAID
              }
            >
              Chưa thanh toán
            </option>

            <option
              value={
                PaymentStatus.PAID
              }
            >
              Đã thanh toán
            </option>

            <option
              value={
                PaymentStatus.PARTIALLY_REFUNDED
              }
            >
              Đã hoàn tiền một phần
            </option>

            <option
              value={
                PaymentStatus.REFUNDED
              }
            >
              Đã hoàn tiền
            </option>
          </select>

          <button
            type="button"
            onClick={
              fetchBookings
            }
            disabled={loading}
            className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/10 disabled:opacity-50"
          >
            {loading
              ? 'Đang tải...'
              : 'Làm mới'}
          </button>
        </div>
      </div>

      {/* ======================================================
          MESSAGE
          ====================================================== */}

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

      {/* ======================================================
          EMPTY
          ====================================================== */}

      {!loading &&
      filteredBookings.length ===
        0 ? (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-center text-sm text-slate-400">
          Không có đơn phù hợp bộ
          lọc.
        </div>
      ) : null}

      {/* ======================================================
          BOOKINGS
          ====================================================== */}

      <div className="grid gap-3">
        {pagedBookings.map(
          (booking) => {
            const isLoading =
              loadingId ===
              booking.id;

            const showtimeStarted =
              isShowtimeStarted(
                booking.showtime
                  .startTime,
                currentTime,
              );

            const canEdit =
              !showtimeStarted &&
              booking.status !==
                BookingStatus.CANCELED;

            const activeTickets =
              booking.tickets.filter(
                (ticket) =>
                  ticket.status ===
                  TicketStatus.ACTIVE,
              );

            const usedTickets =
              booking.tickets.filter(
                (ticket) =>
                  ticket.status ===
                  TicketStatus.USED,
              );

            const canceledTickets =
              booking.tickets.filter(
                (ticket) =>
                  ticket.status ===
                  TicketStatus.CANCELED,
              );

            const originalTotal =
              booking.totalPrice +
              booking.refundedAmount;

            const isExpanded =
              expandedBookingId ===
              booking.id;

            return (
              <article
                key={booking.id}
                className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm"
              >
                {/* ==================================================
                    TÓM TẮT
                    ================================================== */}

                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-white">
                        {
                          booking.bookingCode
                        }
                      </span>

                      <span
                        className={`rounded-xl border px-2.5 py-1 text-[11px] font-medium ${getBookingStatusClass(
                          booking.status,
                        )}`}
                      >
                        {getBookingStatusLabel(
                          booking.status,
                        )}
                      </span>

                      <span
                        className={`rounded-xl border px-2.5 py-1 text-[11px] font-medium ${getPaymentStatusClass(
                          booking.paymentStatus,
                        )}`}
                      >
                        {getPaymentStatusLabel(
                          booking.paymentStatus,
                        )}
                      </span>
                    </div>

                    <div className="mt-2 text-slate-300">
                      {
                        booking.showtime
                          .movie.title
                      }
                    </div>

                    <div className="mt-1 text-xs text-slate-500">
                      {
                        booking.showtime
                          .hall.cinema
                          .name
                      }
                      {' · '}
                      {
                        booking.showtime
                          .hall.name
                      }
                    </div>
                  </div>

                  <div className="text-right text-xs text-slate-400">
                    <div>
                      Suất chiếu
                    </div>

                    <div className="mt-1 font-medium text-slate-300">
                      {new Date(
                        booking.showtime.startTime,
                      ).toLocaleString(
                        'vi-VN',
                      )}
                    </div>
                  </div>
                </div>

                {/* ==================================================
                    THÔNG TIN NGẮN
                    ================================================== */}

                <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                  <span className="rounded-xl border border-white/10 bg-slate-950/40 px-3 py-2 text-slate-300">
                    🎟 {booking.tickets.length} vé
                  </span>

                  <span className="rounded-xl border border-emerald-400/20 bg-emerald-500/5 px-3 py-2 text-emerald-300">
                    Vé còn hiệu lực:{' '}
                    {activeTickets.length}
                  </span>

                  {usedTickets.length > 0 ? (
                    <span className="rounded-xl border border-sky-400/20 bg-sky-500/5 px-3 py-2 text-sky-300">
                      Vé đã dùng:{' '}
                      {usedTickets.length}
                    </span>
                  ) : null}

                  {canceledTickets.length >
                  0 ? (
                    <span className="rounded-xl border border-rose-400/20 bg-rose-500/5 px-3 py-2 text-rose-300">
                      Vé đã hủy:{' '}
                      {canceledTickets.length}
                    </span>
                  ) : null}

                  {(booking.combos ?? []).length > 0 ? (
                    <span className="rounded-xl border border-violet-400/20 bg-violet-500/5 px-3 py-2 text-violet-200">
                      🍿 {(booking.combos ?? []).length} combo
                      {' · '}
                      còn{' '}
                      {(booking.combos ?? []).filter(
                        (c) => c.status === TicketStatus.ACTIVE,
                      ).length}
                    </span>
                  ) : null}

                  <span className="rounded-xl border border-white/10 bg-slate-950/40 px-3 py-2 font-semibold text-white">
                    {formatMoney(
                      booking.totalPrice,
                    )}
                  </span>
                </div>

                {/* ==================================================
                    TRẠNG THÁI SUẤT CHIẾU
                    ================================================== */}

                <div className="mt-3">
                  {showtimeStarted ? (
                    <span className="inline-flex rounded-xl border border-slate-400/20 bg-slate-500/10 px-3 py-2 text-xs text-slate-300">
                      🔒 Suất chiếu đã bắt đầu
                      — không thể sửa
                    </span>
                  ) : (
                    <span className="inline-flex rounded-xl border border-sky-400/20 bg-sky-500/10 px-3 py-2 text-xs text-sky-200">
                      ✓ Chưa chiếu
                    </span>
                  )}
                </div>

                {/* ==================================================
                    CHI TIẾT
                    ================================================== */}

                {isExpanded ? (
                  <div className="mt-4 space-y-4 border-t border-white/10 pt-4">
                    {/* CUSTOMER */}

                    <div className="rounded-xl bg-slate-950/40 p-3">
                      <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Khách hàng
                      </div>

                      <div className="mt-2 grid gap-2 text-slate-300 md:grid-cols-3">
                        <div>
                          <span className="text-slate-500">
                            Họ tên:
                          </span>{' '}
                          {
                            booking.customerName
                          }
                        </div>

                        <div>
                          <span className="text-slate-500">
                            Điện thoại:
                          </span>{' '}
                          {
                            booking.customerPhone
                          }
                        </div>

                        <div className="break-all">
                          <span className="text-slate-500">
                            Email:
                          </span>{' '}
                          {
                            booking.customerEmail
                          }
                        </div>
                      </div>
                    </div>

                    {/* SHOWTIME */}

                    <div>
                      <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Thông tin suất chiếu
                      </div>

                      <div className="grid gap-2 md:grid-cols-3">
                        <div className="rounded-xl border border-white/10 bg-slate-950/40 p-3">
                          <div className="text-xs text-slate-500">
                            Suất chiếu
                          </div>

                          <div className="mt-1 text-slate-300">
                            {new Date(
                              booking.showtime.startTime,
                            ).toLocaleString(
                              'vi-VN',
                            )}
                          </div>
                        </div>

                        <div className="rounded-xl border border-white/10 bg-slate-950/40 p-3">
                          <div className="text-xs text-slate-500">
                            Rạp
                          </div>

                          <div className="mt-1 text-slate-300">
                            {
                              booking
                                .showtime
                                .hall
                                .cinema
                                .name
                            }
                          </div>
                        </div>

                        <div className="rounded-xl border border-white/10 bg-slate-950/40 p-3">
                          <div className="text-xs text-slate-500">
                            Phòng
                          </div>

                          <div className="mt-1 text-slate-300">
                            {
                              booking
                                .showtime
                                .hall
                                .name
                            }
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* MONEY */}

                    <div>
                      <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Thông tin thanh toán
                      </div>

                      <div className="grid gap-3 md:grid-cols-3">
                        <div className="rounded-xl border border-white/10 bg-slate-950/40 p-3">
                          <div className="text-xs text-slate-500">
                            Giá trị ban đầu
                          </div>

                          <div className="mt-1 font-bold text-white">
                            {formatMoney(
                              originalTotal,
                            )}
                          </div>
                        </div>

                        <div className="rounded-xl border border-emerald-400/20 bg-emerald-500/5 p-3">
                          <div className="text-xs text-slate-500">
                            Tổng tiền còn hiệu lực
                          </div>

                          <div className="mt-1 font-bold text-emerald-300">
                            {formatMoney(
                              booking.totalPrice,
                            )}
                          </div>
                        </div>

                        <div className="rounded-xl border border-purple-400/20 bg-purple-500/5 p-3">
                          <div className="text-xs text-slate-500">
                            Đã hoàn
                          </div>

                          <div className="mt-1 font-bold text-purple-300">
                            {formatMoney(
                              booking.refundedAmount,
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* TICKETS */}

                    <div>
                      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                        <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Danh sách vé
                        </div>

                        <div className="text-xs text-slate-500">
                          Chỉ ticket bị hủy mới có
                          tiền hoàn riêng.
                        </div>
                      </div>

                      <div className="grid gap-2">
                        {booking.tickets.map(
                          (ticket) => {
                            const isCanceled =
                              ticket.status ===
                              TicketStatus.CANCELED;
                            const isUsed =
                              ticket.status ===
                              TicketStatus.USED;
                            const canCancelTicket =
                              ticket.status ===
                              TicketStatus.ACTIVE;

                            const ticketLoading =
                              loadingTicketId ===
                              ticket.id;

                            return (
                              <div
                                key={
                                  ticket.id
                                }
                                className={`flex flex-wrap items-center justify-between gap-3 rounded-xl border p-3 ${getItemRowClass(
                                  ticket.status,
                                )}`}
                              >
                                <div>
                                  <div className="flex flex-wrap items-center gap-2">
                                    <span
                                      className={`font-semibold ${
                                        isCanceled
                                          ? 'text-slate-400 line-through'
                                          : isUsed
                                            ? 'text-slate-300'
                                            : 'text-white'
                                      }`}
                                    >
                                      Ghế{' '}
                                      {
                                        ticket.seatCode
                                      }
                                    </span>

                                    <span
                                      className={`rounded-lg border px-2 py-1 text-[11px] font-semibold ${getItemStatusBadgeClass(
                                        ticket.status,
                                      )}`}
                                    >
                                      {getItemStatusLabel(
                                        ticket.status,
                                      )}
                                    </span>
                                  </div>

                                  <div className="mt-1 text-xs text-slate-500">
                                    Giá:{' '}
                                    {formatMoney(
                                      Number(
                                        ticket.price,
                                      ),
                                    )}
                                  </div>

                                  {isCanceled ? (
                                    <>
                                      <div className="mt-2 text-xs font-semibold text-purple-300">
                                        Đã hoàn:{' '}
                                        {formatMoney(
                                          Number(
                                            ticket.price,
                                          ),
                                        )}
                                      </div>

                                      {ticket.canceledAt ? (
                                        <div className="mt-1 text-xs text-slate-500">
                                          Hủy lúc:{' '}
                                          {new Date(
                                            ticket.canceledAt,
                                          ).toLocaleString(
                                            'vi-VN',
                                          )}
                                        </div>
                                      ) : null}
                                    </>
                                  ) : null}
                                </div>

                                {canEdit &&
                                canCancelTicket &&
                                !(
                                  activeTickets.length <= 1 &&
                                  (booking.combos ?? []).filter(
                                    (c) =>
                                      c.status ===
                                      TicketStatus.ACTIVE,
                                  ).length === 0
                                ) ? (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleCancelTicket(
                                        booking,
                                        ticket,
                                      )
                                    }
                                    disabled={
                                      ticketLoading ||
                                      isLoading
                                    }
                                    className="rounded-xl border border-rose-400/40 px-3 py-2 text-xs font-semibold text-rose-200 transition hover:bg-rose-400/10 disabled:cursor-not-allowed disabled:opacity-50"
                                  >
                                    {ticketLoading
                                      ? 'Đang hủy...'
                                      : 'Hủy vé này'}
                                  </button>
                                ) : null}
                              </div>
                            );
                          },
                        )}
                      </div>
                    </div>

                    {/* COMBOS */}

                    {(booking.combos ?? []).length > 0 ? (
                      <div>
                        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                            Danh sách combo
                          </div>
                          <div className="text-xs text-slate-500">
                            Có thể hủy từng combo (nếu còn mục khác hiệu lực).
                          </div>
                        </div>

                        <div className="grid gap-2">
                          {(booking.combos ?? []).map((item) => {
                            const isCanceled =
                              item.status === TicketStatus.CANCELED;
                            const isUsed =
                              item.status === TicketStatus.USED;
                            const comboLoading =
                              loadingComboId === item.id;
                            const activeComboCount =
                              (booking.combos ?? []).filter(
                                (c) =>
                                  c.status === TicketStatus.ACTIVE,
                              ).length;
                            const canCancelThisCombo =
                              canEdit &&
                              item.status === TicketStatus.ACTIVE &&
                              !(
                                activeTickets.length === 0 &&
                                activeComboCount <= 1
                              );

                            return (
                              <div
                                key={item.id}
                                className={`flex flex-wrap items-center justify-between gap-3 rounded-xl border p-3 ${
                                  isCanceled
                                    ? 'border-rose-400/20 bg-rose-500/5'
                                    : isUsed
                                      ? 'border-sky-400/20 bg-sky-500/5'
                                      : 'border-violet-400/20 bg-violet-500/5'
                                }`}
                              >
                                <div>
                                  <div className="flex flex-wrap items-center gap-2">
                                    <span
                                      className={`font-semibold ${
                                        isCanceled
                                          ? 'text-slate-400 line-through'
                                          : isUsed
                                            ? 'text-slate-300'
                                            : 'text-white'
                                      }`}
                                    >
                                      {item.combo.name} × {item.quantity}
                                    </span>

                                    <span
                                      className={`rounded-lg border px-2 py-1 text-[11px] font-semibold ${getItemStatusBadgeClass(
                                        item.status,
                                      )}`}
                                    >
                                      {getItemStatusLabel(item.status)}
                                    </span>
                                  </div>

                                  <div className="mt-1 text-xs text-slate-500">
                                    Giá:{' '}
                                    {formatMoney(
                                      Number(item.unitPrice) *
                                        Number(item.quantity),
                                    )}
                                  </div>

                                  {isCanceled ? (
                                    <div className="mt-2 text-xs font-semibold text-purple-300">
                                      Đã hoàn:{' '}
                                      {formatMoney(
                                        Number(item.unitPrice) *
                                          Number(item.quantity),
                                      )}
                                    </div>
                                  ) : null}
                                </div>

                                {canCancelThisCombo ? (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleCancelCombo(
                                        booking,
                                        item,
                                      )
                                    }
                                    disabled={
                                      comboLoading || isLoading
                                    }
                                    className="rounded-xl border border-rose-400/40 px-3 py-2 text-xs font-semibold text-rose-200 transition hover:bg-rose-400/10 disabled:cursor-not-allowed disabled:opacity-50"
                                  >
                                    {comboLoading
                                      ? 'Đang hủy...'
                                      : 'Hủy combo này'}
                                  </button>
                                ) : null}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ) : null}
                  </div>
                ) : null}

                {/* ==================================================
                    ACTIONS
                    ================================================== */}

                <div className="mt-4 flex flex-wrap gap-2">
                  {canEdit ? (
                    <button
                      type="button"
                      onClick={() =>
                        handleCancelBooking(
                          booking,
                        )
                      }
                      disabled={
                        isLoading
                      }
                      className="rounded-xl border border-rose-400/40 px-3 py-2 text-xs font-semibold text-rose-200 transition hover:bg-rose-400/10 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {isLoading
                        ? 'Đang xử lý...'
                        : 'Hủy đơn'}
                    </button>
                  ) : null}

                  <button
                    type="button"
                    onClick={() =>
                      setExpandedBookingId(
                        isExpanded
                          ? null
                          : booking.id,
                      )
                    }
                    className="rounded-xl border border-sky-400/40 bg-sky-500/5 px-3 py-2 text-xs font-semibold text-sky-200 transition hover:bg-sky-500/10"
                  >
                    {isExpanded
                      ? 'Thu gọn'
                      : 'Xem chi tiết'}
                  </button>
                </div>
              </article>
            );
          },
        )}
      </div>

      <Pagination
        page={Math.min(listPage, totalListPages)}
        totalPages={totalListPages}
        onChange={setListPage}
      />
    </div>
  );
}
