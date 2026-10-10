import { NextResponse } from 'next/server';

import { handleApiError } from '@/lib/api/errors';
import { requireUser } from '@/lib/auth/session';
import { prisma } from '@/lib/db/prisma';

export async function GET(request: Request) {
  try {
    const user = await requireUser();
    const movieId = new URL(request.url).searchParams.get('movieId');

    if (movieId) {
      const favorite = await prisma.favorite.findUnique({
        where: { userId_movieId: { userId: user.id, movieId } },
        select: { id: true },
      });
      return NextResponse.json({ isFavorite: Boolean(favorite) });
    }

    const favorites = await prisma.favorite.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      include: { movie: true },
    });

    return NextResponse.json({ favorites });
  } catch (error) {
    return handleApiError(error, 'GET /api/favorites');
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const body = (await request.json()) as { movieId?: string };

    if (!body.movieId) {
      return NextResponse.json({ message: 'Thiếu mã phim.' }, { status: 400 });
    }

    const movie = await prisma.movie.findUnique({
      where: { id: body.movieId },
      select: { id: true },
    });

    if (!movie) {
      return NextResponse.json({ message: 'Không tìm thấy phim.' }, { status: 404 });
    }

    const existing = await prisma.favorite.findUnique({
      where: { userId_movieId: { userId: user.id, movieId: movie.id } },
      select: { id: true },
    });

    if (existing) {
      await prisma.favorite.delete({ where: { id: existing.id } });
      return NextResponse.json({ isFavorite: false });
    }

    await prisma.favorite.create({
      data: { userId: user.id, movieId: movie.id },
    });
    return NextResponse.json({ isFavorite: true });
  } catch (error) {
    return handleApiError(error, 'POST /api/favorites');
  }
}