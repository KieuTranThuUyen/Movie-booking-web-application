'use client';

import { useEffect, useRef } from 'react';

/**
 * Tự mở hộp thoại in khi URL có ?print=1.
 * Chờ QR của tất cả vé render xong trước khi mở hộp thoại in.
 */
export function AutoPrint({ enabled }: { enabled: boolean }) {
  const didPrint = useRef(false);

  useEffect(() => {
    if (!enabled || didPrint.current) return;
    didPrint.current = true;

    let cancelled = false;
    const startedAt = Date.now();

    const printWhenReady = () => {
      if (cancelled) return;

      const hasQrPlaceholder = Array.from(
        document.querySelectorAll('#electronic-ticket *'),
      ).some((element) =>
        element.textContent?.replace(/\s+/g, ' ').trim().includes('Đang tạo QR...'),
      );
      const imagesReady = Array.from(
        document.querySelectorAll<HTMLImageElement>('#electronic-ticket img'),
      ).every((image) => image.complete && image.naturalWidth > 0);
      const timedOut = Date.now() - startedAt > 10_000;

      if ((!hasQrPlaceholder && imagesReady) || timedOut) {
        window.print();
        return;
      }

      window.setTimeout(printWhenReady, 100);
    };

    const timer = window.setTimeout(printWhenReady, 100);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [enabled]);

  return null;
}
