import { randomBytes, createHash } from 'crypto';

import { prisma } from '@/lib/db/prisma';

export const TOKEN_TYPES = {
  PASSWORD_RESET: 'PASSWORD_RESET',
  EMAIL_VERIFY: 'EMAIL_VERIFY',
} as const;

export type TokenType = (typeof TOKEN_TYPES)[keyof typeof TOKEN_TYPES];

const DEFAULT_TTL_MS: Record<TokenType, number> = {
  PASSWORD_RESET: 60 * 60 * 1000, // 1 giờ
  EMAIL_VERIFY: 24 * 60 * 60 * 1000, // 24 giờ
};

/** Tạo token thô (gửi cho user) + hash lưu DB */
export function generateRawToken(): string {
  return randomBytes(32).toString('hex');
}

export function hashToken(raw: string): string {
  return createHash('sha256').update(raw).digest('hex');
}

/**
 * Tạo token mới, vô hiệu hóa token cũ cùng type của user.
 * Trả về raw token để gửi email (không lưu raw vào DB).
 */
export async function createAuthToken(
  userId: string,
  type: TokenType,
  ttlMs = DEFAULT_TTL_MS[type],
): Promise<string> {
  const raw = generateRawToken();
  const token = hashToken(raw);
  const expiresAt = new Date(Date.now() + ttlMs);

  // Xóa token cũ cùng type chưa dùng
  await prisma.authToken.deleteMany({
    where: {
      userId,
      type,
      usedAt: null,
    },
  });

  await prisma.authToken.create({
    data: {
      userId,
      token,
      type,
      expiresAt,
    },
  });

  return raw;
}

/**
 * Xác thực raw token → trả về record nếu hợp lệ.
 */
export async function consumeAuthToken(raw: string, type: TokenType) {
  const token = hashToken(raw);

  const record = await prisma.authToken.findFirst({
    where: {
      token,
      type,
      usedAt: null,
      expiresAt: { gt: new Date() },
    },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          name: true,
          emailVerified: true,
        },
      },
    },
  });

  if (!record) {
    return null;
  }

  await prisma.authToken.update({
    where: { id: record.id },
    data: { usedAt: new Date() },
  });

  return record;
}
