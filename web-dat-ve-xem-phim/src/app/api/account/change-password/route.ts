import { compare, hash } from 'bcryptjs';
import { NextResponse } from 'next/server';

import { prisma } from '@/lib/db/prisma';
import { requireUser } from '@/lib/auth/session';
import { changePasswordSchema } from '@/lib/validation/auth';
import { handleApiError, unauthorized, notFound } from '@/lib/api/errors';
import { logger } from '@/lib/security/logger';

export async function POST(request: Request) {
  try {
    const sessionUser = await requireUser();
    const data = changePasswordSchema.parse(await request.json());

    const user = await prisma.user.findUnique({
      where: { id: sessionUser.id },
      select: { id: true, password: true },
    });

    if (!user) {
      throw notFound('Không tìm thấy tài khoản.');
    }

    const valid = await compare(data.currentPassword, user.password);
    if (!valid) {
      throw unauthorized('Mật khẩu hiện tại không đúng.');
    }

    const hashedPassword = await hash(data.newPassword, 12);

    await prisma.user.update({
      where: { id: user.id },
      data: { password: hashedPassword },
    });

    logger.info('account/change-password', 'Password changed', { userId: user.id });

    return NextResponse.json({ message: 'Đổi mật khẩu thành công.' });
  } catch (error) {
    return handleApiError(error, 'POST /api/account/change-password');
  }
}
