'use client';

import Image from 'next/image';
import { useState } from 'react';

type MovieTrailerProps = {
  posterUrl: string;
  trailerUrl: string | null;
  title: string;
};

function getYoutubeEmbedUrl(
  url: string,
): string | null {
  try {
    const parsedUrl = new URL(url);

    const videoId =
      parsedUrl.searchParams.get('v');

    if (videoId) {
      return `https://www.youtube.com/embed/${videoId}`;
    }

    if (
      parsedUrl.hostname === 'youtu.be' ||
      parsedUrl.hostname === 'www.youtu.be'
    ) {
      const id =
        parsedUrl.pathname.substring(1);

      if (id) {
        return `https://www.youtube.com/embed/${id}`;
      }
    }

    if (
      parsedUrl.pathname.startsWith('/embed/')
    ) {
      return url;
    }

    return null;
  } catch {
    return null;
  }
}

export function MovieTrailer({
  posterUrl,
  trailerUrl,
  title,
}: MovieTrailerProps) {
  const [showTrailer, setShowTrailer] =
    useState(false);

  const embedUrl = trailerUrl
    ? getYoutubeEmbedUrl(trailerUrl)
    : null;

  return (
    <div className="flex w-full flex-col items-center gap-4">
      {/* POSTER / TRAILER */}
      <div className="w-full max-w-[480px]">
        <div className="relative aspect-video overflow-hidden rounded-2xl border border-white/10 bg-black shadow-xl">
          {showTrailer && embedUrl ? (
            <iframe
              src={`${embedUrl}?rel=0`}
              title={`Trailer ${title}`}
              className="absolute inset-0 h-full w-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
            />
          ) : (
            <Image
              src={posterUrl}
              alt={`Poster ${title}`}
              fill
              unoptimized
              sizes="(max-width: 768px) 100vw, 480px"
              className="object-cover"
            />
          )}
        </div>
      </div>

      {/* TRAILER BUTTON */}
      {embedUrl && (
        <button
          type="button"
          onClick={() =>
            setShowTrailer((value) => !value)
          }
          className="rounded-full bg-white px-5 py-2 text-sm font-semibold text-slate-950 transition hover:bg-slate-100"
        >
          {showTrailer ? 'Poster' : 'Trailer'}
        </button>
      )}
    </div>
  );
}