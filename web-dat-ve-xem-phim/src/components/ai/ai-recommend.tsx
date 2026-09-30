'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';

type RecMovie = {
  id: string;
  title: string;
  slug: string;
  genre: string;
  duration: number;
  ageRating: string;
  posterUrl: string;
  imageUrl?: string;
  synopsis?: string;
  isNowShowing: boolean;
};

const MOODS = [
  { label: 'Hành động', value: 'hành động' },
  { label: 'Hài hước', value: 'hài' },
  { label: 'Tình cảm', value: 'tình cảm' },
  { label: 'Kinh dị', value: 'kinh dị' },
  { label: 'Gia đình', value: 'gia đình hoạt hình' },
  { label: 'Phiêu lưu', value: 'phiêu lưu' },
];

type Props = {
  /** Gợi ý tương tự phim đang xem */
  basedOnMovieId?: string;
  title?: string;
  className?: string;
};

export function AiRecommend({
  basedOnMovieId,
  title = 'AI đề xuất phim cho bạn',
  className = '',
}: Props) {
  const [movies, setMovies] = useState<RecMovie[]>([]);
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(true);
  const [activeMood, setActiveMood] = useState<string | null>(null);

  const fetchRec = useCallback(
    async (mood?: string) => {
      setLoading(true);
      try {
        const res = await fetch('/api/ai/recommend', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            mood: mood || undefined,
            basedOnMovieId,
            limit: 6,
          }),
        });
        const data = await res.json();
        if (res.ok) {
          setMovies((data.movies as RecMovie[]) || []);
          setReason((data.reason as string) || '');
        }
      } catch {
        setMovies([]);
        setReason('Không tải được đề xuất.');
      } finally {
        setLoading(false);
      }
    },
    [basedOnMovieId],
  );

  useEffect(() => {
    void fetchRec();
  }, [fetchRec]);

  return (
    <section className={`rounded-2xl border border-white/10 bg-white/5 p-4 sm:p-6 ${className}`}>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-fuchsia-300/80">
            AI Recommend
          </p>
          <h2 className="mt-1 text-xl font-semibold text-white">{title}</h2>
          {reason && !loading && (
            <p className="mt-1 text-sm text-slate-400">{reason}</p>
          )}
        </div>
      </div>

      {!basedOnMovieId && (
        <div className="mt-4 flex flex-wrap gap-2">
          {MOODS.map((m) => (
            <button
              key={m.value}
              type="button"
              disabled={loading}
              onClick={() => {
                setActiveMood(m.value);
                void fetchRec(m.value);
              }}
              className={`rounded-full border px-3 py-1 text-xs transition ${
                activeMood === m.value
                  ? 'border-fuchsia-400/60 bg-fuchsia-500/20 text-white'
                  : 'border-white/10 bg-white/5 text-slate-300 hover:border-white/20 hover:text-white'
              } disabled:opacity-50`}
            >
              {m.label}
            </button>
          ))}
          {activeMood && (
            <button
              type="button"
              disabled={loading}
              onClick={() => {
                setActiveMood(null);
                void fetchRec();
              }}
              className="rounded-full border border-white/10 px-3 py-1 text-xs text-slate-400 hover:text-white"
            >
              Xóa bộ lọc
            </button>
          )}
        </div>
      )}

      {loading ? (
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="aspect-[2/3] animate-pulse rounded-xl bg-white/10"
            />
          ))}
        </div>
      ) : movies.length === 0 ? (
        <p className="mt-6 text-sm text-slate-500">Chưa có đề xuất phù hợp.</p>
      ) : (
        <ul className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-6">
          {movies.map((m) => (
            <li key={m.id}>
              <Link
                href={`/phim/${m.slug}`}
                className="group block overflow-hidden rounded-xl border border-white/10 bg-black/20 transition hover:border-fuchsia-400/40"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={m.imageUrl?.trim() || m.posterUrl}
                  alt={m.title}
                  className="aspect-[2/3] w-full object-cover transition group-hover:scale-105"
                />
                <div className="p-2">
                  <p className="line-clamp-2 text-xs font-medium text-white">
                    {m.title}
                  </p>
                  <p className="mt-0.5 truncate text-[10px] text-slate-400">
                    {m.genre}
                  </p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
