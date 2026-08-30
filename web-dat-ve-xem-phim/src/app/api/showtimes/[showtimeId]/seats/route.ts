import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';

type RouteContext = {
  params: Promise<{
    showtimeId: string;
  }>;
};

export async function GET(
  request: Request,
  context: RouteContext
) {
  try {
    const { showtimeId } = await context.params;

    if (!showtimeId) {
      return NextResponse.json(
        {
          message: 'Thiếu showtimeId.',
        },
        {
          status: 400,
        }
      );
    }

    /*
     * ============================================================
     * TÌM SUẤT CHIẾU
     * ============================================================
     *
     * Showtime -> Hall
     *
     * Đồng thời lấy toàn bộ thông tin layout của Hall:
     *
     * - layoutWidth
     * - layoutHeight
     * - layoutPreset
     * - layoutBlocks
     */

    const showtime =
      await prisma.showtime.findUnique({
        where: {
          id: showtimeId,
        },

        select: {
          id: true,

          hall: {
            select: {
              id: true,
              name: true,
              capacity: true,

              layoutWidth: true,
              layoutHeight: true,
              layoutPreset: true,

              /*
               * Lấy toàn bộ block do Admin tạo:
               *
               * - lối đi
               * - khoảng trống
               * - sân khấu
               * - màn hình
               * - khu vực
               * - ghi chú
               * - ...
               */

              layoutBlocks: {
                select: {
                  id: true,
                  type: true,
                  x: true,
                  y: true,
                  width: true,
                  height: true,
                  label: true,
                },

                orderBy: [
                  {
                    y: 'asc',
                  },
                  {
                    x: 'asc',
                  },
                ],
              },

              /*
               * Lấy ghế thuộc Hall.
               *
               * QUAN TRỌNG:
               * phải lấy positionX + positionY.
               */

              seats: {
                select: {
                  id: true,
                  code: true,
                  isActive: true,
                  rowLabel: true,
                  seatNumber: true,
                  type: true,

                  positionX: true,
                  positionY: true,
                },

                orderBy: [
                  {
                    positionY: 'asc',
                  },
                  {
                    positionX: 'asc',
                  },
                  {
                    rowLabel: 'asc',
                  },
                  {
                    seatNumber: 'asc',
                  },
                ],
              },
            },
          },
        },
      });

    if (!showtime) {
      return NextResponse.json(
        {
          message:
            'Không tìm thấy suất chiếu.',
        },
        {
          status: 404,
        }
      );
    }

    if (!showtime.hall) {
      return NextResponse.json(
        {
          message:
            'Không tìm thấy phòng chiếu.',
        },
        {
          status: 404,
        }
      );
    }

    /*
     * ============================================================
     * RESPONSE
     * ============================================================
     *
     * Trả về:
     *
     * {
     *   hall: {
     *     layoutWidth,
     *     layoutHeight,
     *     layoutPreset,
     *     layoutBlocks
     *   },
     *   seats: [
     *     {
     *       positionX,
     *       positionY
     *     }
     *   ]
     * }
     */

    return NextResponse.json(
      {
        hall: {
          id: showtime.hall.id,

          name: showtime.hall.name,

          capacity:
            showtime.hall.capacity,

          layoutWidth:
            showtime.hall.layoutWidth,

          layoutHeight:
            showtime.hall.layoutHeight,

          layoutPreset:
            showtime.hall.layoutPreset,

          layoutBlocks:
            showtime.hall.layoutBlocks,
        },

        seats: showtime.hall.seats,
      },
      {
        status: 200,

        headers: {
          'Cache-Control':
            'no-store, max-age=0',
        },
      }
    );
  } catch (error) {
    console.error(
      'GET /api/showtimes/[showtimeId]/seats error:',
      error
    );

    return NextResponse.json(
      {
        message:
          'Không thể lấy sơ đồ ghế.',
      },
      {
        status: 500,
      }
    );
  }
}