import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: Request) {
  const body = (await request.json()) as {
    cinemaId?: string;
    name?: string;
    capacity?: number;
    rows?: number;
    seatsPerRow?: number;
  };

  if (!body.cinemaId || !body.name || !body.capacity) {
    return NextResponse.json({ message: 'Vui lòng nhập đầy đủ thông tin phòng chiếu.' }, { status: 400 });
  }

  const hall = await prisma.hall.create({
    data: {
      cinemaId: body.cinemaId,
      name: body.name,
      capacity: body.capacity
    }
  });

  const rows = Math.max(1, body.rows ?? 6);
  const seatsPerRow = Math.max(1, body.seatsPerRow ?? 8);
  const seatRecords = Array.from({ length: rows }, (_, rowIndex) => {
    const rowLabel = String.fromCharCode(65 + rowIndex);
    return Array.from({ length: seatsPerRow }, (_, seatIndex) => ({
      hallId: hall.id,
      code: `${rowLabel}${seatIndex + 1}`,
      rowLabel,
      seatNumber: seatIndex + 1,
      type: seatIndex >= seatsPerRow - 2 ? 'VIP' : 'STANDARD'
    }));
  }).flat();

  await prisma.seat.createMany({
    data: seatRecords
  });

  return NextResponse.json({ message: 'Tạo phòng chiếu và sơ đồ ghế thành công.', hall });
}
