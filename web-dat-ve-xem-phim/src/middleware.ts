import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

import { checkRateLimit, getClientIp } from '@/lib/security/rate-limit';

/** Rate-limit config cho các endpoint nhạy cảm */
const RATE_LIMITS: Array<{
  match: (path: string, method: string) => boolean;
  key: (path: string, method: string, ip: string) => string;
  limit: number;
  windowMs: number;
}> = [
  {
    match: (p) =>
      p === '/api/auth/register' ||
      p === '/api/auth/login' ||
      p === '/api/auth/callback/credentials',
    key: (p, _m, ip) => `auth:${p.includes('register') ? 'register' : 'login'}:${ip}`,
    limit: 5,
    windowMs: 60_000,
  },
  {
    match: (p) => p === '/api/auth/forgot-password' || p === '/api/auth/reset-password',
    key: (p, _m, ip) => `auth:reset:${ip}`,
    limit: 3,
    windowMs: 60_000,
  },
  {
    match: (p, m) => p === '/api/seat-holds' && m === 'POST',
    key: (_p, _m, ip) => `seat-hold:${ip}`,
    limit: 30,
    windowMs: 60_000,
  },
  {
    match: (p, m) => p === '/api/bookings' && m === 'POST',
    key: (_p, _m, ip) => `booking-create:${ip}`,
    limit: 10,
    windowMs: 60_000,
  },
  {
    match: (p) => p.startsWith('/api/bookings/') && p.endsWith('/cancel'),
    key: (_p, _m, ip) => `booking-cancel:${ip}`,
    limit: 10,
    windowMs: 60_000,
  },
];

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const method = request.method;
  const ip = getClientIp(request);

  // ── Rate limiting ──────────────────────────────────────────
  for (const rule of RATE_LIMITS) {
    if (rule.match(pathname, method)) {
      const result = checkRateLimit(rule.key(pathname, method, ip), rule.limit, rule.windowMs);
      if (!result.allowed) {
        const retryAfterSeconds = Math.max(1, Math.ceil((result.resetAt - Date.now()) / 1000));
        return new NextResponse(
          JSON.stringify({
            message: 'Bạn gửi quá nhiều yêu cầu. Vui lòng thử lại sau.',
            code: 'RATE_LIMITED',
            retryAfterSeconds,
          }),
          {
            status: 429,
            headers: {
              'Content-Type': 'application/json; charset=utf-8',
              'Retry-After': String(retryAfterSeconds),
              'Cache-Control': 'no-store',
            },
          },
        );
      }
    }
  }

  // Auth routes không cần token admin
  if (pathname.startsWith('/api/auth/')) {
    return NextResponse.next();
  }

  // Trang đăng nhập admin
  if (pathname === '/admin/dang-nhap') {
    return NextResponse.next();
  }

  // Bảo vệ /admin/* và /api/admin/*
  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  });

  if (!token) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json(
        { message: 'Bạn cần đăng nhập.', code: 'UNAUTHORIZED' },
        { status: 401 },
      );
    }
    const loginUrl = new URL('/admin/dang-nhap', request.url);
    loginUrl.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (token.role !== 'ADMIN') {
    if (pathname.startsWith('/api/admin')) {
      return NextResponse.json(
        { message: 'Bạn không có quyền thực hiện thao tác này.', code: 'FORBIDDEN' },
        { status: 403 },
      );
    }
    return NextResponse.redirect(new URL('/', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/admin/:path*',
    '/api/admin/:path*',
    '/api/auth/:path*',
    '/api/seat-holds',
    '/api/bookings',
    '/api/bookings/:path*',
  ],
};
