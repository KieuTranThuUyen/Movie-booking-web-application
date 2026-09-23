import { z } from 'zod';
import { idSchema } from '@/lib/validation/common';

export const createBookingSchema = z.object({
  showtimeId: idSchema,
  seats: z
    .string()
    .trim()
    .min(1)
    .max(2000)
    .refine((value) => {
      const seats = [
        ...new Set(
          value
            .split(',')
            .map((seat) => seat.trim())
            .filter(Boolean),
        ),
      ];
      return (
        seats.length >= 1 &&
        seats.length <= 30 &&
        seats.every((seat) => /^[A-Za-z0-9_-]{1,20}$/.test(seat))
      );
    }, 'Danh sách ghế không hợp lệ.'),
  note: z.string().trim().max(500).optional(),
});

export const bookingIdParamSchema = z.object({
  id: idSchema,
});
