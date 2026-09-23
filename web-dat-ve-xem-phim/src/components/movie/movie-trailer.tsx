'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';

type MovieTrailerProps = {
  imageUrl: string | null;
  trailerUrl: string | null;
  title: string;
};

function getYoutubeEmbedUrl(url: string): string | null {
  try {
    const parsedUrl = new URL(url.trim());

    const hostname = parsedUrl.hostname.toLowerCase();

    // https://www.youtube.com/watch?v=VIDEO_ID
    if (
      hostname === 'youtube.com' ||
      hostname === 'www.youtube.com' ||
      hostname === 'm.youtube.com'
    ) {
      const videoId = parsedUrl.searchParams.get('v');

      if (videoId) {
        return `https://www.youtube.com/embed/${videoId}`;
      }

      // https://www.youtube.com/embed/VIDEO_ID
      if (parsedUrl.pathname.startsWith('/embed/')) {
        const videoId = parsedUrl.pathname
          .split('/embed/')[1]
          ?.split('/')[0];

        if (videoId) {
          return `https://www.youtube.com/embed/${videoId}`;
        }
      }

      // https://www.youtube.com/shorts/VIDEO_ID
      if (parsedUrl.pathname.startsWith('/shorts/')) {
        const videoId = parsedUrl.pathname
          .split('/shorts/')[1]
          ?.split('/')[0];

        if (videoId) {
          return `https://www.youtube.com/embed/${videoId}`;
        }
      }
    }

    // https://youtu.be/VIDEO_ID
    if (
      hostname === 'youtu.be' ||
      hostname === 'www.youtu.be'
    ) {
      const videoId = parsedUrl.pathname
        .substring(1)
        .split('/')[0];

      if (videoId) {
        return `https://www.youtube.com/embed/${videoId}`;
      }
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
  const [origin, setOrigin] = useState('');

  /*
   * Không dùng window.location.origin trực tiếp
   * trong lúc render vì Client Component vẫn có thể
   * được prerender phía server.
   */
  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  const embedUrl = trailerUrl
    ? getYoutubeEmbedUrl(trailerUrl)
    : null;

  const iframeUrl =
    embedUrl && origin
      ? `${embedUrl}?rel=0&enablejsapi=1&origin=${encodeURIComponent(
          origin,
        )}`
      : null;

  return (
    <div className="flex w-full flex-col items-center gap-4">
      {showTrailer && iframeUrl ? (
        <div className="w-full max-w-[480px]">
          <div className="relative aspect-video w-full overflow-hidden rounded-2xl border border-white/10 bg-black shadow-xl">
            <iframe
              src={iframeUrl}
              title={`Trailer ${title}`}
              className="absolute inset-0 h-full w-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
              referrerPolicy="strict-origin-when-cross-origin"
            />
          </div>
        </div>
      ) : imageUrl ? (
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
          {showTrailer ? 'Ảnh' : 'Trailer'}
        </button>
      )}
    </div>
  );
}