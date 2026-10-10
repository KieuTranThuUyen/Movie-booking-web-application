import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { requireUser } from '@/lib/auth/session';
import { parseCommentImages, removeCommentImages, saveCommentImages, serializeCommentImages } from '@/lib/comments/storage';
export const runtime = 'nodejs';
type Context = {
    params: Promise<{
        movieId: string;
        commentId: string;
    }>;
};
function parseRating(value: FormDataEntryValue | null) {
    if (value === null || value === '')
        return null;
    const rating = Number(value);
    return Number.isInteger(rating) && rating >= 1 && rating <= 5 ? rating : undefined;
}
export async function PATCH(request: Request, context: Context) {
    try {
        const user = await requireUser();
        const { movieId, commentId } = await context.params;
        const comment = await prisma.movieComment.findFirst({ where: { id: commentId, movieId } });
        if (!comment)
            return NextResponse.json({ message: 'Không tìm thấy bình luận.' }, { status: 404 });
        if (comment.userId !== user.id)
            return NextResponse.json({ message: 'Bạn không có quyền sửa bình luận này.' }, { status: 403 });
        const form = await request.formData();
        const content = String(form.get('content') ?? '').trim();
        const rating = parseRating(form.get('rating'));
        if (!content || content.length > 2000)
            return NextResponse.json({ message: 'Nội dung phải từ 1 đến 2000 ký tự.' }, { status: 400 });
        if (rating === undefined)
            return NextResponse.json({ message: 'Điểm đánh giá phải từ 1 đến 5 sao.' }, { status: 400 });
        const existingImages = parseCommentImages(comment.imageUrl);
        const removedImages = JSON.parse(String(form.get('removedImages') ?? '[]')) as unknown;
        const removed = Array.isArray(removedImages) ? removedImages.filter((value): value is string => typeof value === 'string') : [];
        const uploaded = await saveCommentImages(form.getAll('image').filter((value): value is File => value instanceof File));
        const imageUrls = [...existingImages.filter((imageUrl) => !removed.includes(imageUrl)), ...uploaded];
        const imageUrl = serializeCommentImages(imageUrls);
        const updated = await prisma.$transaction(async (tx) => {
            return tx.movieComment.update({ where: { id: commentId }, data: { content, rating, imageUrl }, include: { user: { select: { id: true, name: true, role: true } } } });
        });
        await removeCommentImages(existingImages.filter((existingImage) => !imageUrls.includes(existingImage)));
        return NextResponse.json(updated);
    }
    catch (error) {
        return NextResponse.json({ message: error instanceof Error ? error.message : 'Không thể cập nhật bình luận.' }, { status: 400 });
    }
}
export async function DELETE(_request: Request, context: Context) {
    try {
        const user = await requireUser();
        const { movieId, commentId } = await context.params;
        const comment = await prisma.movieComment.findFirst({ where: { id: commentId, movieId } });
        if (!comment)
            return NextResponse.json({ message: 'Không tìm thấy bình luận.' }, { status: 404 });
        if (comment.userId !== user.id)
            return NextResponse.json({ message: 'Bạn không có quyền xóa bình luận này.' }, { status: 403 });
        await prisma.movieComment.delete({ where: { id: commentId } });
        await removeCommentImages(parseCommentImages(comment.imageUrl));
        return NextResponse.json({ message: 'Đã xóa bình luận.' });
    }
    catch (error) {
        return NextResponse.json({ message: error instanceof Error ? error.message : 'Không thể xóa bình luận.' }, { status: 400 });
    }
}
