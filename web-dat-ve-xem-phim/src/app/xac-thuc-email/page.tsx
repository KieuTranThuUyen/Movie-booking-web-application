'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('token')?.trim() ?? '';
  const [status, setStatus] = useState<'loading' | 'ok' | 'error'>('loading');
  const [message, setMessage] = useState('Đang xác thực...');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('Thiếu token xác thực.');
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        const res = await fetch('/api/auth/verify-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token }),
        });
        const data = (await res.json()) as { message?: string; redirectTo?: string };
        if (cancelled) return;
        if (res.ok) {
          setStatus('ok');
          setMessage(data.message ?? 'Xác thực thành công.');
          if (data.redirectTo) {
            setTimeout(() => router.push(data.redirectTo!), 2000);
          }
        } else {
          setStatus('error');
          setMessage(data.message ?? 'Xác thực thất bại.');
        }
      } catch {
        if (!cancelled) {
          setStatus('error');
          setMessage('Không thể kết nối máy chủ.');
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [token, router]);

  return (
    <div className="mx-auto max-w-lg rounded-[28px] border border-white/10 bg-slate-950/70 p-8 text-center shadow-glow">
      <h1 className="text-2xl font-semibold text-white">Xác thực email</h1>
      <p
        className={`mt-4 text-sm ${
          status === 'ok'
            ? 'text-emerald-300'
            : status === 'error'
              ? 'text-rose-300'
              : 'text-slate-300'
        }`}
      >
        {message}
      </p>
      <Link
        href="/dang-nhap"
        className="mt-6 inline-flex rounded-2xl border border-white/10 px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/5"
      >
        Đến trang đăng nhập
      </Link>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <main className="page-shell py-12 lg:py-16">
      <Suspense
        fallback={
          <div className="mx-auto max-w-lg text-center text-slate-300">Đang tải...</div>
        }
      >
        <VerifyEmailContent />
      </Suspense>
    </main>
  );
}
