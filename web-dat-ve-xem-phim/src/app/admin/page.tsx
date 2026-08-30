import {
  BookingStatus,
  PaymentStatus,
  TicketStatus,
} from '@prisma/client';

import { prisma } from '@/lib/db/prisma';

const VND = new Intl.NumberFormat('vi-VN', {
  style: 'currency',
  currency: 'VND',
  maximumFractionDigits: 0,
});

const NUMBER = new Intl.NumberFormat('vi-VN');

function formatCurrency(value: number) {
  return VND.format(value);
}

function formatNumber(value: number) {
  return NUMBER.format(value);
}

function getDayStart(date: Date) {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  return result;
}

function getDayEnd(date: Date) {
  const result = new Date(date);
  result.setHours(23, 59, 59, 999);
  return result;
}

function getDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

function getShortDate(date: Date) {
  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
  }).format(date);
}

function getPercent(value: number, total: number) {
  if (total === 0) {
    return 0;
  }

  return Math.min(100, Math.max(0, Math.round((value / total) * 100)));
}

export default async function AdminPage() {
  const now = new Date();

  const todayStart = getDayStart(now);
  const todayEnd = getDayEnd(now);

  const sevenDaysAgo = new Date(todayStart);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);

  /*
   * ============================================================
   * DỮ LIỆU TỔNG QUAN
   * ============================================================
   */

  const [
    bookingsCount,
    moviesCount,
    usersCount,
    showtimesCount,
    cinemasCount,
    hallsCount,

    pendingBookings,
    confirmedBookings,
    canceledBookings,

    paidBookings,
    unpaidBookings,
    refundedBookings,
    partiallyRefundedBookings,

    todayBookings,

    paidRevenueRows,
    todayRevenueRows,

    ticketsCount,
    activeTicketsCount,

    recentBookings,
  ] = await Promise.all([
    prisma.booking.count(),

    prisma.movie.count(),

    prisma.user.count({
      where: {
        role: 'CUSTOMER',
      },
    }),

    prisma.showtime.count(),

    prisma.cinema.count(),

    prisma.hall.count(),

    prisma.booking.count({
      where: {
        status: BookingStatus.PENDING,
      },
    }),

    prisma.booking.count({
      where: {
        status: BookingStatus.CONFIRMED,
      },
    }),

    prisma.booking.count({
      where: {
        status: BookingStatus.CANCELED,
      },
    }),

    prisma.booking.count({
      where: {
        paymentStatus: PaymentStatus.PAID,
      },
    }),

    prisma.booking.count({
      where: {
        paymentStatus: PaymentStatus.UNPAID,
      },
    }),

    prisma.booking.count({
      where: {
        paymentStatus: PaymentStatus.REFUNDED,
      },
    }),

    prisma.booking.count({
      where: {
        paymentStatus: PaymentStatus.PARTIALLY_REFUNDED,
      },
    }),

    prisma.booking.count({
      where: {
        createdAt: {
          gte: todayStart,
          lte: todayEnd,
        },
      },
    }),

    /*
     * Tổng doanh thu thực tế:
     *
     * totalPrice - refundedAmount
     *
     * Chỉ tính các booking đã thanh toán
     * hoặc đã từng thanh toán rồi hoàn tiền.
     */
    prisma.booking.findMany({
      where: {
        paymentStatus: {
          in: [
            PaymentStatus.PAID,
            PaymentStatus.PARTIALLY_REFUNDED,
            PaymentStatus.REFUNDED,
          ],
        },
      },
      select: {
        totalPrice: true,
        refundedAmount: true,
      },
    }),

    /*
     * Doanh thu của booking được tạo hôm nay.
     */
    prisma.booking.findMany({
      where: {
        createdAt: {
          gte: todayStart,
          lte: todayEnd,
        },
        paymentStatus: {
          in: [
            PaymentStatus.PAID,
            PaymentStatus.PARTIALLY_REFUNDED,
            PaymentStatus.REFUNDED,
          ],
        },
      },
      select: {
        totalPrice: true,
        refundedAmount: true,
      },
    }),

    prisma.ticket.count(),

    prisma.ticket.count({
      where: {
        status: TicketStatus.ACTIVE,
      },
    }),

    prisma.booking.findMany({
      orderBy: {
        createdAt: 'desc',
      },
      take: 5,
      select: {
        id: true,
        bookingCode: true,
        customerName: true,
        totalPrice: true,
        refundedAmount: true,
        status: true,
        paymentStatus: true,
        createdAt: true,

        showtime: {
          select: {
            movie: {
              select: {
                title: true,
              },
            },
          },
        },
      },
    }),
  ]);

  /*
   * ============================================================
   * DOANH THU
   * ============================================================
   */

  const totalRevenue = paidRevenueRows.reduce(
    (total, booking) =>
      total + Math.max(0, booking.totalPrice - booking.refundedAmount),
    0,
  );

  const todayRevenue = todayRevenueRows.reduce(
    (total, booking) =>
      total + Math.max(0, booking.totalPrice - booking.refundedAmount),
    0,
  );

  /*
   * ============================================================
   * TỶ LỆ
   * ============================================================
   */

  const completionRate = getPercent(
    confirmedBookings,
    bookingsCount,
  );

  const paymentRate = getPercent(
    paidBookings,
    bookingsCount,
  );

  const cancellationRate = getPercent(
    canceledBookings,
    bookingsCount,
  );

  /*
   * ============================================================
   * DỮ LIỆU 7 NGÀY
   * ============================================================
   */

  const lastSevenDays = Array.from(
    { length: 7 },
    (_, index) => {
      const date = new Date(sevenDaysAgo);

      date.setDate(sevenDaysAgo.getDate() + index);

      return {
        date,
        key: getDateKey(date),
        label: getShortDate(date),
        bookings: 0,
        revenue: 0,
      };
    },
  );

  const sevenDayBookings = await prisma.booking.findMany({
    where: {
      createdAt: {
        gte: sevenDaysAgo,
        lte: todayEnd,
      },
    },
    select: {
      createdAt: true,
      totalPrice: true,
      refundedAmount: true,
      paymentStatus: true,
    },
  });

  for (const booking of sevenDayBookings) {
    const key = getDateKey(booking.createdAt);

    const day = lastSevenDays.find(
      (item) => item.key === key,
    );

    if (!day) {
      continue;
    }

    day.bookings += 1;

    if (
      booking.paymentStatus === PaymentStatus.PAID ||
      booking.paymentStatus ===
        PaymentStatus.PARTIALLY_REFUNDED ||
      booking.paymentStatus === PaymentStatus.REFUNDED
    ) {
      day.revenue += Math.max(
        0,
        booking.totalPrice - booking.refundedAmount,
      );
    }
  }

  const maxRevenue = Math.max(
    ...lastSevenDays.map((item) => item.revenue),
    1,
  );

  const maxBookings = Math.max(
    ...lastSevenDays.map((item) => item.bookings),
    1,
  );

  /*
   * ============================================================
   * TOP PHIM
   * ============================================================
   */

  const showtimes = await prisma.showtime.findMany({
    select: {
      id: true,

      movie: {
        select: {
          title: true,
        },
      },
    },
  });

  const showtimeToMovie = new Map(
    showtimes.map((showtime) => [
      showtime.id,
      showtime.movie.title,
    ]),
  );

  const bookingByShowtime =
    await prisma.booking.groupBy({
      by: ['showtimeId'],

      _count: {
        id: true,
      },

      where: {
        status: {
          not: BookingStatus.CANCELED,
        },
      },
    });

  const movieBookingMap = new Map<string, number>();

  for (const item of bookingByShowtime) {
    const movieTitle = showtimeToMovie.get(
      item.showtimeId,
    );

    if (!movieTitle) {
      continue;
    }

    movieBookingMap.set(
      movieTitle,
      (movieBookingMap.get(movieTitle) ?? 0) +
        item._count.id,
    );
  }

  const topMovies = Array.from(
    movieBookingMap.entries(),
  )
    .map(([title, bookings]) => ({
      title,
      bookings,
    }))
    .sort(
      (a, b) => b.bookings - a.bookings,
    )
    .slice(0, 5);

  const maxMovieBookings = Math.max(
    ...topMovies.map((movie) => movie.bookings),
    1,
  );

  /*
   * ============================================================
   * TOP RẠP
   * ============================================================
   */

  const halls = await prisma.hall.findMany({
    select: {
      id: true,

      cinema: {
        select: {
          name: true,
        },
      },
    },
  });

  const hallToCinema = new Map(
    halls.map((hall) => [
      hall.id,
      hall.cinema.name,
    ]),
  );

  const showtimesWithHall =
    await prisma.showtime.findMany({
      select: {
        id: true,
        hallId: true,
      },
    });

  const showtimeToCinema = new Map<string, string>();

  for (const showtime of showtimesWithHall) {
    const cinemaName = hallToCinema.get(
      showtime.hallId,
    );

    if (!cinemaName) {
      continue;
    }

    showtimeToCinema.set(
      showtime.id,
      cinemaName,
    );
  }

  const cinemaBookingMap = new Map<string, number>();

  for (const booking of bookingByShowtime) {
    const cinemaName = showtimeToCinema.get(
      booking.showtimeId,
    );

    if (!cinemaName) {
      continue;
    }

    cinemaBookingMap.set(
      cinemaName,
      (cinemaBookingMap.get(cinemaName) ?? 0) +
        booking._count.id,
    );
  }

  const topCinemas = Array.from(
    cinemaBookingMap.entries(),
  )
    .map(([name, bookings]) => ({
      name,
      bookings,
    }))
    .sort(
      (a, b) => b.bookings - a.bookings,
    )
    .slice(0, 5);

  const maxCinemaBookings = Math.max(
    ...topCinemas.map(
      (cinema) => cinema.bookings,
    ),
    1,
  );

  /*
   * ============================================================
   * KPI
   * ============================================================
   */

  const kpis = [
    {
      label: 'Tổng doanh thu',
      value: formatCurrency(totalRevenue),
      note: `${formatCurrency(todayRevenue)} hôm nay`,
      tone: 'from-emerald-500/25 to-teal-500/5',
    },

    {
      label: 'Tổng đơn đặt',
      value: formatNumber(bookingsCount),
      note: `${formatNumber(todayBookings)} đơn hôm nay`,
      tone: 'from-sky-500/25 to-cyan-500/5',
    },

    {
      label: 'Vé đã bán',
      value: formatNumber(activeTicketsCount),
      note: `${formatNumber(ticketsCount)} vé trong hệ thống`,
      tone: 'from-violet-500/25 to-blue-500/5',
    },

    {
      label: 'Người dùng',
      value: formatNumber(usersCount),
      note: 'Tài khoản khách hàng',
      tone: 'from-fuchsia-500/25 to-indigo-500/5',
    },

    {
      label: 'Nội dung',
      value: `${formatNumber(moviesCount)} phim`,
      note: `${formatNumber(showtimesCount)} suất chiếu`,
      tone: 'from-amber-500/25 to-orange-500/5',
    },

    {
      label: 'Hạ tầng rạp',
      value: `${formatNumber(cinemasCount)} rạp`,
      note: `${formatNumber(hallsCount)} phòng chiếu`,
      tone: 'from-rose-500/25 to-pink-500/5',
    },
  ];

  /*
   * ============================================================
   * TRẠNG THÁI BOOKING
   * ============================================================
   */

  const bookingStatus = [
    {
      label: 'Đã xác nhận',
      value: confirmedBookings,
      percent: getPercent(
        confirmedBookings,
        bookingsCount,
      ),
      className: 'bg-emerald-400',
    },

    {
      label: 'Đang chờ',
      value: pendingBookings,
      percent: getPercent(
        pendingBookings,
        bookingsCount,
      ),
      className: 'bg-amber-400',
    },

    {
      label: 'Đã hủy',
      value: canceledBookings,
      percent: getPercent(
        canceledBookings,
        bookingsCount,
      ),
      className: 'bg-rose-400',
    },
  ];

  /*
   * ============================================================
   * TRẠNG THÁI THANH TOÁN
   * ============================================================
   */

  const paymentStatus = [
    {
      label: 'Đã thanh toán',
      value: paidBookings,
      percent: getPercent(
        paidBookings,
        bookingsCount,
      ),
      className: 'bg-sky-400',
    },

    {
      label: 'Chưa thanh toán',
      value: unpaidBookings,
      percent: getPercent(
        unpaidBookings,
        bookingsCount,
      ),
      className: 'bg-amber-400',
    },

    {
      label: 'Hoàn tiền một phần',
      value: partiallyRefundedBookings,
      percent: getPercent(
        partiallyRefundedBookings,
        bookingsCount,
      ),
      className: 'bg-violet-400',
    },

    {
      label: 'Đã hoàn tiền',
      value: refundedBookings,
      percent: getPercent(
        refundedBookings,
        bookingsCount,
      ),
      className: 'bg-rose-400',
    },
  ];

  return (
    <section className="space-y-8">

      {/* ======================================================
          HEADER
      ======================================================= */}

      <div className="relative overflow-hidden rounded-[28px] border border-white/10 bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 p-6 shadow-glow">

        <div className="pointer-events-none absolute -right-14 -top-16 h-44 w-44 rounded-full bg-sky-500/20 blur-3xl" />

        <div className="pointer-events-none absolute -bottom-20 left-20 h-56 w-56 rounded-full bg-fuchsia-500/15 blur-3xl" />

        <div className="relative grid gap-6 lg:grid-cols-[1.1fr_0.9fr] lg:items-end">

          <div>
            <p className="text-sm uppercase tracking-[0.28em] text-sky-300/80">
              Tổng quan vận hành
            </p>

            <h2 className="mt-3 text-3xl font-bold text-white lg:text-4xl">
              Dashboard quản trị hệ thống đặt vé
            </h2>

            <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-300">
              Theo dõi doanh thu, đơn đặt vé, vé đã bán,
              người dùng và hoạt động của hệ thống từ
              dữ liệu thực tế trong cơ sở dữ liệu.
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur">

            <div className="text-xs uppercase tracking-[0.2em] text-slate-400">
              Cần ưu tiên hôm nay
            </div>

            <div className="mt-3 grid gap-3 text-sm">

              <div className="flex items-center justify-between rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2">
                <span className="text-slate-300">
                  Đơn chờ xử lý
                </span>

                <span className="font-semibold text-amber-200">
                  {formatNumber(pendingBookings)}
                </span>
              </div>

              <div className="flex items-center justify-between rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2">
                <span className="text-slate-300">
                  Đơn đã xác nhận
                </span>

                <span className="font-semibold text-emerald-200">
                  {formatNumber(confirmedBookings)}
                </span>
              </div>

              <div className="flex items-center justify-between rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2">
                <span className="text-slate-300">
                  Doanh thu hôm nay
                </span>

                <span className="font-semibold text-sky-200">
                  {formatCurrency(todayRevenue)}
                </span>
              </div>

            </div>
          </div>

        </div>
      </div>

      {/* ======================================================
          KPI
      ======================================================= */}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">

        {kpis.map((item) => (
          <article
            key={item.label}
            className="relative overflow-hidden rounded-[24px] border border-white/10 bg-slate-950/75 p-5 shadow-glow backdrop-blur-xl"
          >

            <div
              className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${item.tone}`}
            />

            <div className="relative">

              <p className="text-sm text-slate-300">
                {item.label}
              </p>

              <p className="mt-2 text-2xl font-semibold text-white sm:text-3xl">
                {item.value}
              </p>

              <p className="mt-2 text-xs uppercase tracking-[0.12em] text-slate-400">
                {item.note}
              </p>

            </div>
          </article>
        ))}

      </div>

      {/* ======================================================
          TRẠNG THÁI
      ======================================================= */}

      <div className="grid gap-6 lg:grid-cols-2">

        {/* Booking */}

        <div className="rounded-[24px] border border-white/10 bg-slate-950/70 p-5 shadow-glow backdrop-blur-xl">

          <div>
            <h3 className="text-lg font-semibold text-white">
              Trạng thái đơn đặt
            </h3>

            <p className="mt-1 text-xs text-slate-400">
              Tổng cộng {formatNumber(bookingsCount)} đơn
            </p>
          </div>

          <div className="mt-5 space-y-5">

            {bookingStatus.map((item) => (
              <div key={item.label}>

                <div className="mb-2 flex items-center justify-between text-sm">

                  <span className="text-slate-300">
                    {item.label}
                  </span>

                  <span className="font-semibold text-white">
                    {formatNumber(item.value)} ({item.percent}%)
                  </span>

                </div>

                <div className="h-2 overflow-hidden rounded-full bg-white/10">

                  <div
                    className={`h-2 rounded-full ${item.className}`}
                    style={{
                      width: `${item.percent}%`,
                    }}
                  />

                </div>

              </div>
            ))}

          </div>
        </div>

        {/* Payment */}

        <div className="rounded-[24px] border border-white/10 bg-slate-950/70 p-5 shadow-glow backdrop-blur-xl">

          <div>

            <h3 className="text-lg font-semibold text-white">
              Trạng thái thanh toán
            </h3>

            <p className="mt-1 text-xs text-slate-400">
              Theo dữ liệu paymentStatus của booking
            </p>

          </div>

          <div className="mt-5 space-y-5">

            {paymentStatus.map((item) => (
              <div key={item.label}>

                <div className="mb-2 flex items-center justify-between text-sm">

                  <span className="text-slate-300">
                    {item.label}
                  </span>

                  <span className="font-semibold text-white">
                    {formatNumber(item.value)} ({item.percent}%)
                  </span>

                </div>

                <div className="h-2 overflow-hidden rounded-full bg-white/10">

                  <div
                    className={`h-2 rounded-full ${item.className}`}
                    style={{
                      width: `${item.percent}%`,
                    }}
                  />

                </div>

              </div>
            ))}

          </div>
        </div>

      </div>

      {/* ======================================================
          HIỆU QUẢ XỬ LÝ
      ======================================================= */}

      <div className="rounded-[24px] border border-white/10 bg-slate-950/70 p-5 shadow-glow backdrop-blur-xl">

        <div className="flex flex-wrap items-center justify-between gap-3">

          <div>

            <h3 className="text-lg font-semibold text-white">
              Hiệu quả xử lý đơn
            </h3>

            <p className="mt-1 text-xs text-slate-400">
              Tỷ lệ được tính trực tiếp từ dữ liệu booking hiện tại
            </p>

          </div>

          <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-300">
            Dữ liệu thực tế
          </span>

        </div>

        <div className="mt-5 grid gap-6 md:grid-cols-3">

          {/* Completion */}

          <div>

            <div className="mb-2 flex items-center justify-between text-sm">

              <span className="text-slate-300">
                Xác nhận đơn
              </span>

              <span className="font-semibold text-emerald-200">
                {completionRate}%
              </span>

            </div>

            <div className="h-2 rounded-full bg-white/10">

              <div
                className="h-2 rounded-full bg-gradient-to-r from-emerald-400 to-teal-300"
                style={{
                  width: `${completionRate}%`,
                }}
              />

            </div>

          </div>

          {/* Payment */}

          <div>

            <div className="mb-2 flex items-center justify-between text-sm">

              <span className="text-slate-300">
                Thanh toán
              </span>

              <span className="font-semibold text-sky-200">
                {paymentRate}%
              </span>

            </div>

            <div className="h-2 rounded-full bg-white/10">

              <div
                className="h-2 rounded-full bg-gradient-to-r from-sky-400 to-indigo-300"
                style={{
                  width: `${paymentRate}%`,
                }}
              />

            </div>

          </div>

          {/* Cancel */}

          <div>

            <div className="mb-2 flex items-center justify-between text-sm">

              <span className="text-slate-300">
                Tỷ lệ hủy
              </span>

              <span className="font-semibold text-rose-200">
                {cancellationRate}%
              </span>

            </div>

            <div className="h-2 rounded-full bg-white/10">

              <div
                className="h-2 rounded-full bg-gradient-to-r from-rose-400 to-pink-300"
                style={{
                  width: `${cancellationRate}%`,
                }}
              />

            </div>

          </div>

        </div>
      </div>

      {/* ======================================================
          7 NGÀY
      ======================================================= */}

      <div className="grid gap-6 lg:grid-cols-2">

        {/* Doanh thu */}

        <div className="rounded-[24px] border border-white/10 bg-slate-950/70 p-5 shadow-glow backdrop-blur-xl">

          <div>

            <h3 className="text-lg font-semibold text-white">
              Doanh thu 7 ngày gần nhất
            </h3>

            <p className="mt-1 text-xs text-slate-400">
              Doanh thu sau khi trừ khoản hoàn tiền
            </p>

          </div>

          <div className="mt-6 flex h-64 items-end gap-2 sm:gap-3">

            {lastSevenDays.map((day) => {

              const height =
                day.revenue === 0
                  ? 4
                  : Math.max(
                      8,
                      (day.revenue / maxRevenue) * 100,
                    );

              return (
                <div
                  key={day.key}
                  className="flex min-w-0 flex-1 flex-col items-center justify-end gap-2"
                >

                  <div className="w-full text-center">

                    <span className="text-[10px] text-slate-400 sm:text-xs">
                      {day.revenue > 0
                        ? formatCurrency(day.revenue)
                        : '0 ₫'}
                    </span>

                  </div>

                  <div className="flex h-40 w-full items-end justify-center">

                    <div
                      className="w-full max-w-10 rounded-t-xl bg-gradient-to-t from-emerald-500/80 to-teal-300/80 transition-all"
                      style={{
                        height: `${height}%`,
                      }}
                    />

                  </div>

                  <span className="text-[10px] text-slate-400 sm:text-xs">
                    {day.label}
                  </span>

                </div>
              );
            })}

          </div>
        </div>

        {/* Booking */}

        <div className="rounded-[24px] border border-white/10 bg-slate-950/70 p-5 shadow-glow backdrop-blur-xl">

          <div>

            <h3 className="text-lg font-semibold text-white">
              Booking 7 ngày gần nhất
            </h3>

            <p className="mt-1 text-xs text-slate-400">
              Số lượng đơn được tạo theo từng ngày
            </p>

          </div>

          <div className="mt-6 flex h-64 items-end gap-2 sm:gap-3">

            {lastSevenDays.map((day) => {

              const height =
                day.bookings === 0
                  ? 4
                  : Math.max(
                      8,
                      (day.bookings / maxBookings) * 100,
                    );

              return (
                <div
                  key={day.key}
                  className="flex min-w-0 flex-1 flex-col items-center justify-end gap-2"
                >

                  <div className="w-full text-center">

                    <span className="text-xs font-medium text-slate-300">
                      {formatNumber(day.bookings)}
                    </span>

                  </div>

                  <div className="flex h-40 w-full items-end justify-center">

                    <div
                      className="w-full max-w-10 rounded-t-xl bg-gradient-to-t from-sky-500/80 to-indigo-300/80 transition-all"
                      style={{
                        height: `${height}%`,
                      }}
                    />

                  </div>

                  <span className="text-[10px] text-slate-400 sm:text-xs">
                    {day.label}
                  </span>

                </div>
              );
            })}

          </div>
        </div>

      </div>

      {/* ======================================================
          TOP PHIM + TOP RẠP
      ======================================================= */}

      <div className="grid gap-6 lg:grid-cols-2">

        {/* Top phim */}

        <div className="rounded-[24px] border border-white/10 bg-slate-950/70 p-5 shadow-glow backdrop-blur-xl">

          <div>

            <h3 className="text-lg font-semibold text-white">
              Phim được đặt nhiều nhất
            </h3>

            <p className="mt-1 text-xs text-slate-400">
              Top 5 phim dựa trên số đơn đặt
            </p>

          </div>

          <div className="mt-5 space-y-4">

            {topMovies.length === 0 ? (
              <div className="rounded-xl border border-dashed border-white/10 px-4 py-8 text-center text-sm text-slate-500">
                Chưa có dữ liệu đặt vé.
              </div>
            ) : (
              topMovies.map((movie, index) => {

                const percent = Math.round(
                  (movie.bookings /
                    maxMovieBookings) *
                    100,
                );

                return (
                  <div key={movie.title}>

                    <div className="flex items-center gap-3">

                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white/5 text-sm font-bold text-sky-300">
                        {index + 1}
                      </div>

                      <div className="min-w-0 flex-1">

                        <div className="flex items-center justify-between gap-3">

                          <span className="truncate text-sm font-medium text-white">
                            {movie.title}
                          </span>

                          <span className="shrink-0 text-xs text-slate-400">
                            {formatNumber(movie.bookings)} đơn
                          </span>

                        </div>

                        <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/10">

                          <div
                            className="h-2 rounded-full bg-gradient-to-r from-fuchsia-400 to-violet-300"
                            style={{
                              width: `${percent}%`,
                            }}
                          />

                        </div>

                      </div>

                    </div>
                  </div>
                );
              })
            )}

          </div>
        </div>

        {/* Top rạp */}

        <div className="rounded-[24px] border border-white/10 bg-slate-950/70 p-5 shadow-glow backdrop-blur-xl">

          <div>

            <h3 className="text-lg font-semibold text-white">
              Rạp có nhiều booking nhất
            </h3>

            <p className="mt-1 text-xs text-slate-400">
              Top 5 rạp dựa trên số đơn đặt
            </p>

          </div>

          <div className="mt-5 space-y-4">

            {topCinemas.length === 0 ? (
              <div className="rounded-xl border border-dashed border-white/10 px-4 py-8 text-center text-sm text-slate-500">
                Chưa có dữ liệu đặt vé.
              </div>
            ) : (
              topCinemas.map((cinema, index) => {

                const percent = Math.round(
                  (cinema.bookings /
                    maxCinemaBookings) *
                    100,
                );

                return (
                  <div key={cinema.name}>

                    <div className="flex items-center gap-3">

                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white/5 text-sm font-bold text-emerald-300">
                        {index + 1}
                      </div>

                      <div className="min-w-0 flex-1">

                        <div className="flex items-center justify-between gap-3">

                          <span className="truncate text-sm font-medium text-white">
                            {cinema.name}
                          </span>

                          <span className="shrink-0 text-xs text-slate-400">
                            {formatNumber(cinema.bookings)} đơn
                          </span>

                        </div>

                        <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/10">

                          <div
                            className="h-2 rounded-full bg-gradient-to-r from-emerald-400 to-teal-300"
                            style={{
                              width: `${percent}%`,
                            }}
                          />

                        </div>

                      </div>

                    </div>
                  </div>
                );
              })
            )}

          </div>
        </div>

      </div>

      {/* ======================================================
          BOOKING GẦN NHẤT
      ======================================================= */}

      <div className="rounded-[24px] border border-white/10 bg-slate-950/70 p-5 shadow-glow backdrop-blur-xl">

        <div className="flex flex-wrap items-center justify-between gap-3">

          <div>

            <h3 className="text-lg font-semibold text-white">
              Đơn đặt vé gần nhất
            </h3>

            <p className="mt-1 text-xs text-slate-400">
              5 booking mới nhất trong hệ thống
            </p>

          </div>

          <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-300">
            {formatNumber(bookingsCount)} tổng đơn
          </div>

        </div>

        <div className="mt-5 overflow-x-auto">

          <table className="w-full min-w-[760px] text-left text-sm">

            <thead>

              <tr className="border-b border-white/10 text-xs uppercase tracking-wider text-slate-500">

                <th className="px-3 py-3 font-medium">
                  Mã booking
                </th>

                <th className="px-3 py-3 font-medium">
                  Khách hàng
                </th>

                <th className="px-3 py-3 font-medium">
                  Phim
                </th>

                <th className="px-3 py-3 font-medium">
                  Tổng tiền
                </th>

                <th className="px-3 py-3 font-medium">
                  Trạng thái
                </th>

                <th className="px-3 py-3 font-medium">
                  Thanh toán
                </th>

              </tr>

            </thead>

            <tbody>

              {recentBookings.length === 0 ? (
                <tr>

                  <td
                    colSpan={6}
                    className="px-3 py-10 text-center text-slate-500"
                  >
                    Chưa có đơn đặt vé.
                  </td>

                </tr>
              ) : (
                recentBookings.map((booking) => {

                  const actualAmount = Math.max(
                    0,
                    booking.totalPrice -
                      booking.refundedAmount,
                  );

                  return (
                    <tr
                      key={booking.id}
                      className="border-b border-white/5 transition hover:bg-white/[0.03]"
                    >

                      <td className="px-3 py-4 font-medium text-sky-300">
                        {booking.bookingCode}
                      </td>

                      <td className="px-3 py-4 text-slate-200">
                        {booking.customerName}
                      </td>

                      <td className="max-w-[220px] truncate px-3 py-4 text-slate-300">
                        {booking.showtime.movie.title}
                      </td>

                      <td className="px-3 py-4 font-medium text-white">
                        {formatCurrency(actualAmount)}
                      </td>

                      <td className="px-3 py-4">

                        <span
                          className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${
                            booking.status ===
                            BookingStatus.CONFIRMED
                              ? 'border-emerald-400/20 bg-emerald-400/10 text-emerald-300'
                              : booking.status ===
                                  BookingStatus.PENDING
                                ? 'border-amber-400/20 bg-amber-400/10 text-amber-300'
                                : 'border-rose-400/20 bg-rose-400/10 text-rose-300'
                          }`}
                        >
                          {booking.status ===
                          BookingStatus.CONFIRMED
                            ? 'Đã xác nhận'
                            : booking.status ===
                                BookingStatus.PENDING
                              ? 'Đang chờ'
                              : 'Đã hủy'}
                        </span>

                      </td>

                      <td className="px-3 py-4">

                        <span
                          className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${
                            booking.paymentStatus ===
                            PaymentStatus.PAID
                              ? 'border-sky-400/20 bg-sky-400/10 text-sky-300'
                              : booking.paymentStatus ===
                                  PaymentStatus.PARTIALLY_REFUNDED
                                ? 'border-violet-400/20 bg-violet-400/10 text-violet-300'
                                : booking.paymentStatus ===
                                    PaymentStatus.REFUNDED
                                  ? 'border-rose-400/20 bg-rose-400/10 text-rose-300'
                                  : 'border-amber-400/20 bg-amber-400/10 text-amber-300'
                          }`}
                        >
                          {booking.paymentStatus ===
                          PaymentStatus.PAID
                            ? 'Đã thanh toán'
                            : booking.paymentStatus ===
                                PaymentStatus.PARTIALLY_REFUNDED
                              ? 'Hoàn một phần'
                              : booking.paymentStatus ===
                                  PaymentStatus.REFUNDED
                                ? 'Đã hoàn tiền'
                                : 'Chưa thanh toán'}
                        </span>

                      </td>

                    </tr>
                  );
                })
              )}

            </tbody>
          </table>

        </div>
      </div>

    </section>
  );
}