import Link from 'next/link';
import { getServerSession } from 'next-auth/next';

import { SignOutButton } from '@/components/sign-out-button';
import { authOptions } from '@/lib/auth';

export async function SiteHeader() {
  const session =
    await getServerSession(authOptions);

  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-slate-950/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
        {/* LOGO */}
        <Link
          href="/"
          className="flex items-center gap-3 font-semibold tracking-wide text-white"
        >
          <span className="grid h-10 w-10 place-items-center rounded-2xl bg-gradient-to-br from-rose-500 via-fuchsia-500 to-sky-500 text-sm shadow-glow">
            DVX
          </span>

          <div>
            <div className="text-sm uppercase tracking-[0.35em] text-sky-300/80">
              Cinema
            </div>

            <div className="text-lg">
              DatVeXemPhim
            </div>
          </div>
        </Link>

        {/* SEARCH */}
        <div className="hidden max-w-md flex-1 lg:flex">
          <form
            action="/phim"
            method="GET"
            className="relative w-full"
          >
            <input
              type="text"
              name="search"
              placeholder="Tìm kiếm phim..."
              className="w-full rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white outline-none placeholder:text-slate-500 transition focus:border-white/20 focus:bg-white/10"
            />

            <button
              type="submit"
              className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-slate-400 transition hover:bg-white/10 hover:text-white"
              aria-label="Tìm kiếm"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className="h-4 w-4"
                aria-hidden="true"
              >
                <circle
                  cx="11"
                  cy="11"
                  r="7"
                />

                <path d="m20 20-4-4" />
              </svg>
            </button>
          </form>
        </div>

        {/* ACCOUNT */}
        <div className="hidden items-center gap-3 sm:flex">
          {session ? (
            <>
              <Link
                href="/tai-khoan"
                className="rounded-full border border-white/10 px-4 py-2 text-sm text-slate-100 transition hover:border-white/20 hover:bg-white/5"
              >
                {session.user.role === 'ADMIN'
                  ? 'Administrator'
                  : session.user.name ??
                    'Tài khoản'}
              </Link>

              <SignOutButton
                className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-slate-100"
              />
            </>
          ) : (
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
          )}
        </div>
      </div>
    </header>
  );
}

export default SiteHeader;