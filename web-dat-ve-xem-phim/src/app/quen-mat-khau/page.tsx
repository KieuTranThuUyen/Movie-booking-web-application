import Link from 'next/link';
import { ForgotPasswordForm } from '@/components/forms/forgot-password-form';

export default function ForgotPasswordPage() {
  return (
    <main className="page-shell py-12 lg:py-16">
      <div className="mx-auto grid max-w-5xl gap-8 lg:grid-cols-2 lg:items-center">
        <section className="space-y-6 rounded-[32px] border border-white/10 bg-white/5 p-8 shadow-glow">
          <div className="inline-flex rounded-full border border-white/10 bg-slate-950/50 px-4 py-2 text-sm text-sky-200">
            Khôi phục tài khoản
          </div>
          <h1 className="text-4xl font-bold text-white">Quên mật khẩu?</h1>
          <p className="max-w-xl text-slate-300">
            Nhập email đã đăng ký. Hệ thống sẽ gửi liên kết đặt lại mật khẩu (hiệu lực 1 giờ).
          </p>
          <Link
            href="/dang-nhap"
            className="inline-flex rounded-full border border-white/10 px-6 py-3 font-semibold text-white transition hover:bg-white/5"
          >
            Quay lại đăng nhập
          </Link>
        </section>
        <ForgotPasswordForm />
      </div>
    </main>
  );
}
