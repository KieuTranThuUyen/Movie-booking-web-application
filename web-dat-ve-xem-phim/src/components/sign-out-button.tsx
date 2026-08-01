'use client';

import { signOut } from 'next-auth/react';

type SignOutButtonProps = {
  className?: string;
};

export function SignOutButton({ className }: SignOutButtonProps) {
  return (
    <button type="button" onClick={() => signOut({ callbackUrl: '/' })} className={className}>
      Đăng xuất
    </button>
  );
}