import { NextResponse } from 'next/server';

import {
  Prisma,
  UserRole,
} from '@prisma/client';

import bcrypt from 'bcryptjs';

import { prisma } from '@/lib/db/prisma';

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function PATCH(
  request: Request,
  context: RouteContext,
) {
  try {
    const params = await context.params;

    const body = (await request.json()) as {
      name?: string;
      email?: string;
      password?: string;
      phone?: string;
      role?: string;
    };

    const data: Prisma.UserUpdateInput = {};

    if (body.name !== undefined) {
      data.name = body.name.trim();
    }

    if (body.email !== undefined) {
      data.email = body.email.trim();
    }

    if (body.phone !== undefined) {
      data.phone = body.phone.trim();
    }

    /**
     * Role phải là UserRole của Prisma.
     */
    if (body.role !== undefined) {
      if (
        body.role !== UserRole.ADMIN &&
        body.role !== UserRole.CUSTOMER
      ) {
        return NextResponse.json(
          {
            message:
              'Vai trò người dùng không hợp lệ.',
          },
          {
            status: 400,
          },
        );
      }

      data.role =
        body.role as UserRole;
    }

    /**
     * Nếu nhập mật khẩu mới thì hash trước
     * khi lưu database.
     */
    if (body.password) {
      data.password =
        await bcrypt.hash(
          body.password,
          10,
        );
    }

    const user =
      await prisma.user.update({
        where: {
          id: params.id,
        },

        data,

        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          role: true,
          createdAt: true,
        },
      });

    return NextResponse.json({
      message:
        'Cập nhật người dùng thành công.',
      user,
    });
  } catch (error) {
    console.error(
      'PATCH /api/admin/users/[id] error:',
      error,
    );

    return NextResponse.json(
      {
        message:
          'Không thể cập nhật người dùng.',
      },
      {
        status: 500,
      },
    );
  }
}

export async function DELETE(
  _request: Request,
  context: RouteContext,
) {
  try {
    const params = await context.params;

    await prisma.user.delete({
      where: {
        id: params.id,
      },
    });

    return NextResponse.json({
      message:
        'Xóa người dùng thành công.',
    });
  } catch (error) {
    console.error(
      'DELETE /api/admin/users/[id] error:',
      error,
    );

    return NextResponse.json(
      {
        message:
          'Không thể xóa người dùng.',
      },
      {
        status: 500,
      },
    );
  }
}