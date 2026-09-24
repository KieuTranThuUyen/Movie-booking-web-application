import { NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import type { NextRequest } from 'next/server';
import { prisma } from '@/lib/db/prisma';

async function admin(request: Request) {
  const token = await getToken({
    req: request as NextRequest,
    secret: process.env.NEXTAUTH_SECRET,
  });
  return token?.role === 'ADMIN';
}

export async function GET(request: Request) {
  if (!(await admin(request))) {
    return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
  }
  return NextResponse.json(
    await prisma.voucher.findMany({ orderBy: { createdAt: 'desc' } }),
  );
}

export async function POST(request: Request) {
  if (!(await admin(request))) {
    return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
  }
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const code = String(body.code ?? '').trim().toUpperCase();
    if (!code) {
      return NextResponse.json({ message: 'Mã voucher bắt buộc.' }, { status: 400 });
    }
    const voucher = await prisma.voucher.create({
      data: {
        code,
        discountType: body.discountType === 'PERCENT' ? 'PERCENT' : 'FIXED',
        discountValue: Math.max(0, Math.floor(Number(body.discountValue ?? 0))),
        minOrderAmount: Math.max(0, Math.floor(Number(body.minOrderAmount ?? 0))),
        usageLimit:
          body.usageLimit === '' || body.usageLimit == null
            ? null
            : Math.max(0, Math.floor(Number(body.usageLimit))),
        perUserLimit: Math.max(1, Math.floor(Number(body.perUserLimit ?? 1))),
        startsAt: new Date(String(body.startsAt)),
        endsAt: new Date(String(body.endsAt)),
        isActive: body.isActive === undefined ? true : Boolean(body.isActive),
      },
    });
    return NextResponse.json(voucher, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { message: 'Không thể tạo voucher.', error: String(error) },
      { status: 400 },
    );
  }
}

export async function PATCH(request: Request) {
  if (!(await admin(request))) {
    return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
  }
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const id = String(body.id ?? '').trim();
    if (!id) {
      return NextResponse.json({ message: 'Thiếu id voucher.' }, { status: 400 });
    }

    const data: {
      code?: string;
      discountType?: string;
      discountValue?: number;
      minOrderAmount?: number;
      usageLimit?: number | null;
      perUserLimit?: number;
      startsAt?: Date;
      endsAt?: Date;
      isActive?: boolean;
    } = {};

    if (body.code !== undefined) {
      const code = String(body.code).trim().toUpperCase();
      if (!code) {
        return NextResponse.json({ message: 'Mã voucher không được trống.' }, { status: 400 });
      }
      data.code = code;
    }
    if (body.discountType !== undefined) {
      data.discountType = body.discountType === 'PERCENT' ? 'PERCENT' : 'FIXED';
    }
    if (body.discountValue !== undefined) {
      data.discountValue = Math.max(0, Math.floor(Number(body.discountValue)));
    }
    if (body.minOrderAmount !== undefined) {
      data.minOrderAmount = Math.max(0, Math.floor(Number(body.minOrderAmount)));
    }
    if (body.usageLimit !== undefined) {
      data.usageLimit =
        body.usageLimit === '' || body.usageLimit == null
          ? null
          : Math.max(0, Math.floor(Number(body.usageLimit)));
    }
    if (body.perUserLimit !== undefined) {
      data.perUserLimit = Math.max(1, Math.floor(Number(body.perUserLimit)));
    }
    if (body.startsAt !== undefined) {
      data.startsAt = new Date(String(body.startsAt));
    }
    if (body.endsAt !== undefined) {
      data.endsAt = new Date(String(body.endsAt));
    }
    if (body.isActive !== undefined) {
      data.isActive = Boolean(body.isActive);
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ message: 'Không có dữ liệu cập nhật.' }, { status: 400 });
    }

    const voucher = await prisma.voucher.update({ where: { id }, data });
    return NextResponse.json(voucher);
  } catch (error) {
    return NextResponse.json(
      { message: 'Không thể cập nhật voucher.', error: String(error) },
      { status: 400 },
    );
  }
}

export async function DELETE(request: Request) {
  if (!(await admin(request))) {
    return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
  }
  try {
    const { searchParams } = new URL(request.url);
    let id = searchParams.get('id')?.trim() ?? '';
    if (!id) {
      const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
      id = String(body.id ?? '').trim();
    }
    if (!id) {
      return NextResponse.json({ message: 'Thiếu id voucher.' }, { status: 400 });
    }

    const used =
      (await prisma.voucherRedemption.count({ where: { voucherId: id } })) +
      (await prisma.booking.count({ where: { voucherId: id } }));

    if (used > 0) {
      const voucher = await prisma.voucher.update({
        where: { id },
        data: { isActive: false },
      });
      return NextResponse.json({
        ...voucher,
        softDeleted: true,
        message: 'Voucher đã được dùng — đã tắt thay vì xóa.',
      });
    }

    await prisma.voucher.delete({ where: { id } });
    return NextResponse.json({ success: true, id });
  } catch (error) {
    return NextResponse.json(
      { message: 'Không thể xóa voucher.', error: String(error) },
      { status: 400 },
    );
  }
}
