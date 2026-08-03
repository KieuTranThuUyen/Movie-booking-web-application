'use client';

import { BookingStatus, PaymentStatus } from '@prisma/client';
import { useEffect, useMemo, useState } from 'react';

type BookingItem = {
  id: string;
  bookingCode: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  status: BookingStatus;
  paymentStatus: PaymentStatus;
  totalPrice: number;
  createdAt: string;
  showtime: {
    startTime: string;
    movie: {
      title: string;
    };
    hall: {
      name: string;
      cinema: {
        name: string;
      };
    };
  };
  tickets: Array<{
    seatCode: string;
  }>;
};

export function BookingManagementForm() {
  const [bookings, setBookings] = useState<BookingItem[]>([]);
  const [statusFilter, setStatusFilter] = useState<'ALL' | BookingStatus>('ALL');
  const [message, setMessage] = useState('');
  const [loadingId, setLoadingId] = useState('');

  const fetchBookings = async () => {
    const response = await fetch('/api/admin/bookings');
    const data = (await response.json()) as BookingItem[];
    setBookings(data);
  };

  useEffect(() => {
    fetchBookings();
  }, []);

  const filteredBookings = useMemo(() => {
    if (statusFilter === 'ALL') {
      return bookings;
    }

    return bookings.filter((booking) => booking.status === statusFilter);
  }, [bookings, statusFilter]);

  const updateBooking = async (bookingId: string, payload: { status?: BookingStatus; paymentStatus?: PaymentStatus }) => {
    setLoadingId(bookingId);
    setMessage('');

    const response = await fetch(`/api/admin/bookings/${bookingId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = (await response.json()) as { message: string; booking?: BookingItem };
    setLoadingId('');
    setMessage(data.message);

    if (response.ok && data.booking) {
      setBookings((current) => current.map((booking) => (booking.id === bookingId ? data.booking! : booking)));
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="text-sm text-slate-300">Lọc theo trạng thái:</div>
        <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as 'ALL' | BookingStatus)} className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white outline-none">
          <option value="ALL" className="bg-slate-950">Tất cả</option>
          <option value="PENDING" className="bg-slate-950">PENDING</option>
          <option value="CONFIRMED" className="bg-slate-950">CONFIRMED</option>
          <option value="CANCELED" className="bg-slate-950">CANCELED</option>
        </select>
      </div>

      <div className="grid gap-3">
        {filteredBookings.length === 0 ? (
          <p className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-slate-400">Chưa có booking phù hợp bộ lọc.</p>
        ) : (
          filteredBookings.map((booking) => (
            <article key={booking.id} className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-slate-200">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="font-semibold text-white">{booking.bookingCode}</div>
                  <div className="mt-1 text-slate-400">
                    {booking.showtime.movie.title} · {booking.showtime.hall.cinema.name} · {booking.showtime.hall.name}
                  </div>
                </div>
                <div className="text-slate-300">{new Date(booking.createdAt).toLocaleString('vi-VN')}</div>
              </div>

              <div className="mt-3 text-slate-300">
                {booking.customerName} · {booking.customerPhone} · {booking.customerEmail}
              </div>
              <div className="mt-2 text-slate-400">Ghế: {booking.tickets.map((ticket) => ticket.seatCode).join(', ')}</div>
              <div className="mt-2 text-slate-300">Tổng tiền: {booking.totalPrice.toLocaleString('vi-VN')} đ</div>

              <div className="mt-4 flex flex-wrap gap-2">
                <button type="button" onClick={() => updateBooking(booking.id, { status: BookingStatus.CONFIRMED, paymentStatus: PaymentStatus.PAID })} disabled={loadingId === booking.id} className="rounded-xl border border-emerald-400/40 px-3 py-2 text-xs font-semibold text-emerald-200 disabled:opacity-50">
                  Xác nhận + đã thanh toán
                </button>
                <button type="button" onClick={() => updateBooking(booking.id, { status: BookingStatus.CANCELED, paymentStatus: booking.paymentStatus === PaymentStatus.PAID ? PaymentStatus.REFUNDED : PaymentStatus.UNPAID })} disabled={loadingId === booking.id} className="rounded-xl border border-rose-400/40 px-3 py-2 text-xs font-semibold text-rose-200 disabled:opacity-50">
                  Hủy đơn
                </button>
                <button type="button" onClick={() => updateBooking(booking.id, { paymentStatus: PaymentStatus.REFUNDED })} disabled={loadingId === booking.id} className="rounded-xl border border-amber-400/40 px-3 py-2 text-xs font-semibold text-amber-200 disabled:opacity-50">
                  Đánh dấu hoàn tiền
                </button>
                <span className="rounded-xl bg-slate-900/70 px-3 py-2 text-xs text-slate-300">{booking.status} · {booking.paymentStatus}</span>
              </div>
            </article>
          ))
        )}
      </div>

      {message ? <p className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-200">{message}</p> : null}
    </div>
  );
}
