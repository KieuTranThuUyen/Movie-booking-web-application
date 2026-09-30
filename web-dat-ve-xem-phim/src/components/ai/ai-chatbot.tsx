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

type Msg = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  movies?: ChatMovie[];
};

const SUGGESTIONS = [
  'Gợi ý phim hành động đang chiếu',
  'Phim hài phù hợp gia đình',
  'Phim kinh dị không quá dài',
  'Phim tình cảm lãng mạn',
];

export function AiChatbot() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content:
        'Xin chào! Mình là trợ lý AI tư vấn phim của DatVeXemPhim. Bạn muốn xem thể loại gì, hoặc đang có tâm trạng thế nào?',
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
          body: JSON.stringify({ message: trimmed, history }),
        });
        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || 'Lỗi chatbot');
        }

        setMessages((prev) => [
          ...prev,
          {
            id: `a-${Date.now()}`,
            role: 'assistant',
            content: data.reply as string,
            movies: (data.movies as ChatMovie[]) || [],
          },
        ]);
      } catch {
        setMessages((prev) => [
          ...prev,
          {
            id: `e-${Date.now()}`,
            role: 'assistant',
            content:
              'Xin lỗi, hệ thống AI tạm thời không phản hồi. Bạn thử lại sau hoặc tìm phim tại mục Phim nhé.',
          },
        ]);
      } finally {
        setLoading(false);
      }
    },
    [loading, messages],
  );

  return (
    <>
      {/* Nút nổi */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="fixed bottom-5 right-5 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-rose-500 via-fuchsia-500 to-sky-500 text-white shadow-lg shadow-fuchsia-500/30 transition hover:scale-105 focus:outline-none focus:ring-2 focus:ring-sky-400 print:hidden"
        aria-label={open ? 'Đóng chatbot AI' : 'Mở chatbot AI tư vấn phim'}
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

      {/* Panel chat */}
      {open && (
        <div
          className="fixed bottom-22 right-5 z-50 flex h-[min(560px,70vh)] w-[min(380px,calc(100vw-2rem))] flex-col overflow-hidden rounded-2xl border border-white/10 bg-slate-950/95 shadow-2xl backdrop-blur-xl print:hidden"
          style={{ bottom: '5.5rem' }}
          role="dialog"
          aria-label="AI Chatbot tư vấn phim"
        >
          <div className="flex items-center justify-between border-b border-white/10 bg-gradient-to-r from-rose-500/20 via-fuchsia-500/20 to-sky-500/20 px-4 py-3">
            <div>
              <p className="text-sm font-semibold text-white">AI Tư vấn phim</p>
              <p className="text-xs text-slate-400">Hỏi thể loại, tâm trạng, độ tuổi…</p>
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
                  className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm leading-relaxed ${
                    m.role === 'user'
                      ? 'bg-sky-600 text-white'
                      : 'bg-white/10 text-slate-100'
                  }`}
                >
                  <p className="whitespace-pre-wrap">{m.content}</p>
                  {m.movies && m.movies.length > 0 && (
                    <div className="mt-2 space-y-1.5 border-t border-white/10 pt-2">
                      {m.movies.map((mv) => (
                        <Link
                          key={mv.id}
                          href={`/phim/${mv.slug}`}
                          className="flex items-center gap-2 rounded-lg bg-black/20 p-1.5 transition hover:bg-black/40"
                          onClick={() => setOpen(false)}
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={mv.posterUrl}
                            alt=""
                            className="h-12 w-8 rounded object-cover"
                          />
                          <div className="min-w-0">
                            <p className="truncate text-xs font-medium text-white">
                              {mv.title}
                            </p>
                            <p className="truncate text-[10px] text-slate-400">
                              {mv.genre} · {mv.ageRating}
                            </p>
                          </div>
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="rounded-2xl bg-white/10 px-3 py-2 text-sm text-slate-400">
                  Đang suy nghĩ…
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
                  {s}
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
              placeholder="Hỏi AI về phim…"
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
