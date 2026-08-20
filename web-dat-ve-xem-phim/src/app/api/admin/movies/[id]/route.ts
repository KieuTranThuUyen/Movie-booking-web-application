import { NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';

import { prisma } from '@/lib/prisma';

type RouteContext = {
  params: Promise<{ id: string }>;
};

async function isAdmin(request: Request) {
  const token = await getToken({
    req: request as never,
    secret: process.env.NEXTAUTH_SECRET,
  });

  return token?.role === 'ADMIN';
}

export async function PATCH(
  request: Request,
  context: RouteContext,
) {
  if (!(await isAdmin(request))) {
    return NextResponse.json(
      { message: 'Bạn không có quyền thực hiện thao tác này.' },
      { status: 403 },
    );
  }

  try {
    const { id } = await context.params;

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

    if (!id) {
      return NextResponse.json(
        { message: 'ID phim không hợp lệ.' },
        { status: 400 },
      );
    }

    const existingMovie = await prisma.movie.findUnique({
      where: { id },
    });

    if (!existingMovie) {
      return NextResponse.json(
        { message: 'Không tìm thấy phim.' },
        { status: 404 },
      );
    }

    const title = body.title?.trim();
    const slug = body.slug?.trim();
    const genre = body.genre?.trim();
    const ageRating = body.ageRating?.trim();
    const synopsis = body.synopsis?.trim();
    const posterUrl = body.posterUrl?.trim();
    const trailerUrl = body.trailerUrl?.trim();

    const duration =
      body.duration !== undefined
        ? Number(body.duration)
        : undefined;

    const releaseDate = body.releaseDate
      ? new Date(body.releaseDate)
      : undefined;

    if (
      body.title !== undefined &&
      !title
    ) {
      return NextResponse.json(
        { message: 'Tên phim không được để trống.' },
        { status: 400 },
      );
    }

    if (
      body.slug !== undefined &&
      !slug
    ) {
      return NextResponse.json(
        { message: 'Slug không được để trống.' },
        { status: 400 },
      );
    }

    if (
      duration !== undefined &&
      (!Number.isFinite(duration) || duration <= 0)
    ) {
      return NextResponse.json(
        { message: 'Thời lượng phim không hợp lệ.' },
        { status: 400 },
      );
    }

    if (
      releaseDate &&
      Number.isNaN(releaseDate.getTime())
    ) {
      return NextResponse.json(
        { message: 'Ngày phát hành không hợp lệ.' },
        { status: 400 },
      );
    }

    if (slug && slug !== existingMovie.slug) {
      const duplicateMovie = await prisma.movie.findUnique({
        where: { slug },
      });

      if (duplicateMovie) {
        return NextResponse.json(
          { message: 'Slug phim đã tồn tại.' },
          { status: 409 },
        );
      }
    }

    const movie = await prisma.movie.update({
      where: { id },
      data: {
        title,
        slug,
        genre,
        duration,
        ageRating,
        synopsis,
        posterUrl,
        trailerUrl:
          body.trailerUrl !== undefined
            ? trailerUrl || null
            : undefined,
        releaseDate,
        isNowShowing: body.isNowShowing,
        isComingSoon: body.isComingSoon,
      },
    });

    return NextResponse.json({
      message: 'Cập nhật phim thành công.',
      movie,
    });
  } catch {
    return NextResponse.json(
      { message: 'Không thể cập nhật phim.' },
      { status: 500 },
    );
  }
}

export async function DELETE(
  request: Request,
  context: RouteContext,
) {
  if (!(await isAdmin(request))) {
    return NextResponse.json(
      { message: 'Bạn không có quyền thực hiện thao tác này.' },
      { status: 403 },
    );
  }

  try {
    const { id } = await context.params;

    if (!id) {
      return NextResponse.json(
        { message: 'ID phim không hợp lệ.' },
        { status: 400 },
      );
    }

    const movie = await prisma.movie.findUnique({
      where: { id },
    });

    if (!movie) {
      return NextResponse.json(
        { message: 'Không tìm thấy phim.' },
        { status: 404 },
      );
    }

    await prisma.movie.delete({
      where: { id },
    });

    return NextResponse.json({
      message: 'Xóa phim thành công.',
    });
  } catch {
    return NextResponse.json(
      { message: 'Không thể xóa phim do đang có dữ liệu liên quan.' },
      { status: 400 },
    );
  }
}