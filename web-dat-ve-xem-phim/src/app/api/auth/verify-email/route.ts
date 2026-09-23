import { NextResponse } from 'next/server';

import { prisma } from '@/lib/db/prisma';
import { z } from 'zod';
import { handleApiError, unauthorized } from '@/lib/api/errors';
import { consumeAuthToken, createAuthToken, TOKEN_TYPES } from '@/lib/auth/tokens';
import { sendEmailVerification } from '@/lib/mail';
import { requireUser } from '@/lib/auth/session';
import { logger } from '@/lib/security/logger';

const verifySchema = z.object({
  token: z.string().trim().min(20).max(200),
});

/** POST — xác thực email bằng token */
export async function POST(request: Request) {
  try {
    const { token } = verifySchema.parse(await request.json());

    const record = await consumeAuthToken(token, TOKEN_TYPES.EMAIL_VERIFY);
    if (!record) {
      throw unauthorized('Liên kết xác thực không hợp lệ hoặc đã hết hạn.');
    }

    await prisma.user.update({
      where: { id: record.userId },
      data: { emailVerified: new Date() },
    });

    await prisma.authToken.deleteMany({
      where: {
        userId: record.userId,
        type: TOKEN_TYPES.EMAIL_VERIFY,
      },
    });

    logger.info('auth/verify-email', 'Email verified', { userId: record.userId });

    return NextResponse.json({
      message: 'Xác thực email thành công.',
      redirectTo: '/dang-nhap',
    });
  } catch (error) {
    return handleApiError(error, 'POST /api/auth/verify-email');
  }
}

/** PUT — gửi lại email xác thực (user đã đăng nhập) */
export async function PUT() {
  try {
    const sessionUser = await requireUser();

    const user = await prisma.user.findUnique({
      where: { id: sessionUser.id },
      select: { id: true, email: true, name: true, emailVerified: true },
    });

    if (!user) {
      return NextResponse.json({ message: 'Không tìm thấy tài khoản.' }, { status: 404 });
    }

    if (user.emailVerified) {
      return NextResponse.json({ message: 'Email đã được xác thực.' });
    }

    const rawToken = await createAuthToken(user.id, TOKEN_TYPES.EMAIL_VERIFY);
    await sendEmailVerification(user.email, rawToken);

    logger.info('auth/verify-email', 'Resent verification', { userId: user.id });

    return NextResponse.json({
      message: 'Đã gửi lại email xác thực. Vui lòng kiểm tra hộp thư.',
    });
  } catch (error) {
    return handleApiError(error, 'PUT /api/auth/verify-email');
  }
}
