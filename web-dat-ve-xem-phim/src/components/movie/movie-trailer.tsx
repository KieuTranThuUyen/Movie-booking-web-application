'use client';

import Image from 'next/image';
import { useState } from 'react';

type MovieTrailerProps = {
  imageUrl: string | null;
  trailerUrl: string | null;
  title: string;
};

function getYoutubeEmbedUrl(url: string): string | null {
  try {
    const parsedUrl = new URL(url);

    const videoId = parsedUrl.searchParams.get('v');

    if (videoId) {
      return `https://www.youtube.com/embed/${videoId}`;
    }

    if (
      parsedUrl.hostname === 'youtu.be' ||
      parsedUrl.hostname === 'www.youtu.be'
    ) {
      const id = parsedUrl.pathname.substring(1);

      if (id) {
        return `https://www.youtube.com/embed/${id}`;
      }
    }

    if (parsedUrl.pathname.startsWith('/embed/')) {
      return url;
    }

    return null;
  } catch {
    return null;
  }
}

export function MovieTrailer({
  imageUrl,
  trailerUrl,
  title,
}: MovieTrailerProps) {
  const [showTrailer, setShowTrailer] = useState(false);

  const embedUrl = trailerUrl
    ? getYoutubeEmbedUrl(trailerUrl)
    : null;

  return (
    <div className="flex w-full flex-col items-center gap-4">
      {showTrailer && embedUrl ? (
        /* =========================
           TRAILER
           GIỮ KHUNG 16:9
           ========================= */
        <div className="w-full max-w-[480px]">
          <div className="relative aspect-video w-full overflow-hidden rounded-2xl border border-white/10 bg-black shadow-xl">
            <iframe
              src={`${embedUrl}?rel=0`}
              title={`Trailer ${title}`}
              className="absolute inset-0 h-full w-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
            />
          </div>
        </div>
      ) : imageUrl ? (
        /* =========================
           IMAGE
           CHỈ RỘNG BẰNG ẢNH
           CAO = TRAILER
           KHÔNG DƯ KHUNG ĐEN
           ========================= */
        <div className="flex h-[270px] w-fit overflow-hidden rounded-2xl border border-white/10 bg-black shadow-xl">
          <Image
            src={imageUrl}
            alt={`Ảnh ${title}`}
            width={480}
            height={720}
            unoptimized
            sizes="270px"
            className="h-[270px] w-auto object-contain"
          />
        </div>
      ) : (
        <div className="flex h-[270px] w-[180px] items-center justify-center rounded-2xl border border-white/10 bg-slate-900 text-center text-sm text-slate-400">
          Không có ảnh
        </div>
      )}

      {embedUrl && (
        <button
          type="button"
          onClick={() => setShowTrailer((value) => !value)}
          className="rounded-full bg-white px-5 py-2 text-sm font-semibold text-slate-950 transition hover:bg-slate-100"
        >
          {showTrailer ? 'Image' : 'Trailer'}
        </button>
      )}
    </div>
  );
}
