import Link from 'next/link';

import { prisma } from '@/lib/prisma';
import { ensureMoviesSeeded } from '@/lib/seed-movies';
import {
  formatSeatType,
  getSeatPrice,
} from '@/lib/seat-pricing';

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
  const resolvedSearchParams =
    await searchParams;

  /*
   * ============================================================
   * SEED MOVIES
   * ============================================================
   */

  await ensureMoviesSeeded();

  /*
   * ============================================================
   * LẤY SHOWTIME
   * ============================================================
   */

  const showtime =
    resolvedSearchParams.showtime
      ? await prisma.showtime.findUnique({
          where: {
            id: resolvedSearchParams.showtime,
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
        })
      : null;

  /*
   * ============================================================
   * LẤY DANH SÁCH GHẾ
   * ============================================================
   */

  const selectedSeats = (
    resolvedSearchParams.seats ?? ''
  )
    .split(',')
    .map((seat) => seat.trim())
    .filter(Boolean);

  /*
   * ============================================================
   * LẤY CHI TIẾT GHẾ
   *
   * Giá được xác định theo type của ghế:
   *
   * STANDARD = 70.000
   * VIP      = 90.000
   * COUPLE   = 140.000
   * ============================================================
   */

  const seatDetails =
    showtime?.hall.seats
      .filter((seat) =>
        selectedSeats.includes(
          seat.code
        )
      )
      .map((seat) => ({
        code: seat.code,
        type: formatSeatType(
          seat.type
        ),
        price: getSeatPrice(
          seat.type
        ),
      })) ?? [];

  /*
   * ============================================================
   * TÍNH TỔNG
   * ============================================================
   */

  const subtotal =
    seatDetails.reduce(
      (total, seat) =>
        total + seat.price,
      0
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
      </div>

      <div className="mt-10 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        {/* =====================================================
            THÔNG TIN PHIM + GHẾ
        ====================================================== */}

        <section className="rounded-[28px] border border-white/10 bg-slate-950/70 p-6 shadow-glow backdrop-blur-xl">
          {showtime ? (
            <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
              {/* PHIM */}

              <div className="font-semibold text-white">
                {showtime.movie.title}
              </div>

              {/* RẠP + PHÒNG */}

              <div className="mt-2 text-sm text-slate-300">
                {showtime.hall.cinema.name}
                {' · '}
                {showtime.hall.name}
              </div>

              {/* SUẤT CHIẾU */}

              <div className="mt-2 text-sm text-slate-300">
                {new Date(
                  showtime.startTime
                ).toLocaleString(
                  'vi-VN'
                )}
              </div>

              {/* GHẾ */}

              <div className="mt-6">
                <div className="text-sm font-semibold text-white">
                  Ghế đã chọn
                </div>

                <div className="mt-3 space-y-2">
                  {seatDetails.length >
                  0 ? (
                    seatDetails.map(
                      (seat) => (
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
                              'vi-VN'
                            )}{' '}
                            đ
                          </span>
                        </div>
                      )
                    )
                  ) : (
                    <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-slate-300">
                      Chưa chọn ghế.
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-3xl border border-white/10 bg-white/5 p-5 text-sm text-slate-300">
              Chưa có dữ liệu giỏ vé. Hãy quay
              lại màn hình chọn ghế để thêm vé
              trước khi thanh toán.
            </div>
          )}
        </section>

        {/* =====================================================
            TÓM TẮT
        ====================================================== */}

        <aside className="rounded-[28px] border border-white/10 bg-slate-950/70 p-6 shadow-glow backdrop-blur-xl">
          <div className="text-lg font-semibold text-white">
            Tóm tắt
          </div>

          <div className="mt-4 space-y-3 text-sm text-slate-200">
            {/* SỐ VÉ */}

            <div className="flex items-center justify-between">
              <span>Số vé</span>

              <span>
                {seatDetails.length}
              </span>
            </div>

            {/* CHI TIẾT GIÁ */}

            <div className="border-t border-white/10 pt-3">
              <div className="mb-3 font-semibold text-white">
                Chi tiết giá
              </div>

              <div className="space-y-2">
                {seatDetails.map(
                  (seat) => (
                    <div
                      key={seat.code}
                      className="flex items-center justify-between text-sm"
                    >
                      <span className="text-slate-300">
                        {seat.code}{' '}
                        <span className="text-slate-500">
                          ({seat.type})
                        </span>
                      </span>

                      <span className="text-white">
                        {seat.price.toLocaleString(
                          'vi-VN'
                        )}{' '}
                        đ
                      </span>
                    </div>
                  )
                )}
              </div>
            </div>

            {/* TỔNG */}

            <div className="flex items-center justify-between border-t border-white/10 pt-4 text-base font-semibold">
              <span className="text-white">
                Tổng cộng
              </span>

              <span className="text-white">
                {subtotal.toLocaleString(
                  'vi-VN'
                )}{' '}
                đ
              </span>
            </div>
          </div>

          {/* THANH TOÁN */}

          <Link
            href={
              showtime
                ? `/thanh-toan?showtime=${encodeURIComponent(
                    showtime.id
                  )}&seats=${encodeURIComponent(
                    selectedSeats.join(
                      ','
                    )
                  )}&subtotal=${subtotal}`
                : '/dat-ve'
            }
            className="mt-6 inline-flex w-full items-center justify-center rounded-2xl bg-white px-4 py-3 font-semibold text-slate-950 transition hover:bg-slate-100"
          >
            Sang thanh toán
          </Link>
        </aside>
      </div>
    </main>
  );
}