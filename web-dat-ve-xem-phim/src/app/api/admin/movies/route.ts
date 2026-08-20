import { NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';

import { prisma } from '@/lib/prisma';

async function isAdmin(request: Request) {
  const token = await getToken({
    req: request as never,
    secret: process.env.NEXTAUTH_SECRET,
  });

  return token?.role === 'ADMIN';
}

export async function GET(request: Request) {
  if (!(await isAdmin(request))) {
    return NextResponse.json(
      { message: 'Bạn không có quyền thực hiện thao tác này.' },
      { status: 403 },
    );
  }

  try {
    const movies = await prisma.movie.findMany({
      orderBy: [{ isNowShowing: 'desc' }, { releaseDate: 'desc' }],
    });

    return NextResponse.json(movies);
  } catch {
    return NextResponse.json(
      { message: 'Không thể tải danh sách phim.' },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  if (!(await isAdmin(request))) {
    return NextResponse.json(
      { message: 'Bạn không có quyền thực hiện thao tác này.' },
      { status: 403 },
    );
  }

  try {
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

    const title = body.title?.trim();
    const slug = body.slug?.trim();
    const genre = body.genre?.trim();
    const ageRating = body.ageRating?.trim();
    const synopsis = body.synopsis?.trim();
    const posterUrl = body.posterUrl?.trim();
    const trailerUrl = body.trailerUrl?.trim();
    const duration = Number(body.duration);
    const releaseDate = body.releaseDate
      ? new Date(body.releaseDate)
      : null;

    if (
      !title ||
      !slug ||
      !genre ||
      !ageRating ||
      !synopsis ||
      !posterUrl ||
      !body.releaseDate
    ) {
      return NextResponse.json(
        { message: 'Vui lòng nhập đầy đủ thông tin phim.' },
        { status: 400 },
      );
    }

    if (!Number.isFinite(duration) || duration <= 0) {
      return NextResponse.json(
        { message: 'Thời lượng phim không hợp lệ.' },
        { status: 400 },
      );
    }

    if (!releaseDate || Number.isNaN(releaseDate.getTime())) {
      return NextResponse.json(
        { message: 'Ngày phát hành không hợp lệ.' },
        { status: 400 },
      );
    }

    const existingMovie = await prisma.movie.findUnique({
      where: { slug },
    });

    if (existingMovie) {
      return NextResponse.json(
        { message: 'Slug phim đã tồn tại.' },
        { status: 409 },
      );
    }

    const movie = await prisma.movie.create({
      data: {
        title,
        slug,
        genre,
        duration,
        ageRating,
        synopsis,
        posterUrl,
        trailerUrl: trailerUrl || null,
        releaseDate,
        isNowShowing: Boolean(body.isNowShowing),
        isComingSoon: Boolean(body.isComingSoon),
      },
    });

    return NextResponse.json(
      { message: 'Tạo phim thành công.', movie },
      { status: 201 },
    );
  } catch {
    return NextResponse.json(
      { message: 'Không thể tạo phim.' },
      { status: 500 },
    );
  }
}