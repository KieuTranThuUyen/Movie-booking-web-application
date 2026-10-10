import { z } from 'zod';

export const idSchema = z
    .string()
    .trim()
    .min(1, 'Id không được để trống.')
    .max(100, 'Id không hợp lệ.')
    .regex(/^[a-zA-Z0-9_-]+$/, 'Id chứa ký tự không hợp lệ.');
export const emailSchema = z
    .string()
    .trim()
    .toLowerCase()
    .email('Email không hợp lệ.')
    .max(255, 'Email quá dài.');

export const phoneSchema = z
    .string()
    .trim()
    .regex(/^(0|\+84)?[0-9]{9,11}$/, 'Số điện thoại không hợp lệ.')
    .transform((v) => v.replace(/^\+84/, '0'));
export const optionalPhoneSchema = z
    .string()
    .trim()
    .optional()
    .nullable()
    .transform((v) => (v && v.length > 0 ? v : null))
    .pipe(z.union([phoneSchema, z.null()]).optional());





export const strongPasswordSchema = z
    .string()
    .min(8, 'Mật khẩu phải có ít nhất 8 ký tự.')
    .max(128, 'Mật khẩu không được vượt quá 128 ký tự.')
    .regex(/[a-z]/, 'Mật khẩu phải có ít nhất 1 chữ thường.')
    .regex(/[A-Z]/, 'Mật khẩu phải có ít nhất 1 chữ hoa.')
    .regex(/[0-9]/, 'Mật khẩu phải có ít nhất 1 chữ số.');

export const passwordSchema = z
    .string()
    .min(8, 'Mật khẩu phải có ít nhất 8 ký tự.')
    .max(128, 'Mật khẩu không được vượt quá 128 ký tự.');
export const nameSchema = z
    .string()
    .trim()
    .min(2, 'Họ tên phải có ít nhất 2 ký tự.')
    .max(100, 'Họ tên quá dài.')
    .regex(/^[\p{L}\p{N}\s.'-]+$/u, 'Họ tên chứa ký tự không hợp lệ.');
export const addressSchema = z
    .string()
    .trim()
    .max(255, 'Địa chỉ quá dài.')
    .optional()
    .nullable()
    .transform((v) => (v && v.length > 0 ? v : null));
