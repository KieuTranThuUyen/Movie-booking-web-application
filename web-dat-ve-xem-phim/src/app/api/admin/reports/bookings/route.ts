import { NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import type { NextRequest } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import * as XLSX from 'xlsx';

function csv(value: unknown) { return `"${String(value ?? '').replace(/"/g, '""')}"`; }

export async function GET(request: Request) {
  const token = await getToken({ req: request as NextRequest, secret: process.env.NEXTAUTH_SECRET });
  if (token?.role !== 'ADMIN') return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
  const url = new URL(request.url);
  const from = url.searchParams.get('from');
  const to = url.searchParams.get('to');
  const movieId = url.searchParams.get('movieId');
  const cinemaId = url.searchParams.get('cinemaId');
  const bookings = await prisma.booking.findMany({
    where: {
      ...(from || to ? { createdAt: { ...(from ? { gte: new Date(`${from}T00:00:00`) } : {}), ...(to ? { lte: new Date(`${to}T23:59:59`) } : {}) } } : {}),
      ...(movieId || cinemaId ? { showtime: { ...(movieId ? { movieId } : {}), ...(cinemaId ? { hall: { cinemaId } } : {}) } } : {}),
    },
    orderBy: { createdAt: 'desc' },
    include: { showtime: { include: { movie: true, hall: { include: { cinema: true } } } }, tickets: true },
  });
  const rows = bookings.map((booking) => ({
    'Mã đơn': booking.bookingCode,
    'Ngày tạo': booking.createdAt.toISOString(),
    Phim: booking.showtime.movie.title,
    Rạp: booking.showtime.hall.cinema.name,
    Trạng_thái: booking.status,
    Thanh_toán: booking.paymentStatus,
    'Số vé': booking.tickets.length,
    'Doanh thu': booking.totalPrice,
    'Đã hoàn': booking.refundedAmount,
  }));
  const format = url.searchParams.get('format') ?? 'csv';

  if (format === 'json') {
    const totalRevenue = bookings.reduce((sum, booking) => sum + booking.totalPrice, 0);
    return NextResponse.json({
      rows,
      summary: {
        bookings: bookings.length,
        tickets: bookings.reduce((sum, booking) => sum + booking.tickets.length, 0),
        revenue: totalRevenue,
        canceled: bookings.filter((booking) => booking.status === 'CANCELED').length,
      },
    });
  }

  if (format === 'xlsx') {
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(rows);
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Bookings');
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename="booking-report.xlsx"',
      },
    });
  }

  const csvRows = [['Mã đơn', 'Ngày tạo', 'Phim', 'Rạp', 'Trạng thái', 'Thanh toán', 'Số vé', 'Doanh thu', 'Đã hoàn']];
  for (const row of rows) csvRows.push(Object.values(row).map(String));
  const body = '\ufeff' + csvRows.map((row) => row.map(csv).join(',')).join('\r\n');
  return new NextResponse(body, { headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': 'attachment; filename="booking-report.csv"' } });
}
