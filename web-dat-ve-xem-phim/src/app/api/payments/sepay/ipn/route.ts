import { NextResponse } from 'next/server';
import { BookingStatus, PaymentStatus, } from '@prisma/client';
import { prisma } from '@/lib/db/prisma';
import { confirmBookingPayment, } from '@/lib/payment/confirm-booking-payment';
import { sendTicketEmail } from '@/lib/mail';
type SepayIPNPayload = {
    timestamp?: number;
    notification_type?: string;
    order?: {
        id?: string;
        order_id?: string;
        order_status?: string;
        order_currency?: string;
        order_amount?: string | number;
        order_invoice_number?: string;
        order_description?: string;
        custom_data?: {
            test_mode?: boolean;
            webhook_test?: boolean;
            bookingCode?: string;
            booking_code?: string;
        };
    };
    transaction?: {
        id?: string;
        payment_method?: string;
        transaction_id?: string;
        transaction_type?: string;
        transaction_date?: string;
        transaction_status?: string;
        transaction_amount?: string | number;
        transaction_currency?: string;
        authentication_status?: string;
    };
};
export async function POST(request: Request) {
    try {
        










        const payload = (await request.json()) as SepayIPNPayload;
        console.log('[SePay Payment Gateway IPN] REQUEST RECEIVED');
        console.log('[SePay IPN] Payload:', JSON.stringify(payload, null, 2));
        




        if (payload.order
            ?.custom_data
            ?.webhook_test === true) {
            console.log('[SePay IPN] TEST IPN RECEIVED');
            return NextResponse.json({
                success: true,
                test: true,
                message: 'SePay test IPN received successfully.',
            });
        }
        




        if (payload.notification_type !==
            'ORDER_PAID') {
            console.log('[SePay IPN] Ignored notification:', payload.notification_type);
            return NextResponse.json({
                success: true,
                ignored: true,
                reason: 'NOT_ORDER_PAID',
                notificationType: payload.notification_type ??
                    null,
            });
        }
        




        const order = payload.order;
        if (!order) {
            return NextResponse.json({
                success: false,
                message: 'Missing order.',
            }, {
                status: 400,
            });
        }
        












        const bookingCode = String(order.order_invoice_number ??
            order.custom_data
                ?.bookingCode ??
            order.custom_data
                ?.booking_code ??
            '').trim();
        if (!bookingCode) {
            console.error('[SePay IPN] Missing booking code.');
            return NextResponse.json({
                success: false,
                message: 'Missing booking code.',
            }, {
                status: 400,
            });
        }
        console.log('[SePay IPN] Booking code:', bookingCode);
        




        if (order.order_status &&
            order.order_status !==
                'CAPTURED') {
            console.log('[SePay IPN] Order not captured:', order.order_status);
            return NextResponse.json({
                success: true,
                ignored: true,
                reason: 'ORDER_NOT_CAPTURED',
                orderStatus: order.order_status,
            });
        }
        




        const transaction = payload.transaction;
        if (transaction?.transaction_status &&
            transaction.transaction_status !==
                'APPROVED') {
            console.log('[SePay IPN] Transaction not approved:', transaction.transaction_status);
            return NextResponse.json({
                success: true,
                ignored: true,
                reason: 'TRANSACTION_NOT_APPROVED',
                transactionStatus: transaction.transaction_status,
            });
        }
        




        const booking = await prisma.booking.findUnique({
            where: {
                bookingCode,
            },
            include: {
                payment: true,
            },
        });
        if (!booking) {
            console.warn('[SePay IPN] Booking not found:', bookingCode);
            



            return NextResponse.json({
                success: true,
                ignored: true,
                reason: 'BOOKING_NOT_FOUND',
            });
        }
        console.log('[SePay IPN] Booking found:', {
            bookingId: booking.id,
            bookingCode: booking.bookingCode,
            status: booking.status,
            paymentStatus: booking.paymentStatus,
            totalPrice: booking.totalPrice,
        });
        




        if (booking.paymentStatus ===
            PaymentStatus.PAID &&
            booking.status ===
                BookingStatus.CONFIRMED) {
            console.log('[SePay IPN] Already processed:', bookingCode);
            return NextResponse.json({
                success: true,
                alreadyPaid: true,
                bookingId: booking.id,
                bookingCode,
            });
        }
        




        if (!booking.payment) {
            console.error('[SePay IPN] Payment not found:', bookingCode);
            return NextResponse.json({
                success: false,
                message: 'Payment not found.',
            }, {
                status: 409,
            });
        }
        




        const paidAmount = Math.round(Number(transaction?.transaction_amount ??
            order.order_amount ??
            0));
        const requiredAmount = Math.round(Number(booking.totalPrice ?? booking.payment?.amount ?? 0));
        console.log('[SePay IPN] Amount check:', {
            bookingCode,
            paidAmount,
            requiredAmount,
            paymentAmount: booking.payment?.amount,
            totalPrice: booking.totalPrice,
        });
        




        if (!Number.isFinite(paidAmount) || Math.abs(paidAmount - requiredAmount) > 1) {
            console.warn('[SePay IPN] Amount mismatch — will not confirm tickets:', {
                bookingCode,
                paidAmount,
                requiredAmount,
            });
            
            return NextResponse.json({
                success: false,
                amountMismatch: true,
                paidAmount,
                requiredAmount,
                message: 'Số tiền IPN không khớp đơn.',
            }, { status: 409 });
        }
        




        const transactionCode = transaction?.transaction_id ??
            transaction?.id ??
            order.order_id ??
            undefined;
        




        let paidAt = new Date();
        if (transaction?.transaction_date) {
            const parsed = new Date(transaction.transaction_date);
            if (!Number.isNaN(parsed.getTime())) {
                paidAt =
                    parsed;
            }
        }
        











        console.log('[SePay IPN] Confirming payment:', {
            bookingId: booking.id,
            bookingCode: booking.bookingCode,
            transactionCode,
            paidAt,
        });
        const result = await confirmBookingPayment({
            bookingId: booking.id,
            transactionCode,
            paidAt,
        });
        if (!result.alreadyPaid) {
            try {
                const ticketBooking = await prisma.booking.findUnique({
                    where: { id: result.booking.id },
                    include: {
                        showtime: {
                            include: {
                                movie: true,
                                hall: { include: { cinema: true } },
                            },
                        },
                        tickets: { orderBy: { seatCode: 'asc' } },
                        combos: { include: { combo: true }, orderBy: { id: 'asc' } },
                    },
                });
                if (ticketBooking?.customerEmail) {
                    await sendTicketEmail({
                        to: ticketBooking.customerEmail,
                        customerName: ticketBooking.customerName,
                        bookingCode: ticketBooking.bookingCode,
                        bookingId: ticketBooking.id,
                        movieTitle: ticketBooking.showtime.movie.title,
                        cinemaName: ticketBooking.showtime.hall.cinema.name,
                        hallName: ticketBooking.showtime.hall.name,
                        startTime: ticketBooking.showtime.startTime,
                        tickets: ticketBooking.tickets,
                        combos: ticketBooking.combos.map((combo) => ({
                            name: combo.combo.name,
                            quantity: combo.quantity,
                            unitPrice: combo.unitPrice,
                            qrCode: combo.qrCode,
                        })),
                        totalPrice: ticketBooking.totalPrice,
                    });
                }
            }
            catch (emailError) {
                console.error('[SePay IPN] Ticket email failed:', emailError);
            }
        }
        




        console.log('[SePay IPN] Payment confirmed:', {
            bookingId: result.booking.id,
            bookingCode: result.booking.bookingCode,
            status: result.booking.status,
            paymentStatus: result.booking.paymentStatus,
            alreadyPaid: result.alreadyPaid,
        });
        




        return NextResponse.json({
            success: true,
            paid: true,
            alreadyPaid: result.alreadyPaid,
            bookingId: result.booking.id,
            bookingCode: result.booking.bookingCode,
            paymentStatus: result.booking.paymentStatus,
            status: result.booking.status,
        });
    }
    catch (error) {
        console.error('[SePay IPN] Processing failed:', error);
        



        return NextResponse.json({
            success: false,
            message: 'Không thể xử lý thanh toán SePay.',
        }, {
            status: 500,
        });
    }
}
