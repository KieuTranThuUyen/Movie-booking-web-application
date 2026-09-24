import { z } from 'zod';
import {
  emailSchema,
  nameSchema,
  optionalPhoneSchema,
  passwordSchema,
  phoneSchema,
  strongPasswordSchema,
} from '@/lib/validation/common';

export const loginSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Vui lòng nhập email hoặc số điện thoại.')
    .max(255),
  password: passwordSchema,
});

export const registerSchema = z
  .object({
    name: nameSchema,
    email: emailSchema,
    phone: phoneSchema,
    password: strongPasswordSchema,
    confirmPassword: z.string().max(128),
  })
  .refine((data) => data.password === data.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Mật khẩu và xác nhận mật khẩu không khớp.',
  });

export const changePasswordSchema = z
  .object({
    currentPassword: passwordSchema,
    newPassword: strongPasswordSchema,
    confirmPassword: z.string().max(128),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Mật khẩu mới và xác nhận không khớp.',
  })
  .refine((data) => data.currentPassword !== data.newPassword, {
    path: ['newPassword'],
    message: 'Mật khẩu mới phải khác mật khẩu hiện tại.',
  });

export const updateProfileSchema = z.object({
  name: nameSchema,
  phone: optionalPhoneSchema,
  address: z.string().trim().max(255).optional().nullable(),
  city: z.string().trim().max(100).optional().nullable(),
  district: z.string().trim().max(100).optional().nullable(),
});

export const forgotPasswordSchema = z.object({
  email: emailSchema,
});

export const resetPasswordSchema = z
  .object({
    token: z.string().trim().min(20).max(200),
    password: strongPasswordSchema,
    confirmPassword: z.string().max(128),
  })
  .refine((data) => data.password === data.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Mật khẩu và xác nhận mật khẩu không khớp.',
  });
