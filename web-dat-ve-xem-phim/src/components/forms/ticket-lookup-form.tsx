'use client';

import {
  BookingStatus,
  PaymentStatus,
  TicketStatus,
} from '@prisma/client';
import QRCode from 'qrcode';
import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

type BookingTicket = {
  id: string;
  seatCode: string;
  price: number;
  seatId: string;
  status: TicketStatus;
  canceledAt: string | null;
  qrCode: string | null;
};

type BookingCombo = {
  id: string;
  quantity: number;
  unitPrice: number;
  status: TicketStatus;
  qrCode: string | null;
  combo: { id: string; name: string };
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
  combos?: BookingCombo[];
};

type DialogMode = 'view' | 'print';

function formatMoney(value: number) {
  return `${value.toLocaleString('vi-VN')} đ`;
}

function escapeHtml(value: string) {
  return value.replace(/[&<>'"]/g, (character) =>
    ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      "'": '&#39;',
      '"': '&quot;',
    })[character] ?? character,
  );
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

async function printTicketPageMarkup(
  booking: BookingItem,
  options?: { seatCode?: string; comboId?: string },
) {
  const params = new URLSearchParams({ print: '1' });
  if (options?.seatCode) params.set('seat', options.seatCode);
  if (options?.comboId) params.set('combo', options.comboId);

  const response = await fetch(`/ve/${booking.id}?${params.toString()}`, {
    credentials: 'same-origin',
    cache: 'no-store',
  });
  if (!response.ok) throw new Error('TICKET_PAGE_UNAVAILABLE');

  const html = await response.text();
  const parsed = new DOMParser().parseFromString(html, 'text/html');
  // Lấy cả khối vé + combo (combo nằm ngoài #electronic-ticket)
  const ticketContent = parsed.querySelector('#electronic-ticket');
  const comboSection = parsed.querySelector('.combo-print-section');
  if (!ticketContent && !comboSection) throw new Error('TICKET_CONTENT_UNAVAILABLE');

  const root = document.createElement('div');
  root.id = 'ticket-print-root';
  root.innerHTML =
    (ticketContent?.outerHTML ?? '') + (comboSection?.outerHTML ?? '');

  const pageStyles = Array.from(parsed.querySelectorAll('style'))
    .map((style) => style.textContent ?? '')
    .join('\n');
  const style = document.createElement('style');
  style.id = 'ticket-print-style';
  style.textContent = `${pageStyles}
#ticket-print-root{display:none}
@media print{
  body>*:not(#ticket-print-root){display:none!important}
  #ticket-print-root{display:block!important;color:#000!important;background:#fff!important}
  #ticket-print-root .ticket-item,
  #ticket-print-root .combo-ticket-item{
    page-break-inside:avoid;break-inside:avoid;
    border:2px solid #000!important;border-radius:16px!important;
    background:#fff!important;color:#000!important;margin-bottom:16px!important;
  }
  #ticket-print-root *{color:#000!important;border-color:#000!important}
}`;

  const ticketItems = Array.from(root.querySelectorAll('.ticket-item'));
  const ticketsToPrint = options?.seatCode
    ? booking.tickets.filter((ticket) => ticket.seatCode === options.seatCode)
    : options?.comboId
      ? []
      : booking.tickets.filter((ticket) => ticket.status === TicketStatus.ACTIVE);

  await Promise.all(
    ticketItems.map(async (item) => {
      const ticket = ticketsToPrint.find((candidate) =>
        item.textContent?.includes(candidate.seatCode),
      );
      if (!ticket) return;
      const qrValue = ticket.qrCode ?? `${booking.bookingCode}-${ticket.id}-${ticket.seatCode}`;
      const qrImage = await QRCode.toDataURL(qrValue, { width: 220, margin: 2, color: { dark: '#000000', light: '#ffffff' } });
      const placeholder = Array.from(item.querySelectorAll('*')).find(
        (element) =>
          element.textContent?.replace(/\s+/g, ' ').trim() === 'Đang tạo QR...',
      );
      if (placeholder) {
        placeholder.innerHTML = `<img src="${qrImage}" alt="QR ${escapeHtml(ticket.seatCode)}" style="height:180px;width:180px" />`;
      }
    }),
  );

  // QR cho combo
  const comboItems = Array.from(root.querySelectorAll('.combo-ticket-item'));
  const combos = booking.combos ?? [];
  const combosToPrint = options?.comboId
    ? combos.filter((c) => c.id === options.comboId)
    : options?.seatCode
      ? []
      : combos.filter((c) => c.status === TicketStatus.ACTIVE && c.qrCode);

  await Promise.all(
    comboItems.map(async (item) => {
      const combo = combosToPrint.find((c) => item.textContent?.includes(c.combo.name));
      if (!combo?.qrCode) return;
      const qrImage = await QRCode.toDataURL(combo.qrCode, {
        width: 220,
        margin: 2,
        color: { dark: '#000000', light: '#ffffff' },
      });
      const qrWrap = item.querySelector('.combo-qr-wrap');
      if (qrWrap) {
        qrWrap.innerHTML = `<img src="${qrImage}" alt="QR combo" style="height:180px;width:180px" />`;
      }
    }),
  );

  document.head.appendChild(style);
  document.body.appendChild(root);
  await Promise.all(
    Array.from(root.querySelectorAll<HTMLImageElement>('img')).map(
      (image) =>
        image.complete
          ? Promise.resolve()
          : new Promise<void>((resolve) => {
              image.addEventListener('load', () => resolve(), { once: true });
              image.addEventListener('error', () => resolve(), { once: true });
            }),
    ),
  );
  const cleanup = () => {
    root.remove();
    style.remove();
    window.removeEventListener('afterprint', cleanup);
  };
  window.addEventListener('afterprint', cleanup, { once: true });
  window.setTimeout(() => {
    window.print();
    window.setTimeout(cleanup, 1000);
  }, 100);
}

export function TicketLookupForm() {
  const router = useRouter();

  const [query, setQuery] = useState('');
  const [bookings, setBookings] = useState<BookingItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const [dialogBooking, setDialogBooking] = useState<BookingItem | null>(
    null,
  );
  const [dialogMode, setDialogMode] = useState<DialogMode>('print');
  const [selectedSeatCodes, setSelectedSeatCodes] = useState<string[]>(
    [],
  );
  const [selectedComboIds, setSelectedComboIds] = useState<string[]>([]);
  const [printing, setPrinting] = useState(false);

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

  const getActiveTickets = (booking: BookingItem) =>
    booking.tickets.filter((t) => t.status === TicketStatus.ACTIVE);

  const getActiveCombos = (booking: BookingItem) =>
    (booking.combos ?? []).filter((c) => c.status === TicketStatus.ACTIVE);

  const openDialog = (booking: BookingItem, mode: DialogMode) => {
    const active = getActiveTickets(booking);
    const activeCombos = getActiveCombos(booking);

    if (active.length === 0 && activeCombos.length === 0) {
      setError('Đơn này không còn vé / combo hiệu lực.');
      return;
    }

    // Xem vé → vào thẳng trang vé
    if (mode === 'view') {
      router.push(`/ve/${booking.id}`);
      return;
    }

    // 1 ghế, không combo → in luôn
    if (active.length === 1 && activeCombos.length === 0) {
      setPrinting(true);
      setMessage('Đang mở hộp thoại in...');
      void printTicketPageMarkup(booking, { seatCode: active[0].seatCode })
        .catch(() => setMessage('Không thể tạo bản in vé. Vui lòng thử lại.'))
        .finally(() => setPrinting(false));
      return;
    }

    // 1 combo, không ghế → in combo
    if (active.length === 0 && activeCombos.length === 1) {
      setPrinting(true);
      setMessage('Đang mở hộp thoại in...');
      void printTicketPageMarkup(booking, { comboId: activeCombos[0].id })
        .catch(() => setMessage('Không thể tạo bản in. Vui lòng thử lại.'))
        .finally(() => setPrinting(false));
      return;
    }

    setDialogBooking(booking);
    setDialogMode('print');
    setSelectedSeatCodes(active.map((t) => t.seatCode));
    setSelectedComboIds(activeCombos.map((c) => c.id));
  };

  const closeDialog = () => {
    setDialogBooking(null);
    setSelectedSeatCodes([]);
    setSelectedComboIds([]);
  };

  const toggleSeat = (seatCode: string) => {
    setSelectedSeatCodes((current) =>
      current.includes(seatCode)
        ? current.filter((c) => c !== seatCode)
        : [...current, seatCode],
    );
  };

  const toggleCombo = (comboId: string) => {
    setSelectedComboIds((current) =>
      current.includes(comboId)
        ? current.filter((c) => c !== comboId)
        : [...current, comboId],
    );
  };

  const selectAllSeats = () => {
    if (!dialogBooking) return;
    setSelectedSeatCodes(
      getActiveTickets(dialogBooking).map((t) => t.seatCode),
    );
    setSelectedComboIds(getActiveCombos(dialogBooking).map((c) => c.id));
  };

  const confirmDialog = () => {
    if (
      !dialogBooking ||
      (selectedSeatCodes.length === 0 && selectedComboIds.length === 0)
    ) {
      return;
    }

    closeDialog();

    if (dialogMode === 'print') {
      setPrinting(true);
      setMessage('Đang mở hộp thoại in...');
      const onlyOneSeat =
        selectedSeatCodes.length === 1 && selectedComboIds.length === 0;
      const onlyOneCombo =
        selectedComboIds.length === 1 && selectedSeatCodes.length === 0;
      void printTicketPageMarkup(
        dialogBooking,
        onlyOneSeat
          ? { seatCode: selectedSeatCodes[0] }
          : onlyOneCombo
            ? { comboId: selectedComboIds[0] }
            : undefined, // in tất cả (vé + combo)
      )
        .catch(() => setMessage('Không thể tạo bản in vé. Vui lòng thử lại.'))
        .finally(() => setPrinting(false));
    } else {
      router.push(`/ve/${dialogBooking.id}`);
    }
  };

  useEffect(() => {
    if (!dialogBooking) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeDialog();
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [dialogBooking]);

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
          const activeTickets = getActiveTickets(booking);
          const activeCombos = getActiveCombos(booking);
          const canUse =
            booking.status !== BookingStatus.CANCELED &&
            (activeTickets.length > 0 || activeCombos.length > 0);

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
                  <div className="text-slate-400">
                    {booking.customerPhone}
                  </div>
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
                  <div className="text-xs text-slate-500">
                    Ghế còn hiệu lực
                  </div>
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
                {canUse ? (
                  <>
                    <button
                      type="button"
                      onClick={() => openDialog(booking, 'print')}
                      disabled={printing}
                      className="inline-flex items-center rounded-xl bg-sky-500 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-sky-400 disabled:opacity-50"
                    >
                      🖨 In vé
                    </button>
                    <button
                      type="button"
                      onClick={() => openDialog(booking, 'view')}
                      className="inline-flex items-center rounded-xl border border-white/15 bg-white/5 px-5 py-2.5 text-sm font-semibold text-slate-200 transition hover:bg-white/10"
                    >
                      Xem vé
                    </button>
                  </>
                ) : (
                  <span className="inline-flex items-center rounded-xl border border-white/10 bg-white/5 px-5 py-2.5 text-sm text-slate-500">
                    Không thể in / xem (đơn đã hủy hoặc hết vé)
                  </span>
                )}
              </div>
            </article>
          );
        })}
      </div>

      {dialogBooking ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="ticket-dialog-title"
          onClick={(e) => {
            if (e.target === e.currentTarget) closeDialog();
          }}
        >
          <div className="w-full max-w-md rounded-3xl border border-white/10 bg-slate-950 p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3
                  id="ticket-dialog-title"
                  className="text-lg font-semibold text-white"
                >
                  {dialogMode === 'print'
                    ? 'Chọn vé / combo cần in'
                    : 'Chọn vé cần xem'}
                </h3>
                <p className="mt-1 text-sm text-slate-400">
                  {dialogBooking.bookingCode} ·{' '}
                  {dialogBooking.showtime.movie.title}
                </p>
              </div>
              <button
                type="button"
                onClick={closeDialog}
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 text-xl text-slate-400 transition hover:bg-white/10 hover:text-white"
                aria-label="Đóng"
              >
                ×
              </button>
            </div>

            <div className="mt-4 max-h-72 space-y-2 overflow-y-auto">
              {getActiveTickets(dialogBooking).map((ticket) => {
                const checked = selectedSeatCodes.includes(ticket.seatCode);

                return (
                  <label
                    key={ticket.id}
                    className={`flex cursor-pointer items-center justify-between gap-3 rounded-2xl border px-4 py-3 transition ${
                      checked
                        ? 'border-sky-400/40 bg-sky-500/10'
                        : 'border-white/10 bg-white/5 hover:bg-white/10'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleSeat(ticket.seatCode)}
                        className="h-4 w-4 rounded border-white/20 bg-slate-900 text-sky-500 focus:ring-sky-400"
                      />
                      <span className="font-semibold text-white">
                        Ghế {ticket.seatCode}
                      </span>
                    </div>
                    <span className="text-sm text-slate-400">
                      {formatMoney(ticket.price)}
                    </span>
                  </label>
                );
              })}

              {getActiveCombos(dialogBooking).map((c) => {
                const checked = selectedComboIds.includes(c.id);
                return (
                  <label
                    key={c.id}
                    className={`flex cursor-pointer items-center justify-between gap-3 rounded-2xl border px-4 py-3 transition ${
                      checked
                        ? 'border-amber-400/40 bg-amber-500/10'
                        : 'border-white/10 bg-white/5 hover:bg-white/10'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleCombo(c.id)}
                        className="h-4 w-4 rounded border-white/20 bg-slate-900 text-amber-500 focus:ring-amber-400"
                      />
                      <span className="font-semibold text-white">
                        Combo {c.combo.name} ×{c.quantity}
                      </span>
                    </div>
                    <span className="text-sm text-slate-400">
                      {formatMoney(c.unitPrice * c.quantity)}
                    </span>
                  </label>
                );
              })}
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={selectAllSeats}
                className="rounded-xl border border-white/10 px-3 py-1.5 text-xs font-medium text-slate-300 transition hover:bg-white/10"
              >
                Chọn tất cả
              </button>
              <button
                type="button"
                onClick={() => setSelectedSeatCodes([])}
                className="rounded-xl border border-white/10 px-3 py-1.5 text-xs font-medium text-slate-300 transition hover:bg-white/10"
              >
                Bỏ chọn
              </button>
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={confirmDialog}
                disabled={
                  selectedSeatCodes.length === 0 &&
                  selectedComboIds.length === 0
                }
                className="flex-1 rounded-2xl bg-sky-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {dialogMode === 'print' ? 'In' : 'Xem'}{' '}
                {selectedSeatCodes.length + selectedComboIds.length > 0
                  ? `(${selectedSeatCodes.length} vé${
                      selectedComboIds.length
                        ? ` + ${selectedComboIds.length} combo`
                        : ''
                    })`
                  : ''}
              </button>
              <button
                type="button"
                onClick={closeDialog}
                className="rounded-2xl border border-white/10 px-4 py-3 text-sm font-medium text-slate-300 transition hover:bg-white/10"
              >
                Hủy
              </button>
            </div>

            <p className="mt-3 text-xs text-slate-500">
              {dialogMode === 'print'
                ? 'In trắng đen tại đây. Có thể chọn ghế và/hoặc combo.'
                : 'Chuyển sang trang vé để xem chi tiết.'}
            </p>
          </div>
        </div>
      ) : null}
    </div>
  );
}
