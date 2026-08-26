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

/**
 * Tạo ghế theo số lượng từng loại (Standard / VIP / Couple).
 * Tự suy ra số hàng & ghế mỗi hàng để bố cục hợp lý.
 */
function makeSeatsFromQuantities(
  hallId: string,
  counts: Record<SeatType, number>,
  preset: string,
  width: number,
  height: number,
) {
  const total =
    counts.STANDARD + counts.VIP + counts.COUPLE;

  if (total <= 0) return [];

  // Ước lượng số ghế mỗi hàng (khoảng 8–14)
  const seatsPerRow = Math.min(
    14,
    Math.max(6, Math.ceil(Math.sqrt(total * 1.4))),
  );
  const rows = Math.ceil(total / seatsPerRow);

  const startX = 100;
  const startY = 110;
  const gapX = Math.min(
    58,
    Math.max(34, Math.floor((width - 200) / Math.max(seatsPerRow, 1))),
  );
  const gapY = Math.min(
    58,
    Math.max(42, Math.floor((height - 170) / Math.max(rows, 1))),
  );

  // Xây danh sách loại ghế: LUÔN đúng số lượng từng loại.
  // Preset chỉ đổi thứ tự đặt ghế (trước → sau), không đổi/biến mất loại.
  const typeList: SeatType[] = [];

  if (preset === 'VIP_REAR') {
    // Trước → sau: Standard → Couple → VIP (Couple nằm giữa, không biến thành STANDARD)
    for (let i = 0; i < counts.STANDARD; i++) typeList.push('STANDARD');
    for (let i = 0; i < counts.COUPLE; i++) typeList.push('COUPLE');
    for (let i = 0; i < counts.VIP; i++) typeList.push('VIP');
  } else if (preset === 'COUPLE_REAR') {
    // Trước → sau: Standard → VIP → Couple
    for (let i = 0; i < counts.STANDARD; i++) typeList.push('STANDARD');
    for (let i = 0; i < counts.VIP; i++) typeList.push('VIP');
    for (let i = 0; i < counts.COUPLE; i++) typeList.push('COUPLE');
  } else {
    // Mặc định / AISLE / STAGGERED / FREE: Standard → VIP → Couple
    for (let i = 0; i < counts.STANDARD; i++) typeList.push('STANDARD');
    for (let i = 0; i < counts.VIP; i++) typeList.push('VIP');
    for (let i = 0; i < counts.COUPLE; i++) typeList.push('COUPLE');
  }

  if (typeList.length !== total) {
    // An toàn: không bao giờ thiếu / thừa so với số lượng đã nhập
    while (typeList.length < total) typeList.push('STANDARD');
    typeList.length = total;
  }

  const records = [];
  let seatIndex = 0;

  for (let r = 0; r < rows; r++) {
    const seatsInThisRow = Math.min(seatsPerRow, total - seatIndex);
    // Căn giữa hàng
    const rowWidth = (seatsInThisRow - 1) * gapX;
    const rowStartX = Math.round((width - rowWidth) / 2);

    for (let c = 0; c < seatsInThisRow; c++) {
      let x = rowStartX + c * gapX;
      const y = startY + r * gapY;

      if (preset === 'AISLE_CENTER' && c >= Math.ceil(seatsInThisRow / 2)) {
        x += gapX * 0.8;
      }
      if (preset === 'STAGGERED' && r % 2 === 1) {
        x += gapX / 2;
      }

      const type = typeList[seatIndex] ?? 'STANDARD';
      records.push({
        hallId,
        code: `${String.fromCharCode(65 + r)}${c + 1}`,
        rowLabel: String.fromCharCode(65 + r),
        seatNumber: c + 1,
        type,
        isActive: true,
        positionX: Math.round(Math.min(Math.max(x, 10), width - 50)),
        positionY: Math.round(Math.min(Math.max(y, 10), height - 50)),
      });
      seatIndex++;
    }
  }

  return records;
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
      cinemaId?: string;
      name?: string;
      // Hỗ trợ cả cách cũ (rows/seatsPerRow) và cách mới (số lượng loại)
      rows?: number;
      seatsPerRow?: number;
      standardCount?: number;
      vipCount?: number;
      coupleCount?: number;
      seatTypes?: Array<{ type?: string; quantity?: number }>;
      layoutWidth?: number;
      layoutHeight?: number;
      layoutPreset?: string;
    };

    const cinemaId = body.cinemaId?.trim();
    const name = body.name?.trim();

    if (!cinemaId || !name) {
      return NextResponse.json(
        { message: 'Vui lòng nhập đầy đủ tên phòng và rạp chiếu.' },
        { status: 400 },
      );
    }

    const cinema = await prisma.cinema.findUnique({ where: { id: cinemaId } });
    if (!cinema) {
      return NextResponse.json({ message: 'Không tìm thấy rạp chiếu.' }, { status: 404 });
    }

    const width = Number(body.layoutWidth ?? 1000);
    const height = Number(body.layoutHeight ?? 650);
    const preset = PRESETS.includes((body.layoutPreset ?? 'STANDARD') as (typeof PRESETS)[number])
      ? (body.layoutPreset ?? 'STANDARD')
      : 'STANDARD';

    if (
      !Number.isInteger(width) ||
      width < 600 ||
      width > 3000 ||
      !Number.isInteger(height) ||
      height < 400 ||
      height > 2000
    ) {
      return NextResponse.json({ message: 'Kích thước sơ đồ không hợp lệ.' }, { status: 400 });
    }

    // Ưu tiên số lượng loại ghế
    const counts: Record<SeatType, number> = {
      STANDARD: 0,
      VIP: 0,
      COUPLE: 0,
    };

    if (
      body.standardCount !== undefined ||
      body.vipCount !== undefined ||
      body.coupleCount !== undefined
    ) {
      counts.STANDARD = Math.max(0, Math.floor(Number(body.standardCount ?? 0)));
      counts.VIP = Math.max(0, Math.floor(Number(body.vipCount ?? 0)));
      counts.COUPLE = Math.max(0, Math.floor(Number(body.coupleCount ?? 0)));
    } else if (body.seatTypes?.length) {
      for (const item of body.seatTypes) {
        const type = String(item.type ?? '').trim().toUpperCase();
        const quantity = Number(item.quantity ?? 0);
        if (isSeatType(type) && Number.isInteger(quantity) && quantity >= 0) {
          counts[type] += quantity;
        }
      }
    } else {
      // Fallback cách cũ: rows * seatsPerRow
      const rows = Number(body.rows ?? 6);
      const seatsPerRow = Number(body.seatsPerRow ?? 8);
      if (
        !Number.isInteger(rows) ||
        rows < 1 ||
        rows > 26 ||
        !Number.isInteger(seatsPerRow) ||
        seatsPerRow < 1 ||
        seatsPerRow > 50
      ) {
        return NextResponse.json(
          { message: 'Số hàng hoặc số ghế mỗi hàng không hợp lệ.' },
          { status: 400 },
        );
      }
      const total = rows * seatsPerRow;
      counts.STANDARD = total;
    }

    const totalSeats = counts.STANDARD + counts.VIP + counts.COUPLE;
    if (totalSeats < 1 || totalSeats > 500) {
      return NextResponse.json(
        { message: 'Tổng số ghế phải từ 1 đến 500.' },
        { status: 400 },
      );
    }

    const existingHall = await prisma.hall.findFirst({ where: { cinemaId, name } });
    if (existingHall) {
      return NextResponse.json(
        { message: 'Tên phòng trong rạp này đã tồn tại.' },
        { status: 409 },
      );
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

      const seats = makeSeatsFromQuantities(hall.id, counts, preset, width, height);
      if (seats.length > 0) {
        await tx.seat.createMany({ data: seats });
      }

      return hall;
    });

    const hall = await prisma.hall.findUnique({
      where: { id: result.id },
      include: {
        seats: { orderBy: [{ positionY: 'asc' }, { positionX: 'asc' }] },
        layoutBlocks: { orderBy: [{ y: 'asc' }, { x: 'asc' }] },
      },
    });

    return NextResponse.json(
      { message: 'Tạo phòng chiếu thành công.', hall },
      { status: 201 },
    );
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: 'Không thể tạo phòng chiếu.' }, { status: 500 });
  }
}
