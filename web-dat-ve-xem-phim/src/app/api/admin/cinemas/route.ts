import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const cinemas = await prisma.cinema.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      halls: {
        include: {
          seats: true
        }
      }
    }
  });

  return NextResponse.json(cinemas);
}

export async function POST(request: Request) {
  const body = (await request.json()) as { name?: string; city?: string; address?: string };

  if (!body.name || !body.city || !body.address) {
    return NextResponse.json({ message: 'Vui lòng nhập đầy đủ thông tin rạp.' }, { status: 400 });
  }

  const cinema = await prisma.cinema.create({
    data: {
      name: body.name,
      city: body.city,
      address: body.address
    }
  });

  return NextResponse.json({ message: 'Tạo rạp chiếu thành công.', cinema });
}
