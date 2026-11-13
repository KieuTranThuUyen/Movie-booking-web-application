import { TicketStatus } from '@prisma/client';
import { prisma } from '@/lib/db/prisma';

export async function expirePastTicketItems(now = new Date()) {
    const [tickets, combos] = await prisma.$transaction([
        prisma.ticket.updateMany({
            where: {
                status: TicketStatus.ACTIVE,
                booking: {
                    showtime: {
                        endTime: { lte: now },
                    },
                },
            },
            data: {
                status: TicketStatus.EXPIRED,
            },
        }),
        prisma.bookingCombo.updateMany({
            where: {
                status: TicketStatus.ACTIVE,
                booking: {
                    showtime: {
                        endTime: { lte: now },
                    },
                },
            },
            data: {
                status: TicketStatus.EXPIRED,
            },
        }),
    ]);

    return {
        tickets: tickets.count,
        combos: combos.count,
    };
}
