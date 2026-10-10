import { NextResponse } from 'next/server';
import { UserRole } from '@prisma/client';
import { prisma } from '@/lib/db/prisma';
import { requireAdmin, requireUser } from '@/lib/auth/session';
import { saveCommentImages, serializeCommentImages } from '@/lib/comments/storage';
import { createAdminReplyForComment } from '@/lib/comments/admin-reply';

export const runtime = 'nodejs';

type Context = { params: Promise<{ movieId: string }> };

function ratingValue(value: FormDataEntryValue | null) {
  if (value === null || value === '') return null;
  const rating = Number(value);
  return Number.isInteger(rating) && rating >= 1 && rating <= 5 ? rating : undefined;
}

export async function GET(request: Request, context: Context) {
  const { movieId } = await context.params;
  const admin = new URL(request.url).searchParams.get('admin') === 'true';
  if (admin) {
    try { await requireAdmin(); } catch { return NextResponse.json({ message: 'Bạn không có quyền.' }, { status: 403 }); }
  }
  const comments = await prisma.movieComment.findMany({
    where: { movieId, ...(admin ? {} : { isHidden: false }) },
    orderBy: { createdAt: 'asc' },
    include: { user: { select: { id: true, name: true, role: true } } },
  });
  const ratings = comments.filter((comment) => comment.rating !== null && !comment.isHidden);
  return NextResponse.json({
    comments: comments.map((comment) => ({
      ...comment,
      imageUrls: comment.imageUrl ? (() => {
        try {
          const parsed: unknown = JSON.parse(comment.imageUrl);
          return Array.isArray(parsed) ? parsed : [comment.imageUrl];
        } catch {
          return [comment.imageUrl];
        }
      })() : [],
    })),
    summary: {
      average: ratings.length ? ratings.reduce((sum, comment) => sum + (comment.rating ?? 0), 0) / ratings.length : 0,
      count: ratings.length,
    },
  });
}

export async function POST(request: Request, context: Context) {
  try {
    const user = await requireUser();
    const { movieId } = await context.params;
    if (!(await prisma.movie.findUnique({ where: { id: movieId }, select: { id: true } }))) {
      return NextResponse.json({ message: 'Không tìm thấy phim.' }, { status: 404 });
    }
    const form = await request.formData();
    const content = String(form.get('content') ?? '').trim();
    const parentId = String(form.get('parentId') ?? '').trim() || null;
    const rating = ratingValue(form.get('rating'));
    if (!content || content.length > 2000) return NextResponse.json({ message: 'Nội dung phải từ 1 đến 2000 ký tự.' }, { status: 400 });
    if (rating === undefined) return NextResponse.json({ message: 'Điểm đánh giá phải từ 1 đến 5 sao.' }, { status: 400 });
    if (parentId) {
      const parent = await prisma.movieComment.findFirst({ where: { id: parentId, movieId } });
      if (!parent || parent.userId === user.id) return NextResponse.json({ message: 'Bạn chỉ có thể trả lời bình luận của người khác.' }, { status: 400 });
    }
    const imageUrls = await saveCommentImages(form.getAll('image').filter((value): value is File => value instanceof File));
    const imageUrl = serializeCommentImages(imageUrls);
    const comment = await prisma.$transaction(async (tx) => {
      return tx.movieComment.create({ data: { movieId, userId: user.id, parentId, content, rating, imageUrl }, include: { user: { select: { id: true, name: true, role: true } } } });
    });
    let adminReply = null;
    if (user.role === UserRole.CUSTOMER) {
      const admin = await prisma.user.findFirst({
        where: { role: UserRole.ADMIN },
        select: { id: true },
        orderBy: { createdAt: 'asc' },
      });
      if (admin) {
        try {
          adminReply = await createAdminReplyForComment(comment.id, admin.id);
        } catch (error) {
          console.error('[auto comment admin reply]', error);
        }
      }
    }
    return NextResponse.json({ comment, adminReply }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ message: error instanceof Error ? error.message : 'Không thể đăng bình luận.' }, { status: 400 });
  }
}
