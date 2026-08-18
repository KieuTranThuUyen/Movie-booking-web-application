import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { getServerSession } from 'next-auth/next';

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
   PAYMENT STATUS
   ============================================================ */

function getPaymentStatusLabel(status: string) {
  switch (status) {
    case 'UNPAID':
      return 'Chưa thanh toán';

    case 'PAID':
      return 'Đã thanh toán';

    case 'REFUNDED':
      return 'Đã hoàn tiền';

    default:
      return status;
  }
}

function getPaymentStatusClass(status: string) {
  switch (status) {
    case 'PAID':
      return 'bg-emerald-500/10 text-emerald-300';

    case 'REFUNDED':
      return 'bg-rose-500/10 text-rose-300';

    case 'UNPAID':
    default:
      return 'bg-amber-500/10 text-amber-300';
  }
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

function formatPrice(price: number) {
  return `${price.toLocaleString('vi-VN')} đ`;
}

/* ============================================================
   PAGE
   ============================================================ */

export default async function ElectronicTicketPage({
  params,
  searchParams,
}: TicketPageProps) {
  /* ==========================================================
     LẤY PARAMS
     ========================================================== */

  const { id } = await params;
  const { seat } = await searchParams;

  /* ==========================================================
     KIỂM TRA ĐĂNG NHẬP
     ========================================================== */

  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect(
      `/dang-nhap?callbackUrl=${encodeURIComponent(`/ve/${id}`)}`
    );
  }

  /* ==========================================================
     LẤY BOOKING
     ========================================================== */

  const booking = await prisma.booking.findUnique({
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
        orderBy: [
          {
            seatCode: 'asc',
          },
        ],
      },

      payment: true,
    },
  });

  /* ==========================================================
     KHÔNG TÌM THẤY BOOKING
     ========================================================== */

  if (!booking) {
    notFound();
  }

  /* ==========================================================
     KIỂM TRA QUYỀN

     CUSTOMER:
     Chỉ xem đơn của chính mình.

     ADMIN:
     Được xem tất cả đơn.
     ========================================================== */

  const isAdmin = session.user.role === 'ADMIN';

  if (!isAdmin && booking.userId !== session.user.id) {
    redirect('/don-hang');
  }

  /* ==========================================================
     KIỂM TRA BOOKING CÓ VÉ HAY KHÔNG
     ========================================================== */

  if (booking.tickets.length === 0) {
    return (
      <main className="min-h-screen bg-slate-950 px-4 py-10 text-white">
        <div className="mx-auto max-w-3xl">
          <Link
            href={isAdmin ? '/admin/bookings' : '/don-hang'}
            className="mb-6 inline-flex items-center rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-300 transition hover:bg-white/10 hover:text-white"
          >
            ← Quay lại
          </Link>

          <section className="rounded-[28px] border border-white/10 bg-slate-900 p-8 text-center shadow-2xl">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-amber-500/10 text-3xl">
              🎫
            </div>

            <h1 className="mt-5 text-2xl font-bold">
              Đơn hàng chưa có vé
            </h1>

            <p className="mt-2 text-slate-400">
              Đơn hàng {booking.bookingCode} hiện chưa có vé điện tử.
            </p>
          </section>
        </div>
      </main>
    );
  }

  /* ==========================================================
     NGÀY GIỜ SUẤT CHIẾU
     ========================================================== */

  const showtimeDate = new Date(booking.showtime.startTime);

  /* ==========================================================
     XỬ LÝ LỰA CHỌN GHẾ

     Không có ?seat=...
       => Tất cả

     Có ?seat=A1
       => Chỉ vé ghế A1
     ========================================================== */

  const selectedTicket = seat
    ? booking.tickets.find(
        (ticket) =>
          ticket.seatCode.toLowerCase() === seat.toLowerCase()
      )
    : null;

  const isAllTickets = !seat;

  /*
   * Nếu URL chứa ghế không tồn tại thì quay về tất cả vé.
   */
  const invalidSeat = Boolean(seat && !selectedTicket);

  const visibleTickets =
    isAllTickets || invalidSeat
      ? booking.tickets
      : selectedTicket
        ? [selectedTicket]
        : booking.tickets;

  /* ==========================================================
     LINK CHỌN GHẾ
     ========================================================== */

  const allTicketsUrl = `/ve/${booking.id}`;

  /* ==========================================================
     HÀM TẠO URL CHỌN VÉ
     ========================================================== */

  const getTicketUrl = (seatCode: string) =>
    `/ve/${booking.id}?seat=${encodeURIComponent(seatCode)}`;

  /* ==========================================================
     THÔNG TIN CHUNG
     ========================================================== */

  const totalTickets = booking.tickets.length;

  const selectedLabel =
    isAllTickets || invalidSeat
      ? `Tất cả (${totalTickets} vé)`
      : `Ghế ${selectedTicket?.seatCode}`;

  /* ==========================================================
     RENDER
     ========================================================== */

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-10 text-white sm:px-6 lg:px-8 print:bg-white print:px-0 print:py-0">
      <div className="mx-auto max-w-5xl">
        {/* ====================================================
            HEADER ACTION
            ==================================================== */}

        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 print:hidden">
          <Link
            href={isAdmin ? '/admin/bookings' : '/don-hang'}
            className="inline-flex items-center rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-300 transition hover:bg-white/10 hover:text-white"
          >
            ← Quay lại
          </Link>

          <div className="flex flex-wrap items-center gap-2">
            {isAdmin && <PrintTicketButton />}
          </div>
        </div>

        {/* ====================================================
            HEADER TRANG
            ==================================================== */}

        <section className="mb-6 rounded-[28px] border border-white/10 bg-slate-900 p-6 shadow-xl print:hidden sm:p-8">
          <div className="flex flex-wrap items-start justify-between gap-5">
            <div>
              <p className="text-sm uppercase tracking-[0.3em] text-sky-300">
                Vé điện tử
              </p>

              <h1 className="mt-2 text-3xl font-bold">
                {booking.showtime.movie.title}
              </h1>

              <p className="mt-2 text-sm text-slate-400">
                Mã đơn: {booking.bookingCode}
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

          {/* ==================================================
              CHỌN VÉ
              ================================================== */}

          <div className="mt-6">
            <p className="mb-3 text-sm font-semibold text-slate-300">
              Chọn vé để xem
            </p>

            <div className="flex flex-wrap gap-2">
              {/* TẤT CẢ */}

              <Link
                href={allTicketsUrl}
                className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
                  isAllTickets || invalidSeat
                    ? 'bg-sky-500 text-white shadow-lg shadow-sky-500/20'
                    : 'border border-white/10 bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white'
                }`}
              >
                Tất cả ({totalTickets})
              </Link>

              {/* TỪNG GHẾ */}

              {booking.tickets.map((ticket) => {
                const isSelected =
                  !isAllTickets &&
                  !invalidSeat &&
                  selectedTicket?.id === ticket.id;

                return (
                  <Link
                    key={ticket.id}
                    href={getTicketUrl(ticket.seatCode)}
                    className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
                      isSelected
                        ? 'bg-sky-500 text-white shadow-lg shadow-sky-500/20'
                        : 'border border-white/10 bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    Ghế {ticket.seatCode}
                  </Link>
                );
              })}
            </div>
          </div>
        </section>

        {/* ====================================================
            VÉ ĐIỆN TỬ
            ==================================================== */}

        <div
          id="electronic-ticket"
          className={
            visibleTickets.length > 1
              ? 'space-y-8'
              : ''
          }
        >
          {visibleTickets.map((ticket, index) => {
            /* ================================================
               QR RIÊNG CHO TỪNG VÉ
               ================================================ */

            const ticketQrValue =
              ticket.qrCode ??
              `${booking.bookingCode}-${ticket.id}-${ticket.seatCode}`;

            return (
              <section
                key={ticket.id}
                className="ticket-item overflow-hidden rounded-[32px] border border-white/10 bg-slate-900 shadow-2xl print:rounded-none print:border print:border-slate-300 print:bg-white print:text-black print:shadow-none"
              >
                {/* ============================================
                    HEADER VÉ
                    ============================================ */}

                <div className="border-b border-white/10 bg-gradient-to-r from-sky-500/20 via-slate-900 to-purple-500/20 p-6 sm:p-8 print:border-slate-300 print:bg-white">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <p className="text-sm uppercase tracking-[0.35em] text-sky-300 print:text-slate-500">
                        Vé điện tử
                      </p>

                      <h2 className="mt-2 text-3xl font-bold text-white print:text-black sm:text-4xl">
                        {booking.showtime.movie.title}
                      </h2>

                      <p className="mt-2 text-sm text-slate-400 print:text-slate-600">
                        Mã đơn: {booking.bookingCode}
                      </p>

                      <p className="mt-1 text-sm font-semibold text-sky-300 print:text-black">
                        Vé {index + 1}/{totalTickets}
                      </p>
                    </div>

                    {/* ========================================
                        TRẠNG THÁI
                        ======================================== */}

                    <div className="text-right">
                      <div
                        className={`inline-flex rounded-full px-4 py-2 text-sm font-semibold ${getBookingStatusClass(
                          booking.status
                        )} print:border print:border-slate-300 print:bg-white print:text-black`}
                      >
                        {getBookingStatusLabel(
                          booking.status
                        )}
                      </div>

                      <div
                        className={`mt-2 inline-flex rounded-full px-4 py-2 text-sm font-semibold ${getPaymentStatusClass(
                          booking.paymentStatus
                        )} print:border print:border-slate-300 print:bg-white print:text-black`}
                      >
                        {getPaymentStatusLabel(
                          booking.paymentStatus
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* ============================================
                    NỘI DUNG
                    ============================================ */}

                <div className="grid gap-8 p-6 sm:p-8 lg:grid-cols-[1fr_220px] print:grid-cols-[1fr_220px]">
                  {/* ==========================================
                      THÔNG TIN VÉ
                      ========================================== */}

                  <div className="space-y-6">
                    {/* RẠP */}

                    <div>
                      <p className="text-xs uppercase tracking-wider text-slate-500">
                        Rạp chiếu
                      </p>

                      <p className="mt-1 text-lg font-semibold text-white print:text-black">
                        {booking.showtime.hall.cinema.name}
                      </p>

                      <p className="mt-1 text-sm text-slate-400 print:text-slate-600">
                        {booking.showtime.hall.cinema.address}
                      </p>
                    </div>

                    {/* PHÒNG */}

                    <div>
                      <p className="text-xs uppercase tracking-wider text-slate-500">
                        Phòng chiếu
                      </p>

                      <p className="mt-1 text-lg font-semibold text-white print:text-black">
                        {booking.showtime.hall.name}
                      </p>
                    </div>

                    {/* NGÀY + GIỜ */}

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
                              minute: '2-digit',
                            }
                          )}
                        </p>
                      </div>
                    </div>

                    {/* PHIM */}

                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <p className="text-xs uppercase tracking-wider text-slate-500">
                          Định dạng
                        </p>

                        <p className="mt-1 font-semibold text-white print:text-black">
                          {booking.showtime.format}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs uppercase tracking-wider text-slate-500">
                          Ngôn ngữ
                        </p>

                        <p className="mt-1 font-semibold text-white print:text-black">
                          {booking.showtime.language}
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
                        <span className="inline-flex rounded-xl bg-sky-500/10 px-5 py-3 text-xl font-bold text-sky-300 print:border print:border-slate-300 print:bg-white print:text-black">
                          {ticket.seatCode}
                        </span>
                      </div>
                    </div>

                    {/* GIÁ VÉ */}

                    <div>
                      <p className="text-xs uppercase tracking-wider text-slate-500">
                        Giá vé
                      </p>

                      <p className="mt-1 text-xl font-bold text-white print:text-black">
                        {formatPrice(ticket.price)}
                      </p>
                    </div>

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
                  </div>

                  {/* ==========================================
                      QR RIÊNG CHO GHẾ
                      ========================================== */}

                  <div className="flex flex-col items-center justify-start">
                    <div className="rounded-[28px] border border-white/10 bg-white/5 p-4 print:border-slate-300 print:bg-white">
                      <BookingQR value={ticketQrValue} />
                    </div>

                    <p className="mt-3 text-center text-xs text-slate-500 print:text-slate-600">
                      Mã QR của ghế {ticket.seatCode}
                    </p>

                    <p className="mt-2 text-center font-mono text-xs text-slate-500 print:text-slate-600">
                      {ticket.id}
                    </p>
                  </div>
                </div>

                {/* ============================================
                    THÔNG TIN MÃ VÉ
                    ============================================ */}

                <div className="border-t border-white/10 bg-white/[0.03] p-6 sm:p-8 print:border-slate-300 print:bg-white">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <p className="text-xs uppercase tracking-wider text-slate-500">
                        Mã vé
                      </p>

                      <p className="mt-2 break-all font-mono text-sm font-semibold text-white print:text-black">
                        {ticket.id}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs uppercase tracking-wider text-slate-500">
                        Mã đặt vé
                      </p>

                      <p className="mt-2 font-mono text-sm font-semibold text-white print:text-black">
                        {booking.bookingCode}
                      </p>
                    </div>
                  </div>
                </div>

                {/* ============================================
                    FOOTER
                    ============================================ */}

                <div className="border-t border-white/10 p-6 text-center text-xs text-slate-500 print:border-slate-300 print:text-slate-600">
                  Vui lòng xuất trình vé điện tử hoặc mã QR khi
                  vào phòng chiếu.
                </div>
              </section>
            );
          })}
        </div>

        {/* ====================================================
            TỔNG KẾT ĐƠN HÀNG
            Không cần hiện khi chỉ xem một vé
            ==================================================== */}

        {isAllTickets && (
          <section className="mt-8 rounded-[28px] border border-white/10 bg-slate-900 p-6 shadow-xl print:hidden sm:p-8">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-sm text-slate-500">
                  Tổng số vé
                </p>

                <p className="mt-1 text-2xl font-bold">
                  {totalTickets} vé
                </p>
              </div>

              <div className="text-right">
                <p className="text-sm text-slate-500">
                  Tổng tiền đơn hàng
                </p>

                <p className="mt-1 text-2xl font-bold text-sky-300">
                  {formatPrice(booking.totalPrice)}
                </p>
              </div>
            </div>
          </section>
        )}
      </div>

      {/* ======================================================
          PRINT CSS
          ====================================================== */}

      <style>{`
        @media print {
          @page {
            size: A4;
            margin: 12mm;
          }

          html,
          body {
            background: white !important;
            color: black !important;
          }

          body {
            min-height: auto !important;
          }

          #electronic-ticket {
            width: 100% !important;
            max-width: none !important;
            margin: 0 !important;
          }

          .ticket-item {
            width: 100% !important;
            max-width: none !important;
            margin: 0 0 10mm 0 !important;
            border-radius: 0 !important;
            box-shadow: none !important;
            break-inside: avoid;
            page-break-inside: avoid;
          }

          .ticket-item + .ticket-item {
            break-before: page;
            page-break-before: always;
          }

          /*
           * Khi chọn một vé:
           * chỉ có một .ticket-item nên không tạo trang trắng.
           */

          a {
            text-decoration: none !important;
          }
        }
      `}</style>
    </main>
  );
}