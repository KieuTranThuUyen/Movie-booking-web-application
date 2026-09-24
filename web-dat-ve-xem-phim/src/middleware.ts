import { NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import type { NextRequest } from 'next/server';

/** Rate-limit in-memory đơn giản (Edge-safe) */
const buckets = new Map<string, { count: number; resetAt: number }>();

function rateLimit(key: string, limit: number, windowMs: number) {
  const now = Date.now();
  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true };
  }
  if (bucket.count >= limit) return { allowed: false, resetAt: bucket.resetAt };
  bucket.count += 1;
  return { allowed: true };
}

function clientIp(request: NextRequest) {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0]?.trim() || 'unknown';
  return request.headers.get('x-real-ip')?.trim() || 'unknown';
}

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const method = request.method;
  const ip = clientIp(request);

  if (
    pathname.startsWith('/admin') &&
    pathname !== '/admin/dang-nhap'
  ) {
    const token = await getToken({
      req: request,
      secret: process.env.NEXTAUTH_SECRET,
    });

    if (token?.role !== 'ADMIN') {
      const loginUrl = new URL('/admin/dang-nhap', request.url);
      loginUrl.searchParams.set(
        'callbackUrl',
        `${pathname}${request.nextUrl.search}`,
      );
      return NextResponse.redirect(loginUrl);
    }
  }

  // ── Rate limit các API nhạy cảm ───────────────────────────
  const limits: Array<{ test: boolean; key: string; limit: number }> = [
    {
      test:
        pathname === '/api/auth/register' ||
        pathname === '/api/auth/login' ||
        pathname === '/api/auth/callback/credentials',
      key: `auth:${ip}`,
      limit: 5,
    },
    {
      test:
        pathname === '/api/auth/forgot-password' ||
        pathname === '/api/auth/reset-password',
      key: `reset:${ip}`,
      limit: 3,
    },
    {
      test: pathname === '/api/seat-holds' && method === 'POST',
      key: `seat-hold:${ip}`,
      limit: 30,
    },
    {
      test: pathname === '/api/bookings' && method === 'POST',
      key: `booking:${ip}`,
      limit: 10,
    },
  ];

  for (const rule of limits) {
    if (!rule.test) continue;
    const result = rateLimit(rule.key, rule.limit, 60_000);
    if (!result.allowed) {
      return NextResponse.json(
        {
          message: 'Bạn gửi quá nhiều yêu cầu. Vui lòng thử lại sau.',
          code: 'RATE_LIMITED',
        },
        { status: 429 },
      );
    }
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