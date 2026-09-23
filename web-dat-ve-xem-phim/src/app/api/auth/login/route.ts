import { NextResponse } from 'next/server';

import { findAuthenticatedUser } from '@/lib/auth';
import { loginSchema } from '@/lib/validation/auth';
import { handleApiError, unauthorized } from '@/lib/api/errors';
import { logger } from '@/lib/security/logger';

/**
 * Endpoint kiểm tra credentials (không tạo session).
 * Session thực tế do NextAuth CredentialsProvider xử lý.
 */
export async function POST(request: Request) {
  try {
    const body = loginSchema.parse(await request.json());
    const user = await findAuthenticatedUser(body.name, body.password);

    if (!user) {
      // Không tiết lộ email/phone nào tồn tại
      throw unauthorized('Thông tin đăng nhập không hợp lệ.');
    }

    logger.info('auth/login', 'Login check OK', { userId: user.id });

    return NextResponse.json({
      message: 'Đăng nhập thành công.',
      redirectTo: user.role === 'ADMIN' ? '/admin' : '/tai-khoan',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    return handleApiError(error, 'POST /api/auth/login');
  }
}
