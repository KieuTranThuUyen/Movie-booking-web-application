import Link from 'next/link';
import {
  notFound,
  redirect,
} from 'next/navigation';
import { getServerSession } from 'next-auth/next';

import { TicketStatus } from '@prisma/client';

import { BookingQR } from '@/components/booking/booking-qr';
import { AutoPrint } from '@/components/booking/auto-print';
import { PrintTicketButton } from '@/components/booking/print-ticket-button';
import { TicketPaymentWaiter } from '@/components/booking/ticket-payment-waiter';

import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db/prisma';

type TicketPageProps = {
  params: Promise<{
    id: string;
  }>;

  searchParams: Promise<{
    seat?: string;
    checking?: string;
    print?: string;
  }>;
};

/* ============================================================
   BOOKING STATUS
   ============================================================ */

function getBookingStatusLabel(
  status: string,
) {
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

function getBookingStatusClass(
  status: string,
) {
  switch (status) {
    case 'CONFIRMED':
      return 'bg-emerald-500/10 text-emerald-300';

    case 'CANCELED':
      return 'bg-rose-500/10 text-rose-300';

    case 'PENDING':
    default:
      return 'bg-amber-500/10 text-amber-300';
  }
}

function getTicketStatusLabel(status: TicketStatus) {
  switch (status) {
    case TicketStatus.USED:
      return 'Đã sử dụng';
    case TicketStatus.CANCELED:
      return 'Đã hủy';
    case TicketStatus.EXPIRED:
      return 'Đã hết hạn';
    default:
      return 'Còn hiệu lực';
  }
}

function getTicketStatusClass(status: TicketStatus) {
  switch (status) {
    case TicketStatus.USED:
      return 'bg-sky-500/10 text-sky-300';
    case TicketStatus.CANCELED:
      return 'bg-rose-500/10 text-rose-300';
    case TicketStatus.EXPIRED:
      return 'bg-slate-500/20 text-slate-300';
    default:
      return 'bg-emerald-500/10 text-emerald-300';
  }
}

/* ============================================================
   TICKET PAYMENT STATUS
   ============================================================ */

function getTicketPaymentStatus(
  ticketStatus: TicketStatus,
  bookingPaymentStatus: string,
) {
  /*
   * Vé đã hủy:
   * luôn hiển thị đã hoàn tiền.
   */

  if (
    ticketStatus ===
    TicketStatus.CANCELED
  ) {
    return {
      label: 'Đã hoàn tiền',

      className:
        'bg-purple-500/10 text-purple-300',
    };
  }

  /*
   * Booking chưa thanh toán.
   */

  if (
    bookingPaymentStatus ===
    'UNPAID'
  ) {
    return {
      label: 'Chưa thanh toán',

      className:
        'bg-amber-500/10 text-amber-300',
    };
  }

  /*
   * Đơn đã thanh toán nhưng
   * có một phần vé đã hoàn.
   *
   * Vé ACTIVE vẫn còn hiệu lực.
   */

  if (
    bookingPaymentStatus ===
    'PARTIALLY_REFUNDED'
  ) {
    return {
      label:
        'Đã thanh toán một phần hoàn tiền',

      className:
        'bg-orange-500/10 text-orange-300',
    };
  }

  /*
   * Đơn đã hoàn toàn.
   */

  if (
    bookingPaymentStatus ===
    'REFUNDED'
  ) {
    return {
      label: 'Đã hoàn tiền',

      className:
        'bg-purple-500/10 text-purple-300',
    };
  }

  /*
   * PAID.
   */

  return {
    label: 'Đã thanh toán',

    className:
      'bg-emerald-500/10 text-emerald-300',
  };
}

/* ============================================================
   PAYMENT METHOD
   ============================================================ */

function getPaymentMethodLabel(
  method: string,
) {
  switch (method) {
    case 'CASH':
      return 'Thanh toán tại quầy';

    case 'VNPAY':
      return 'VNPay';

    case 'MOMO':
      return 'MoMo';

    case 'ZALOPAY':
      return 'ZaloPay';

    case 'BANKING':
      return 'Chuyển khoản ngân hàng';

    case 'SEPAY':
      return 'SePay Sandbox';

    default:
      return method;
  }
}

/* ============================================================
   FORMAT PRICE
   ============================================================ */

function formatPrice(
  value: number,
) {
  return `${Number(value).toLocaleString(
    'vi-VN',
  )} đ`;
}

/* ============================================================
   PAGE
   ============================================================ */

export default async function ElectronicTicketPage({
  params,
  searchParams,
}: TicketPageProps) {
  /* ==========================================================
     PARAMS
     ========================================================== */

  const { id } =
    await params;

  const {
    seat,
    combo: comboParam,
    checking,
    print,
  } =
    await searchParams;

  const shouldAutoPrint = print === '1';

  /* ==========================================================
     SESSION
     ========================================================== */

  const session =
    await getServerSession(
      authOptions,
    );

  if (!session?.user?.id) {
    const callbackUrl =
      `/ve/${id}${
        checking === '1'
          ? '?checking=1'
          : ''
      }`;

    redirect(
      `/dang-nhap?callbackUrl=${encodeURIComponent(
        callbackUrl,
      )}`,
    );
  }

  /* ==========================================================
     BOOKING
     ========================================================== */

  const booking =
    await prisma.booking.findUnique({
      where: {
        id,
      },

      include: {
        user: true,

        showtime: {
          include: {
            movie: true,

            hall: {
              include: {
                cinema: true,
              },
            },
          },
        },

        tickets: {
          orderBy: {
            seatCode: 'asc',
          },
        },

        combos: {
          include: { combo: true },
          orderBy: { id: 'asc' },
        },

        payment: true,
      },
    });

  if (!booking) {
    notFound();
  }

  /* ==========================================================
     PERMISSION
     ========================================================== */

  const isAdmin =
    session.user.role ===
    'ADMIN';

  if (
    !isAdmin &&
    booking.userId !==
      session.user.id
  ) {
    redirect('/don-hang');
  }

  /* ==========================================================
     NO TICKETS
     ========================================================== */

  if (
    booking.tickets.length ===
    0
  ) {
    /*
     * success_url của SePay KHÔNG phải
     * bằng chứng thanh toán thành công.
     *
     * Chỉ IPN mới cập nhật:
     *
     * Payment  -> PAID
     * Booking  -> CONFIRMED
     * Ticket   -> CREATE
     */

    const isWaitingForPaymentConfirmation =
      checking === '1' &&
      (
        booking.status ===
          'PENDING' ||
        (
          booking.paymentStatus ===
            'PAID' &&
          booking.tickets.length ===
            0
        )
      );

    if (
      isWaitingForPaymentConfirmation
    ) {
      return (
        <main className="min-h-screen bg-slate-950 px-4 py-10 text-white">
          <div className="mx-auto max-w-3xl">
            <TicketPaymentWaiter
              bookingId={
                booking.id
              }
              showtimeId={
                booking.showtimeId
              }
            />
          </div>
        </main>
      );
    }

    /* ========================================================
       BOOKING CANCELED
       ======================================================== */

    if (
      booking.status ===
      'CANCELED'
    ) {
      return (
        <main className="min-h-screen bg-slate-950 px-4 py-10 text-white">
          <div className="mx-auto max-w-3xl">
            <Link
              href={
                isAdmin
                  ? '/admin/bookings'
                  : '/don-hang'
              }
              className="mb-6 inline-flex items-center rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-300 transition hover:bg-white/10 hover:text-white"
            >
              ← Quay lại
            </Link>

            <section className="rounded-[28px] border border-rose-400/20 bg-slate-900 p-8 text-center shadow-2xl">
              <div className="text-5xl">
                ❌
              </div>

              <h1 className="mt-5 text-2xl font-bold">
                Đơn hàng đã bị hủy
              </h1>

              <p className="mt-2 text-slate-400">
                Đơn hàng{' '}
                {
                  booking.bookingCode
                }{' '}
                không còn hiệu lực.
              </p>

              <Link
                href={`/dat-ve?showtime=${encodeURIComponent(
                  booking.showtimeId,
                )}`}
                className="mt-6 inline-flex rounded-2xl bg-white px-5 py-3 font-semibold text-slate-950 transition hover:bg-slate-100"
              >
                Quay lại chọn ghế
              </Link>
            </section>
          </div>
        </main>
      );
    }

    /* ========================================================
       PAID NHƯNG CHƯA CÓ TICKET
       ======================================================== */

    if (
      booking.paymentStatus ===
      'PAID'
    ) {
      return (
        <main className="min-h-screen bg-slate-950 px-4 py-10 text-white">
          <div className="mx-auto max-w-3xl">
            <section className="rounded-[28px] border border-amber-400/20 bg-slate-900 p-8 text-center shadow-2xl">
              <div className="text-5xl">
                ⏳
              </div>

              <h1 className="mt-5 text-2xl font-bold">
                Đang hoàn tất tạo vé
              </h1>

              <p className="mt-3 text-slate-400">
                Thanh toán đã được ghi
                nhận. Hệ thống đang hoàn
                tất việc tạo vé điện tử.
              </p>

              <p className="mt-4 text-sm text-slate-500">
                Vui lòng tải lại trang sau
                ít giây.
              </p>

              <Link
                href={`/ve/${encodeURIComponent(
                  booking.id,
                )}?checking=1`}
                className="mt-6 inline-flex rounded-2xl bg-white px-5 py-3 font-semibold text-slate-950 transition hover:bg-slate-100"
              >
                Kiểm tra lại
              </Link>
            </section>
          </div>
        </main>
      );
    }

    /* ========================================================
       CHƯA CÓ VÉ
       ======================================================== */

    return (
      <main className="min-h-screen bg-slate-950 px-4 py-10 text-white">
        <div className="mx-auto max-w-3xl">
          <Link
            href={
              isAdmin
                ? '/admin/tra-cuu-ve'
                : '/don-hang'
            }
            className="mb-6 inline-flex items-center rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-300 transition hover:bg-white/10 hover:text-white"
          >
            ← Quay lại
          </Link>

          <section className="rounded-[28px] border border-white/10 bg-slate-900 p-8 text-center shadow-2xl">
            <div className="text-5xl">
              🎫
            </div>

            <h1 className="mt-5 text-2xl font-bold">
              Đơn hàng chưa có vé
            </h1>

            <p className="mt-2 text-slate-400">
              Đơn hàng{' '}
              {
                booking.bookingCode
              }{' '}
              hiện chưa có vé điện tử.
            </p>
          </section>
        </div>
      </main>
    );
  }

  /* ==========================================================
     TICKET GROUPS
     ========================================================== */

  const activeTickets =
    booking.tickets.filter(
      (ticket) =>
        ticket.status ===
        TicketStatus.ACTIVE,
    );

  const canceledTickets =
    booking.tickets.filter(
      (ticket) =>
        ticket.status ===
        TicketStatus.CANCELED,
    );

  const activeCombos = booking.combos.filter(
    (c) => c.status === TicketStatus.ACTIVE || c.status === 'ACTIVE',
  );
  const usedCombos = booking.combos.filter(
    (c) => c.status === TicketStatus.USED || c.status === 'USED',
  );
  const comboQtyTotal = booking.combos.reduce(
    (sum, c) => sum + Number(c.quantity || 0),
    0,
  );
  const activeComboQty = activeCombos.reduce(
    (sum, c) => sum + Number(c.quantity || 0),
    0,
  );

  /* ==========================================================
     SHOWTIME
     ========================================================== */

  const showtimeDate =
    new Date(
      booking.showtime.startTime,
    );

  /* ==========================================================
     SELECT TICKET
     ========================================================== */

  const selectedTicket =
    seat
      ? booking.tickets.find(
          (ticket) =>
            ticket.seatCode.toLowerCase() ===
            seat.toLowerCase(),
        )
      : null;

  const selectedCombo =
    comboParam
      ? booking.combos.find((c) => c.id === comboParam)
      : null;

  const isAllTickets = !seat && !comboParam;

  const invalidSeat = Boolean(seat && !selectedTicket);
  const invalidCombo = Boolean(comboParam && !selectedCombo);

  const selectedTicketIsCanceled =
    Boolean(
      selectedTicket &&
        selectedTicket.status ===
          TicketStatus.CANCELED,
    );

  /* ==========================================================
     VISIBLE TICKETS / COMBOS
     ========================================================== */

  const visibleTickets =
    comboParam && !seat
      ? [] // chỉ xem combo
      : isAllTickets || invalidSeat
        ? booking.tickets
        : selectedTicket
          ? [selectedTicket]
          : booking.tickets;

  const visibleCombos =
    seat && !comboParam
      ? [] // chỉ xem ghế
      : isAllTickets || invalidCombo
        ? booking.combos
        : selectedCombo
          ? [selectedCombo]
          : booking.combos;

  const selectedLabel =
    selectedCombo
      ? `Combo ${selectedCombo.combo.name}`
      : isAllTickets || invalidSeat
        ? `Tất cả (${booking.tickets.length} vé)`
        : `Ghế ${selectedTicket?.seatCode}`;

  /* ==========================================================
     PRINT RULE — chỉ ADMIN
     ========================================================== */

  const hasActiveCombo = booking.combos.some(
    (c) => c.status === 'ACTIVE' && c.qrCode,
  );
  const canPrint =
    isAdmin &&
    booking.status === 'CONFIRMED' &&
    booking.paymentStatus === 'PAID' &&
    (selectedTicket
      ? selectedTicket.status === TicketStatus.ACTIVE
      : selectedCombo
        ? selectedCombo.status === 'ACTIVE'
        : activeTickets.length > 0 || hasActiveCombo);

  /* ==========================================================
     TICKET URL
     ========================================================== */

  const getTicketUrl = (seatCode: string) =>
    `/ve/${booking.id}?seat=${encodeURIComponent(seatCode)}`;

  const getComboUrl = (comboId: string) =>
    `/ve/${booking.id}?combo=${encodeURIComponent(comboId)}`;

  /* ==========================================================
     RENDER
     ========================================================== */

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-10 text-white print:bg-white print:px-0 print:py-0">
      <AutoPrint enabled={shouldAutoPrint && canPrint} />
      <div className="mx-auto max-w-5xl print:max-w-none">

        {/* ====================================================
            HEADER ACTION
            ==================================================== */}

        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 print:hidden">
          <Link
            href={
              isAdmin
                ? '/admin/tra-cuu-ve'
                : '/don-hang'
            }
            className="inline-flex items-center rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-300 transition hover:bg-white/10 hover:text-white"
          >
            ← Quay lại
          </Link>

          <div className="flex flex-wrap items-center gap-2">
            {selectedTicketIsCanceled ? (
              <div className="rounded-xl border border-rose-400/30 bg-rose-500/10 px-4 py-2 text-sm font-semibold text-rose-300">
                Vé ghế{' '}
                {
                  selectedTicket?.seatCode
                }{' '}
                đã bị hủy — không thể in
                vé
              </div>
            ) : null}

            {canPrint ? (
              <PrintTicketButton
                label={
                  selectedCombo
                    ? '🖨 In combo'
                    : hasActiveCombo && isAllTickets
                      ? '🖨 In vé & combo'
                      : '🖨 In vé'
                }
              />
            ) : null}
          </div>
        </div>

        {/* ====================================================
            BOOKING HEADER
            ==================================================== */}

        <section className="mb-6 rounded-[28px] border border-white/10 bg-slate-900 p-6 shadow-xl print:hidden sm:p-8">
          <div className="flex flex-wrap items-start justify-between gap-5">
            <div>
              <p className="text-sm uppercase tracking-[0.3em] text-sky-300">
                Vé điện tử
              </p>

              <h1 className="mt-2 text-3xl font-bold">
                {
                  booking
                    .showtime
                    .movie
                    .title
                }
              </h1>

              <p className="mt-2 text-sm text-slate-400">
                Mã đơn:{' '}
                {
                  booking.bookingCode
                }
              </p>
            </div>

            <div className="text-left sm:text-right">
              <p className="text-sm text-slate-500">
                Đang xem
              </p>

              <p className="mt-1 text-lg font-bold text-sky-300">
                {selectedLabel}
              </p>
            </div>
          </div>

          {/* SUMMARY */}

          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <div className="rounded-xl border border-white/10 bg-white/5 p-3">
              <div className="text-xs text-slate-500">
                Tổng số vé
              </div>
              <div className="mt-1 text-lg font-bold">
                {booking.tickets.length}
              </div>
            </div>

            <div className="rounded-xl border border-amber-400/20 bg-amber-500/5 p-3">
              <div className="text-xs text-slate-500">
                Combo
              </div>
              <div className="mt-1 text-lg font-bold text-amber-300">
                {comboQtyTotal}
                <span className="ml-1 text-xs font-normal text-slate-500">
                  ({booking.combos.length} loại)
                </span>
              </div>
            </div>

            <div className="rounded-xl border border-emerald-400/20 bg-emerald-500/5 p-3">
              <div className="text-xs text-slate-500">
                Còn hiệu lực
              </div>
              <div className="mt-1 text-lg font-bold text-emerald-300">
                {activeTickets.length}
                {activeComboQty > 0 ? (
                  <span className="ml-1 text-sm font-normal text-emerald-400/80">
                    + {activeComboQty} combo
                  </span>
                ) : null}
              </div>
            </div>

            <div className="rounded-xl border border-rose-400/20 bg-rose-500/5 p-3">
              <div className="text-xs text-slate-500">
                Đã hủy
              </div>
              <div className="mt-1 text-lg font-bold text-rose-300">
                {canceledTickets.length}
              </div>
            </div>

            <div className="rounded-xl border border-purple-400/20 bg-purple-500/5 p-3">
              <div className="text-xs text-slate-500">
                Đã hoàn
              </div>
              <div className="mt-1 text-lg font-bold text-purple-300">
                {formatPrice(Number(booking.refundedAmount))}
              </div>
            </div>
          </div>

          {/* PAYMENT SUMMARY */}

          <div className="mt-4 rounded-2xl border border-orange-400/20 bg-orange-500/5 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-wider text-slate-500">
                  Trạng thái thanh toán
                </p>

                <p className="mt-1 font-semibold text-orange-300">
                  {booking.paymentStatus ===
                  'PARTIALLY_REFUNDED'
                    ? 'Đã thanh toán một phần hoàn tiền'
                    : booking.paymentStatus ===
                        'REFUNDED'
                      ? 'Đã hoàn tiền'
                      : booking.paymentStatus ===
                          'PAID'
                        ? 'Đã thanh toán'
                        : 'Chưa thanh toán'}
                </p>
              </div>

              <div className="text-right">
                <p className="text-xs text-slate-500">
                  Giá trị còn hiệu lực
                </p>

                <p className="mt-1 text-lg font-bold text-sky-300">
                  {formatPrice(
                    Number(
                      booking.totalPrice,
                    ),
                  )}
                </p>
              </div>
            </div>
          </div>

          {/* CHỌN VÉ */}

          <div className="mt-6">
            <p className="mb-3 text-sm font-semibold text-slate-300">
              Chọn vé / combo để xem
            </p>

            <div className="flex flex-wrap gap-2">
              <Link
                href={`/ve/${booking.id}`}
                className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
                  isAllTickets ||
                  invalidSeat
                    ? 'bg-sky-500 text-white shadow-lg shadow-sky-500/20'
                    : 'border border-white/10 bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white'
                }`}
              >
                Tất cả (
                {booking.tickets.length}
                {booking.combos.length > 0
                  ? ` + ${booking.combos.length} combo`
                  : ''}
                )
              </Link>

              {booking.tickets.map(
                (ticket) => {
                  const isSelected =
                    !isAllTickets &&
                    !invalidSeat &&
                    !comboParam &&
                    selectedTicket?.id ===
                      ticket.id;

                  const isInactive = ticket.status !== TicketStatus.ACTIVE;

                  return (
                    <Link
                      key={
                        ticket.id
                      }
                      href={getTicketUrl(
                        ticket.seatCode,
                      )}
                      className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
                        isSelected
                          ? 'bg-sky-500 text-white shadow-lg shadow-sky-500/20'
                          : isInactive
                            ? `border border-white/10 ${getTicketStatusClass(ticket.status)} hover:opacity-80`
                            : 'border border-white/10 bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white'
                      }`}
                    >
                      Ghế{' '}
                      {
                        ticket.seatCode
                      }

                      {isInactive ? ` · ${getTicketStatusLabel(ticket.status)}` : ''}
                    </Link>
                  );
                },
              )}

              {booking.combos.map((c) => {
                const isSelected = selectedCombo?.id === c.id;
                const isUsed = c.status === 'USED';
                return (
                  <Link
                    key={c.id}
                    href={getComboUrl(c.id)}
                    className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
                      isSelected
                        ? 'bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/20'
                        : isUsed
                          ? 'border border-white/10 bg-white/5 text-slate-500'
                          : 'border border-amber-400/30 bg-amber-500/10 text-amber-200 hover:bg-amber-500/20'
                    }`}
                  >
                    Combo {c.combo.name}
                    {isUsed ? ' · Đã dùng' : ''}
                  </Link>
                );
              })}
            </div>
          </div>
        </section>

        {/* ====================================================
            ELECTRONIC TICKETS
            ==================================================== */}

        <div
          id="electronic-ticket"
          className="space-y-8 print:space-y-0"
        >
          {visibleTickets.map(
            (
              ticket,
              index,
            ) => {
              const isCanceled = ticket.status === TicketStatus.CANCELED;
              const isInactive = ticket.status !== TicketStatus.ACTIVE;

              const ticketPaymentStatus =
                getTicketPaymentStatus(
                  ticket.status,
                  booking.paymentStatus,
                );

              const ticketQrValue =
                ticket.qrCode ??
                `${booking.bookingCode}-${ticket.id}-${ticket.seatCode}`;

              return (
                <section
                  key={
                    ticket.id
                  }
                  data-ticket-status={
                    ticket.status
                  }
                  className={`ticket-item overflow-hidden rounded-[32px] border shadow-2xl print:rounded-2xl print:shadow-none ${
                    isInactive
                      ? 'border-rose-400/20 bg-slate-900/70 print:hidden'
                      : 'border-white/10 bg-slate-900'
                  }`}
                >
                  {/* HEADER */}

                  <div
                    className={`border-b p-6 sm:p-8 ${
                      isInactive
                        ? 'border-rose-400/20 bg-rose-500/5'
                        : 'border-white/10 bg-gradient-to-r from-sky-500/20 via-slate-900 to-purple-500/20'
                    } print:border-slate-300 print:bg-white`}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div>
                        <p className="text-sm uppercase tracking-[0.35em] text-sky-300 print:text-slate-500">
                          Vé điện tử
                        </p>

                        <h2
                          className={`mt-2 text-3xl font-bold sm:text-4xl ${
                            isCanceled
                              ? 'text-slate-400 line-through print:text-slate-500'
                              : 'text-white print:text-black'
                          }`}
                        >
                          {
                            booking
                              .showtime
                              .movie
                              .title
                          }
                        </h2>

                        <p className="mt-2 text-sm text-slate-400 print:text-slate-600">
                          Mã đơn:{' '}
                          {
                            booking.bookingCode
                          }
                        </p>

                        <p className="mt-1 text-sm font-semibold text-sky-300 print:text-black">
                          Vé{' '}
                          {index + 1}/
                          {
                            booking
                              .tickets
                              .length
                          }
                        </p>
                      </div>

                      <div className="text-right">
                        <div
                          className={`inline-flex rounded-full px-4 py-2 text-sm font-semibold ${getBookingStatusClass(
                            booking.status,
                          )} print:border print:border-slate-300 print:bg-white print:text-black`}
                        >
                          {getBookingStatusLabel(
                            booking.status,
                          )}
                        </div>

                        <div
                          className={`mt-2 inline-flex rounded-full px-4 py-2 text-sm font-semibold ${ticketPaymentStatus.className} print:border print:border-slate-300 print:bg-white print:text-black`}
                        >
                          {
                            ticketPaymentStatus.label
                          }
                        </div>

                        <div
                          className={`mt-2 inline-flex rounded-full px-4 py-2 text-sm font-semibold ${
                            getTicketStatusClass(ticket.status)
                          } print:border print:border-slate-300 print:bg-white print:text-black`}
                        >
                          {getTicketStatusLabel(ticket.status)}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* CONTENT */}

                  <div
                    className={`grid gap-8 p-6 sm:p-8 lg:grid-cols-[1fr_220px] print:grid-cols-[1fr_220px] ${
                      isCanceled
                        ? 'opacity-70'
                        : ''
                    }`}
                  >
                    <div className="space-y-6">
                      {/* RẠP */}

                      <div>
                        <p className="text-xs uppercase tracking-wider text-slate-500">
                          Rạp chiếu
                        </p>

                        <p className="mt-1 text-lg font-semibold text-white print:text-black">
                          {
                            booking
                              .showtime
                              .hall
                              .cinema
                              .name
                          }
                        </p>

                        <p className="mt-1 text-sm text-slate-400 print:text-slate-600">
                          {
                            booking
                              .showtime
                              .hall
                              .cinema
                              .address
                          }
                        </p>
                      </div>

                      {/* PHÒNG */}

                      <div>
                        <p className="text-xs uppercase tracking-wider text-slate-500">
                          Phòng chiếu
                        </p>

                        <p className="mt-1 text-lg font-semibold text-white print:text-black">
                          {
                            booking
                              .showtime
                              .hall
                              .name
                          }
                        </p>
                      </div>

                      {/* NGÀY */}

                      <div className="grid gap-4 sm:grid-cols-2">
                        <div>
                          <p className="text-xs uppercase tracking-wider text-slate-500">
                            Ngày chiếu
                          </p>

                          <p className="mt-1 font-semibold text-white print:text-black">
                            {showtimeDate.toLocaleDateString(
                              'vi-VN',
                            )}
                          </p>
                        </div>

                        <div>
                          <p className="text-xs uppercase tracking-wider text-slate-500">
                            Giờ chiếu
                          </p>

                          <p className="mt-1 font-semibold text-white print:text-black">
                            {showtimeDate.toLocaleTimeString(
                              'vi-VN',
                              {
                                hour:
                                  '2-digit',

                                minute:
                                  '2-digit',
                              },
                            )}
                          </p>
                        </div>
                      </div>

                      {/* FORMAT */}

                      <div className="grid gap-4 sm:grid-cols-2">
                        <div>
                          <p className="text-xs uppercase tracking-wider text-slate-500">
                            Định dạng
                          </p>

                          <p className="mt-1 font-semibold text-white print:text-black">
                            {
                              booking
                                .showtime
                                .format
                            }
                          </p>
                        </div>

                        <div>
                          <p className="text-xs uppercase tracking-wider text-slate-500">
                            Ngôn ngữ
                          </p>

                          <p className="mt-1 font-semibold text-white print:text-black">
                            {
                              booking
                                .showtime
                                .language
                            }
                          </p>
                        </div>
                      </div>

                      {/* KHÁCH HÀNG */}

                      <div>
                        <p className="text-xs uppercase tracking-wider text-slate-500">
                          Khách hàng
                        </p>

                        <p className="mt-1 font-semibold text-white print:text-black">
                          {
                            booking.customerName
                          }
                        </p>

                        {booking.customerEmail ? (
                          <p className="mt-1 text-sm text-slate-400 print:text-slate-600">
                            {
                              booking.customerEmail
                            }
                          </p>
                        ) : null}

                        {booking.customerPhone ? (
                          <p className="mt-1 text-sm text-slate-400 print:text-slate-600">
                            {
                              booking.customerPhone
                            }
                          </p>
                        ) : null}
                      </div>

                      {/* GHẾ */}

                      <div>
                        <p className="text-xs uppercase tracking-wider text-slate-500">
                          Ghế
                        </p>

                        <div className="mt-2">
                          <span
                            className={`inline-flex rounded-xl px-5 py-3 text-xl font-bold print:border print:border-slate-300 print:bg-white print:text-black ${
                              isCanceled
                                ? 'bg-rose-500/10 text-rose-300 line-through'
                                : 'bg-sky-500/10 text-sky-300'
                            }`}
                          >
                            {
                              ticket.seatCode
                            }
                          </span>
                        </div>
                      </div>

                      {/* GIÁ */}

                      <div>
                        <p className="text-xs uppercase tracking-wider text-slate-500">
                          Giá vé
                        </p>

                        <p
                          className={`mt-1 text-xl font-bold print:text-black ${
                            isCanceled
                              ? 'text-slate-500 line-through'
                              : 'text-white'
                          }`}
                        >
                          {formatPrice(
                            Number(
                              ticket.price,
                            ),
                          )}
                        </p>
                      </div>

                      {/* TIỀN HOÀN */}

                      {isCanceled ? (
                        <div className="rounded-2xl border border-purple-400/20 bg-purple-500/5 p-4 print:border-slate-300 print:bg-white">
                          <p className="text-xs uppercase tracking-wider text-purple-300 print:text-slate-500">
                            Tiền hoàn của vé
                          </p>

                          <p className="mt-1 text-2xl font-bold text-purple-300 print:text-black">
                            {formatPrice(
                              Number(
                                ticket.price,
                              ),
                            )}
                          </p>

                          <p className="mt-2 text-sm text-slate-400 print:text-slate-600">
                            Vé này đã bị hủy
                            nên không còn giá
                            trị sử dụng.
                          </p>

                          {ticket.canceledAt ? (
                            <p className="mt-1 text-xs text-slate-500 print:text-slate-600">
                              Hủy lúc:{' '}
                              {new Date(
                                ticket.canceledAt,
                              ).toLocaleString(
                                'vi-VN',
                              )}
                            </p>
                          ) : null}
                        </div>
                      ) : null}

                      {/* PHƯƠNG THỨC */}

                      <div>
                        <p className="text-xs uppercase tracking-wider text-slate-500">
                          Phương thức thanh toán
                        </p>

                        <p className="mt-1 font-semibold text-white print:text-black">
                          {getPaymentMethodLabel(
                            booking.paymentMethod,
                          )}
                        </p>
                      </div>

                      {/* CẢNH BÁO */}

                      {isCanceled ? (
                        <div className="rounded-2xl border border-rose-400/30 bg-rose-500/10 p-4">
                          <p className="font-semibold text-rose-300">
                            Vé đã bị hủy
                          </p>

                          <p className="mt-1 text-sm text-slate-400">
                            Vé này không còn
                            giá trị sử dụng và
                            không được phép in.
                          </p>
                        </div>
                      ) : null}

                      
                    </div>

                    {/* QR */}

                    <div className="flex flex-col items-center">
                      {isInactive ? (
                        <div className="flex h-[220px] w-[220px] flex-col items-center justify-center rounded-[28px] border border-white/10 bg-white/5 text-center">
                          <div className="text-5xl">
                            {isCanceled ? '🚫' : ticket.status === TicketStatus.USED ? '✓' : '⌛'}
                          </div>

                          <p className={`mt-3 font-bold ${getTicketStatusClass(ticket.status).split(' ')[1]}`}>
                            {getTicketStatusLabel(ticket.status).toUpperCase()}
                          </p>

                          <p className="mt-1 px-5 text-xs text-slate-500">
                            QR không còn hiệu lực
                          </p>
                        </div>
                      ) : (
                        <>
                          <div className="rounded-[28px] border border-white/10 bg-white/5 p-4 print:border-slate-300 print:bg-white">
                            <BookingQR
                              value={
                                ticketQrValue
                              }
                            />
                          </div>

                          <p className="mt-3 text-center text-xs text-slate-500 print:text-slate-600">
                            QR của ghế{' '}
                            {
                              ticket.seatCode
                            }
                          </p>
                        </>
                      )}

                      <p className="mt-2 break-all text-center font-mono text-xs text-slate-500 print:text-slate-600">
                        {ticket.id}
                      </p>
                    </div>
                  </div>

                  {/* FOOTER */}

                  <div
                    className={`border-t p-6 text-center text-xs print:border-slate-300 ${
                      isCanceled
                        ? 'border-rose-400/20 text-rose-300 print:text-slate-600'
                        : 'border-white/10 text-slate-500 print:text-slate-600'
                    }`}
                  >
                    {isCanceled
                      ? `Vé ${getTicketStatusLabel(ticket.status).toLowerCase()} — không được phép sử dụng hoặc in vé.`
                      : 'Vui lòng xuất trình vé điện tử hoặc mã QR khi vào phòng chiếu.'}
                  </div>
                </section>
              );
            },
          )}
        </div>

        {/* ====================================================
            COMBO (chỉ hiện 1 lần — dưới cùng, trước tóm tắt)
            ==================================================== */}
        {visibleCombos.length > 0 ? (
          <section className="combo-print-section mt-8 space-y-5 print:mt-4">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="text-sm uppercase tracking-[0.3em] text-amber-300/80">
                  Ưu đãi kèm vé
                </p>
                <h2 className="mt-1 text-2xl font-bold text-white">
                  Combo bắp nước
                </h2>
              </div>
              <p className="text-sm text-slate-400">
                Xuất trình QR combo tại quầy
              </p>
            </div>

            <div className="grid gap-5">
              {visibleCombos.map((combo) => {
                const isUsed = combo.status === 'USED';
                const lineTotal =
                  Number(combo.unitPrice) * Number(combo.quantity);
                return (
                  <div
                    key={combo.id}
                    className={`combo-ticket-item overflow-hidden rounded-[28px] border shadow-xl print:rounded-xl print:shadow-none ${
                      isUsed
                        ? 'border-slate-600/40 bg-slate-950/80 opacity-80 print:hidden'
                        : 'border-amber-400/20 bg-gradient-to-br from-slate-900 via-slate-900 to-amber-950/30 print:border-2 print:border-black print:bg-white print:from-white print:to-white'
                    }`}
                  >
                    <div className="grid gap-0 md:grid-cols-[1fr_auto]">
                      <div className="p-6 sm:p-8">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded-full bg-amber-400/15 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-amber-300">
                            Combo
                          </span>
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-semibold ${
                              isUsed
                                ? 'bg-slate-500/20 text-slate-400'
                                : 'bg-emerald-500/15 text-emerald-300'
                            }`}
                          >
                            {isUsed ? 'Đã sử dụng' : 'Còn hiệu lực'}
                          </span>
                        </div>

                        <h3 className="mt-4 text-2xl font-bold text-white print:text-black">
                          {combo.combo.name}
                        </h3>
                        {combo.combo.description ? (
                          <p className="mt-2 text-sm text-slate-400">
                            {combo.combo.description}
                          </p>
                        ) : null}

                        <div className="mt-6 grid gap-4 sm:grid-cols-3">
                          <div>
                            <p className="text-xs uppercase tracking-wide text-slate-500">
                              Số lượng
                            </p>
                            <p className="mt-1 text-lg font-semibold text-white">
                              × {combo.quantity}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs uppercase tracking-wide text-slate-500">
                              Đơn giá
                            </p>
                            <p className="mt-1 text-lg font-semibold text-white">
                              {Number(combo.unitPrice).toLocaleString('vi-VN')} đ
                            </p>
                          </div>
                          <div>
                            <p className="text-xs uppercase tracking-wide text-slate-500">
                              Thành tiền
                            </p>
                            <p className="mt-1 text-lg font-semibold text-amber-300">
                              {lineTotal.toLocaleString('vi-VN')} đ
                            </p>
                          </div>
                        </div>

                        <p className="mt-5 text-xs text-slate-500">
                          Mã đơn {booking.bookingCode}
                          {combo.qrCode ? ` · QR: ${combo.qrCode}` : ''}
                        </p>
                      </div>

                      <div className="flex flex-col items-center justify-center gap-3 border-t border-white/10 bg-black/20 p-6 md:border-l md:border-t-0 md:px-8">
                        {isUsed ? (
                          <div className="flex h-[180px] w-[180px] flex-col items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-center">
                            <div className="text-5xl">✓</div>
                            <p className="mt-3 font-bold text-slate-400">ĐÃ SỬ DỤNG</p>
                            <p className="mt-1 px-4 text-xs text-slate-500">
                              QR không còn hiệu lực
                            </p>
                          </div>
                        ) : combo.qrCode ? (
                          <>
                            <div className="combo-qr-wrap rounded-2xl bg-white p-3 shadow-lg print:border print:border-black print:shadow-none">
                              <BookingQR value={combo.qrCode} />
                            </div>
                            <p className="max-w-[140px] text-center text-xs text-slate-400 print:text-black">
                              Quét tại quầy để nhận combo
                            </p>
                          </>
                        ) : (
                          <p className="text-sm text-slate-500">Chưa có mã QR</p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        ) : null}

        {/* ====================================================
            ORDER SUMMARY
            ==================================================== */}

        {isAllTickets ? (
          <section className="mt-8 rounded-[28px] border border-white/10 bg-slate-900 p-6 shadow-xl print:hidden sm:p-8">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
              <div>
                <p className="text-sm text-slate-500">Tổng số vé</p>
                <p className="mt-1 text-2xl font-bold">
                  {booking.tickets.length}
                </p>
              </div>

              <div>
                <p className="text-sm text-slate-500">Combo</p>
                <p className="mt-1 text-2xl font-bold text-amber-300">
                  {comboQtyTotal}
                </p>
                <p className="mt-0.5 text-xs text-slate-500">
                  {booking.combos.length} loại · {activeComboQty} còn hiệu lực
                  {usedCombos.length > 0
                    ? ` · ${usedCombos.reduce((s, c) => s + Number(c.quantity || 0), 0)} đã dùng`
                    : ''}
                </p>
              </div>

              <div>
                <p className="text-sm text-slate-500">Còn hiệu lực</p>
                <p className="mt-1 text-2xl font-bold text-emerald-300">
                  {activeTickets.length}
                  {activeComboQty > 0 ? (
                    <span className="ml-1 text-base font-normal text-emerald-400/80">
                      +{activeComboQty} combo
                    </span>
                  ) : null}
                </p>
              </div>

              <div>
                <p className="text-sm text-slate-500">Tổng tiền</p>
                <p className="mt-1 text-2xl font-bold text-sky-300">
                  {formatPrice(Number(booking.totalPrice))}
                </p>
              </div>

              <div>
                <p className="text-sm text-slate-500">Đã hoàn</p>
                <p className="mt-1 text-2xl font-bold text-purple-300">
                  {formatPrice(Number(booking.refundedAmount))}
                </p>
              </div>
            </div>
          </section>
        ) : null}
      </div>

      {/* ======================================================
          PRINT
          ====================================================== */}

      <style>{`
        @media print {
          @page {
            size: A4;
            margin: 10mm;
          }

          html,
          body {
            background: #ffffff !important;
            color: #000000 !important;
          }

          body {
            min-height: auto !important;
          }

          .print\\:hidden {
            display: none !important;
          }

          #electronic-ticket {
            width: 100% !important;
            max-width: none !important;
            margin: 0 !important;
            padding: 0 !important;
          }

          .ticket-item[data-ticket-status="ACTIVE"],
          .combo-ticket-item {
            display: block !important;
            width: 100% !important;
            max-width: none !important;
            margin: 0 0 16px 0 !important;
            border: 2px solid #000 !important;
            border-radius: 16px !important;
            box-shadow: none !important;
            background: #ffffff !important;
            color: #000000 !important;
            overflow: hidden !important;
            break-inside: avoid;
            page-break-inside: avoid;
          }

          .ticket-item[data-ticket-status="CANCELED"] {
            display: none !important;
          }

          .ticket-item[data-ticket-status="ACTIVE"]
            + .ticket-item[data-ticket-status="ACTIVE"],
          .combo-ticket-item + .combo-ticket-item,
          .ticket-item[data-ticket-status="ACTIVE"] + .combo-ticket-item {
            break-before: page;
            page-break-before: always;
          }

          .ticket-item[data-ticket-status="ACTIVE"],
          .ticket-item[data-ticket-status="ACTIVE"] *,
          .combo-ticket-item,
          .combo-ticket-item * {
            color: #000000 !important;
            border-color: #000000 !important;
            background-image: none !important;
          }

          .ticket-item[data-ticket-status="ACTIVE"],
          .combo-ticket-item {
            background: #ffffff !important;
          }

          .ticket-item[data-ticket-status="ACTIVE"] img,
          .combo-ticket-item img {
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
          }

          .combo-ticket-item .combo-qr-wrap {
            border: 1px solid #000 !important;
            background: #fff !important;
            border-radius: 12px !important;
            padding: 8px !important;
          }

          a {
            text-decoration: none !important;
          }
        }
      `}</style>
    </main>
  );
}