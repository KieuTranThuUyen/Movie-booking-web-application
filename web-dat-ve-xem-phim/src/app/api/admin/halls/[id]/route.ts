import { NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import type { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';

type RouteContext = { params: Promise<{ id: string }> };
const PRESETS = ['STANDARD', 'AISLE_CENTER', 'STAGGERED', 'VIP_REAR', 'COUPLE_REAR', 'FREE'];
const BLOCK_TYPES = ['AISLE', 'SPACE'];
const SEAT_TYPES = ['STANDARD', 'VIP', 'COUPLE'];

async function isAdmin(request: Request) {
  const token = await getToken({
    req: request as NextRequest,
    secret: process.env.NEXTAUTH_SECRET,
  });
  return token?.role === 'ADMIN';
}

function validInt(value: unknown, min: number, max: number) {
  return Number.isInteger(value) && Number(value) >= min && Number(value) <= max;
}

export async function PATCH(request: Request, context: RouteContext) {
  if (!(await isAdmin(request))) {
    return NextResponse.json({ message: 'Bạn không có quyền thực hiện thao tác này.' }, { status: 403 });
  }

  try {
    const { id } = await context.params;
    const body = await request.json() as {
      name?: string;
      layoutWidth?: number;
      layoutHeight?: number;
      layoutPreset?: string;
      seats?: Array<{
        id: string;
        code?: string;
        rowLabel?: string;
        seatNumber?: number;
        type?: string;
        isActive?: boolean;
        positionX?: number;
        positionY?: number;
      }>;
      layoutBlocks?: Array<{
        id?: string;
        type: string;
        x: number;
        y: number;
        width: number;
        height: number;
        label?: string | null;
      }>;
    };

    const hall = await prisma.hall.findUnique({
      where: { id },
      include: { seats: true },
    });

    if (!hall) return NextResponse.json({ message: 'Không tìm thấy phòng chiếu.' }, { status: 404 });

    if (body.layoutWidth !== undefined && !validInt(body.layoutWidth, 600, 3000)) {
      return NextResponse.json({ message: 'Chiều rộng sơ đồ không hợp lệ.' }, { status: 400 });
    }
    if (body.layoutHeight !== undefined && !validInt(body.layoutHeight, 400, 2000)) {
      return NextResponse.json({ message: 'Chiều cao sơ đồ không hợp lệ.' }, { status: 400 });
    }
    if (body.layoutPreset !== undefined && !PRESETS.includes(body.layoutPreset)) {
      return NextResponse.json({ message: 'Mẫu bố cục không hợp lệ.' }, { status: 400 });
    }

    const ticketCount = await prisma.ticket.count({ where: { seat: { hallId: id } } });

    if (body.seats) {
      const existingIds = new Set(hall.seats.map((seat) => seat.id));
      const seenCodes = new Set<string>();

      for (const item of body.seats) {
        if (!existingIds.has(item.id)) {
          return NextResponse.json({ message: 'Danh sách ghế chứa ghế không thuộc phòng.' }, { status: 400 });
        }
        const code = item.code?.trim();
        if (!code) return NextResponse.json({ message: 'Tên/mã ghế không được để trống.' }, { status: 400 });
        const type = (item.type ?? 'STANDARD').toUpperCase();
        if (!SEAT_TYPES.includes(type)) return NextResponse.json({ message: `Loại ghế ${type} không hợp lệ.` }, { status: 400 });
        if (!validInt(item.positionX, 0, hall.layoutWidth - 1) || !validInt(item.positionY, 0, hall.layoutHeight - 1)) {
          return NextResponse.json({ message: `Vị trí ghế ${code} nằm ngoài sơ đồ.` }, { status: 400 });
        }
        if (seenCodes.has(code)) return NextResponse.json({ message: `Mã ghế ${code} bị trùng.` }, { status: 400 });
        seenCodes.add(code);
      }

      if (ticketCount > 0) {
        // Lấy danh sách ghế đã có vé ACTIVE
        const bookedSeatIds = new Set(
          (
            await prisma.ticket.findMany({
              where: {
                seat: { hallId: id },
                status: 'ACTIVE',
                booking: { status: { in: ['PENDING', 'CONFIRMED'] } },
              },
              select: { seatId: true },
            })
          ).map((t) => t.seatId),
        );

        for (const item of body.seats) {
          const oldSeat = hall.seats.find((s) => s.id === item.id);
          if (!oldSeat) continue;
          const isBooked = bookedSeatIds.has(item.id);

          const codeChanged = (item.code ?? oldSeat.code) !== oldSeat.code;
          const rowChanged = (item.rowLabel ?? oldSeat.rowLabel) !== oldSeat.rowLabel;
          const numChanged = (item.seatNumber ?? oldSeat.seatNumber) !== oldSeat.seatNumber;
          const typeChanged = (item.type ?? oldSeat.type).toUpperCase() !== oldSeat.type.toUpperCase();
          const lockChanged =
            item.isActive !== undefined && item.isActive !== oldSeat.isActive;

          if (isBooked && (codeChanged || rowChanged || numChanged)) {
            return NextResponse.json({
              message: `Ghế ${oldSeat.code} đã có người đặt vé nên không thể đổi mã/hàng/số ghế.`,
            }, { status: 400 });
          }
          if (isBooked && typeChanged) {
            return NextResponse.json({
              message: `Ghế ${oldSeat.code} đã có người đặt vé nên không thể đổi loại ghế.`,
            }, { status: 400 });
          }
          if (isBooked && lockChanged && item.isActive === false) {
            return NextResponse.json({
              message: `Ghế ${oldSeat.code} đã có người đặt vé nên không thể khóa ghế.`,
            }, { status: 400 });
          }
        }

        const changedStructural = body.seats.some((item) => {
          const oldSeat = hall.seats.find((s) => s.id === item.id);
          return oldSeat && (
            (item.code ?? oldSeat.code) !== oldSeat.code ||
            (item.rowLabel ?? oldSeat.rowLabel) !== oldSeat.rowLabel ||
            (item.seatNumber ?? oldSeat.seatNumber) !== oldSeat.seatNumber
          );
        });
        if (changedStructural) {
          return NextResponse.json({
            message: 'Phòng đã có vé nên không thể đổi mã/hàng/số ghế.',
          }, { status: 400 });
        }
      }
    }

    if (body.layoutBlocks) {
      for (const block of body.layoutBlocks) {
        if (!BLOCK_TYPES.includes(block.type) ||
            !validInt(block.x, 0, hall.layoutWidth) ||
            !validInt(block.y, 0, hall.layoutHeight) ||
            !validInt(block.width, 1, hall.layoutWidth) ||
            !validInt(block.height, 1, hall.layoutHeight) ||
            block.x + block.width > hall.layoutWidth ||
            block.y + block.height > hall.layoutHeight) {
          return NextResponse.json({ message: 'Có lối đi/khoảng trống không hợp lệ.' }, { status: 400 });
        }
      }
    }

    await prisma.$transaction(async (tx) => {
      await tx.hall.update({
        where: { id },
        data: {
          ...(body.name?.trim() ? { name: body.name.trim() } : {}),
          ...(body.layoutWidth !== undefined ? { layoutWidth: body.layoutWidth } : {}),
          ...(body.layoutHeight !== undefined ? { layoutHeight: body.layoutHeight } : {}),
          ...(body.layoutPreset !== undefined ? { layoutPreset: body.layoutPreset } : {}),
          ...(body.seats ? { capacity: body.seats.filter((s) => s.isActive !== false).length } : {}),
        },
      });

      if (body.seats) {
        for (const item of body.seats) {
          const old = hall.seats.find((s) => s.id === item.id)!;
          await tx.seat.update({
            where: { id: item.id },
            data: {
              code: item.code?.trim() ?? old.code,
              rowLabel: item.rowLabel ?? old.rowLabel,
              seatNumber: item.seatNumber ?? old.seatNumber,
              type: item.type?.toUpperCase() ?? old.type,
              isActive: item.isActive ?? old.isActive,
              positionX: item.positionX ?? old.positionX,
              positionY: item.positionY ?? old.positionY,
            },
          });
        }
      }

      if (body.layoutBlocks) {
        await tx.hallLayoutBlock.deleteMany({ where: { hallId: id } });
        if (body.layoutBlocks.length) {
          await tx.hallLayoutBlock.createMany({
            data: body.layoutBlocks.map((b) => ({
              hallId: id,
              type: b.type,
              x: b.x,
              y: b.y,
              width: b.width,
              height: b.height,
              label: b.label?.trim() || null,
            })),
          });
        }
      }
    });

    const result = await prisma.hall.findUnique({
      where: { id },
      include: {
        seats: { orderBy: [{ positionY: 'asc' }, { positionX: 'asc' }] },
        layoutBlocks: { orderBy: [{ y: 'asc' }, { x: 'asc' }] },
      },
    });

    return NextResponse.json({ message: 'Cập nhật phòng và sơ đồ thành công.', hall: result });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: 'Không thể cập nhật phòng chiếu.' }, { status: 500 });
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  if (!(await isAdmin(request))) {
    return NextResponse.json({ message: 'Bạn không có quyền thực hiện thao tác này.' }, { status: 403 });
  }

  try {
    const { id } = await context.params;
    const hall = await prisma.hall.findUnique({ where: { id } });
    if (!hall) return NextResponse.json({ message: 'Không tìm thấy phòng chiếu.' }, { status: 404 });

    const showtimeCount = await prisma.showtime.count({ where: { hallId: id } });
    if (showtimeCount > 0) {
      return NextResponse.json({
        message: `Không thể xóa phòng vì đang có ${showtimeCount} suất chiếu. Vui lòng xóa hoặc chuyển suất chiếu trước.`,
      }, { status: 400 });
    }

    const ticketCount = await prisma.ticket.count({ where: { seat: { hallId: id } } });
    if (ticketCount > 0) {
      return NextResponse.json({ message: 'Không thể xóa phòng vì đã có dữ liệu vé liên quan.' }, { status: 400 });
    }

    await prisma.hall.delete({ where: { id } });
    return NextResponse.json({ message: 'Xóa phòng chiếu thành công.' });
  } catch {
    return NextResponse.json({ message: 'Không thể xóa phòng do đang có dữ liệu liên quan.' }, { status: 400 });
  }
}
