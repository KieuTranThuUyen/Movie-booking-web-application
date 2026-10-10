import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/session';
import { prisma } from '@/lib/db/prisma';
export async function GET(request: Request) {
    try {
        await requireAdmin();
        const movieId = new URL(request.url).searchParams.get('movieId')?.trim();
        const comments = await prisma.movieComment.findMany({
            where: movieId ? { movieId } : undefined,
            orderBy: { createdAt: 'desc' },
            include: {
                movie: { select: { id: true, title: true } },
                user: { select: { id: true, name: true, email: true, role: true } },
            },
        });
        return NextResponse.json(comments);
    }
    catch {
        return NextResponse.json({ message: 'Bạn không có quyền thực hiện thao tác này.' }, { status: 403 });
    }
}
