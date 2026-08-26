import { NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import type { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';

const PRESETS = ['STANDARD', 'AISLE_CENTER', 'STAGGERED', 'VIP_REAR', 'COUPLE_REAR', 'FREE'] as const;
const TYPES = ['STANDARD', 'VIP', 'COUPLE'] as const;

type SeatType = (typeof TYPES)[number];

function isSeatType(value: string): value is SeatType {
  return TYPES.includes(value as SeatType);
}

async function isAdmin(request: Request) {
  const token = await getToken({
    req: request as NextRequest,
    secret: process.env.NEXTAUTH_SECRET,
  });
  return token?.role === 'ADMIN';
}

function makeSeats(
  hallId: string,
  rows: number,
  seatsPerRow: number,
  types: Record<SeatType, number>,
  preset: string,
  width: number,
  height: number,
) {
  const records = [];
  let seatIndex = 0;
  const total = rows * seatsPerRow;
  const startX = 100;
  const startY = 110;
  const gapX = Math.min(58, Math.max(34, Math.floor((width - 200) / Math.max(seatsPerRow, 1))));
  const gapY = Math.min(58, Math.max(42, Math.floor((height - 170) / Math.max(rows, 1))));

  const typeForIndex = (index: number): SeatType => {
    if (preset === 'VIP_REAR') {
      const rearStart = Math.floor(rows * 0.65) * seatsPerRow;
      return index >= rearStart ? 'VIP' : 'STANDARD';
    }
    if (preset === 'COUPLE_REAR') {
      const rearStart = Math.floor(rows * 0.75) * seatsPerRow;
      return index >= rearStart ? 'COUPLE' : 'STANDARD';
    }
    let cursor = 0;
    for (const type of TYPES) {
      cursor += types[type];
      if (index < cursor) return type;
    }
    return 'STANDARD';
  };

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < seatsPerRow; c++) {
      let x = startX + c * gapX;
      const y = startY + r * gapY;

      if (preset === 'AISLE_CENTER' && c >= Math.ceil(seatsPerRow / 2)) {
        x += gapX * 0.8;
      }
      if (preset === 'STAGGERED' && r % 2 === 1) {
        x += gapX / 2;
      }

      const type = typeForIndex(seatIndex);
      records.push({
        hallId,
        code: `${String.fromCharCode(65 + r)}${c + 1}`,
        rowLabel: String.fromCharCode(65 + r),
        seatNumber: c + 1,
        type,
        isActive: true,
        positionX: Math.round(x),
        positionY: Math.round(y),
      });
      seatIndex++;
    }
  }

  return records;
}

export async function POST(request: Request) {
  if (!(await isAdmin(request))) {
    return NextResponse.json({ message: 'Bạn không có quyền thực hiện thao tác này.' }, { status: 403 });
  }

  try {
    const body = await request.json() as {
      cinemaId?: string;
      name?: string;
      rows?: number;
      seatsPerRow?: number;
      seatTypes?: Array<{ type?: string; quantity?: number }>;
      layoutWidth?: number;
      layoutHeight?: number;
      layoutPreset?: string;
    };

    const cinemaId = body.cinemaId?.trim();
    const name = body.name?.trim();

    if (!cinemaId || !name) {
      return NextResponse.json({ message: 'Vui lòng nhập đầy đủ tên phòng và rạp chiếu.' }, { status: 400 });
    }

    const cinema = await prisma.cinema.findUnique({ where: { id: cinemaId } });
    if (!cinema) {
      return NextResponse.json({ message: 'Không tìm thấy rạp chiếu.' }, { status: 404 });
    }

    const rows = Number(body.rows ?? 6);
    const seatsPerRow = Number(body.seatsPerRow ?? 8);
    const width = Number(body.layoutWidth ?? 1000);
    const height = Number(body.layoutHeight ?? 650);
    const preset = PRESETS.includes((body.layoutPreset ?? 'STANDARD') as typeof PRESETS[number])
      ? (body.layoutPreset ?? 'STANDARD')
      : 'STANDARD';

    if (!Number.isInteger(rows) || rows < 1 || rows > 26 || !Number.isInteger(seatsPerRow) || seatsPerRow < 1 || seatsPerRow > 50) {
      return NextResponse.json({ message: 'Số hàng hoặc số ghế mỗi hàng không hợp lệ.' }, { status: 400 });
    }
    if (!Number.isInteger(width) || width < 600 || width > 3000 || !Number.isInteger(height) || height < 400 || height > 2000) {
      return NextResponse.json({ message: 'Kích thước sơ đồ không hợp lệ.' }, { status: 400 });
    }

    const totalSeats = rows * seatsPerRow;
    const counts: Record<SeatType, number> = { STANDARD: 0, VIP: 0, COUPLE: 0 };
    for (const item of body.seatTypes ?? []) {
      const type = String(item.type ?? '').trim().toUpperCase();
      const quantity = Number(item.quantity ?? 0);
      if (isSeatType(type) && Number.isInteger(quantity) && quantity >= 0) counts[type] += quantity;
    }
    if (Object.values(counts).reduce((a, b) => a + b, 0) !== totalSeats) {
      counts.STANDARD = totalSeats;
      counts.VIP = 0;
      counts.COUPLE = 0;
    }

    const existingHall = await prisma.hall.findFirst({ where: { cinemaId, name } });
    if (existingHall) {
      return NextResponse.json({ message: 'Tên phòng trong rạp này đã tồn tại.' }, { status: 409 });
    }

    const result = await prisma.$transaction(async (tx) => {
      const hall = await tx.hall.create({
        data: {
          cinemaId,
          name,
          capacity: totalSeats,
          layoutWidth: width,
          layoutHeight: height,
          layoutPreset: preset,
        },
      });

      await tx.seat.createMany({
        data: makeSeats(hall.id, rows, seatsPerRow, counts, preset, width, height),
      });

      return hall;
    });

    const hall = await prisma.hall.findUnique({
      where: { id: result.id },
      include: {
        seats: { orderBy: [{ positionY: 'asc' }, { positionX: 'asc' }] },
        layoutBlocks: { orderBy: [{ y: 'asc' }, { x: 'asc' }] },
      },
    });

    return NextResponse.json({ message: 'Tạo phòng chiếu thành công.', hall }, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: 'Không thể tạo phòng chiếu.' }, { status: 500 });
  }
}
