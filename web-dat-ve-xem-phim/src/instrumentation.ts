export async function register() {
    
    if (process.env.NEXT_RUNTIME === 'edge') {
        return;
    }
    const { ensureAdminUser } = await import('@/lib/auth/ensure-admin');
    const { expirePastTicketItems } = await import('@/lib/booking/expire-past-ticket-items');
    await ensureAdminUser();
    await expirePastTicketItems();
    setInterval(() => {
        void expirePastTicketItems().catch((error) => {
            console.error('[ticket-expiration] Không thể cập nhật vé hết hạn:', error);
        });
    }, 60_000);
}
