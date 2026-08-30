import { hash } from 'bcryptjs';
import { UserRole } from '@prisma/client';

import { prisma } from '@/lib/db/prisma';

/**
 * Kiểm tra DB đã có admin chưa.
 * Nếu chưa → tạo từ biến môi trường ADMIN_*.
 * Chỉ tạo khi chưa tồn tại (theo email).
 */
export async function ensureAdminUser(): Promise<void> {
  const email = process.env.ADMIN_EMAIL?.trim();
  const password = process.env.ADMIN_PASSWORD;
  const name = process.env.ADMIN_NAME?.trim() || 'Administrator';

  // Không cấu hình .env → bỏ qua, không tạo
  if (!email || !password) {
    console.warn(
      '[ensure-admin] Bỏ qua: thiếu ADMIN_EMAIL hoặc ADMIN_PASSWORD trong .env',
    );
    return;
  }

  const existing = await prisma.user.findUnique({
    where: { email },
  });

  if (existing) {
    return;
  }

  const hashedPassword = await hash(password, 10);

  await prisma.user.create({
    data: {
      name,
      email,
      password: hashedPassword,
      role: UserRole.ADMIN,
    },
  });

  console.log(`[ensure-admin] Đã tạo tài khoản admin: ${email}`);
}