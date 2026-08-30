import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { getServerSession } from 'next-auth/next';

import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db/prisma';

type PaymentPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function PaymentPage({
  params,
}: PaymentPageProps) {
  const { id } = await params;

  const session =
    await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect(
      `/dang-nhap?callbackUrl=${encodeURIComponent(
        `/thanh-toan/${id}`,
      )}`,
    );
  }

  const booking =
    await prisma.booking.findUnique({
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

  if (
    booking.userId !==
    session.user.id
  ) {
    return (
      <main className="min-h-screen bg-slate-950 px-6 py-20 text-center text-white">
        <h1 className="text-2xl font-bold">
          Không có quyền truy cập
        </h1>

        <p className="mt-2 text-slate-400">
          Đơn vé này không thuộc tài khoản
          của bạn.
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

  /*
   * ============================================================
   * TRẠNG THÁI
   * ============================================================
   */

  const isPaid =
    booking.paymentStatus ===
    'PAID';

  const isConfirmed =
    booking.status ===
    'CONFIRMED';

  const isCanceled =
    booking.status ===
    'CANCELED';

  const isPending =
    booking.status ===
      'PENDING' &&
    booking.paymentStatus !==
      'PAID';

  /*
   * ============================================================
   * Nếu đã thanh toán thành công
   * ============================================================
   */

  if (
    isPaid &&
    isConfirmed
  ) {
    return (
      <main className="min-h-screen bg-slate-950 px-6 py-12 text-white">
        <div className="mx-auto max-w-2xl">
          <section className="rounded-[28px] border border-emerald-400/20 bg-slate-950/70 p-8 text-center shadow-glow backdrop-blur-xl">
            <div className="text-6xl">
              ✅
            </div>

            <h1 className="mt-5 text-3xl font-bold text-white">
              Thanh toán thành công
            </h1>

            <p className="mt-3 text-slate-400">
              Đơn vé của bạn đã được xác
              nhận.
            </p>

            <div className="mx-auto mt-6 max-w-md rounded-2xl border border-white/10 bg-white/5 p-5">
              <p className="text-sm text-slate-500">
                Mã booking
              </p>

              <p className="mt-1 text-xl font-bold text-white">
                {
                  booking.bookingCode
                }
              </p>

              <p className="mt-4 text-sm text-slate-500">
                Tổng tiền
              </p>

              <p className="mt-1 text-2xl font-bold text-emerald-300">
                {booking.totalPrice.toLocaleString(
                  'vi-VN',
                )}{' '}
                đ
              </p>
            </div>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
              <Link
                href={`/ve/${booking.id}`}
                className="inline-flex items-center justify-center rounded-2xl bg-emerald-400 px-5 py-3 font-semibold text-slate-950 transition hover:bg-emerald-300"
              >
                Xem vé
              </Link>

              <Link
                href="/don-hang"
                className="inline-flex items-center justify-center rounded-2xl border border-white/10 bg-white/5 px-5 py-3 font-semibold text-white transition hover:bg-white/10"
              >
                Xem đơn hàng
              </Link>
            </div>
          </section>
        </div>
      </main>
    );
  }

  /*
   * ============================================================
   * BOOKING CANCELED
   * ============================================================
   */

  if (isCanceled) {
    return (
      <main className="min-h-screen bg-slate-950 px-6 py-12 text-white">
        <div className="mx-auto max-w-2xl">
          <section className="rounded-[28px] border border-rose-400/20 bg-slate-950/70 p-8 text-center shadow-glow backdrop-blur-xl">
            <div className="text-6xl">
              ❌
            </div>

            <h1 className="mt-5 text-3xl font-bold">
              Đơn đã bị hủy
            </h1>

            <p className="mt-3 text-slate-400">
              Đơn đặt vé này không còn hiệu
              lực để thanh toán.
            </p>

            <Link
              href="/dat-ve"
              className="mt-6 inline-flex rounded-2xl bg-white px-5 py-3 font-semibold text-slate-950"
            >
              Quay lại đặt vé
            </Link>
          </section>
        </div>
      </main>
    );
  }

  /*
   * ============================================================
   * PENDING
   * ============================================================
   */

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-12 text-white">
      <div className="mx-auto max-w-4xl">
        <div className="text-center">
          <p className="text-sm uppercase tracking-[0.35em] text-sky-300/80">
            Thanh toán
          </p>

          <h1 className="mt-2 text-4xl font-bold">
            Thanh toán qua SePay
          </h1>

          <p className="mt-3 text-slate-400">
            Đơn của bạn đang chờ thanh toán
            trên SePay Sandbox.
          </p>
        </div>

        <div className="mx-auto mt-8 max-w-2xl rounded-2xl border border-sky-400/20 bg-sky-500/5 px-5 py-4 text-sm text-sky-200">
          <div className="font-semibold">
            🧪 SePay Sandbox
          </div>

          <p className="mt-1 text-slate-400">
            Đây là môi trường kiểm thử.
            Không sử dụng tài khoản ngân
            hàng thật và không trừ tiền
            thật.
          </p>
        </div>

        <div className="mt-10 grid gap-6 lg:grid-cols-[1fr_380px]">
          {/* ==================================================
              PAYMENT
          =================================================== */}

          <section className="rounded-[28px] border border-white/10 bg-slate-950/70 p-8 shadow-glow backdrop-blur-xl">
            <div className="flex flex-col items-center text-center">
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-amber-400/10 text-4xl">
                ⏳
              </div>

              <h2 className="mt-5 text-2xl font-semibold">
                Đang chờ thanh toán
              </h2>

              <p className="mt-3 max-w-md text-sm leading-6 text-slate-400">
                Hãy tiếp tục tới cổng SePay
                Sandbox để thực hiện giao dịch
                kiểm thử.
              </p>

              <div className="mt-6 w-full rounded-2xl border border-white/10 bg-white/5 p-5 text-left">
                <div className="flex items-center justify-between gap-4">
                  <span className="text-sm text-slate-400">
                    Mã đơn
                  </span>

                  <span className="font-semibold text-white">
                    {
                      booking.bookingCode
                    }
                  </span>
                </div>

                <div className="mt-4 flex items-center justify-between gap-4 border-t border-white/10 pt-4">
                  <span className="text-sm text-slate-400">
                    Trạng thái
                  </span>

                  <span className="font-semibold text-amber-400">
                    Chờ thanh toán
                  </span>
                </div>
              </div>

              <Link
                href={`/api/payments/sepay/checkout/${encodeURIComponent(
                  booking.id,
                )}`}
                className="mt-6 inline-flex w-full max-w-md items-center justify-center rounded-2xl bg-sky-400 px-5 py-4 font-semibold text-slate-950 transition hover:bg-sky-300"
              >
                Mở SePay Sandbox
              </Link>

              <p className="mt-4 max-w-md text-xs leading-5 text-slate-500">
                Sau khi thanh toán trên SePay
                Sandbox, hệ thống sẽ nhận IPN
                và tự động cập nhật đơn thành
                CONFIRMED.
              </p>
            </div>
          </section>

          {/* ==================================================
              BOOKING INFO
          =================================================== */}

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
                  {
                    booking.showtime
                      .movie
                      .title
                  }
                </p>
              </div>

              <div>
                <p className="text-sm text-slate-500">
                  Rạp
                </p>

                <p className="mt-1">
                  {
                    booking.showtime
                      .hall
                      .cinema
                      .name
                  }
                </p>
              </div>

              <div>
                <p className="text-sm text-slate-500">
                  Phòng
                </p>

                <p className="mt-1">
                  {
                    booking.showtime
                      .hall
                      .name
                  }
                </p>
              </div>

              <div>
                <p className="text-sm text-slate-500">
                  Suất chiếu
                </p>

                <p className="mt-1">
                  {new Date(
                    booking.showtime
                      .startTime,
                  ).toLocaleString(
                    'vi-VN',
                  )}
                </p>
              </div>

              <div>
                <p className="text-sm text-slate-500">
                  Ghế
                </p>

                <p className="mt-1 font-semibold">
                  {booking.tickets.length >
                  0
                    ? booking.tickets
                        .map(
                          (
                            ticket,
                          ) =>
                            ticket.seatCode,
                        )
                        .join(
                          ', ',
                        )
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
                    isPending
                      ? 'mt-1 font-semibold text-amber-400'
                      : 'mt-1 font-semibold text-slate-300'
                  }
                >
                  {isPending
                    ? 'Chờ thanh toán'
                    : booking.status}
                </p>
              </div>

              <div className="border-t border-white/10 pt-4">
                <p className="text-sm text-slate-500">
                  Thanh toán
                </p>

                <p className="mt-1 font-semibold text-amber-400">
                  {booking.payment?.status ===
                  'PENDING'
                    ? 'Chưa thanh toán'
                    : booking.payment
                        ?.status ??
                      'Chưa có giao dịch'}
                </p>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}