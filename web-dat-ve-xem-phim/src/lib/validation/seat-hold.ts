import { z } from 'zod';
import { idSchema } from '@/lib/validation/common';

export const seatHoldSchema = z.object({
  showtimeId: idSchema,
  seatIds: z
    .array(idSchema)
    .min(1, 'Cần chọn ít nhất 1 ghế.')
    .max(30, 'Tối đa 30 ghế mỗi lần giữ.')
    .transform((ids) => [...new Set(ids)]),
});
