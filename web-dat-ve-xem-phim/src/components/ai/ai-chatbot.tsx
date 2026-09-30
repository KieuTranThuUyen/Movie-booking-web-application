'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';

type ChatMovie = {
  id: string;
  title: string;
  slug: string;
  genre: string;
  posterUrl: string;
  ageRating: string;
  isNowShowing: boolean;
};

type ShowtimeOption = {
  id: string;
  label: string;
  time: string;
  cinema: string;
  city: string;
  movieTitle: string;
};

type BookingDraft = {
  movieQuery?: string;
  movieId?: string;
  movieTitle?: string;
  dayOffset?: number;
  city?: string;
  quantity?: number;
  seatType?: 'STANDARD' | 'VIP' | 'COUPLE' | 'ANY';
  showtimeId?: string;
  cinemaName?: string;
  startTimeLabel?: string;
  step?: 'collect' | 'showtimes' | 'confirm';
};

type Msg = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  movies?: ChatMovie[];
  showtimeOptions?: ShowtimeOption[];
  confirmUrl?: string;
};

const SUGGESTIONS = [
  'Em muốn xem phim Marvel tối nay ở TP.HCM, 2 người ghế đôi',
  'Hướng dẫn đặt vé',
  'Suất chiếu hôm nay',
  'Gợi ý phim kinh dị',
];

export function AiChatbot() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [bookingDraft, setBookingDraft] = useState<BookingDraft | null>(null);
  const [messages, setMessages] = useState<Msg[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content:
        'Xin chào! Mình là trợ lý AI tư vấn phim & đặt vé DatVeXemPhim.\n\nBạn có thể nói tự nhiên, ví dụ:\n"Muốn xem phim Marvel tối nay ở TP.HCM, 2 người ghế đôi"\n\nMình sẽ đề xuất suất → bạn chọn → xác nhận → sang trang chọn ghế (AI không tự thanh toán).',
    },
  ]);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open, messages, loading]);

  const send = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || loading) return;

      const userMsg: Msg = {
        id: `u-${Date.now()}`,
        role: 'user',
        content: trimmed,
      };
      setMessages((prev) => [...prev, userMsg]);
      setInput('');
      setLoading(true);

      try {
        const history = [...messages, userMsg]
          .filter((m) => m.id !== 'welcome')
          .slice(-10)
          .map((m) => ({ role: m.role, content: m.content }));

        const res = await fetch('/api/ai/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: trimmed,
            history,
            bookingDraft,
          }),
        });
        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || 'Lỗi chatbot');
        }

        if (data.bookingDraft) {
          setBookingDraft(data.bookingDraft as BookingDraft);
        }

        setMessages((prev) => [
          ...prev,
          {
            id: `a-${Date.now()}`,
            role: 'assistant',
            content: data.reply as string,
            movies: (data.movies as ChatMovie[]) || [],
            showtimeOptions: (data.showtimeOptions as ShowtimeOption[]) || [],
            confirmUrl: data.confirmUrl as string | undefined,
          },
        ]);
      } catch {
        setMessages((prev) => [
          ...prev,
          {
            id: `e-${Date.now()}`,
            role: 'assistant',
            content:
              'Xin lỗi, hệ thống AI tạm thời không phản hồi. Bạn thử lại sau hoặc đặt vé tại mục Suất chiếu nhé.',
          },
        ]);
      } finally {
        setLoading(false);
      }
    },
    [loading, messages, bookingDraft],
  );

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="fixed bottom-5 right-5 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-rose-500 via-fuchsia-500 to-sky-500 text-white shadow-lg shadow-fuchsia-500/30 transition hover:scale-105 focus:outline-none focus:ring-2 focus:ring-sky-400 print:hidden"
        aria-label={open ? 'Đóng chatbot AI' : 'Mở chatbot AI tư vấn & đặt vé'}
      >
        {open ? (
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-6 w-6">
            <path d="M18 6 6 18M6 6l12 12" />
          </svg>
        ) : (
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-6 w-6">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
        )}
      </button>

      {open && (
        <div
          className="fixed right-5 z-50 flex h-[min(600px,75vh)] w-[min(400px,calc(100vw-2rem))] flex-col overflow-hidden rounded-2xl border border-white/10 bg-slate-950/95 shadow-2xl backdrop-blur-xl print:hidden"
          style={{ bottom: '5.5rem' }}
          role="dialog"
          aria-label="AI Chatbot tư vấn và đặt vé"
        >
          <div className="flex items-center justify-between border-b border-white/10 bg-gradient-to-r from-rose-500/20 via-fuchsia-500/20 to-sky-500/20 px-4 py-3">
            <div>
              <p className="text-sm font-semibold text-white">AI Tư vấn & Đặt vé</p>
              <p className="text-xs text-slate-400">
                Đề xuất suất → bạn xác nhận → chọn ghế trên web
              </p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-white/10 hover:text-white"
              aria-label="Đóng"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto px-3 py-3">
            {messages.map((m) => (
              <div
                key={m.id}
                className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[90%] rounded-2xl px-3 py-2 text-sm leading-relaxed ${
                    m.role === 'user'
                      ? 'bg-sky-600 text-white'
                      : 'bg-white/10 text-slate-100'
                  }`}
                >
                  <p className="whitespace-pre-wrap">{m.content}</p>

                  {m.showtimeOptions && m.showtimeOptions.length > 0 && !m.confirmUrl && (
                    <div className="mt-2 space-y-1.5 border-t border-white/10 pt-2">
                      {m.showtimeOptions.map((opt, idx) => (
                        <button
                          key={opt.id}
                          type="button"
                          disabled={loading}
                          onClick={() => void send(`Chọn suất ${idx + 1}`)}
                          className="flex w-full flex-col rounded-lg border border-white/10 bg-black/30 px-2.5 py-2 text-left text-xs transition hover:border-sky-400/40 hover:bg-black/50 disabled:opacity-50"
                        >
                          <span className="font-medium text-white">
                            {idx + 1}. {opt.time} – {opt.cinema}
                          </span>
                          <span className="text-slate-400">
                            {opt.movieTitle} · {opt.city}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}

                  {m.confirmUrl && (
                    <div className="mt-3 space-y-2 border-t border-white/10 pt-2">
                      <Link
                        href={m.confirmUrl}
                        onClick={() => setOpen(false)}
                        className="flex w-full items-center justify-center rounded-xl bg-emerald-600 px-3 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-500"
                      >
                        Xác nhận → Chọn ghế & thanh toán
                      </Link>
                      <p className="text-[10px] text-slate-400">
                        AI không tự tạo đơn. Bạn hoàn tất ghế/thanh toán trên trang đặt vé.
                      </p>
                    </div>
                  )}

                  {m.movies && m.movies.length > 0 && (
                    <div className="mt-2 space-y-1.5 border-t border-white/10 pt-2">
                      {m.movies.map((mv) => (
                        <button
                          key={mv.id}
                          type="button"
                          disabled={loading}
                          onClick={() => void send(`Chọn phim ${mv.title}`)}
                          className="flex w-full items-center gap-2 rounded-lg bg-black/20 p-1.5 text-left transition hover:bg-black/40 disabled:opacity-50"
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={mv.posterUrl}
                            alt=""
                            className="h-12 w-8 rounded object-cover"
                          />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-xs font-medium text-white">
                              {mv.title}
                            </p>
                            <p className="truncate text-[10px] text-slate-400">
                              {mv.genre} · {mv.ageRating} · Chọn để xem suất
                            </p>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="rounded-2xl bg-white/10 px-3 py-2 text-sm text-slate-400">
                  Đang tìm suất phù hợp…
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {messages.length <= 2 && (
            <div className="flex flex-wrap gap-1.5 border-t border-white/5 px-3 py-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  disabled={loading}
                  onClick={() => send(s)}
                  className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] text-slate-300 transition hover:border-sky-400/40 hover:text-white disabled:opacity-50"
                >
                  {s.length > 42 ? s.slice(0, 40) + '…' : s}
                </button>
              ))}
            </div>
          )}

          <form
            className="flex gap-2 border-t border-white/10 p-3"
            onSubmit={(e) => {
              e.preventDefault();
              void send(input);
            }}
          >
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="VD: Marvel tối nay HCM 2 người ghế đôi…"
              maxLength={1000}
              disabled={loading}
              className="flex-1 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none placeholder:text-slate-500 focus:border-sky-400/50 disabled:opacity-60"
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="rounded-xl bg-sky-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-sky-500 disabled:opacity-40"
            >
              Gửi
            </button>
          </form>
        </div>
      )}
    </>
  );
}
