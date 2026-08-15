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
   PAGE
   ============================================================ */

export default async function ElectronicTicketPage({
  params,
}: TicketPageProps) {
  /* ==========================================================
     LẤY ID
     ========================================================== */

  const { id } = await params;

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

      tickets: true,

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
     - Chỉ xem được đơn của chính mình.

     ADMIN:
     - Có thể xem tất cả đơn.
     ========================================================== */

  const isAdmin = session.user.role === 'ADMIN';

  if (!isAdmin && booking.userId !== session.user.id) {
    redirect('/don-hang');
  }

  /* ==========================================================
     NGÀY GIỜ SUẤT CHIẾU
     ========================================================== */

  const showtimeDate = new Date(
    booking.showtime.startTime
  );

  /* ==========================================================
     QR CODE
     ========================================================== */

  const qrValue =
    booking.tickets[0]?.qrCode ??
    `${booking.bookingCode}-${booking.tickets
      .map((ticket) => ticket.seatCode)
      .join('-')}`;

  /* ==========================================================
     RENDER
     ========================================================== */

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-10 text-white sm:px-6 lg:px-8 print:bg-white print:px-0 print:py-0">
      <div className="mx-auto max-w-4xl">
        {/* ====================================================
            NÚT QUAY LẠI + IN VÉ
            ==================================================== */}

        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 print:hidden">
          <Link
            href={isAdmin ? '/admin/bookings' : '/don-hang'}
            className="inline-flex items-center rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-300 transition hover:bg-white/10 hover:text-white"
          >
            ← Quay lại
          </Link>

          {/* ==================================================
              CHỈ ADMIN MỚI ĐƯỢC IN VÉ
              ================================================== */}

          {isAdmin && <PrintTicketButton />}
        </div>

        {/* ====================================================
            VÉ ĐIỆN TỬ
            ==================================================== */}

        <section
          id="electronic-ticket"
          className="overflow-hidden rounded-[32px] border border-white/10 bg-slate-900 shadow-2xl print:rounded-none print:border print:border-slate-300 print:bg-white print:text-black print:shadow-none"
        >
          {/* ==================================================
              HEADER VÉ
              ================================================== */}

          <div className="border-b border-white/10 bg-gradient-to-r from-sky-500/20 via-slate-900 to-purple-500/20 p-6 sm:p-8 print:border-slate-300 print:bg-white">
            <div className="flex flex-wrap items-start justify-between gap-4">
              {/* Thông tin phim */}

              <div>
                <p className="text-sm uppercase tracking-[0.35em] text-sky-300 print:text-slate-500">
                  Vé điện tử
                </p>

                <h1 className="mt-2 text-3xl font-bold text-white print:text-black sm:text-4xl">
                  {booking.showtime.movie.title}
                </h1>

                <p className="mt-2 text-sm text-slate-400 print:text-slate-600">
                  Mã đơn: {booking.bookingCode}
                </p>
              </div>

              {/* Trạng thái */}

              <div className="text-right">
                {/* Trạng thái đơn */}

                <div
                  className={`inline-flex rounded-full px-4 py-2 text-sm font-semibold ${getBookingStatusClass(
                    booking.status
                  )} print:border print:border-slate-300 print:bg-white print:text-black`}
                >
                  {getBookingStatusLabel(booking.status)}
                </div>

                {/* Trạng thái thanh toán */}

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

          {/* ==================================================
              NỘI DUNG VÉ
              ================================================== */}

          <div className="grid gap-8 p-6 sm:p-8 lg:grid-cols-[1fr_220px] print:grid-cols-[1fr_220px]">
            {/* =================================================
                THÔNG TIN
                ================================================= */}

            <div className="space-y-6">
              {/* Rạp */}

              <div>
                <p className="text-xs uppercase tracking-wider text-slate-500">
                  Rạp chiếu
                </p>

                <p className="mt-1 text-lg font-semibold text-white print:text-black">
                  {booking.showtime.hall.cinema.name}
                </p>
              </div>

              {/* Phòng */}

              <div>
                <p className="text-xs uppercase tracking-wider text-slate-500">
                  Phòng chiếu
                </p>

                <p className="mt-1 text-lg font-semibold text-white print:text-black">
                  {booking.showtime.hall.name}
                </p>
              </div>

              {/* Ngày + giờ */}

              <div className="grid gap-4 sm:grid-cols-2">
                {/* Ngày */}

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

                {/* Giờ */}

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

              {/* Khách hàng */}

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

              {/* Ghế */}

              <div>
                <p className="text-xs uppercase tracking-wider text-slate-500">
                  Ghế
                </p>

                <div className="mt-2 flex flex-wrap gap-2">
                  {booking.tickets.map((ticket) => (
                    <span
                      key={ticket.id}
                      className="rounded-xl bg-sky-500/10 px-4 py-2 font-semibold text-sky-300 print:border print:border-slate-300 print:bg-white print:text-black"
                    >
                      {ticket.seatCode}
                    </span>
                  ))}
                </div>
              </div>

              {/* Tổng tiền */}

              <div className="border-t border-white/10 pt-5 print:border-slate-300">
                <div className="flex items-center justify-between gap-4">
                  <span className="text-slate-400 print:text-slate-600">
                    Tổng tiền
                  </span>

                  <span className="text-2xl font-bold text-white print:text-black">
                    {booking.totalPrice.toLocaleString(
                      'vi-VN'
                    )}{' '}
                    đ
                  </span>
                </div>
              </div>
            </div>

            {/* =================================================
                QR CODE
                ================================================= */}

            <div className="flex flex-col items-center justify-start">
              <div className="rounded-[28px] border border-white/10 bg-white/5 p-4 print:border-slate-300 print:bg-white">
                <BookingQR value={qrValue} />
              </div>

              <p className="mt-3 text-center text-xs text-slate-500 print:text-slate-600">
                Quét mã QR để xác thực vé
              </p>
            </div>
          </div>

          {/* ==================================================
              DANH SÁCH MÃ VÉ
              ================================================== */}

          <div className="border-t border-white/10 bg-white/[0.03] p-6 sm:p-8 print:border-slate-300 print:bg-white">
            <p className="text-xs uppercase tracking-wider text-slate-500">
              Mã vé
            </p>

            <div className="mt-3 space-y-2">
              {booking.tickets.map((ticket) => (
                <div
                  key={ticket.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 bg-slate-950/50 px-4 py-3 print:border-slate-300 print:bg-white"
                >
                  <span className="font-semibold text-white print:text-black">
                    Ghế {ticket.seatCode}
                  </span>

                  <span className="font-mono text-xs text-slate-400 print:text-slate-600">
                    {ticket.id}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* ==================================================
              FOOTER CỦA VÉ
              ================================================== */}

          <div className="border-t border-white/10 p-6 text-center text-xs text-slate-500 print:border-slate-300 print:text-slate-600">
            Vui lòng xuất trình vé điện tử hoặc mã QR khi vào phòng
            chiếu.
          </div>
        </section>
      </div>

      {/* ======================================================
          PRINT CSS

          Lưu ý:
          - Không in SiteHeader
          - Không in SiteFooter
          - Không in nút Quay lại
          - Không in nút In vé
          - Chỉ in #electronic-ticket
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
            border-radius: 0 !important;
            box-shadow: none !important;
          }
        }
      `}</style>
    </main>
  );
}