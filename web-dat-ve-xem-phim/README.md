# Web đặt vé xem phim

## Mô tả dự án

- Xây dựng website cho phép người dùng xem danh sách phim đang chiếu và sắp chiếu
- Hỗ trợ xem chi tiết phim, chọn suất chiếu, chọn ghế và đặt vé trực tuyến
- Hỗ trợ đăng ký, đăng nhập và quản lý tài khoản người dùng
- Cho phép xem giỏ vé, thanh toán và theo dõi lịch sử đặt vé
- Admin quản lý phim, rạp chiếu, sơ đồ ghế, suất chiếu, người dùng và đơn đặt vé
- Hỗ trợ xuất vé sau khi đặt thành công
- Website xác thực và phân quyền người dùng cho hệ thống
- Frontend: Next.js, React, TypeScript, Tailwind CSS
- Backend: Next.js API routes, Prisma
- Database: MySQL
- Deploy bằng Docker và Docker Compose

## Những phần đã dựng sẵn

- Trang chủ
- Danh sách phim
- Chi tiết phim
- Chọn ghế đặt vé
- Quản lý rạp chiếu
- Quản lý ghế theo từng rạp với sơ đồ và số lượng khác nhau
- Giỏ vé
- Thanh toán
- Xuất vé
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

## Chạy bằng Docker

1. Đảm bảo `.env` có `DATABASE_URL` trỏ tới MySQL trong Compose.
2. Khởi động dịch vụ: `docker compose up --build`.
3. Ứng dụng chạy ở `http://localhost:3000`, MySQL chạy ở `localhost:3306`.

## Lưu ý

Hiện tại đây là scaffold để phát triển tiếp. Code hiện có dùng MySQL + Prisma, còn phần xác thực và đặt vé mới ở mức route/màn hình mẫu, chưa phải backend production đầy đủ.