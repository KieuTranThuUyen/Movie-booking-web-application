'use client';

import Link from 'next/link';
import { useSession } from 'next-auth/react';

import { SignOutButton } from '@/components/layout/sign-out-button';

export function HeaderAccount() {
  const { data: session, status } = useSession();

  if (status === 'loading') {
    return (
      <div className="h-9 w-24 animate-pulse rounded-full bg-white/10" />
    );
  }

  if (session) {
    return (
      <>
        <Link
          href="/tai-khoan"
          className="rounded-full border border-white/10 px-4 py-2 text-sm text-slate-100 transition hover:border-white/20 hover:bg-white/5"
        >
          {session.user.role === 'ADMIN'
            ? 'Administrator'
            : session.user.name ?? 'Tài khoản'}
        </Link>

        <SignOutButton
          className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-slate-100"
        />
      </>
    );
  }

  return (
    <>
      <Link
        href="/dang-nhap"
        className="rounded-full border border-white/10 px-4 py-2 text-sm text-slate-100 transition hover:border-white/20 hover:bg-white/5"
      >
        Đăng nhập
      </Link>

      <Link
        href="/dang-ky"
        className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-slate-100"
      >
        Đăng ký
      </Link>
    </>
  );
}

