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
    await prisma.combo.findMany({ orderBy: { createdAt: 'desc' } }),
  );
}

export async function POST(request: Request) {
  if (!(await admin(request))) {
    return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
  }
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const name = String(body.name ?? '').trim();
    if (!name) {
      return NextResponse.json({ message: 'Tên combo bắt buộc.' }, { status: 400 });
    }
    const price = Math.max(0, Math.floor(Number(body.price ?? 0)));
    const stock = Math.max(0, Math.floor(Number(body.stock ?? 0)));
    const combo = await prisma.combo.create({
      data: {
        name,
        description: String(body.description ?? '').trim() || null,
        imageUrl: String(body.imageUrl ?? '').trim() || null,
        price,
        stock,
        isActive: body.isActive === undefined ? true : Boolean(body.isActive),
      },
    });
    return NextResponse.json(combo, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { message: 'Không thể tạo combo.', error: String(error) },
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
      return NextResponse.json({ message: 'Thiếu id combo.' }, { status: 400 });
    }
    const data: {
      stock?: number;
      price?: number;
      name?: string;
      description?: string | null;
      imageUrl?: string | null;
      isActive?: boolean;
    } = {};
    if (body.stock !== undefined) {
      data.stock = Math.max(0, Math.floor(Number(body.stock)));
    }
    if (body.price !== undefined) {
      data.price = Math.max(0, Math.floor(Number(body.price)));
    }
    if (body.name !== undefined) {
      const name = String(body.name).trim();
      if (!name) {
        return NextResponse.json({ message: 'Tên combo không được trống.' }, { status: 400 });
      }
      data.name = name;
    }
    if (body.description !== undefined) {
      data.description = String(body.description).trim() || null;
    }
    if (body.imageUrl !== undefined) {
      data.imageUrl = String(body.imageUrl).trim() || null;
    }
    if (body.isActive !== undefined) {
      data.isActive = Boolean(body.isActive);
    }
    if (Object.keys(data).length === 0) {
      return NextResponse.json({ message: 'Không có dữ liệu cập nhật.' }, { status: 400 });
    }
    const combo = await prisma.combo.update({ where: { id }, data });
    return NextResponse.json(combo);
  } catch (error) {
    return NextResponse.json(
      { message: 'Không thể cập nhật combo.', error: String(error) },
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
      return NextResponse.json({ message: 'Thiếu id combo.' }, { status: 400 });
    }

    // Nếu combo đã gắn booking thì chỉ tắt, không xóa cứng
    const used = await prisma.bookingCombo.count({ where: { comboId: id } });
    if (used > 0) {
      const combo = await prisma.combo.update({
        where: { id },
        data: { isActive: false, stock: 0 },
      });
      return NextResponse.json({
        ...combo,
        softDeleted: true,
        message: 'Combo đã dùng trong đơn hàng — đã tắt bán thay vì xóa.',
      });
    }

    await prisma.combo.delete({ where: { id } });
    return NextResponse.json({ success: true, id });
  } catch (error) {
    return NextResponse.json(
      { message: 'Không thể xóa combo.', error: String(error) },
      { status: 400 },
    );
  }
}
