import { hash } from 'bcryptjs';
import { NextResponse } from 'next/server';

import { prisma } from '@/lib/db/prisma';
import { registerSchema } from '@/lib/validation/auth';
import { handleApiError, conflict } from '@/lib/api/errors';
import { createAuthToken, TOKEN_TYPES } from '@/lib/auth/tokens';
import { sendEmailVerification } from '@/lib/mail';
import { logger } from '@/lib/security/logger';

export async function POST(request: Request) {
  try {
    const data = registerSchema.parse(await request.json());
    const email = data.email;

    const existingUser = await prisma.user.findFirst({
      where: { OR: [{ email }, { phone: data.phone }] },
      select: { id: true },
    });

    if (existingUser) {
      throw conflict('Email hoặc số điện thoại đã được sử dụng.');
    }

    const hashedPassword = await hash(data.password, 12);

    const user = await prisma.user.create({
      data: {
        name: data.name,
        email,
        phone: data.phone,
        password: hashedPassword,
      },
      select: { id: true, email: true, name: true },
    });

    try {
      const rawToken = await createAuthToken(user.id, TOKEN_TYPES.EMAIL_VERIFY);
      await sendEmailVerification(user.email, rawToken);
    } catch (mailErr) {
      logger.error('auth/register', mailErr, { note: 'verify email send failed' });
    }

    logger.info('auth/register', 'User registered', { userId: user.id });

    return NextResponse.json({
      message:
        'Tạo tài khoản thành công. Vui lòng kiểm tra email để xác thực tài khoản (nếu đã cấu hình SMTP).',
      redirectTo: '/dang-nhap',
    });
  } catch (error) {
    return handleApiError(error, 'POST /api/auth/register');
  }
}
