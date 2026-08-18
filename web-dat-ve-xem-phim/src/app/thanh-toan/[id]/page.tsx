import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { getServerSession } from 'next-auth/next';

import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { PaymentConfirmButton } from '@/components/payment-confirm-button';

type PaymentPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function PaymentPage({
  params,
}: PaymentPageProps) {
  const { id } = await params;

  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect(
      `/dang-nhap?callbackUrl=${encodeURIComponent(
        `/thanh-toan/${id}`,
      )}`,
    );
  }

  const booking = await prisma.booking.findUnique({
    where: {
      id,
    },
    include: {
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

  if (!booking) {
    notFound();
  }

  if (booking.userId !== session.user.id) {
    return (
      <main className="min-h-screen bg-slate-950 px-6 py-20 text-center text-white">
        <h1 className="text-2xl font-bold">
          Không có quyền truy cập
        </h1>

        <p className="mt-2 text-slate-400">
          Đơn vé này không thuộc tài khoản của bạn.
        </p>

        <Link
          href="/don-hang"
          className="mt-6 inline-flex rounded-full bg-white px-5 py-3 font-semibold text-slate-950"
        >
          Về đơn vé
        </Link>
      </main>
    );
  }

  const isPaid = booking.paymentStatus === 'PAID';

  const paymentPending =
    booking.payment?.status === 'PENDING';

  const qrData = JSON.stringify({
    bookingCode: booking.bookingCode,
    paymentMethod: booking.paymentMethod,
    amount: booking.totalPrice,
    movie: booking.showtime.movie.title,
    seats: booking.tickets.map(
      (ticket) => ticket.seatCode,
    ),
  });

  const qrUrl =
    `https://api.qrserver.com/v1/create-qr-code/` +
    `?size=300x300&data=${encodeURIComponent(qrData)}`;

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-12 text-white">
      <div className="mx-auto max-w-4xl">
        <div className="text-center">
          <p className="text-sm uppercase tracking-[0.35em] text-sky-300/80">
            Thanh toán
          </p>

          <h1 className="mt-2 text-4xl font-bold">
            Thanh toán mô phỏng
          </h1>

          <p className="mt-3 text-slate-400">
            Phương thức:{' '}
            <span className="font-semibold text-white">
              {booking.paymentMethod}
            </span>
          </p>

          <div className="mx-auto mt-5 max-w-2xl rounded-2xl border border-amber-400/20 bg-amber-500/5 px-5 py-4 text-sm text-amber-200">
            Đây là giao dịch mô phỏng phục vụ kiểm thử
            hệ thống đặt vé. VNPay, MoMo và ZaloPay chưa
            được kết nối với cổng thanh toán thực tế.
          </div>
        </div>

        <div className="mt-10 grid gap-6 lg:grid-cols-[1fr_380px]">
          <section className="rounded-[28px] border border-white/10 bg-slate-950/70 p-8 text-center shadow-glow backdrop-blur-xl">
            <h2 className="text-xl font-semibold">
              Mã QR Demo
            </h2>

            <p className="mt-2 text-sm text-slate-400">
              QR này chỉ chứa thông tin đơn đặt vé, không
              thực hiện giao dịch ngân hàng.
            </p>

            <div className="mx-auto mt-6 flex w-fit rounded-3xl bg-white p-5">
              <img
                src={qrUrl}
                alt="QR Demo thanh toán"
                width={300}
                height={300}
                className="h-[300px] w-[300px]"
              />
            </div>

            <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-sm text-slate-400">
                Mã đơn
              </p>

              <p className="mt-1 text-lg font-bold text-white">
                {booking.bookingCode}
              </p>
            </div>

            <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="flex items-center justify-between gap-4">
                <span className="text-sm text-slate-400">
                  Trạng thái giao dịch
                </span>

                <span
                  className={
                    isPaid
                      ? 'font-semibold text-emerald-400'
                      : paymentPending
                        ? 'font-semibold text-amber-400'
                        : 'font-semibold text-rose-400'
                  }
                >
                  {isPaid
                    ? 'Đã thanh toán'
                    : paymentPending
                      ? 'Chờ thanh toán'
                      : 'Không hợp lệ'}
                </span>
              </div>
            </div>

            <PaymentConfirmButton
              bookingId={booking.id}
              isPaid={isPaid}
            />
          </section>

          <aside className="h-fit rounded-[28px] border border-white/10 bg-slate-950/70 p-6 shadow-glow">
            <h2 className="text-xl font-semibold">
              Thông tin đặt vé
            </h2>

            <div className="mt-6 space-y-4">
              <div>
                <p className="text-sm text-slate-500">
                  Phim
                </p>

                <p className="mt-1 font-semibold">
                  {booking.showtime.movie.title}
                </p>
              </div>

              <div>
                <p className="text-sm text-slate-500">
                  Rạp
                </p>

                <p className="mt-1">
                  {booking.showtime.hall.cinema.name}
                </p>
              </div>

              <div>
                <p className="text-sm text-slate-500">
                  Phòng
                </p>

                <p className="mt-1">
                  {booking.showtime.hall.name}
                </p>
              </div>

              <div>
                <p className="text-sm text-slate-500">
                  Suất chiếu
                </p>

                <p className="mt-1">
                  {new Date(
                    booking.showtime.startTime,
                  ).toLocaleString('vi-VN')}
                </p>
              </div>

              <div>
                <p className="text-sm text-slate-500">
                  Ghế
                </p>

                <p className="mt-1 font-semibold">
                  {booking.tickets.length > 0
                    ? booking.tickets
                        .map(
                          (ticket) =>
                            ticket.seatCode,
                        )
                        .join(', ')
                    : 'Đang giữ ghế'}
                </p>
              </div>

              <div className="border-t border-white/10 pt-4">
                <p className="text-sm text-slate-500">
                  Tổng tiền
                </p>

                <p className="mt-1 text-2xl font-bold text-sky-300">
                  {booking.totalPrice.toLocaleString(
                    'vi-VN',
                  )}{' '}
                  đ
                </p>
              </div>

              <div className="border-t border-white/10 pt-4">
                <p className="text-sm text-slate-500">
                  Trạng thái đơn
                </p>

                <p
                  className={
                    booking.status === 'CONFIRMED'
                      ? 'mt-1 font-semibold text-emerald-400'
                      : booking.status === 'CANCELED'
                        ? 'mt-1 font-semibold text-rose-400'
                        : 'mt-1 font-semibold text-amber-400'
                  }
                >
                  {booking.status === 'CONFIRMED'
                    ? 'Đã xác nhận'
                    : booking.status === 'CANCELED'
                      ? 'Đã hủy'
                      : 'Chờ thanh toán'}
                </p>
              </div>

              <div className="border-t border-white/10 pt-4">
                <p className="text-sm text-slate-500">
                  Thanh toán
                </p>

                <p
                  className={
                    isPaid
                      ? 'mt-1 font-semibold text-emerald-400'
                      : 'mt-1 font-semibold text-amber-400'
                  }
                >
                  {isPaid
                    ? 'Đã thanh toán'
                    : 'Chưa thanh toán'}
                </p>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}