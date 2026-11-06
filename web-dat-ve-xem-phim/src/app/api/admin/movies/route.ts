import { NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { prisma } from '@/lib/db/prisma';
async function isAdmin(request: Request) {
    const token = await getToken({
        req: request as never,
        secret: process.env.NEXTAUTH_SECRET,
    });
    return token?.role === 'ADMIN';
}
function parseReleaseDate(value: string): Date {
    const trimmed = value.trim();
    return new Date(/^\d{4}-\d{2}-\d{2}$/.test(trimmed)
        ? `${trimmed}T12:00:00+07:00`
        : /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(trimmed)
            ? `${trimmed}:00+07:00`
            : trimmed);
}
function withDerivedStatus<T extends { releaseDate: Date }>(movie: T) {
    const isNowShowing = movie.releaseDate <= new Date();
    return { ...movie, isNowShowing, isComingSoon: !isNowShowing };
}
export async function GET(request: Request) {
    if (!(await isAdmin(request))) {
        return NextResponse.json({ message: 'Bạn không có quyền thực hiện thao tác này.' }, { status: 403 });
    }
    try {
        const movies = await prisma.movie.findMany({
            orderBy: { releaseDate: 'desc' },
        });
        return NextResponse.json(movies.map(withDerivedStatus));
    }
    catch {
        return NextResponse.json({ message: 'Không thể tải danh sách phim.' }, { status: 500 });
    }
}
export async function POST(request: Request) {
    if (!(await isAdmin(request))) {
        return NextResponse.json({ message: 'Bạn không có quyền thực hiện thao tác này.' }, { status: 403 });
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
            imageUrl?: string;
            trailerUrl?: string;
            releaseDate?: string;
        };
        const title = body.title?.trim();
        const slug = body.slug?.trim();
        const genre = body.genre?.trim();
        const ageRating = body.ageRating?.trim();
        const synopsis = body.synopsis?.trim();
        const posterUrl = body.posterUrl?.trim();
        const imageUrl = body.imageUrl?.trim();
        const trailerUrl = body.trailerUrl?.trim();
        const duration = Number(body.duration);
        
        const releaseDate = body.releaseDate ? parseReleaseDate(body.releaseDate) : null;
        if (!title ||
            !slug ||
            !genre ||
            !ageRating ||
            !synopsis ||
            !imageUrl ||
            !body.releaseDate) {
            return NextResponse.json({ message: 'Vui lòng nhập đầy đủ thông tin phim.' }, { status: 400 });
        }
        if (!Number.isFinite(duration) || duration <= 0) {
            return NextResponse.json({ message: 'Thời lượng phim không hợp lệ.' }, { status: 400 });
        }
        if (!releaseDate || Number.isNaN(releaseDate.getTime())) {
            return NextResponse.json({ message: 'Ngày phát hành không hợp lệ.' }, { status: 400 });
        }
        const existingMovie = await prisma.movie.findUnique({
            where: { slug },
        });
        if (existingMovie) {
            return NextResponse.json({ message: 'Slug phim đã tồn tại.' }, { status: 409 });
        }
        const now = new Date();
        const movie = await prisma.movie.create({
            data: {
                title,
                slug,
                genre,
                duration,
                ageRating,
                synopsis,
                posterUrl: posterUrl || '',
                imageUrl,
                trailerUrl: trailerUrl || null,
                releaseDate,
                isNowShowing: releaseDate <= now,
                isComingSoon: releaseDate > now,
            },
        });
        return NextResponse.json({ message: 'Tạo phim thành công.', movie: withDerivedStatus(movie) }, { status: 201 });
    }
    catch {
        return NextResponse.json({ message: 'Không thể tạo phim.' }, { status: 500 });
    }
}
