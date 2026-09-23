import { hash } from 'bcryptjs';
import { NextResponse } from 'next/server';

import { prisma } from '@/lib/db/prisma';
import { resetPasswordSchema } from '@/lib/validation/auth';
import { handleApiError, unauthorized } from '@/lib/api/errors';
import { consumeAuthToken, TOKEN_TYPES } from '@/lib/auth/tokens';
import { logger } from '@/lib/security/logger';

export async function POST(request: Request) {
  try {
    const data = resetPasswordSchema.parse(await request.json());

    const record = await consumeAuthToken(data.token, TOKEN_TYPES.PASSWORD_RESET);
    if (!record) {
      throw unauthorized('Liên kết đặt lại mật khẩu không hợp lệ hoặc đã hết hạn.');
    }

    const hashedPassword = await hash(data.password, 12);

    await prisma.user.update({
      where: { id: record.userId },
      data: { password: hashedPassword },
    });

    // Xóa mọi token reset còn lại của user
    await prisma.authToken.deleteMany({
      where: {
        userId: record.userId,
        type: TOKEN_TYPES.PASSWORD_RESET,
      },
    });

    logger.info('auth/reset-password', 'Password reset OK', { userId: record.userId });

    return NextResponse.json({
      message: 'Đặt lại mật khẩu thành công. Bạn có thể đăng nhập bằng mật khẩu mới.',
      redirectTo: '/dang-nhap',
    });
  } catch (error) {
    return handleApiError(error, 'POST /api/auth/reset-password');
  }
}
