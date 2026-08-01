import Link from 'next/link';
import { LoginForm } from '@/components/forms/login-form';

export default function LoginPage() {
  return (
    <main className="page-shell py-12 lg:py-16">
      <div className="grid gap-8 lg:grid-cols-2 lg:items-center">
        <section className="space-y-6 rounded-[32px] border border-white/10 bg-white/5 p-8 shadow-glow">
          <div className="inline-flex rounded-full border border-white/10 bg-slate-950/50 px-4 py-2 text-sm text-sky-200">
            Đăng nhập tài khoản người dùng
          </div>
          <h1 className="text-4xl font-bold text-white">Đăng nhập để quản lý vé và lịch sử đặt chỗ.</h1>
          <p className="max-w-xl text-slate-300">
            Dùng email hoặc số điện thoại để truy cập tài khoản, xem lịch sử đặt vé và tiếp tục đặt chỗ nhanh hơn.
          </p>
          <Link href="/dang-ky" className="inline-flex rounded-full border border-white/10 px-6 py-3 font-semibold text-white transition hover:bg-white/5">
            Chưa có tài khoản? Đăng ký
          </Link>
        </section>

        <LoginForm />
      </div>
    </main>
  );
}