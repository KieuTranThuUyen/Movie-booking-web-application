'use client';

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
    QRCode.toDataURL(value, {
      width: 220,
      margin: 2,
    })
      .then(setQrUrl)
      .catch((error) => {
        console.error('QR error:', error);
      });
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
      <img
        src={qrUrl}
        alt={`Mã QR ${value}`}
        className="h-[180px] w-[180px]"
      />
    </div>
  );
}