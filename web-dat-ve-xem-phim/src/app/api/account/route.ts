import { getServerSession } from 'next-auth/next';
import { NextResponse } from 'next/server';

import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db/prisma';

export async function PATCH(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { message: 'Bạn chưa đăng nhập.' },
        { status: 401 }
      );
    }

    const body = (await request.json()) as {
      name?: string;
      phone?: string;
    };

    const name = body.name?.trim() ?? '';
    const phone = body.phone?.trim() ?? '';

    if (!name) {
      return NextResponse.json(
        { message: 'Họ và tên không được để trống.' },
        { status: 400 }
      );
    }

    if (name.length < 2) {
      return NextResponse.json(
        { message: 'Họ và tên phải có ít nhất 2 ký tự.' },
        { status: 400 }
      );
    }

    if (phone && !/^[0-9]{9,11}$/.test(phone)) {
      return NextResponse.json(
        { message: 'Số điện thoại không hợp lệ.' },
        { status: 400 }
      );
    }

    const user = await prisma.user.update({
      where: {
        id: session.user.id,
      },
      data: {
        name,
        phone: phone || null,
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
      },
    });

    return NextResponse.json({
      message: 'Cập nhật thông tin thành công.',
      user,
    });
  } catch (error) {
    console.error('Update account error:', error);

    return NextResponse.json(
      { message: 'Không thể cập nhật thông tin tài khoản.' },
      { status: 500 }
    );
  }
}