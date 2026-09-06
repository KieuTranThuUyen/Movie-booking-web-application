'use client';

import { useEffect, useRef } from 'react';

/**
 * Tự mở hộp thoại in khi URL có ?print=1.
 * Hoạt động cả khi trang được load trong iframe ẩn (in từ admin tra cứu).
 */
export function AutoPrint({ enabled }: { enabled: boolean }) {
  const didPrint = useRef(false);

  useEffect(() => {
    if (!enabled || didPrint.current) return;
    didPrint.current = true;

    const timer = window.setTimeout(() => {
      window.print();
    }, 700);

    return () => window.clearTimeout(timer);
  }, [enabled]);

  return null;
}
