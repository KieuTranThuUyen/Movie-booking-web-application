import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/session';
import { prisma } from '@/lib/db/prisma';

type Context = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: Context) {
  try {
    await requireAdmin();
    const { id } = await context.params;
    const body = (await request.json()) as { isHidden?: boolean };
    if (typeof body.isHidden !== 'boolean') return NextResponse.json({ message: 'Trạng thái không hợp lệ.' }, { status: 400 });
    const comment = await prisma.movieComment.update({ where: { id }, data: { isHidden: body.isHidden } });
    return NextResponse.json(comment);
  } catch {
    return NextResponse.json({ message: 'Không thể cập nhật trạng thái bình luận.' }, { status: 400 });
  }
}
