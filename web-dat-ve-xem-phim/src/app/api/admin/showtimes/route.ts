import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ensureMoviesSeeded } from '@/lib/seed-movies';

export async function GET() {
  await ensureMoviesSeeded();

  const showtimes = await prisma.showtime.findMany({
    orderBy: { startTime: 'asc' },
    include: {
      movie: true,
      hall: {
        include: {
          cinema: true
        }
      }
    }
  });

  return NextResponse.json(showtimes);
}

export async function POST(request: Request) {
  const body = (await request.json()) as {
    movieSlug?: string;
    hallId?: string;
    startTime?: string;
    endTime?: string;
    basePrice?: number;
    language?: string;
    format?: string;
  };

  if (!body.movieSlug || !body.hallId || !body.startTime || !body.endTime || !body.basePrice) {
    return NextResponse.json({ message: 'Vui lòng nhập đầy đủ thông tin suất chiếu.' }, { status: 400 });
  }

  await ensureMoviesSeeded();
  const movie = await prisma.movie.findUnique({ where: { slug: body.movieSlug } });

  if (!movie) {
    return NextResponse.json({ message: 'Không tìm thấy phim tương ứng.' }, { status: 404 });
  }

  const hall = await prisma.hall.findUnique({ where: { id: body.hallId } });

  if (!hall) {
    return NextResponse.json({ message: 'Không tìm thấy phòng chiếu tương ứng.' }, { status: 404 });
  }

  const showtime = await prisma.showtime.create({
    data: {
      movieId: movie.id,
      hallId: hall.id,
      startTime: new Date(body.startTime),
      endTime: new Date(body.endTime),
      basePrice: Number(body.basePrice),
      language: body.language ?? 'VietSub',
      format: body.format ?? '2D'
    },
    include: {
      movie: true,
      hall: {
        include: {
          cinema: true
        }
      }
    }
  });

  return NextResponse.json({ message: 'Tạo suất chiếu thành công.', showtime });
}
