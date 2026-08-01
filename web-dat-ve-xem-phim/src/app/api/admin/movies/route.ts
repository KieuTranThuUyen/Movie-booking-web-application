import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const movies = await prisma.movie.findMany({
    orderBy: [{ isNowShowing: 'desc' }, { releaseDate: 'desc' }]
  });

  return NextResponse.json(movies);
}

export async function POST(request: Request) {
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

  if (!body.title || !body.slug || !body.genre || !body.duration || !body.ageRating || !body.synopsis || !body.posterUrl || !body.releaseDate) {
    return NextResponse.json({ message: 'Vui lòng nhập đầy đủ thông tin phim.' }, { status: 400 });
  }

  const movie = await prisma.movie.create({
    data: {
      title: body.title,
      slug: body.slug,
      genre: body.genre,
      duration: Number(body.duration),
      ageRating: body.ageRating,
      synopsis: body.synopsis,
      posterUrl: body.posterUrl,
      trailerUrl: body.trailerUrl || null,
      releaseDate: new Date(body.releaseDate),
      isNowShowing: Boolean(body.isNowShowing),
      isComingSoon: Boolean(body.isComingSoon)
    }
  });

  return NextResponse.json({ message: 'Tạo phim thành công.', movie });
}