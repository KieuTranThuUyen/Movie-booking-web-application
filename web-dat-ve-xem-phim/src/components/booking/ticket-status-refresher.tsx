'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

type TicketStatusRefresherProps = {
    bookingId: string;
    booking: {
        status: string;
        paymentStatus: string;
    };
    tickets: Array<{
        id: string;
        status: string;
    }>;
    combos: Array<{
        id: string;
        status: string;
    }>;
};

type TicketStatusResponse = {
    success: boolean;
    booking?: {
        status: string;
        paymentStatus: string;
    };
    tickets?: Array<{
        id: string;
        status: string;
    }>;
    combos?: Array<{
        id: string;
        status: string;
    }>;
};

function getStatusSnapshot(
    tickets: Array<{ id: string; status: string }>,
    combos: Array<{ id: string; status: string }>,
    booking?: { status: string; paymentStatus: string },
) {
    return JSON.stringify({
        booking,
        tickets: tickets
            .map((ticket) => `${ticket.id}:${ticket.status}`)
            .sort(),
        combos: combos
            .map((combo) => `${combo.id}:${combo.status}`)
            .sort(),
    });
}

export function TicketStatusRefresher({
    bookingId,
    booking,
    tickets,
    combos,
}: TicketStatusRefresherProps) {
    const router = useRouter();
    const snapshotRef = useRef(getStatusSnapshot(tickets, combos, booking));

    useEffect(() => {
        let stopped = false;
        snapshotRef.current = getStatusSnapshot(tickets, combos, booking);

        const checkStatus = async () => {
            try {
                const response = await fetch(
                    `/api/bookings/${encodeURIComponent(bookingId)}/payment-status`,
                    {
                        cache: 'no-store',
                        headers: {
                            'Cache-Control': 'no-cache',
                        },
                    },
                );

                if (!response.ok || stopped) {
                    return;
                }

                const data = (await response.json()) as TicketStatusResponse;
                if (!data.success || !data.tickets || !data.combos || stopped) {
                    return;
                }

                const nextSnapshot = getStatusSnapshot(data.tickets, data.combos, data.booking);
                if (nextSnapshot !== snapshotRef.current) {
                    snapshotRef.current = nextSnapshot;
                    router.refresh();
                }
            } catch (error) {
                console.error('Ticket status refresh error:', error);
            }
        };

        const timer = window.setInterval(() => {
            void checkStatus();
        }, 3000);

        return () => {
            stopped = true;
            window.clearInterval(timer);
        };
    }, [bookingId, combos, router, tickets]);

    return null;
}
