'use client';

import Image from 'next/image';
import QRCode from 'qrcode';
import { useEffect, useState } from 'react';

type BookingQRProps = {
  value: string;
};

export function BookingQR({
  value,
}: BookingQRProps) {
  const [qrUrl, setQrUrl] = useState('');

  useEffect(() => {
    let cancelled = false;

    QRCode.toDataURL(value, {
      width: 220,
      margin: 2,
    })
      .then((url) => {
        if (!cancelled) {
          setQrUrl(url);
        }
      })
      .catch((error) => {
        console.error('QR error:', error);
      });

    return () => {
      cancelled = true;
    };
  }, [value]);

  if (!qrUrl) {
    return (
      <div className="flex h-[180px] w-[180px] items-center justify-center rounded-2xl bg-white text-xs text-slate-500">
        Đang tạo QR...
      </div>
    );
  }

  return (
    <div className="rounded-2xl bg-white p-3">
      <Image
        src={qrUrl}
        alt={`Mã QR ${value}`}
        width={180}
        height={180}
        unoptimized
        className="h-[180px] w-[180px]"
      />
    </div>
  );
}