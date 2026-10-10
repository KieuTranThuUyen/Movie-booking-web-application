import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { BookingStatus, PaymentStatus, } from '@prisma/client';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db/prisma';
const PAYMENT_METHOD = 'SEPAY';
type CreateBookingBody = {
    showtimeId?: string;
    seats?: string;
    note?: string;
    voucherCode?: string;
    combos?: Array<{
        id: string;
        quantity: number;
    }>;
};
function createBookingCode(): string {
    return `BK${Date.now()
        .toString()
        .slice(-8)}${Math.floor(Math.random() * 900 + 100)}`;
}



export async function GET() {
    try {
        const session = await getServerSession(authOptions);
        const user = session?.user;
        if (!user?.id) {
            return NextResponse.json({
                message: 'Báº¡n cáº§n Ä‘Äƒng nháº­p Ä‘á»ƒ xem Ä‘Æ¡n Ä‘áº·t vÃ©.',
            }, {
                status: 401,
            });
        }
        const bookings = await prisma.booking.findMany({
            where: user.role === 'ADMIN'
                ? undefined
                : {
                    userId: user.id,
                },
            orderBy: {
                createdAt: 'desc',
            },
            include: {
                showtime: {
                    include: {
                        movie: true,
                        hall: {
                            include: {
                                cinema: true,
                            },
                        },
                    },
                },
                tickets: true,
                payment: true,
            },
        });
        const result = bookings.map((booking) => ({
            id: booking.id,
            bookingCode: booking.bookingCode,
            customerName: booking.customerName,
            customerEmail: booking.customerEmail,
            customerPhone: booking.customerPhone,
            status: booking.status,
            paymentStatus: booking.paymentStatus,
            paymentMethod: booking.paymentMethod,
            totalPrice: booking.totalPrice,
            createdAt: booking.createdAt,
            movieTitle: booking.showtime
                .movie.title,
            showtimeLabel: `${booking.showtime.movie.title} Â· ` +
                `${booking.showtime.hall.cinema.name} Â· ` +
                `${booking.showtime.hall.name} Â· ` +
                `${new Date(booking.showtime.startTime).toLocaleString('vi-VN')}`,
            seats: booking.tickets.map((ticket) => ticket.seatCode),
            payment: booking.payment
                ? {
                    id: booking.payment
                        .id,
                    provider: booking.payment
                        .provider,
                    amount: booking.payment
                        .amount,
                    status: booking.payment
                        .status,
                    transactionCode: booking.payment
                        .transactionCode,
                    paidAt: booking.payment
                        .paidAt,
                }
                : null,
        }));
        return NextResponse.json(result);
    }
    catch (error) {
        console.error('GET /api/bookings error:', error);
        return NextResponse.json({
            message: 'KhÃ´ng thá»ƒ láº¥y danh sÃ¡ch Ä‘Æ¡n Ä‘áº·t vÃ©.',
        }, {
            status: 500,
        });
    }
}



export async function POST(request: Request) {
    try {
        const session = await getServerSession(authOptions);
        const user = session?.user;
        if (!user?.id) {
            return NextResponse.json({
                message: 'Báº¡n cáº§n Ä‘Äƒng nháº­p trÆ°á»›c khi Ä‘áº·t vÃ©.',
            }, {
                status: 401,
            });
        }
        const body = (await request.json()) as CreateBookingBody;
        const showtimeId = String(body.showtimeId ?? '').trim();
        const requestedSeatCodes = [
            ...new Set(String(body.seats ?? '')
                .split(',')
                .map((seat) => seat.trim())
                .filter(Boolean)),
        ];
        if (!showtimeId ||
            requestedSeatCodes.length === 0) {
            return NextResponse.json({
                message: 'Vui lÃ²ng chá»n suáº¥t chiáº¿u vÃ  gháº¿ trÆ°á»›c khi thanh toÃ¡n.',
            }, {
                status: 400,
            });
        }
        const now = new Date();



        const showtime = await prisma.showtime.findUnique({
            where: {
                id: showtimeId,
            },
            include: {
                movie: true,
                hall: {
                    include: {
                        seats: true,
                        cinema: true,
                    },
                },
            },
        });
        if (!showtime) {
            return NextResponse.json({
                message: 'KhÃ´ng tÃ¬m tháº¥y suáº¥t chiáº¿u tÆ°Æ¡ng á»©ng.',
            }, {
                status: 404,
            });
        }
        if (showtime.startTime <=
            now) {
            return NextResponse.json({
                message: 'Suáº¥t chiáº¿u Ä‘Ã£ báº¯t Ä‘áº§u. KhÃ´ng thá»ƒ Ä‘áº·t vÃ©.',
            }, {
                status: 400,
            });
        }



        const selectedSeats = showtime.hall.seats.filter((seat) => requestedSeatCodes.includes(seat.code));
        if (selectedSeats.length !==
            requestedSeatCodes.length) {
            return NextResponse.json({
                message: 'CÃ³ gháº¿ khÃ´ng tá»“n táº¡i trong phÃ²ng chiáº¿u nÃ y.',
            }, {
                status: 400,
            });
        }



        const inactiveSeats = selectedSeats.filter((seat) => !seat.isActive);
        if (inactiveSeats.length > 0) {
            return NextResponse.json({
                message: `Gháº¿ ${inactiveSeats
                    .map((seat) => seat.code)
                    .join(', ')} Ä‘ang bá»‹ khÃ³a bá»Ÿi quáº£n trá»‹ viÃªn.`,
            }, {
                status: 409,
            });
        }



        await prisma.seatHold.deleteMany({
            where: {
                showtimeId,
                expiresAt: {
                    lte: now,
                },
            },
        });



        const expiredPendingBookings = await prisma.booking.findMany({
            where: {
                userId: user.id,
                showtimeId,
                status: BookingStatus.PENDING,
                seatHolds: {
                    none: {
                        expiresAt: {
                            gt: now,
                        },
                    },
                },
            },
            select: {
                id: true,
            },
        });
        if (expiredPendingBookings.length >
            0) {
            await prisma.booking.updateMany({
                where: {
                    id: {
                        in: expiredPendingBookings.map((booking) => booking.id),
                    },
                    status: BookingStatus.PENDING,
                },
                data: {
                    status: BookingStatus.CANCELED,
                },
            });
            await prisma.seatHold.deleteMany({
                where: {
                    bookingId: {
                        in: expiredPendingBookings.map((booking) => booking.id),
                    },
                },
            });
        }



        const soldTickets = await prisma.ticket.findMany({
            where: {
                seatId: {
                    in: selectedSeats.map((seat) => seat.id),
                },

                status: {
                    not: 'CANCELED',
                },
                booking: {
                    showtimeId,
                    status: {
                        not: BookingStatus.CANCELED,
                    },
                },
            },
            select: {
                seatCode: true,
            },
        });
        if (soldTickets.length >
            0) {
            return NextResponse.json({
                message: `Gháº¿ ${soldTickets
                    .map((ticket) => ticket.seatCode)
                    .join(', ')} Ä‘Ã£ Ä‘Æ°á»£c Ä‘áº·t.`,
            }, {
                status: 409,
            });
        }



        const selectedSeatIds = selectedSeats.map((seat) => seat.id);
        const userHolds = await prisma.seatHold.findMany({
            where: {
                showtimeId,
                userId: user.id,
                seatId: {
                    in: selectedSeatIds,
                },
                expiresAt: {
                    gt: now,
                },
                bookingId: null,
            },
            select: {
                id: true,
                seatId: true,
                bookingId: true,
                expiresAt: true,
            },
        });



        const heldIds = new Set(userHolds.map((hold) => hold.seatId));
        const missingSeats = selectedSeats.filter((seat) => !heldIds.has(seat.id));
        if (missingSeats.length >
            0) {
            return NextResponse.json({
                message: `Gháº¿ ${missingSeats
                    .map((seat) => seat.code)
                    .join(', ')} khÃ´ng cÃ²n Ä‘Æ°á»£c báº¡n giá»¯. Vui lÃ²ng chá»n láº¡i gháº¿.`,
            }, {
                status: 409,
            });
        }



        const getSeatPrice = (type: string) => {
            switch (type.toUpperCase()) {
                case 'VIP':
                    return Number(showtime.vipPrice);
                case 'COUPLE':
                    return Number(showtime.couplePrice);
                default:
                    return Number(showtime.standardPrice);
            }
        };
        const totalPrice = selectedSeats.reduce((total, seat) => total +
            getSeatPrice(String(seat.type)), 0);
        const subtotalPrice = totalPrice;
        const voucherCode = body.voucherCode?.trim().toUpperCase();
        let voucherId: string | undefined;
        let discountAmount = 0;
        if (voucherCode) {
            const voucher = await prisma.voucher.findUnique({ where: { code: voucherCode } });
            const now = new Date();
            if (!voucher || !voucher.isActive || now < voucher.startsAt || now > voucher.endsAt) {
                return NextResponse.json({ message: 'Voucher khÃ´ng tá»“n táº¡i hoáº·c Ä‘Ã£ háº¿t háº¡n.' }, { status: 400 });
            }
            const usedByUser = await prisma.voucherRedemption.count({ where: { voucherId: voucher.id, userId: user.id } });
            if (subtotalPrice < voucher.minOrderAmount || (voucher.usageLimit !== null && voucher.usedCount >= voucher.usageLimit) || usedByUser >= voucher.perUserLimit) {
                return NextResponse.json({ message: 'Voucher khÃ´ng Ä‘á»§ Ä‘iá»u kiá»‡n sá»­ dá»¥ng.' }, { status: 400 });
            }
            voucherId = voucher.id;
            discountAmount = voucher.discountType === 'PERCENT'
                ? Math.min(subtotalPrice, Math.floor(subtotalPrice * voucher.discountValue / 100))
                : Math.min(subtotalPrice, voucher.discountValue);
        }
        const payableTotal = subtotalPrice - discountAmount;
        const comboItems = (body.combos ?? [])
            .map((item) => ({
            id: String(item?.id ?? '').trim(),
            quantity: Math.floor(Number(item?.quantity)),
        }))
            .filter((item) => item.id && Number.isFinite(item.quantity) && item.quantity > 0);








        const booking = await prisma.$transaction(async (tx) => {
            const selectedCombos = comboItems.length
                ? await tx.combo.findMany({
                    where: { id: { in: comboItems.map((item) => item.id) }, isActive: true },
                })
                : [];
            if (selectedCombos.length !== comboItems.length) {
                throw new Error('COMBO_NOT_FOUND');
            }
            const comboTotal = selectedCombos.reduce((sum, combo) => {
                const item = comboItems.find((candidate) => candidate.id === combo.id)!;
                if (combo.stock < item.quantity)
                    throw new Error('COMBO_OUT_OF_STOCK');
                return sum + Math.floor(Number(combo.price)) * Math.floor(Number(item.quantity));
            }, 0);
            const orderTotal = Math.floor(Number(payableTotal)) + comboTotal;
            const bookingRecord = await tx.booking.create({
                data: {
                    bookingCode: createBookingCode(),
                    userId: user.id,
                    showtimeId,
                    customerName: user.name ??
                        'KhÃ¡ch hÃ ng',
                    customerEmail: user.email ??
                        '',
                    customerPhone: user.phone ??
                        '',
                    note: body.note ??
                        null,
                    paymentMethod: PAYMENT_METHOD,
                    totalPrice: orderTotal,
                    subtotalPrice,
                    discountAmount,
                    voucherId,
                    status: BookingStatus.PENDING,
                    paymentStatus: PaymentStatus.UNPAID,
                },
            });



            await tx.seatHold.updateMany({
                where: {
                    showtimeId,
                    userId: user.id,
                    bookingId: null,
                    seatId: {
                        in: selectedSeatIds,
                    },
                    expiresAt: {
                        gt: new Date(),
                    },
                },
                data: {
                    bookingId: bookingRecord.id,
                    expiresAt: new Date(Date.now() + 15 * 60 * 1000),
                },
            });



            const finalHolds = await tx.seatHold.findMany({
                where: {
                    bookingId: bookingRecord.id,
                    seatId: {
                        in: selectedSeatIds,
                    },
                    expiresAt: {
                        gt: new Date(),
                    },
                },
                select: {
                    seatId: true,
                },
            });
            if (finalHolds.length !==
                selectedSeats.length) {
                throw new Error('SEAT_HOLD_ASSIGN_FAILED');
            }



            await tx.payment.create({
                data: {
                    bookingId: bookingRecord.id,
                    provider: PAYMENT_METHOD,
                    amount: orderTotal,
                    status: 'PENDING',
                },
            });
            if (voucherId) {
                await tx.voucher.update({ where: { id: voucherId }, data: { usedCount: { increment: 1 } } });
                await tx.voucherRedemption.create({ data: { voucherId, userId: user.id, bookingId: bookingRecord.id } });
            }
            for (const combo of selectedCombos) {
                const item = comboItems.find((candidate) => candidate.id === combo.id)!;
                const qty = Math.floor(Number(item.quantity));
                await tx.combo.update({ where: { id: combo.id }, data: { stock: { decrement: qty } } });

                for (let i = 0; i < qty; i++) {
                    await tx.bookingCombo.create({
                        data: {
                            bookingId: bookingRecord.id,
                            comboId: combo.id,
                            quantity: 1,
                            unitPrice: Math.floor(Number(combo.price)),
                        },
                    });
                }
            }
            return tx.booking.findUniqueOrThrow({
                where: {
                    id: bookingRecord.id,
                },
                include: {
                    payment: true,
                },
            });
        });



        console.log('[Create Booking] NEW BOOKING CREATED', {
            bookingId: booking.id,
            bookingCode: booking.bookingCode,
            totalPrice: booking.totalPrice,
        });
        return NextResponse.json({
            success: true,
            message: 'ÄÆ¡n Ä‘áº·t vÃ© Ä‘Ã£ Ä‘Æ°á»£c táº¡o má»›i.',
            id: booking.id,
            bookingId: booking.id,
            bookingCode: booking.bookingCode,
            paymentMethod: PAYMENT_METHOD,
            amount: booking.totalPrice,
            paymentDescription: `${process.env
                .SEPAY_PAYMENT_PREFIX ??
                'MOVIE'} ${booking.bookingCode}`,
            redirectTo: `/api/payments/sepay/checkout/${encodeURIComponent(booking.id)}`,
        }, {
            status: 201,
        });
    }
    catch (error) {
        console.error('POST /api/bookings error:', error);
        if (error instanceof Error) {
            if (error.message === 'SEAT_HOLD_ASSIGN_FAILED') {
                return NextResponse.json({ message: 'KhÃ´ng thá»ƒ cáº­p nháº­t gháº¿ cho Ä‘Æ¡n. Vui lÃ²ng chá»n láº¡i gháº¿.' }, { status: 409 });
            }
            if (error.message === 'COMBO_NOT_FOUND') {
                return NextResponse.json({ message: 'Combo khÃ´ng tá»“n táº¡i hoáº·c Ä‘Ã£ ngá»«ng bÃ¡n.' }, { status: 400 });
            }
            if (error.message === 'COMBO_OUT_OF_STOCK') {
                return NextResponse.json({ message: 'Combo Ä‘Ã£ háº¿t hÃ ng. Vui lÃ²ng chá»n láº¡i.' }, { status: 409 });
            }
        }
        return NextResponse.json({
            message: 'KhÃ´ng thá»ƒ táº¡o Ä‘Æ¡n Ä‘áº·t vÃ©.',
        }, {
            status: 500,
        });
    }
}
