'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

type FavoriteButtonProps = {
  movieId: string;
  initialFavorite?: boolean;
  className?: string;
};

export function FavoriteButton({
  movieId,
  initialFavorite = false,
  className = '',
}: FavoriteButtonProps) {
  const router = useRouter();
  const [isFavorite, setIsFavorite] = useState(initialFavorite);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (initialFavorite) return;

    fetch(`/api/favorites?movieId=${encodeURIComponent(movieId)}`)
      .then(async (response) => {
        if (response.ok) {
          const data = (await response.json()) as { isFavorite?: boolean };
          setIsFavorite(Boolean(data.isFavorite));
        }
      })
      .catch(() => undefined);
  }, [initialFavorite, movieId]);

  const toggleFavorite = async () => {
    if (loading) return;

    setLoading(true);
    try {
      const response = await fetch('/api/favorites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ movieId }),
      });

      if (response.status === 401) {
        router.push(`/dang-nhap?callbackUrl=${encodeURIComponent(window.location.pathname)}`);
        return;
      }

      if (response.ok) {
        const data = (await response.json()) as { isFavorite: boolean };
        setIsFavorite(data.isFavorite);
        router.refresh();
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={toggleFavorite}
      aria-label={isFavorite ? 'Xóa khỏi mục yêu thích' : 'Thêm vào mục yêu thích'}
      aria-pressed={isFavorite}
      disabled={loading}
      className={`flex h-10 w-10 items-center justify-center rounded-full border border-white/20 bg-black/60 text-white backdrop-blur-md transition hover:scale-105 hover:border-rose-300/70 hover:text-rose-300 disabled:cursor-wait disabled:opacity-70 ${className}`}
    >
      <svg
        viewBox="0 0 24 24"
        fill={isFavorite ? 'currentColor' : 'none'}
        stroke="currentColor"
        strokeWidth="1.8"
        className="h-5 w-5"
        aria-hidden="true"
      >
        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78L12 21.23l8.84-8.84a5.5 5.5 0 0 0 0-7.78Z" />
      </svg>
    </button>
  );
}