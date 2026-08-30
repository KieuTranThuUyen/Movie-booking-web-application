import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';

import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db/prisma';

const ALLOWED_LANGUAGES = [
  'VietSub',
  'VietDub',
  'EngSub',
] as const;

const ALLOWED_FORMATS = [
  '2D',
  '3D',
  'IMAX',
] as const;

/*
 * ============================================================
 * TYPE SESSION
 * ============================================================
 *
 * Không dùng:
 *
 * Awaited<ReturnType<typeof getServerSession>>
 *
 * vì trong cấu hình NextAuth hiện tại TypeScript có thể
 * suy luận kết quả của getServerSession thành {}.
 *
 * Chỉ cần kiểm tra role của user nên định nghĩa một type
 * nhỏ cho phần dữ liệu chúng ta thực sự sử dụng.
 */

type AdminSession = {
  user?: {
    role?: string | null;
  } | null;
} | null;

/*
 * ============================================================
 * KIỂM TRA ADMIN
 * ============================================================
 */

function isAdmin(session: AdminSession): boolean {
  return session?.user?.role === 'ADMIN';
}

// ============================================================
// GET - LẤY DANH SÁCH SUẤT CHIẾU
// ============================================================

export async function GET() {
  try {
    // ========================================================
    // KIỂM TRA QUYỀN ADMIN
    // ========================================================

    const session = await getServerSession(authOptions);

    if (!isAdmin(session)) {
      return NextResponse.json(
        {
          message:
            'Bạn không có quyền thực hiện thao tác này.',
        },
        {
          status: 403,
        },
      );
    }

    // ========================================================
    // SEED PHIM
    // ========================================================


    // ========================================================
    // LẤY DANH SÁCH SUẤT CHIẾU
    // ========================================================

    const showtimes =
      await prisma.showtime.findMany({
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
    // ========================================================
    // KIỂM TRA QUYỀN ADMIN
    // ========================================================

    const session = await getServerSession(authOptions);

    if (!isAdmin(session)) {
      return NextResponse.json(
        {
          message:
            'Bạn không có quyền tạo suất chiếu.',
        },
        {
          status: 403,
        },
      );
    }

    // ========================================================
    // ĐỌC REQUEST
    // ========================================================

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
    // CHUẨN HÓA DỮ LIỆU
    // ========================================================

    const movieSlug = String(
      body.movieSlug ?? '',
    ).trim();

    const hallId = String(
      body.hallId ?? '',
    ).trim();

    const startTimeString = String(
      body.startTime ?? '',
    ).trim();

    const endTimeString = String(
      body.endTime ?? '',
    ).trim();

    // ========================================================
    // KIỂM TRA DỮ LIỆU CƠ BẢN
    // ========================================================

    if (
      !movieSlug ||
      !hallId ||
      !startTimeString ||
      !endTimeString
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

    const isValidPrice = (
      price: number,
    ): boolean => {
      return (
        Number.isSafeInteger(price) &&
        price >= 1000 &&
        price % 1000 === 0
      );
    };

    if (!isValidPrice(standardPrice)) {
      return NextResponse.json(
        {
          message:
            'Giá ghế thường phải là số nguyên và là bội số của 1.000đ.',
        },
        {
          status: 400,
        },
      );
    }

    if (!isValidPrice(vipPrice)) {
      return NextResponse.json(
        {
          message:
            'Giá ghế VIP phải là số nguyên và là bội số của 1.000đ.',
        },
        {
          status: 400,
        },
      );
    }

    if (!isValidPrice(couplePrice)) {
      return NextResponse.json(
        {
          message:
            'Giá ghế đôi phải là số nguyên và là bội số của 1.000đ.',
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
      startTimeString,
    );

    const endTime = new Date(
      endTimeString,
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
    // KHÔNG CHO TẠO SUẤT CHIẾU TRONG QUÁ KHỨ
    // ========================================================

    if (startTime <= new Date()) {
      return NextResponse.json(
        {
          message:
            'Thời gian bắt đầu phải ở tương lai.',
        },
        {
          status: 400,
        },
      );
    }

    // ========================================================
    // KIỂM TRA NGÔN NGỮ
    // ========================================================

    const language = String(
      body.language ?? 'VietSub',
    ).trim();

    const isAllowedLanguage =
      (
        ALLOWED_LANGUAGES as readonly string[]
      ).includes(language);

    if (!isAllowedLanguage) {
      return NextResponse.json(
        {
          message:
            'Ngôn ngữ suất chiếu không hợp lệ.',
        },
        {
          status: 400,
        },
      );
    }

    // ========================================================
    // KIỂM TRA ĐỊNH DẠNG
    // ========================================================

    const format = String(
      body.format ?? '2D',
    ).trim();

    const isAllowedFormat =
      (
        ALLOWED_FORMATS as readonly string[]
      ).includes(format);

    if (!isAllowedFormat) {
      return NextResponse.json(
        {
          message:
            'Định dạng suất chiếu không hợp lệ.',
        },
        {
          status: 400,
        },
      );
    }

    // ========================================================
    // SEED PHIM
    // ========================================================


    // ========================================================
    // TÌM PHIM
    // ========================================================

    const movie =
      await prisma.movie.findUnique({
        where: {
          slug: movieSlug,
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

    if (movie.isComingSoon) {
      return NextResponse.json(
        {
          message:
            'Không thể tạo suất chiếu cho phim sắp chiếu.',
        },
        {
          status: 400,
        },
      );
    }

    // ========================================================
    // NGÀY CHIẾU >= NGÀY KHỞI CHIẾU
    // ========================================================

    const releaseDay = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Ho_Chi_Minh',
    }).format(movie.releaseDate);

    const showDay = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Ho_Chi_Minh',
    }).format(startTime);

    if (showDay < releaseDay) {
      return NextResponse.json(
        {
          message:
            `Ngày chiếu phải từ ngày khởi chiếu của phim (${releaseDay}) trở đi.`,
        },
        {
          status: 400,
        },
      );
    }

    // ========================================================
    // TÌM PHÒNG
    // ========================================================

    const hall =
      await prisma.hall.findUnique({
        where: {
          id: hallId,
        },

        include: {
          cinema: true,
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
    //
    // Hai khoảng thời gian giao nhau khi:
    //
    // existing.startTime < new.endTime
    // &&
    // existing.endTime > new.startTime
    // ========================================================

    const overlappingShowtime =
      await prisma.showtime.findFirst({
        where: {
          hallId: hall.id,

          startTime: {
            lt: endTime,
          },

          endTime: {
            gt: startTime,
          },
        },

        include: {
          movie: {
            select: {
              title: true,
            },
          },
        },

        orderBy: {
          startTime: 'asc',
        },
      });

    if (overlappingShowtime) {
      const existingStart =
        new Date(
          overlappingShowtime.startTime,
        ).toLocaleString('vi-VN');

      const existingEnd =
        new Date(
          overlappingShowtime.endTime,
        ).toLocaleString('vi-VN');

      return NextResponse.json(
        {
          message:
            `Phòng ${hall.name} tại ${hall.cinema.name} ` +
            `đã có suất chiếu "${overlappingShowtime.movie.title}" ` +
            `từ ${existingStart} đến ${existingEnd}. ` +
            `Vui lòng chọn thời gian khác.`,
        },
        {
          status: 409,
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

          language,
          format,
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