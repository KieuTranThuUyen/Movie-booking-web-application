import Link from 'next/link';
import { getServerSession } from 'next-auth/next';
import { redirect } from 'next/navigation';

import { authOptions } from '@/lib/auth';
import { ChangePasswordForm } from '@/components/forms/change-password-form';

export default async function ChangePasswordPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect('/dang-nhap?callbackUrl=/tai-khoan/doi-mat-khau');
  }

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-10 text-white sm:px-6 lg:px-8">
      <div className="mx-auto max-w-2xl">
        <Link
          href="/tai-khoan"
          className="inline-flex items-center text-sm text-slate-400 transition hover:text-white"
        >
          ← Quay lại tài khoản
        </Link>

        <div className="mt-6">
          <p className="text-sm uppercase tracking-[0.35em] text-sky-300/80">
            Tài khoản
          </p>

          <h1 className="mt-2 text-3xl font-bold sm:text-4xl">
            Đổi mật khẩu
          </h1>

          <p className="mt-2 text-slate-400">
            Cập nhật mật khẩu mới để bảo vệ tài khoản của bạn.
          </p>
        </div>

        <div className="mt-8">
          <ChangePasswordForm />
        </div>
      </div>
    </main>
  );
}