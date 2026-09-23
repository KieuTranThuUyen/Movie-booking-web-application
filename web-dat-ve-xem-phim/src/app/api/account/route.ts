import { NextResponse } from 'next/server';

import { prisma } from '@/lib/db/prisma';
import { requireUser } from '@/lib/auth/session';
import { updateProfileSchema } from '@/lib/validation/auth';
import { handleApiError, conflict } from '@/lib/api/errors';
import { logger } from '@/lib/security/logger';

/** GET — thông tin tài khoản hiện tại */
export async function GET() {
  try {
    const sessionUser = await requireUser();

    const user = await prisma.user.findUnique({
      where: { id: sessionUser.id },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        address: true,
        city: true,
        district: true,
        role: true,
        createdAt: true,
      },
    });

    if (!user) {
      return NextResponse.json({ message: 'Không tìm thấy tài khoản.' }, { status: 404 });
    }

    return NextResponse.json({ user });
  } catch (error) {
    return handleApiError(error, 'GET /api/account');
  }
}

/** PATCH — cập nhật thông tin cá nhân */
export async function PATCH(request: Request) {
  try {
    const sessionUser = await requireUser();
    const body = updateProfileSchema.parse(await request.json());

    // Kiểm tra phone trùng (nếu đổi)
    if (body.phone) {
      const taken = await prisma.user.findFirst({
        where: {
          phone: body.phone,
          NOT: { id: sessionUser.id },
        },
        select: { id: true },
      });
      if (taken) {
        throw conflict('Số điện thoại đã được sử dụng bởi tài khoản khác.');
      }
    }

    const user = await prisma.user.update({
      where: { id: sessionUser.id },
      data: {
        name: body.name,
        phone: body.phone ?? null,
        address: body.address ?? null,
        city: body.city ?? null,
        district: body.district ?? null,
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        address: true,
        city: true,
        district: true,
        role: true,
      },
    });

    logger.info('account/update', 'Profile updated', { userId: user.id });

    return NextResponse.json({
      message: 'Cập nhật thông tin thành công.',
      user,
    });
  } catch (error) {
    return handleApiError(error, 'PATCH /api/account');
  }
}
