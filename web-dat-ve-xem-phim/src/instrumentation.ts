export async function register() {
    
    if (process.env.NEXT_RUNTIME === 'edge') {
        return;
    }
    const { ensureAdminUser } = await import('@/lib/auth/ensure-admin');
    await ensureAdminUser();
}
