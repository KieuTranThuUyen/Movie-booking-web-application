import { getServerSession } from 'next-auth/next';
import { getToken } from 'next-auth/jwt';
import type { NextRequest } from 'next/server';
import { UserRole } from '@prisma/client';

import { authOptions } from '@/lib/auth';
import { unauthorized, forbidden } from '@/lib/api/errors';

export type SessionUser = {
  id: string;
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  role: UserRole;
};

/**
 * Lấy session user từ cookie (Server Component / Route Handler).
 * Throw ApiError 401 nếu chưa đăng nhập.
 */
export async function requireUser(): Promise<SessionUser> {
  const session = await getServerSession(authOptions);
  const user = session?.user;

  if (!user?.id) {
    throw unauthorized();
  }

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone ?? null,
    role: (user.role as UserRole) ?? UserRole.CUSTOMER,
  };
}

/**
 * Yêu cầu role ADMIN.
 */
export async function requireAdmin(): Promise<SessionUser> {
  const user = await requireUser();
  if (user.role !== UserRole.ADMIN) {
    throw forbidden();
  }
  return user;
}

/**
 * Kiểm tra ADMIN qua JWT (dùng trong middleware-style / khi không có session cookie đầy đủ).
 */
export async function isAdminFromRequest(request: Request): Promise<boolean> {
  const token = await getToken({
    req: request as NextRequest,
    secret: process.env.NEXTAUTH_SECRET,
  });
  return token?.role === 'ADMIN';
}

/**
 * Đảm bảo user sở hữu resource, hoặc là ADMIN.
 * @param ownerId - userId của resource (booking, ticket, ...)
 */
export function assertOwnership(user: SessionUser, ownerId: string): void {
  if (user.id !== ownerId && user.role !== UserRole.ADMIN) {
    throw forbidden('Bạn không có quyền truy cập dữ liệu này.');
  }
}
