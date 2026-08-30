export async function register() {
  // Chỉ chạy phía Node server, không chạy trên Edge
  if (process.env.NEXT_RUNTIME === 'edge') {
    return;
  }

  const { ensureAdminUser } = await import('@/lib/auth/ensure-admin');
  await ensureAdminUser();
}