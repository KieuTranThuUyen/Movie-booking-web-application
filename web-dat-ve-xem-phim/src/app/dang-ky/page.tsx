import Link from 'next/link';
import { RegisterForm } from '@/components/forms/register-form';

export default function RegisterPage() {
  return (
    <main className="page-shell py-12 lg:py-16">
      <div className="grid gap-8 lg:grid-cols-2 lg:items-center">
        <section className="space-y-6 rounded-[32px] border border-white/10 bg-white/5 p-8 shadow-glow">
          <div className="inline-flex rounded-full border border-white/10 bg-slate-950/50 px-4 py-2 text-sm text-sky-200">
            Tạo tài khoản người dùng mới
          </div>
          <h1 className="text-4xl font-bold text-white">Tạo tài khoản để đặt vé nhanh hơn.</h1>
          <p className="max-w-xl text-slate-300">
            Điền email, số điện thoại và mật khẩu để tạo tài khoản và tiếp tục hoàn thiện luồng đặt vé.
          </p>
          <Link href="/dang-nhap" className="inline-flex rounded-full border border-white/10 px-6 py-3 font-semibold text-white transition hover:bg-white/5">
            Đã có tài khoản? Đăng nhập
          </Link>
        </section>

        <RegisterForm />
      </div>
    </main>
  );
}