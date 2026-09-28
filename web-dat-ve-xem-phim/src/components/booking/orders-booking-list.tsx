'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';

import { PAGE_SIZE, Pagination } from '@/components/ui/pagination';

/** Khách chỉ được hủy trước giờ chiếu ít nhất 30 phút */
const MIN_MINUTES_BEFORE_SHOWTIME = 30;

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
    price?: number;
  }[];
  combos?: {
    id: string;
    quantity: number;
    unitPrice: number;
    status: string;
    combo: {
      id: string;
      name: string;
    };
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

function formatMoney(value: number) {
  return `${Number(value).toLocaleString('vi-VN')} đ`;
}

type Props = { bookings: OrdersBooking[] };

function canCustomerCancel(booking: OrdersBooking): boolean {
  if (booking.status === 'CANCELED') return false;
  if (booking.status !== 'PENDING' && booking.status !== 'CONFIRMED') {
    return false;
  }

  const start = new Date(booking.showtime.startTime).getTime();
  const minutesLeft = (start - Date.now()) / (60 * 1000);
  return minutesLeft >= MIN_MINUTES_BEFORE_SHOWTIME;
}

export function OrdersBookingList({ bookings }: Props) {
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [cancelingId, setCancelingId] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [selectModeId, setSelectModeId] = useState<string | null>(null);
  const [selectedTickets, setSelectedTickets] = useState<string[]>([]);
  const [selectedCombos, setSelectedCombos] = useState<string[]>([]);

  const totalPages = Math.max(1, Math.ceil(bookings.length / PAGE_SIZE));
  const paged = useMemo(() => {
    const safe = Math.min(page, totalPages);
    const start = (safe - 1) * PAGE_SIZE;
    return bookings.slice(start, start + PAGE_SIZE);
  }, [bookings, page, totalPages]);

  const enterSelectMode = (booking: OrdersBooking) => {
    setSelectModeId(booking.id);
    setSelectedTickets([]);
    setSelectedCombos([]);
    setMessage('');
  };

  const exitSelectMode = () => {
    setSelectModeId(null);
    setSelectedTickets([]);
    setSelectedCombos([]);
  };

  const toggleTicket = (id: string) => {
    setSelectedTickets((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const toggleCombo = (id: string) => {
    setSelectedCombos((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const handleCancel = async (
    bookingId: string,
    options?: { ticketIds?: string[]; comboIds?: string[] },
  ) => {
    const isPartial =
      (options?.ticketIds && options.ticketIds.length > 0) ||
      (options?.comboIds && options.comboIds.length > 0);

    const confirmed = window.confirm(
      isPartial
        ? `Bạn có chắc muốn hủy ${options?.ticketIds?.length ?? 0} vé và ${options?.comboIds?.length ?? 0} combo đã chọn?\n\nLưu ý: Chỉ hủy được trước giờ chiếu ít nhất 30 phút.`
        : 'Bạn có chắc muốn hủy toàn bộ đơn đặt vé này?\n\nLưu ý: Chỉ hủy được trước giờ chiếu ít nhất 30 phút. Nếu đã thanh toán, hoàn tiền sẽ được ghi nhận trong hệ thống (xử lý thực tế qua cổng thanh toán có thể cần liên hệ hỗ trợ).',
    );

    if (!confirmed) return;

    setCancelingId(bookingId);
    setMessage('');

    try {
      const response = await fetch(`/api/bookings/${bookingId}/cancel`, {
        method: 'POST',
        headers: isPartial
          ? { 'Content-Type': 'application/json' }
          : undefined,
        body: isPartial
          ? JSON.stringify({
              ticketIds: options?.ticketIds ?? [],
              comboIds: options?.comboIds ?? [],
            })
          : undefined,
      });
      const data = (await response.json()) as {
        success?: boolean;
        message?: string;
      };

      if (!response.ok || !data.success) {
        setMessage(data.message || 'Không thể hủy đơn đặt vé.');
        return;
      }

      setMessage(data.message || 'Đã hủy thành công.');
      exitSelectMode();
      router.refresh();
    } catch {
      setMessage('Không thể kết nối đến máy chủ.');
    } finally {
      setCancelingId(null);
    }
  };

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
      {message ? (
        <div className="mb-4 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-200">
          {message}
        </div>
      ) : null}

      <div className="grid gap-4">
        {paged.map((booking) => {
          const activeTickets = booking.tickets.filter(
            (ticket) => ticket.status === 'ACTIVE',
          );
          const canceledTickets = booking.tickets.filter(
            (ticket) => ticket.status === 'CANCELED',
          );
          const combos = booking.combos ?? [];
          const activeCombos = combos.filter((c) => c.status === 'ACTIVE');
          const canceledCombos = combos.filter((c) => c.status === 'CANCELED');
          const canViewElectronicTicket =
            booking.status === 'CONFIRMED' &&
            (activeTickets.length > 0 || activeCombos.length > 0);
          const canPay =
            booking.status === 'PENDING' &&
            booking.paymentStatus === 'UNPAID';
          const canCancel = canCustomerCancel(booking);
          const inSelectMode = selectModeId === booking.id;

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
                  Tổng tiền: {formatMoney(booking.totalPrice)}
                </span>
                <span className="rounded-full bg-white/5 px-3 py-1">
                  Ghế:{' '}
                  {booking.tickets.length > 0
                    ? booking.tickets.map((t) => t.seatCode).join(', ')
                    : 'Đang giữ ghế'}
                </span>
                {combos.length > 0 ? (
                  <span className="rounded-full bg-violet-500/10 px-3 py-1 text-violet-200">
                    Combo:{' '}
                    {combos
                      .map((c) => `${c.combo.name} x${c.quantity}`)
                      .join(', ')}
                  </span>
                ) : null}
              </div>

              {booking.tickets.length > 0 || combos.length > 0 ? (
                <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div className="flex flex-wrap gap-4 text-sm">
                    <span className="text-slate-400">
                      Tổng vé:{' '}
                      <strong className="text-white">
                        {booking.tickets.length}
                      </strong>
                    </span>
                    <span className="text-slate-400">
                      Vé còn hiệu lực:{' '}
                      <strong className="text-emerald-300">
                        {activeTickets.length}
                      </strong>
                    </span>
                    <span className="text-slate-400">
                      Vé đã hủy:{' '}
                      <strong className="text-rose-300">
                        {canceledTickets.length}
                      </strong>
                    </span>
                    {combos.length > 0 ? (
                      <>
                        <span className="text-slate-400">
                          Combo còn hiệu lực:{' '}
                          <strong className="text-emerald-300">
                            {activeCombos.length}
                          </strong>
                        </span>
                        <span className="text-slate-400">
                          Combo đã hủy:{' '}
                          <strong className="text-rose-300">
                            {canceledCombos.length}
                          </strong>
                        </span>
                      </>
                    ) : null}
                    {Number(booking.refundedAmount) > 0 ? (
                      <span className="text-slate-400">
                        Đã hoàn:{' '}
                        <strong className="text-purple-300">
                          {formatMoney(booking.refundedAmount)}
                        </strong>
                      </span>
                    ) : null}
                  </div>
                  {booking.paymentStatus === 'PARTIALLY_REFUNDED' &&
                  (activeTickets.length > 0 || activeCombos.length > 0) ? (
                    <p className="mt-3 text-xs text-orange-300">
                      Một phần vé/combo trong đơn đã được hoàn tiền. Các mục
                      còn hiệu lực vẫn có thể sử dụng bình thường.
                    </p>
                  ) : null}
                </div>
              ) : null}

              {/* Chọn vé/combo để hủy */}
              {inSelectMode && canCancel ? (
                <div className="mt-4 space-y-3 rounded-2xl border border-rose-400/20 bg-rose-500/5 p-4">
                  <p className="text-sm font-medium text-rose-200">
                    Chọn vé và combo muốn hủy
                  </p>

                  {activeTickets.length > 0 ? (
                    <div>
                      <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Vé còn hiệu lực
                      </div>
                      <div className="grid gap-2">
                        {activeTickets.map((ticket) => (
                          <label
                            key={ticket.id}
                            className="flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-white/10 bg-slate-950/40 px-3 py-2 text-sm"
                          >
                            <span className="flex items-center gap-2 text-white">
                              <input
                                type="checkbox"
                                checked={selectedTickets.includes(ticket.id)}
                                onChange={() => toggleTicket(ticket.id)}
                                className="rounded border-white/20"
                              />
                              Ghế {ticket.seatCode}
                            </span>
                            {ticket.price != null ? (
                              <span className="text-xs text-slate-400">
                                {formatMoney(ticket.price)}
                              </span>
                            ) : null}
                          </label>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  {activeCombos.length > 0 ? (
                    <div>
                      <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Combo còn hiệu lực
                      </div>
                      <div className="grid gap-2">
                        {activeCombos.map((item) => (
                          <label
                            key={item.id}
                            className="flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-white/10 bg-slate-950/40 px-3 py-2 text-sm"
                          >
                            <span className="flex items-center gap-2 text-white">
                              <input
                                type="checkbox"
                                checked={selectedCombos.includes(item.id)}
                                onChange={() => toggleCombo(item.id)}
                                className="rounded border-white/20"
                              />
                              {item.combo.name} × {item.quantity}
                            </span>
                            <span className="text-xs text-slate-400">
                              {formatMoney(
                                Number(item.unitPrice) * Number(item.quantity),
                              )}
                            </span>
                          </label>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  <div className="flex flex-wrap gap-2 pt-1">
                    <button
                      type="button"
                      disabled={
                        cancelingId === booking.id ||
                        (selectedTickets.length === 0 &&
                          selectedCombos.length === 0)
                      }
                      onClick={() =>
                        handleCancel(booking.id, {
                          ticketIds: selectedTickets,
                          comboIds: selectedCombos,
                        })
                      }
                      className="inline-flex items-center justify-center rounded-xl border border-rose-400/40 bg-rose-500/10 px-4 py-2.5 text-sm font-semibold text-rose-200 transition hover:bg-rose-500/20 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {cancelingId === booking.id
                        ? 'Đang hủy…'
                        : `Hủy đã chọn (${selectedTickets.length + selectedCombos.length})`}
                    </button>
                    <button
                      type="button"
                      disabled={cancelingId === booking.id}
                      onClick={() => handleCancel(booking.id)}
                      className="inline-flex items-center justify-center rounded-xl border border-rose-400/40 px-4 py-2.5 text-sm font-semibold text-rose-200 transition hover:bg-rose-500/10 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Hủy toàn bộ đơn
                    </button>
                    <button
                      type="button"
                      onClick={exitSelectMode}
                      className="inline-flex items-center justify-center rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-slate-300 transition hover:bg-white/10"
                    >
                      Bỏ chọn
                    </button>
                  </div>
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
                {canCancel && !inSelectMode ? (
                  <button
                    type="button"
                    disabled={cancelingId === booking.id}
                    onClick={() => enterSelectMode(booking)}
                    className="inline-flex items-center justify-center rounded-xl border border-rose-400/40 bg-rose-500/10 px-4 py-2.5 text-sm font-semibold text-rose-200 transition hover:bg-rose-500/20 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Hủy vé / combo
                  </button>
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
