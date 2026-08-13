import { NextResponse } from 'next/server';

import { prisma } from '@/lib/prisma';
import { ensureMoviesSeeded } from '@/lib/seed-movies';

// ============================================================
// GET - LẤY DANH SÁCH SUẤT CHIẾU
// ============================================================

export async function GET() {
  try {
    await ensureMoviesSeeded();

    const showtimes = await prisma.showtime.findMany({
      orderBy: {
        startTime: 'asc',
      },
      include: {
        movie: {
          select: {
            id: true,
            title: true,
            slug: true,
            posterUrl: true,
            duration: true,
          },
        },

        hall: {
          include: {
            cinema: true,
          },
        },
      },
    });

    return NextResponse.json(
      {
        showtimes,
      },
      {
        status: 200,
      },
    );
  } catch (error) {
    console.error(
      'GET /api/admin/showtimes error:',
      error,
    );

    return NextResponse.json(
      {
        message:
          'Không thể lấy danh sách suất chiếu.',
        showtimes: [],
      },
      {
        status: 500,
      },
    );
  }
}

// ============================================================
// POST - TẠO SUẤT CHIẾU
// ============================================================

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      movieSlug?: string;
      hallId?: string;

      startTime?: string;
      endTime?: string;

      standardPrice?: number;
      vipPrice?: number;
      couplePrice?: number;

      language?: string;
      format?: string;
    };

    // ========================================================
    // KIỂM TRA DỮ LIỆU CƠ BẢN
    // ========================================================

    if (
      !body.movieSlug ||
      !body.hallId ||
      !body.startTime ||
      !body.endTime
    ) {
      return NextResponse.json(
        {
          message:
            'Vui lòng nhập đầy đủ thông tin suất chiếu.',
        },
        {
          status: 400,
        },
      );
    }

    // ========================================================
    // KIỂM TRA GIÁ
    // ========================================================

    const standardPrice = Number(
      body.standardPrice,
    );

    const vipPrice = Number(
      body.vipPrice,
    );

    const couplePrice = Number(
      body.couplePrice,
    );

    if (
      !Number.isInteger(standardPrice) ||
      standardPrice < 1000
    ) {
      return NextResponse.json(
        {
          message:
            'Giá ghế thường không hợp lệ.',
        },
        {
          status: 400,
        },
      );
    }

    if (
      !Number.isInteger(vipPrice) ||
      vipPrice < 1000
    ) {
      return NextResponse.json(
        {
          message:
            'Giá ghế VIP không hợp lệ.',
        },
        {
          status: 400,
        },
      );
    }

    if (
      !Number.isInteger(couplePrice) ||
      couplePrice < 1000
    ) {
      return NextResponse.json(
        {
          message:
            'Giá ghế đôi không hợp lệ.',
        },
        {
          status: 400,
        },
      );
    }

    // ========================================================
    // KIỂM TRA THỜI GIAN
    // ========================================================

    const startTime = new Date(
      body.startTime,
    );

    const endTime = new Date(
      body.endTime,
    );

    if (
      Number.isNaN(startTime.getTime()) ||
      Number.isNaN(endTime.getTime())
    ) {
      return NextResponse.json(
        {
          message:
            'Thời gian suất chiếu không hợp lệ.',
        },
        {
          status: 400,
        },
      );
    }

    if (endTime <= startTime) {
      return NextResponse.json(
        {
          message:
            'Thời gian kết thúc phải sau thời gian bắt đầu.',
        },
        {
          status: 400,
        },
      );
    }

    // ========================================================
    // SEED PHIM
    // ========================================================

    await ensureMoviesSeeded();

    // ========================================================
    // TÌM PHIM
    // ========================================================

    const movie =
      await prisma.movie.findUnique({
        where: {
          slug: body.movieSlug,
        },
      });

    if (!movie) {
      return NextResponse.json(
        {
          message:
            'Không tìm thấy phim tương ứng.',
        },
        {
          status: 404,
        },
      );
    }

    // ========================================================
    // TÌM PHÒNG
    // ========================================================

    const hall =
      await prisma.hall.findUnique({
        where: {
          id: body.hallId,
        },
      });

    if (!hall) {
      return NextResponse.json(
        {
          message:
            'Không tìm thấy phòng chiếu tương ứng.',
        },
        {
          status: 404,
        },
      );
    }

    // ========================================================
    // KIỂM TRA TRÙNG SUẤT CHIẾU
    // CÙNG PHÒNG + THỜI GIAN BỊ CHỒNG
    // ========================================================

    const overlappingShowtime =
      await prisma.showtime.findFirst({
        where: {
          hallId: hall.id,

          AND: [
            {
              startTime: {
                lt: endTime,
              },
            },
            {
              endTime: {
                gt: startTime,
              },
            },
          ],
        },

        include: {
          movie: true,
        },
      });

    if (overlappingShowtime) {
      return NextResponse.json(
        {
          message:
            `Phòng ${hall.name} đã có suất chiếu ` +
            `${overlappingShowtime.movie.title} ` +
            `trong khoảng thời gian này.`,
        },
        {
          status: 400,
        },
      );
    }

    // ========================================================
    // TẠO SUẤT CHIẾU
    // ========================================================

    const showtime =
      await prisma.showtime.create({
        data: {
          movieId: movie.id,
          hallId: hall.id,

          startTime,
          endTime,

          standardPrice,
          vipPrice,
          couplePrice,

          language:
            body.language ?? 'VietSub',

          format:
            body.format ?? '2D',
        },

        include: {
          movie: true,

          hall: {
            include: {
              cinema: true,
            },
          },
        },
      });

    // ========================================================
    // TRẢ KẾT QUẢ
    // ========================================================

    return NextResponse.json(
      {
        message:
          'Tạo suất chiếu thành công.',

        showtime,

        prices: {
          standardPrice,
          vipPrice,
          couplePrice,
        },
      },
      {
        status: 201,
      },
    );
  } catch (error) {
    console.error(
      'POST /api/admin/showtimes error:',
      error,
    );

    return NextResponse.json(
      {
        message:
          'Có lỗi xảy ra khi tạo suất chiếu.',
      },
      {
        status: 500,
      },
    );
  }
}