import { NextResponse } from 'next/server';
import { ZodError } from 'zod';

/**
 * Lỗi nghiệp vụ có mã ổn định — dùng throw ApiError trong route handlers.
 * Client chỉ nhận message + code, không có stack trace.
 */
export class ApiError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(message: string, status = 400, code = 'BAD_REQUEST') {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }
}

export function unauthorized(message = 'Bạn cần đăng nhập.') {
  return new ApiError(message, 401, 'UNAUTHORIZED');
}

export function forbidden(message = 'Bạn không có quyền thực hiện thao tác này.') {
  return new ApiError(message, 403, 'FORBIDDEN');
}

export function notFound(message = 'Không tìm thấy dữ liệu.') {
  return new ApiError(message, 404, 'NOT_FOUND');
}

export function conflict(message: string) {
  return new ApiError(message, 409, 'CONFLICT');
}

export function tooManyRequests(message = 'Bạn gửi quá nhiều yêu cầu. Vui lòng thử lại sau.') {
  return new ApiError(message, 429, 'RATE_LIMITED');
}

/**
 * Chuyển mọi lỗi thành JSON an toàn cho client.
 * - ZodError → 400 + message đầu tiên
 * - ApiError → status + code + message
 * - Còn lại → 500 generic (log server-side, không lộ stack)
 */
export function handleApiError(error: unknown, context?: string): NextResponse {
  if (error instanceof ZodError) {
    const first = error.issues[0];
    const message = first?.message ?? 'Dữ liệu không hợp lệ.';
    return NextResponse.json(
      { message, code: 'VALIDATION_ERROR', field: first?.path?.join('.') },
      { status: 400 },
    );
  }

  if (error instanceof SyntaxError) {
    return NextResponse.json(
      { message: 'Body JSON không hợp lệ.', code: 'INVALID_JSON' },
      { status: 400 },
    );
  }

  if (error instanceof ApiError) {
    return NextResponse.json(
      { message: error.message, code: error.code },
      { status: error.status },
    );
  }

  // Log nội bộ — không gửi stack cho client
  const label = context ? `[${context}]` : '[API]';
  if (process.env.NODE_ENV !== 'production') {
    console.error(label, error);
  } else {
    // Production: chỉ log message, tránh lộ dữ liệu nhạy cảm
    const msg = error instanceof Error ? error.message : 'Unknown error';
    console.error(label, msg);
  }

  return NextResponse.json(
    { message: 'Đã xảy ra lỗi hệ thống. Vui lòng thử lại sau.', code: 'INTERNAL_ERROR' },
    { status: 500 },
  );
}
