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
        `/thanh-toan/${id}`
      )}`
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

  // Không cho user xem đơn của người khác
  if (booking.userId !== session.user.id) {
    return (
      <main className="min-h-screen bg-slate-950 px-6 py-20 text-center">
        <h1 className="text-2xl font-bold text-white">
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

  const qrData = JSON.stringify({
    bookingCode: booking.bookingCode,
    paymentMethod: booking.paymentMethod,
    amount: booking.totalPrice,
    movie: booking.showtime.movie.title,
    seats: booking.tickets.map(
      (ticket) => ticket.seatCode
    ),
  });

  const qrUrl =
    `https://api.qrserver.com/v1/create-qr-code/` +
    `?size=300x300&data=${encodeURIComponent(qrData)}`;

  const isPaid =
    booking.paymentStatus === 'PAID';

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-12 text-white">
      <div className="mx-auto max-w-4xl">

        {/* HEADER */}
        <div className="text-center">
          <p className="text-sm uppercase tracking-[0.35em] text-sky-300/80">
            Thanh toán
          </p>

          <h1 className="mt-2 text-4xl font-bold">
            Quét mã QR để thanh toán
          </h1>

          <p className="mt-3 text-slate-400">
            Phương thức: {booking.paymentMethod}
          </p>
        </div>

        <div className="mt-10 grid gap-6 lg:grid-cols-[1fr_380px]">

          {/* QR */}
          <section className="rounded-[28px] border border-white/10 bg-slate-950/70 p-8 text-center shadow-glow backdrop-blur-xl">

            <h2 className="text-xl font-semibold">
              Mã QR thanh toán
            </h2>

            <p className="mt-2 text-sm text-slate-400">
              Đây là QR demo cho hệ thống đặt vé.
            </p>

            <div className="mx-auto mt-6 flex w-fit rounded-3xl bg-white p-5">
              <img
                src={qrUrl}
                alt="QR thanh toán"
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

            <PaymentConfirmButton
              bookingId={booking.id}
              isPaid={isPaid}
            />
          </section>

          {/* THÔNG TIN */}
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
                    booking.showtime.startTime
                  ).toLocaleString('vi-VN')}
                </p>
              </div>

              <div>
                <p className="text-sm text-slate-500">
                  Ghế
                </p>

                <p className="mt-1 font-semibold">
                  {booking.tickets
                    .map(
                      (ticket) =>
                        ticket.seatCode
                    )
                    .join(', ')}
                </p>
              </div>

              <div className="border-t border-white/10 pt-4">
                <p className="text-sm text-slate-500">
                  Tổng tiền
                </p>

                <p className="mt-1 text-2xl font-bold text-sky-300">
                  {booking.totalPrice.toLocaleString(
                    'vi-VN'
                  )}{' '}
                  đ
                </p>
              </div>

              <div className="border-t border-white/10 pt-4">
                <p className="text-sm text-slate-500">
                  Trạng thái
                </p>

                <p
                  className={
                    isPaid
                      ? 'mt-1 font-semibold text-emerald-400'
                      : 'mt-1 font-semibold text-yellow-400'
                  }
                >
                  {isPaid
                    ? 'Đã thanh toán'
                    : 'Chờ thanh toán'}
                </p>
              </div>

            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}