import Link from 'next/link';

import { getServerSession } from 'next-auth/next';

import {
  BookingStatus,
} from '@prisma/client';

import {
  prisma,
} from '@/lib/prisma';

import {
  ensureMoviesSeeded,
} from '@/lib/seed-movies';

import {
  formatSeatType,
} from '@/lib/seat-pricing';

import {
  authOptions,
} from '@/lib/auth';

type CartPageProps = {
  searchParams: Promise<{
    movie?: string;

    showtime?: string;

    seats?: string;
  }>;
};

export default async function CartPage({
  searchParams,
}: CartPageProps) {
  const params =
    await searchParams;

  await ensureMoviesSeeded();

  /*
   * ============================================================
   * LOGIN
   * ============================================================
   */

  const session =
    await getServerSession(
      authOptions,
    );

  const userId =
    session?.user?.id ??
    null;

  /*
   * ============================================================
   * SHOWTIME
   * ============================================================
   */

  const showtimeId =
    params.showtime?.trim();

  if (!showtimeId) {
    return (
      <main className="page-shell py-12 lg:py-16">
        <div className="rounded-[28px] border border-white/10 bg-slate-950/70 p-8 text-center shadow-glow">
          <h1 className="text-2xl font-bold text-white">
            Không tìm thấy suất chiếu
          </h1>

          <p className="mt-3 text-slate-400">
            Vui lòng quay lại chọn suất
            chiếu.
          </p>

          <Link
            href="/suat-chieu"
            className="mt-6 inline-flex rounded-2xl bg-white px-5 py-3 font-semibold text-slate-950"
          >
            Chọn suất chiếu
          </Link>
        </div>
      </main>
    );
  }

  const showtime =
    await prisma.showtime.findUnique({
      where: {
        id:
          showtimeId,
      },

      include: {
        movie: true,

        hall: {
          include: {
            cinema: true,

            seats: true,
          },
        },
      },
    });

  if (!showtime) {
    return (
      <main className="page-shell py-12 lg:py-16">
        <div className="rounded-[28px] border border-white/10 bg-slate-950/70 p-8 text-center shadow-glow">
          <h1 className="text-2xl font-bold text-white">
            Không tìm thấy suất chiếu
          </h1>
        </div>
      </main>
    );
  }

  /*
   * ============================================================
   * URL SEATS
   * ============================================================
   */

  const requestedSeats = [
    ...new Set(
      (params.seats ??
        '')
        .split(',')
        .map(
          (seat) =>
            seat.trim(),
        )
        .filter(
          Boolean,
        ),
    ),
  ];

  /*
   * ============================================================
   * USER
   * ============================================================
   */

  if (!userId) {
    const callbackUrl =
      `/gio-hang?showtime=${encodeURIComponent(
        showtimeId,
      )}&seats=${encodeURIComponent(
        requestedSeats.join(
          ',',
        ),
      )}`;

    return (
      <main className="page-shell py-12 lg:py-16">
        <div className="rounded-[28px] border border-white/10 bg-slate-950/70 p-8 text-center shadow-glow">
          <h1 className="text-2xl font-bold text-white">
            Bạn cần đăng nhập
          </h1>

          <p className="mt-3 text-slate-400">
            Vui lòng đăng nhập để tiếp
            tục đặt vé.
          </p>

          <Link
            href={`/dang-nhap?callbackUrl=${encodeURIComponent(
              callbackUrl,
            )}`}
            className="mt-6 inline-flex rounded-2xl bg-white px-5 py-3 font-semibold text-slate-950"
          >
            Đăng nhập
          </Link>
        </div>
      </main>
    );
  }

  const now =
    new Date();

  /*
   * ============================================================
   * XÓA HOLD HẾT HẠN
   * ============================================================
   */
  await prisma.seatHold.deleteMany({
    where: {
      showtimeId,

      expiresAt: {
        lte: now,
      },
    },
  });

  /*
   * ============================================================
   * XÓA HOLD CANCELED
   * ============================================================
   */
  await prisma.seatHold.deleteMany({
    where: {
      showtimeId,

      booking: {
        status:
          BookingStatus.CANCELED,
      },
    },
  });

  /*
   * ============================================================
   * LẤY HOLD CỦA USER
   *
   * Có thể:
   *
   * - bookingId = null
   * - bookingId = Booking PENDING
   * ============================================================
   */
  const myHolds =
    await prisma.seatHold.findMany({
      where: {
        showtimeId,

        userId,

        expiresAt: {
          gt: now,
        },

        OR: [
          {
            bookingId:
              null,
          },

          {
            booking: {
              status:
                BookingStatus.PENDING,
            },
          },
        ],
      },

      select: {
        seatId:
          true,

        expiresAt:
          true,

        bookingId:
          true,

        seat: {
          select: {
            code:
              true,

            isActive:
              true,
          },
        },
      },
    });

  /*
   * ============================================================
   * SEAT CODE USER ĐANG GIỮ
   * ============================================================
   */
  const myHeldCodes =
    myHolds
      .filter(
        (hold) =>
          hold.seat.isActive,
      )
      .map(
        (hold) =>
          hold.seat.code,
      );

  /*
   * ============================================================
   * CHỈ DÙNG NHỮNG GHẾ SERVER XÁC NHẬN
   * ============================================================
   */
  const validSelectedSeats =
    requestedSeats.filter(
      (seatCode) =>
        myHeldCodes.includes(
          seatCode,
        ),
    );

  /*
   * ============================================================
   * GHẾ KHÔNG CÒN ĐƯỢC GIỮ
   * ============================================================
   */
  const missingSeats =
    requestedSeats.filter(
      (seatCode) =>
        !myHeldCodes.includes(
          seatCode,
        ),
    );

  /*
   * ============================================================
   * CHI TIẾT GHẾ
   * ============================================================
   */
  const seatDetails =
    showtime.hall.seats
      .filter(
        (seat) =>
          validSelectedSeats.includes(
            seat.code,
          ),
      )
      .map(
        (seat) => {
          const type =
            formatSeatType(
              seat.type,
            );

          let price =
            showtime.standardPrice;

          switch (
            type
          ) {
            case 'VIP':
              price =
                showtime.vipPrice;
              break;

            case 'COUPLE':
              price =
                showtime.couplePrice;
              break;

            default:
              price =
                showtime.standardPrice;
          }

          return {
            code:
              seat.code,

            type,

            price,
          };
        },
      );

  const subtotal =
    seatDetails.reduce(
      (
        total,
        seat,
      ) =>
        total +
        seat.price,
      0,
    );

  /*
   * ============================================================
   * RENDER
   * ============================================================
   */
  return (
    <main className="page-shell py-12 lg:py-16">
      <div className="space-y-3">
        <p className="text-sm uppercase tracking-[0.35em] text-sky-300/80">
          Giỏ vé
        </p>

        <h1 className="text-4xl font-bold text-white">
          Thông tin vé đã chọn
        </h1>

        <p className="text-slate-400">
          Hệ thống đã kiểm tra lại ghế
          trước khi thanh toán.
        </p>
      </div>

      {missingSeats.length >
        0 && (
        <div className="mt-6 rounded-2xl border border-amber-400/20 bg-amber-500/5 p-4">
          <p className="text-sm font-semibold text-amber-300">
            Một số ghế không còn được
            giữ
          </p>

          <p className="mt-1 text-sm text-slate-400">
            Ghế{' '}
            {missingSeats.join(
              ', ',
            )}{' '}
            đã được loại khỏi giỏ.
          </p>
        </div>
      )}

      <div className="mt-10 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <section className="rounded-[28px] border border-white/10 bg-slate-950/70 p-6 shadow-glow backdrop-blur-xl">
          <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
            <div className="font-semibold text-white">
              {
                showtime.movie
                  .title
              }
            </div>

            <div className="mt-2 text-sm text-slate-300">
              {
                showtime
                  .hall
                  .cinema
                  .name
              }
              {' · '}
              {
                showtime
                  .hall
                  .name
              }
            </div>

            <div className="mt-2 text-sm text-slate-300">
              {new Date(
                showtime.startTime,
              ).toLocaleString(
                'vi-VN',
              )}
            </div>

            <div className="mt-6">
              <div className="text-sm font-semibold text-white">
                Ghế đã chọn
              </div>

              <div className="mt-3 space-y-2">
                {seatDetails.length >
                0 ? (
                  seatDetails.map(
                    (
                      seat,
                    ) => (
                      <div
                        key={
                          seat.code
                        }
                        className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3"
                      >
                        <div className="flex items-center gap-3">
                          <span className="font-semibold text-white">
                            {
                              seat.code
                            }
                          </span>

                          <span className="rounded-lg bg-slate-700/60 px-2 py-1 text-xs text-slate-300">
                            {
                              seat.type
                            }
                          </span>
                        </div>

                        <span className="font-semibold text-white">
                          {seat.price.toLocaleString(
                            'vi-VN',
                          )}{' '}
                          đ
                        </span>
                      </div>
                    ),
                  )
                ) : (
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-slate-300">
                    Không còn ghế nào
                    được bạn giữ.
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        <aside className="rounded-[28px] border border-white/10 bg-slate-950/70 p-6 shadow-glow backdrop-blur-xl">
          <div className="text-lg font-semibold text-white">
            Tóm tắt
          </div>

          <div className="mt-4 space-y-3 text-sm text-slate-200">
            <div className="flex items-center justify-between">
              <span>
                Số vé
              </span>

              <span>
                {
                  seatDetails.length
                }
              </span>
            </div>

            <div className="border-t border-white/10 pt-3">
              <div className="mb-3 font-semibold text-white">
                Chi tiết giá
              </div>

              <div className="space-y-2">
                {seatDetails.map(
                  (
                    seat,
                  ) => (
                    <div
                      key={
                        seat.code
                      }
                      className="flex items-center justify-between text-sm"
                    >
                      <span className="text-slate-300">
                        {
                          seat.code
                        }{' '}
                        <span className="text-slate-500">
                          (
                          {
                            seat.type
                          }
                          )
                        </span>
                      </span>

                      <span className="text-white">
                        {seat.price.toLocaleString(
                          'vi-VN',
                        )}{' '}
                        đ
                      </span>
                    </div>
                  ),
                )}
              </div>
            </div>

            <div className="flex items-center justify-between border-t border-white/10 pt-4 text-base font-semibold">
              <span className="text-white">
                Tổng cộng
              </span>

              <span className="text-white">
                {subtotal.toLocaleString(
                  'vi-VN',
                )}{' '}
                đ
              </span>
            </div>
          </div>

          {seatDetails.length >
          0 ? (
            <Link
              href={`/thanh-toan?showtime=${encodeURIComponent(
                showtime.id,
              )}&seats=${encodeURIComponent(
                validSelectedSeats.join(
                  ',',
                ),
              )}`}
              className="mt-6 inline-flex w-full items-center justify-center rounded-2xl bg-white px-4 py-3 font-semibold text-slate-950 transition hover:bg-slate-100"
            >
              Sang thanh toán
            </Link>
          ) : (
            <Link
              href={`/dat-ve?showtime=${encodeURIComponent(
                showtime.id,
              )}`}
              className="mt-6 inline-flex w-full items-center justify-center rounded-2xl bg-white px-4 py-3 font-semibold text-slate-950 transition hover:bg-slate-100"
            >
              Quay lại chọn ghế
            </Link>
          )}
        </aside>
      </div>
    </main>
  );
}