import { BookingStatus, PaymentStatus, TicketStatus, } from '@prisma/client';
import { NextResponse } from 'next/server';
import { getToken, } from 'next-auth/jwt';
import type { NextRequest } from 'next/server';
import { prisma } from '@/lib/db/prisma';
type RouteContext = {
    params: Promise<{
        id: string;
        ticketId: string;
    }>;
};
async function isAdmin(request: Request) {
    const token = await getToken({
        req: request as NextRequest,
        secret: process.env
            .NEXTAUTH_SECRET,
    });
    return (token?.role ===
        'ADMIN');
}
function getBookingInclude() {
    return {
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
        tickets: {
            orderBy: {
                seatCode: 'asc' as const,
            },
        },
        combos: {
            include: {
                combo: true,
            },
            orderBy: {
                id: 'asc' as const,
            },
        },
        payment: true,
        user: {
            select: {
                id: true,
                name: true,
                email: true,
            },
        },
    };
}
export async function DELETE(request: Request, context: RouteContext) {
    


    if (!(await isAdmin(request))) {
        return NextResponse.json({
            message: 'Bạn không có quyền thực hiện thao tác này.',
        }, {
            status: 403,
        });
    }
    try {
        const { id, ticketId, } = await context.params;
        if (!id || !ticketId) {
            return NextResponse.json({
                message: 'Thông tin vé không hợp lệ.',
            }, {
                status: 400,
            });
        }
        


        const booking = await prisma.booking.findUnique({
            where: {
                id,
            },
            include: {
                showtime: true,
                tickets: true,
                combos: true,
                payment: true,
            },
        });
        if (!booking) {
            return NextResponse.json({
                message: 'Không tìm thấy đơn đặt vé.',
            }, {
                status: 404,
            });
        }
        


        const now = new Date();
        if (booking.showtime.startTime <=
            now) {
            return NextResponse.json({
                message: 'Suất chiếu đã bắt đầu hoặc đã kết thúc. Không thể hủy vé.',
            }, {
                status: 400,
            });
        }
        


        if (booking.status ===
            BookingStatus.CANCELED) {
            return NextResponse.json({
                message: 'Đơn đặt vé này đã bị hủy.',
            }, {
                status: 400,
            });
        }
        


        const ticket = booking.tickets.find((item) => item.id ===
            ticketId);
        if (!ticket) {
            return NextResponse.json({
                message: 'Không tìm thấy vé trong đơn đặt vé.',
            }, {
                status: 404,
            });
        }
        if (ticket.status ===
            TicketStatus.CANCELED) {
            return NextResponse.json({
                message: `Vé ghế ${ticket.seatCode} đã được hủy trước đó.`,
            }, {
                status: 400,
            });
        }
        


        const remainingActiveTickets = booking.tickets.filter((item) => item.status ===
            TicketStatus.ACTIVE &&
            item.id !==
                ticketId);
        



        const activeCombosCount = (booking.combos ?? []).filter((item) => item.status === TicketStatus.ACTIVE).length;
        if (remainingActiveTickets.length ===
            0 &&
            activeCombosCount === 0) {
            return NextResponse.json({
                message: 'Đây là mục cuối cùng còn hiệu lực. Hãy dùng chức năng Hủy đơn.',
            }, {
                status: 400,
            });
        }
        


        const wasPaid = booking.paymentStatus ===
            PaymentStatus.PAID ||
            booking.paymentStatus ===
                PaymentStatus.PARTIALLY_REFUNDED;
        const refundAmount = wasPaid
            ? Number(ticket.price)
            : 0;
        const nextRefundedAmount = Number(booking.refundedAmount) +
            refundAmount;
        


        const remainingActiveCombos = (booking.combos ?? []).filter((item) => item.status === TicketStatus.ACTIVE);
        const remainingTicketsTotal = remainingActiveTickets.reduce((sum, item) => sum +
            Number(item.price), 0);
        const remainingCombosTotal = remainingActiveCombos.reduce((sum, item) => sum +
            Number(item.unitPrice) * Number(item.quantity), 0);
        const remainingTotalPrice = remainingTicketsTotal + remainingCombosTotal;
        








        let nextPaymentStatus = booking.paymentStatus;
        let paymentRecordStatus: 'PENDING' | 'PAID' | 'PARTIALLY_REFUNDED' | 'REFUNDED' = 'PENDING';
        if (booking.paymentStatus ===
            PaymentStatus.PAID) {
            nextPaymentStatus =
                PaymentStatus.PARTIALLY_REFUNDED;
            paymentRecordStatus =
                'PARTIALLY_REFUNDED';
        }
        else if (booking.paymentStatus ===
            PaymentStatus.PARTIALLY_REFUNDED) {
            nextPaymentStatus =
                PaymentStatus.PARTIALLY_REFUNDED;
            paymentRecordStatus =
                'PARTIALLY_REFUNDED';
        }
        else if (booking.paymentStatus ===
            PaymentStatus.UNPAID) {
            nextPaymentStatus =
                PaymentStatus.UNPAID;
            paymentRecordStatus =
                'PENDING';
        }
        




        const nextBookingStatus = booking.status;
        


        const updated = await prisma.$transaction(async (tx) => {
            


            await tx.ticket.update({
                where: {
                    id: ticketId,
                },
                data: {
                    status: TicketStatus.CANCELED,
                    canceledAt: now,
                },
            });
            


            const updatedBooking = await tx.booking.update({
                where: {
                    id,
                },
                data: {
                    status: nextBookingStatus,
                    totalPrice: remainingTotalPrice,
                    refundedAmount: nextRefundedAmount,
                    paymentStatus: nextPaymentStatus,
                    ...(booking.payment
                        ? {
                            payment: {
                                update: {
                                    status: paymentRecordStatus,
                                    paidAt: booking.payment
                                        .paidAt,
                                },
                            },
                        }
                        : {}),
                },
                include: getBookingInclude(),
            });
            return updatedBooking;
        });
        


        console.log('[Admin Cancel Ticket]', {
            bookingId: booking.id,
            bookingCode: booking.bookingCode,
            canceledTicketId: ticket.id,
            canceledSeat: ticket.seatCode,
            refundAmount,
            remainingTotalPrice,
            paymentStatus: updated.paymentStatus,
            bookingStatus: updated.status,
        });
        return NextResponse.json({
            success: true,
            message: refundAmount > 0
                ? `Đã hủy vé ghế ${ticket.seatCode} và hoàn ${refundAmount.toLocaleString('vi-VN')} đ. Vé còn lại vẫn có hiệu lực.`
                : `Đã hủy vé ghế ${ticket.seatCode}. Vé còn lại vẫn có hiệu lực.`,
            booking: updated,
        });
    }
    catch (error) {
        console.error('DELETE admin ticket error:', error);
        return NextResponse.json({
            success: false,
            message: 'Có lỗi xảy ra khi hủy vé.',
        }, {
            status: 500,
        });
    }
}
