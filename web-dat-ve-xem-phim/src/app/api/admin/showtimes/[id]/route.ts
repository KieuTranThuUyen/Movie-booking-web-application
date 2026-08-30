import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';

import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db/prisma';

const ALLOWED_LANGUAGES = ['VietSub', 'VietDub', 'EngSub'] as const;
const ALLOWED_FORMATS = ['2D', '3D', 'IMAX'] as const;

type AdminSession = {
  user?: { role?: string | null } | null;
} | null;

type RouteContext = {
  params: Promise<{ id: string }>;
};

function isAdmin(session: AdminSession): boolean {
  return session?.user?.role === 'ADMIN';
}

function isValidPrice(price: number): boolean {
  return Number.isSafeInteger(price) && price >= 1000 && price % 1000 === 0;
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const session = await getServerSession(authOptions);
    if (!isAdmin(session)) {
      return NextResponse.json(
        { message: 'Bạn không có quyền cập nhật suất chiếu.' },
        { status: 403 },
      );
    }

    const { id } = await context.params;

    const existing = await prisma.showtime.findUnique({
      where: { id },
      include: { _count: { select: { bookings: true } } },
    });

    if (!existing) {
      return NextResponse.json(
        { message: 'Không tìm thấy suất chiếu.' },
        { status: 404 },
      );
    }

    if (existing._count.bookings > 0) {
      return NextResponse.json(
        {
          message: `Không thể sửa suất chiếu vì đã có ${existing._count.bookings} đơn đặt vé.`,
        },
        { status: 409 },
      );
    }

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

    const movieSlug = String(body.movieSlug ?? '').trim();
    const hallId = String(body.hallId ?? '').trim();
    const startTime = new Date(String(body.startTime ?? ''));
    const endTime = new Date(String(body.endTime ?? ''));

    if (
      !movieSlug ||
      !hallId ||
      Number.isNaN(startTime.getTime()) ||
      Number.isNaN(endTime.getTime())
    ) {
      return NextResponse.json(
        { message: 'Vui lòng nhập đầy đủ thông tin suất chiếu.' },
        { status: 400 },
      );
    }

    if (endTime <= startTime) {
      return NextResponse.json(
        { message: 'Thời gian kết thúc phải sau thời gian bắt đầu.' },
        { status: 400 },
      );
    }

    const standardPrice = Number(body.standardPrice);
    const vipPrice = Number(body.vipPrice);
    const couplePrice = Number(body.couplePrice);

    if (
      !isValidPrice(standardPrice) ||
      !isValidPrice(vipPrice) ||
      !isValidPrice(couplePrice)
    ) {
      return NextResponse.json(
        { message: 'Giá ghế không hợp lệ (bội số 1.000đ, tối thiểu 1.000đ).' },
        { status: 400 },
      );
    }

    const language = String(body.language ?? 'VietSub').trim();
    const format = String(body.format ?? '2D').trim();

    if (!(ALLOWED_LANGUAGES as readonly string[]).includes(language)) {
      return NextResponse.json(
        { message: 'Ngôn ngữ không hợp lệ.' },
        { status: 400 },
      );
    }

    if (!(ALLOWED_FORMATS as readonly string[]).includes(format)) {
      return NextResponse.json(
        { message: 'Định dạng không hợp lệ.' },
        { status: 400 },
      );
    }

    const movie = await prisma.movie.findUnique({ where: { slug: movieSlug } });
    if (!movie) {
      return NextResponse.json(
        { message: 'Không tìm thấy phim tương ứng.' },
        { status: 404 },
      );
    }

    if (movie.isComingSoon) {
      return NextResponse.json(
        { message: 'Không thể gán suất chiếu cho phim sắp chiếu.' },
        { status: 400 },
      );
    }

    const releaseDay = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Ho_Chi_Minh',
    }).format(movie.releaseDate);
    const showDay = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Ho_Chi_Minh',
    }).format(startTime);

    if (showDay < releaseDay) {
      return NextResponse.json(
        {
          message: `Ngày chiếu phải từ ngày khởi chiếu của phim (${releaseDay}) trở đi.`,
        },
        { status: 400 },
      );
    }

    const hall = await prisma.hall.findUnique({
      where: { id: hallId },
      include: { cinema: true },
    });

    if (!hall) {
      return NextResponse.json(
        { message: 'Không tìm thấy phòng chiếu tương ứng.' },
        { status: 404 },
      );
    }

    const overlapping = await prisma.showtime.findFirst({
      where: {
        hallId: hall.id,
        id: { not: id },
        startTime: { lt: endTime },
        endTime: { gt: startTime },
      },
      include: { movie: { select: { title: true } } },
    });

    if (overlapping) {
      return NextResponse.json(
        {
          message:
            `Phòng ${hall.name} đã có suất "${overlapping.movie.title}" trùng khung giờ.`,
        },
        { status: 409 },
      );
    }

    const showtime = await prisma.showtime.update({
      where: { id },
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
        hall: { include: { cinema: true } },
        _count: { select: { bookings: true } },
      },
    });

    return NextResponse.json({
      message: 'Cập nhật suất chiếu thành công.',
      showtime: {
        ...showtime,
        bookingCount: showtime._count.bookings,
      },
    });
  } catch (error) {
    console.error('PATCH /api/admin/showtimes/[id] error:', error);
    return NextResponse.json(
      { message: 'Có lỗi xảy ra khi cập nhật suất chiếu.' },
      { status: 500 },
    );
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const session = await getServerSession(authOptions);
    if (!isAdmin(session)) {
      return NextResponse.json(
        { message: 'Bạn không có quyền xóa suất chiếu.' },
        { status: 403 },
      );
    }

    const { id } = await context.params;

    const existing = await prisma.showtime.findUnique({
      where: { id },
      include: { _count: { select: { bookings: true } } },
    });

    if (!existing) {
      return NextResponse.json(
        { message: 'Không tìm thấy suất chiếu.' },
        { status: 404 },
      );
    }

    if (existing._count.bookings > 0) {
      return NextResponse.json(
        {
          message: `Không thể xóa suất chiếu vì đã có ${existing._count.bookings} đơn đặt vé.`,
        },
        { status: 409 },
      );
    }

    // Xóa seat holds còn sót (nếu có) rồi xóa suất
    await prisma.seatHold.deleteMany({ where: { showtimeId: id } });
    await prisma.showtime.delete({ where: { id } });

    return NextResponse.json({
      message: 'Đã xóa suất chiếu.',
    });
  } catch (error) {
    console.error('DELETE /api/admin/showtimes/[id] error:', error);
    return NextResponse.json(
      { message: 'Có lỗi xảy ra khi xóa suất chiếu.' },
      { status: 500 },
    );
  }
}
