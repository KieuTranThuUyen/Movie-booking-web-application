import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { getServerSession } from 'next-auth/next';

import { TicketStatus } from '@prisma/client';

import { BookingQR } from '@/components/booking-qr';
import { PrintTicketButton } from '@/components/print-ticket-button';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

type TicketPageProps = {
  params: Promise<{
    id: string;
  }>;

  searchParams: Promise<{
    seat?: string;
  }>;
};

/* ============================================================
   BOOKING STATUS
   ============================================================ */

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

function getBookingStatusClass(status: string) {
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

/* ============================================================
   TICKET PAYMENT STATUS
   ============================================================ */

/*
 * Trạng thái thanh toán của TỪNG VÉ.
 *
 * ACTIVE:
 *   - UNPAID -> Chưa thanh toán
 *   - PAID / PARTIALLY_REFUNDED / REFUNDED -> Đã thanh toán
 *
 * CANCELED:
 *   -> Đã hoàn tiền
 */
function getTicketPaymentStatus(
  ticketStatus: TicketStatus,
  bookingPaymentStatus: string
) {
  if (
    ticketStatus === TicketStatus.CANCELED
  ) {
    return {
      label: 'Đã hoàn tiền',
      className:
        'bg-purple-500/10 text-purple-300',
    };
  }

  if (
    bookingPaymentStatus === 'UNPAID'
  ) {
    return {
      label: 'Chưa thanh toán',
      className:
        'bg-amber-500/10 text-amber-300',
    };
  }

  return {
    label: 'Đã thanh toán',
    className:
      'bg-emerald-500/10 text-emerald-300',
  };
}

/* ============================================================
   PAYMENT METHOD
   ============================================================ */

function getPaymentMethodLabel(method: string) {
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

    default:
      return method;
  }
}

/* ============================================================
   FORMAT PRICE
   ============================================================ */

function formatPrice(value: number) {
  return `${value.toLocaleString('vi-VN')} đ`;
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

  const { id } = await params;
  const { seat } = await searchParams;

  /* ==========================================================
     SESSION
     ========================================================== */

  const session =
    await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect(
      `/dang-nhap?callbackUrl=${encodeURIComponent(
        `/ve/${id}`
      )}`
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
    session.user.role === 'ADMIN';

  if (
    !isAdmin &&
    booking.userId !== session.user.id
  ) {
    redirect('/don-hang');
  }

  /* ==========================================================
     NO TICKETS
     ========================================================== */

  if (booking.tickets.length === 0) {
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

          <section className="rounded-[28px] border border-white/10 bg-slate-900 p-8 text-center shadow-2xl">
            <div className="text-5xl">
              🎫
            </div>

            <h1 className="mt-5 text-2xl font-bold">
              Đơn hàng chưa có vé
            </h1>

            <p className="mt-2 text-slate-400">
              Đơn hàng {booking.bookingCode}{' '}
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
        TicketStatus.ACTIVE
    );

  const canceledTickets =
    booking.tickets.filter(
      (ticket) =>
        ticket.status ===
        TicketStatus.CANCELED
    );

  /* ==========================================================
     SHOWTIME
     ========================================================== */

  const showtimeDate =
    new Date(
      booking.showtime.startTime
    );

  /* ==========================================================
     SELECT TICKET
     ========================================================== */

  const selectedTicket = seat
    ? booking.tickets.find(
        (ticket) =>
          ticket.seatCode.toLowerCase() ===
          seat.toLowerCase()
      )
    : null;

  const isAllTickets = !seat;

  const invalidSeat =
    Boolean(
      seat &&
        !selectedTicket
    );

  /*
   * Có chọn riêng 1 vé bị hủy hay không?
   */
  const selectedTicketIsCanceled =
    Boolean(
      selectedTicket &&
        selectedTicket.status ===
          TicketStatus.CANCELED
    );

  /*
   * Vẫn xem được vé CANCELED.
   */
  const visibleTickets =
    isAllTickets || invalidSeat
      ? booking.tickets
      : selectedTicket
        ? [selectedTicket]
        : booking.tickets;

  const selectedLabel =
    isAllTickets || invalidSeat
      ? `Tất cả (${booking.tickets.length} vé)`
      : `Ghế ${selectedTicket?.seatCode}`;

  /* ==========================================================
     PRINT RULE
     ========================================================== */

  /*
   * Chỉ ADMIN mới có quyền in.
   *
   * Nếu:
   * - xem tất cả: chỉ cần còn ACTIVE
   * - chọn 1 ticket: ticket đó phải ACTIVE
   */
  const canPrint =
    isAdmin &&
    activeTickets.length > 0 &&
    !selectedTicketIsCanceled;

  /* ==========================================================
     TICKET URL
     ========================================================== */

  const getTicketUrl = (
    seatCode: string
  ) =>
    `/ve/${booking.id}?seat=${encodeURIComponent(
      seatCode
    )}`;

  /* ==========================================================
     RENDER
     ========================================================== */

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-10 text-white print:bg-white print:px-0 print:py-0">
      <div className="mx-auto max-w-5xl print:max-w-none">

        {/* ====================================================
            HEADER ACTION
            ==================================================== */}

        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 print:hidden">
          <Link
            href={
              isAdmin
                ? '/admin/bookings'
                : '/don-hang'
            }
            className="inline-flex items-center rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-300 transition hover:bg-white/10 hover:text-white"
          >
            ← Quay lại
          </Link>

          <div className="flex flex-wrap items-center gap-2">

            {/* CẢNH BÁO KHI CHỌN RIÊNG VÉ ĐÃ HỦY */}

            {selectedTicketIsCanceled ? (
              <div className="rounded-xl border border-rose-400/30 bg-rose-500/10 px-4 py-2 text-sm font-semibold text-rose-300">
                Vé ghế{' '}
                {selectedTicket?.seatCode}{' '}
                đã bị hủy — không thể in vé
              </div>
            ) : null}

            {/* CHỈ ADMIN MỚI IN ĐƯỢC */}

            {canPrint ? (
              <PrintTicketButton />
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
                  booking.showtime
                    .movie.title
                }
              </h1>

              <p className="mt-2 text-sm text-slate-400">
                Mã đơn:{' '}
                {booking.bookingCode}
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

          <div className="mt-6 grid gap-3 sm:grid-cols-4">
            <div className="rounded-xl border border-white/10 bg-white/5 p-3">
              <div className="text-xs text-slate-500">
                Tổng số vé
              </div>

              <div className="mt-1 text-lg font-bold">
                {booking.tickets.length}
              </div>
            </div>

            <div className="rounded-xl border border-emerald-400/20 bg-emerald-500/5 p-3">
              <div className="text-xs text-slate-500">
                Còn hiệu lực
              </div>

              <div className="mt-1 text-lg font-bold text-emerald-300">
                {activeTickets.length}
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
                {formatPrice(
                  booking.refundedAmount
                )}
              </div>
            </div>
          </div>

          {/* CHỌN VÉ */}

          <div className="mt-6">
            <p className="mb-3 text-sm font-semibold text-slate-300">
              Chọn vé để xem
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
                )
              </Link>

              {booking.tickets.map(
                (ticket) => {
                  const isSelected =
                    !isAllTickets &&
                    !invalidSeat &&
                    selectedTicket?.id ===
                      ticket.id;

                  const isCanceled =
                    ticket.status ===
                    TicketStatus.CANCELED;

                  return (
                    <Link
                      key={ticket.id}
                      href={getTicketUrl(
                        ticket.seatCode
                      )}
                      className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
                        isSelected
                          ? 'bg-sky-500 text-white shadow-lg shadow-sky-500/20'
                          : isCanceled
                            ? 'border border-rose-400/30 bg-rose-500/10 text-rose-300 hover:bg-rose-500/20'
                            : 'border border-white/10 bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white'
                      }`}
                    >
                      Ghế {ticket.seatCode}

                      {isCanceled
                        ? ' · Đã hủy'
                        : ''}
                    </Link>
                  );
                }
              )}
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
            (ticket, index) => {
              const isCanceled =
                ticket.status ===
                TicketStatus.CANCELED;

              /*
               * Trạng thái thanh toán theo từng vé.
               */
              const ticketPaymentStatus =
                getTicketPaymentStatus(
                  ticket.status,
                  booking.paymentStatus
                );

              /*
               * QR chỉ dùng cho ACTIVE.
               */
              const ticketQrValue =
                ticket.qrCode ??
                `${booking.bookingCode}-${ticket.id}-${ticket.seatCode}`;

              return (
                <section
                  key={ticket.id}
                  data-ticket-status={
                    ticket.status
                  }
                  className={`ticket-item overflow-hidden rounded-[32px] border shadow-2xl print:rounded-none print:shadow-none ${
                    isCanceled
                      ? 'border-rose-400/20 bg-slate-900/70'
                      : 'border-white/10 bg-slate-900'
                  }`}
                >

                  {/* ==========================================
                      HEADER
                      ========================================== */}

                  <div
                    className={`border-b p-6 sm:p-8 ${
                      isCanceled
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
                              .movie.title
                          }
                        </h2>

                        <p className="mt-2 text-sm text-slate-400 print:text-slate-600">
                          Mã đơn:{' '}
                          {booking.bookingCode}
                        </p>

                        <p className="mt-1 text-sm font-semibold text-sky-300 print:text-black">
                          Vé {index + 1}/
                          {booking.tickets.length}
                        </p>
                      </div>

                      <div className="text-right">

                        {/* BOOKING STATUS */}

                        <div
                          className={`inline-flex rounded-full px-4 py-2 text-sm font-semibold ${getBookingStatusClass(
                            booking.status
                          )} print:border print:border-slate-300 print:bg-white print:text-black`}
                        >
                          {getBookingStatusLabel(
                            booking.status
                          )}
                        </div>

                        {/* PAYMENT STATUS CỦA RIÊNG TICKET */}

                        <div
                          className={`mt-2 inline-flex rounded-full px-4 py-2 text-sm font-semibold ${ticketPaymentStatus.className} print:border print:border-slate-300 print:bg-white print:text-black`}
                        >
                          {
                            ticketPaymentStatus.label
                          }
                        </div>

                        {/* TICKET STATUS */}

                        <div
                          className={`mt-2 inline-flex rounded-full px-4 py-2 text-sm font-semibold ${
                            isCanceled
                              ? 'bg-rose-500/10 text-rose-300'
                              : 'bg-emerald-500/10 text-emerald-300'
                          } print:border print:border-slate-300 print:bg-white print:text-black`}
                        >
                          {isCanceled
                            ? 'Đã hủy'
                            : 'Còn hiệu lực'}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* ==========================================
                      CONTENT
                      ========================================== */}

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
                              'vi-VN'
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
                                hour: '2-digit',
                                minute:
                                  '2-digit',
                              }
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
                          {booking.customerName}
                        </p>

                        {booking.customerEmail ? (
                          <p className="mt-1 text-sm text-slate-400 print:text-slate-600">
                            {booking.customerEmail}
                          </p>
                        ) : null}

                        {booking.customerPhone ? (
                          <p className="mt-1 text-sm text-slate-400 print:text-slate-600">
                            {booking.customerPhone}
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
                            {ticket.seatCode}
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
                            ticket.price
                          )}
                        </p>
                      </div>

                      {/* ========================================
                          TIỀN HOÀN
                          CHỈ VÉ CANCELED
                          ======================================== */}

                      {isCanceled ? (
                        <div className="rounded-2xl border border-purple-400/20 bg-purple-500/5 p-4 print:border-slate-300 print:bg-white">

                          <p className="text-xs uppercase tracking-wider text-purple-300 print:text-slate-500">
                            Tiền hoàn của vé
                          </p>

                          <p className="mt-1 text-2xl font-bold text-purple-300 print:text-black">
                            {formatPrice(
                              ticket.price
                            )}
                          </p>

                          <p className="mt-2 text-sm text-slate-400 print:text-slate-600">
                            Vé này đã bị hủy nên không còn giá trị sử dụng.
                          </p>

                          {ticket.canceledAt ? (
                            <p className="mt-1 text-xs text-slate-500 print:text-slate-600">
                              Hủy lúc:{' '}
                              {new Date(
                                ticket.canceledAt
                              ).toLocaleString(
                                'vi-VN'
                              )}
                            </p>
                          ) : null}

                        </div>
                      ) : null}

                      {/* PHƯƠNG THỨC THANH TOÁN */}

                      <div>
                        <p className="text-xs uppercase tracking-wider text-slate-500">
                          Phương thức thanh toán
                        </p>

                        <p className="mt-1 font-semibold text-white print:text-black">
                          {getPaymentMethodLabel(
                            booking.paymentMethod
                          )}
                        </p>
                      </div>

                      {/* CẢNH BÁO VÉ HỦY */}

                      {isCanceled ? (
                        <div className="rounded-2xl border border-rose-400/30 bg-rose-500/10 p-4">
                          <p className="font-semibold text-rose-300">
                             Vé đã bị hủy
                          </p>

                          <p className="mt-1 text-sm text-slate-400">
                            Vé này không còn giá trị sử dụng và không được phép in.
                          </p>
                        </div>
                      ) : null}
                    </div>

                    {/* ==========================================
                        QR
                        ========================================== */}

                    <div className="flex flex-col items-center">

                      {isCanceled ? (
                        <div className="flex h-[220px] w-[220px] flex-col items-center justify-center rounded-[28px] border border-rose-400/20 bg-rose-500/5 text-center">
                          <div className="text-5xl">
                            🚫
                          </div>

                          <p className="mt-3 font-bold text-rose-300">
                            VÉ ĐÃ HỦY
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
                            {ticket.seatCode}
                          </p>
                        </>
                      )}

                      <p className="mt-2 break-all text-center font-mono text-xs text-slate-500 print:text-slate-600">
                        {ticket.id}
                      </p>
                    </div>
                  </div>

                  {/* ==========================================
                      FOOTER
                      ========================================== */}

                  <div
                    className={`border-t p-6 text-center text-xs print:border-slate-300 ${
                      isCanceled
                        ? 'border-rose-400/20 text-rose-300 print:text-slate-600'
                        : 'border-white/10 text-slate-500 print:text-slate-600'
                    }`}
                  >
                    {isCanceled
                      ? 'Vé đã hủy — không được phép sử dụng hoặc in vé.'
                      : 'Vui lòng xuất trình vé điện tử hoặc mã QR khi vào phòng chiếu.'}
                  </div>
                </section>
              );
            }
          )}
        </div>

        {/* ====================================================
            ORDER SUMMARY
            ==================================================== */}

        {isAllTickets ? (
          <section className="mt-8 rounded-[28px] border border-white/10 bg-slate-900 p-6 shadow-xl print:hidden sm:p-8">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <p className="text-sm text-slate-500">
                  Tổng số vé
                </p>

                <p className="mt-1 text-2xl font-bold">
                  {booking.tickets.length}
                </p>
              </div>

              <div>
                <p className="text-sm text-slate-500">
                  Còn hiệu lực
                </p>

                <p className="mt-1 text-2xl font-bold text-emerald-300">
                  {activeTickets.length}
                </p>
              </div>

              <div>
                <p className="text-sm text-slate-500">
                  Tổng tiền
                </p>

                <p className="mt-1 text-2xl font-bold text-sky-300">
                  {formatPrice(
                    booking.totalPrice
                  )}
                </p>
              </div>

              <div>
                <p className="text-sm text-slate-500">
                  Đã hoàn
                </p>

                <p className="mt-1 text-2xl font-bold text-purple-300">
                  {formatPrice(
                    booking.refundedAmount
                  )}
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

          /*
           * Header / nút / summary không in.
           */
          .print\\:hidden {
            display: none !important;
          }

          #electronic-ticket {
            width: 100% !important;
            max-width: none !important;
            margin: 0 !important;
            padding: 0 !important;
          }

          /*
           * Ticket ACTIVE được in.
           */
          .ticket-item[data-ticket-status="ACTIVE"] {
            display: block !important;
            width: 100% !important;
            max-width: none !important;
            margin: 0 !important;
            border-radius: 0 !important;
            box-shadow: none !important;
            break-inside: avoid;
            page-break-inside: avoid;
          }

          /*
           * Ticket CANCELED không được in.
           */
          .ticket-item[data-ticket-status="CANCELED"] {
            display: none !important;
          }

          /*
           * Mỗi vé ACTIVE một trang.
           */
          .ticket-item[data-ticket-status="ACTIVE"]
            + .ticket-item[data-ticket-status="ACTIVE"] {
            break-before: page;
            page-break-before: always;
          }

          /*
           * Màu khi in.
           */
          .ticket-item[data-ticket-status="ACTIVE"],
          .ticket-item[data-ticket-status="ACTIVE"] * {
            color: #000000 !important;
          }

          .ticket-item[data-ticket-status="ACTIVE"] {
            background: #ffffff !important;
          }

          /*
           * QR.
           */
          .ticket-item[data-ticket-status="ACTIVE"] img {
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
          }

          a {
            text-decoration: none !important;
          }
        }
      `}</style>
    </main>
  );
}