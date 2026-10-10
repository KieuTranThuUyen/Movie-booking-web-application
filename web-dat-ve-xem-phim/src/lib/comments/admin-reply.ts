import { prisma } from '@/lib/db/prisma';
const ADMIN_REPLY = 'Cảm ơn bạn đã chia sẻ cảm nhận về phim. Đội ngũ quản trị đã ghi nhận ý kiến của bạn.';
export async function createAdminReplyForComment(commentId: string, adminId: string) {
    const comment = await prisma.movieComment.findUnique({
        where: { id: commentId },
        select: { id: true, movieId: true, userId: true },
    });
    if (!comment || comment.userId === adminId)
        return null;
    return prisma.movieComment.create({
        data: {
            movieId: comment.movieId,
            userId: adminId,
            parentId: comment.id,
            content: ADMIN_REPLY,
        },
        include: { user: { select: { id: true, name: true, role: true } } },
    });
}
