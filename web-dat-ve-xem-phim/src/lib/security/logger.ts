/**
 * Logger an toàn — không log password, token, body nhạy cảm.
 * Production chỉ log message ngắn; development log đầy đủ hơn.
 */

const SENSITIVE_KEYS = new Set([
  'password',
  'confirmPassword',
  'currentPassword',
  'newPassword',
  'token',
  'secret',
  'authorization',
  'cookie',
  'nexcookie',
  'creditCard',
  'cvv',
]);

function redact(value: unknown, depth = 0): unknown {
  if (depth > 4) return '[MaxDepth]';
  if (value == null) return value;
  if (typeof value === 'string') {
    if (value.length > 200) return value.slice(0, 200) + '…';
    return value;
  }
  if (typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.slice(0, 20).map((v) => redact(v, depth + 1));

  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    if (SENSITIVE_KEYS.has(k.toLowerCase())) {
      out[k] = '[REDACTED]';
    } else {
      out[k] = redact(v, depth + 1);
    }
  }
  return out;
}

export const logger = {
  info(context: string, message: string, meta?: unknown) {
    if (process.env.NODE_ENV === 'production') {
      console.info(`[${context}] ${message}`);
    } else {
      console.info(`[${context}] ${message}`, meta !== undefined ? redact(meta) : '');
    }
  },

  warn(context: string, message: string, meta?: unknown) {
    console.warn(`[${context}] ${message}`, meta !== undefined ? redact(meta) : '');
  },

  error(context: string, error: unknown, meta?: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    if (process.env.NODE_ENV === 'production') {
      console.error(`[${context}] ${msg}`);
    } else {
      console.error(`[${context}] ${msg}`, meta !== undefined ? redact(meta) : '', error);
    }
  },
};
