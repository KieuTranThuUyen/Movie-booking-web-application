# Web đặt vé xem phim

Đây là bộ khung Next.js cho đề tài **Xây dựng hệ thống đặt vé xem phim trực tuyến bằng Next.js, TypeScript, MySQL và Docker**.

## Những phần đã dựng sẵn

- Trang chủ
- Danh sách phim
- Chi tiết phim
- Chọn ghế đặt vé
- Giỏ vé
- Thanh toán
- Đăng nhập, đăng ký
- Tài khoản, lịch sử đơn vé
- Admin dashboard
- Prisma schema cho MySQL
- Dockerfile và docker-compose

## Những form đã tái sử dụng từ project PHP cũ

- Đăng nhập: `name`, `password`, `remember`
- Đăng ký: `name`, `email`, `phone`, `password`, `confirmPassword`
- Thanh toán: `fullName`, `phone`, `email`, `address`, `city`, `district`, `note`, `paymentMethod`

## Chạy dự án

1. Sao chép `.env.example` thành `.env`.
2. Cài dependencies: `npm install`.
3. Sinh Prisma client: `npm run prisma:generate`.
4. Chạy dev server: `npm run dev`.

## Lưu ý

Hiện tại đây là scaffold hoàn chỉnh để phát triển tiếp. Phần xử lý thật với PostgreSQL, NextAuth và bảng dữ liệu chi tiết có thể nối tiếp từ bộ khung này.