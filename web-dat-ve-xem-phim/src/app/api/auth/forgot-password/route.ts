import { NextResponse } from 'next/server';

import { prisma } from '@/lib/db/prisma';
import { forgotPasswordSchema } from '@/lib/validation/auth';
import { handleApiError } from '@/lib/api/errors';
import { createAuthToken, TOKEN_TYPES } from '@/lib/auth/tokens';
import { sendPasswordResetEmail } from '@/lib/mail';
import { logger } from '@/lib/security/logger';

/**
 * Luôn trả message giống nhau để không lộ email có tồn tại hay không.
 */
export async function POST(request: Request) {
  try {
    const { email } = forgotPasswordSchema.parse(await request.json());

    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true },
    });

    if (user) {
      const rawToken = await createAuthToken(user.id, TOKEN_TYPES.PASSWORD_RESET);
      await sendPasswordResetEmail(user.email, rawToken);
      logger.info('auth/forgot-password', 'Reset token created', { userId: user.id });
    } else {
      logger.info('auth/forgot-password', 'Email not found (silent)', { email });
    }

    return NextResponse.json({
      message:
        'Nếu email tồn tại trong hệ thống, chúng tôi đã gửi hướng dẫn đặt lại mật khẩu. Vui lòng kiểm tra hộp thư.',
    });
  } catch (error) {
    return handleApiError(error, 'POST /api/auth/forgot-password');
  }
}
