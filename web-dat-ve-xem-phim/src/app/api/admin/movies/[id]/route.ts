import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  const params = await context.params;
  const body = (await request.json()) as {
    title?: string;
    slug?: string;
    genre?: string;
    duration?: number;
    ageRating?: string;
    synopsis?: string;
    posterUrl?: string;
    trailerUrl?: string;
    releaseDate?: string;
    isNowShowing?: boolean;
    isComingSoon?: boolean;
  };

  const movie = await prisma.movie.update({
    where: { id: params.id },
    data: {
      title: body.title,
      slug: body.slug,
      genre: body.genre,
      duration: body.duration ? Number(body.duration) : undefined,
      ageRating: body.ageRating,
      synopsis: body.synopsis,
      posterUrl: body.posterUrl,
      trailerUrl: body.trailerUrl || null,
      releaseDate: body.releaseDate ? new Date(body.releaseDate) : undefined,
      isNowShowing: body.isNowShowing,
      isComingSoon: body.isComingSoon
    }
  });

  return NextResponse.json({ message: 'Cập nhật phim thành công.', movie });
}

export async function DELETE(_request: Request, context: RouteContext) {
  const params = await context.params;

  await prisma.movie.delete({ where: { id: params.id } });

  return NextResponse.json({ message: 'Xóa phim thành công.' });
}