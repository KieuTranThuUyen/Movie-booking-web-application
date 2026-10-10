# Web đặt vé xem phim

## Giới thiệu

Dự án này là một ứng dụng đặt vé xem phim trực tuyến xây dựng bằng Next.js, Prisma và MySQL. Người dùng có thể duyệt phim, xem thông tin chi tiết, tìm suất chiếu, chọn ghế, thêm combo, áp dụng voucher, tiến hành thanh toán và quản lý đơn hàng sau khi đặt vé.

Hệ thống được chia thành 2 nhóm chính:

- Khách hàng: xem phim, tìm kiếm, đặt vé, thanh toán, xem vé, quản lý tài khoản, lịch sử đặt vé và hủy vé.
- Quản trị viên: quản lý phim, rạp, phòng chiếu, sơ đồ ghế, suất chiếu, user, voucher, booking, báo cáo và ticket.

Ngoài chức năng đặt vé truyền thống, dự án còn tích hợp:

- AI chatbot hỗ trợ tìm phim và suất chiếu bằng ngôn ngữ tự nhiên.
- AI search / recommendation tùy theo cấu hình API mô hình LLM.
- SePay checkout và webhook IPN cho thanh toán.
- Tạo mã QR cho vé và combo.
- Hủy vé/combos theo từng mục hoặc toàn bộ đơn hợp lệ.
- Xác thực email và đặt lại mật khẩu qua email.

---

## GitHub

Mã nguồn dự án:

https://github.com/KieuTranThuUyen/Movie-booking-web-application

---

## Công nghệ sử dụng

- Next.js 15
- React 19
- TypeScript
- Tailwind CSS
- Prisma ORM
- MySQL
- NextAuth
- SePay Sandbox
- Nodemailer
- QRCode
- OpenAI / Groq compatible API cho AI

---

## Chức năng chính

### 1. Khách hàng

- Xem danh sách phim đang chiếu và sắp chiếu
- Xem thông tin chi tiết phim, trailer, synopsis, thể loại, thời lượng
- Tìm kiếm phim theo tên, thể loại, tiêu chí
- Xem suất chiếu theo phim, ngày, rạp và địa điểm
- Chọn phòng chiếu và ghế
- Hỗ trợ ghế Standard, VIP, Couple
- Giữ ghế tạm thời trong quá trình đặt vé
- Thêm combo vào giỏ hàng
- Áp dụng voucher/discount
- Đặt vé trực tuyến
- Thanh toán qua SePay
- Theo dõi trạng thái thanh toán và đơn hàng
- Xem vé, mã QR, lịch sử đặt vé, chi tiết booking
- Hủy vé / combo / toàn bộ mục hợp lệ
- Đăng ký tài khoản, đăng nhập, đăng xuất
- Quản lý thông tin cá nhân
- Xác thực email và khôi phục mật khẩu

### 2. Quản trị viên

- Quản lý phim, rạp, phòng chiếu, sơ đồ ghế
- Quản lý suất chiếu và giá vé theo loại ghế
- Quản lý người dùng và phân quyền
- Quản lý voucher, combo, booking, ticket
- Theo dõi báo cáo đặt vé / thống kê đơn hàng
- Check-in vé tại rạp
- Kiểm duyệt bình luận phim

### 3. AI

- Chatbot hỗ trợ tìm phim, suất chiếu và chuyển hướng sang trang đặt vé
- Tìm kiếm phim bằng câu hỏi tự nhiên
- Hỗ trợ đề xuất phim bằng LLM nếu cấu hình API AI

---

## Cấu trúc dự án

```text
web-dat-ve-xem-phim/
├── prisma/
│   ├── schema.prisma
│   ├── seed.ts
│   └── migrations/
├── public/
├── src/
│   ├── app/
│   ├── components/
│   ├── lib/
│   └── types/
├── docker-compose.yml
├── Dockerfile
├── next.config.mjs
├── package.json
├── tailwind.config.ts
├── tsconfig.json
├── README.md
└── .env.example (nếu được thêm vào)
```

---

## Yêu cầu môi trường

- Node.js 18+
- npm hoặc pnpm
- MySQL 8
- Tùy chọn: Docker / Docker Compose

---

## Cài đặt và chạy dự án

### 1) Clone project

```bash
git clone https://github.com/KieuTranThuUyen/Movie-booking-web-application.git
cd web-dat-ve-xem-phim
```

### 2) Cài đặt dependencies

```bash
npm install
```

### 3) Cấu hình biến môi trường

Tạo file `.env` từ cấu hình tương thích với project:

```env
DATABASE_URL="mysql://root:root@localhost:3306/cinema_booking"
NEXTAUTH_SECRET="thay_bang_mot_chuoi_bi_mat_ran"
NEXTAUTH_URL="http://localhost:3000"
NEXT_PUBLIC_APP_URL="http://localhost:3000"

ADMIN_EMAIL="admin@example.com"
ADMIN_PASSWORD="Admin@123"
ADMIN_NAME="Administrator"

SMTP_HOST="smtp.gmail.com"
SMTP_PORT="587"
SMTP_USER="your-email@gmail.com"
SMTP_PASS="your-app-password"
SMTP_SECURE="false"
MAIL_FROM="your-email@gmail.com"

SEPAY_ENV="sandbox"
SEPAY_MERCHANT_ID="your_merchant_id"
SEPAY_SECRET_KEY="your_secret_key"
SEPAY_PAYMENT_PREFIX="MOVIEBOOKING"

GOOGLE_CLIENT_ID=""
GOOGLE_CLIENT_SECRET=""

OPENAI_API_KEY=""
OPENAI_MODEL="gpt-4o-mini"
```

> Nếu không dùng SMTP hoặc SePay, hệ thống vẫn có thể chạy ở chế độ cơ bản nhưng email thanh toán / xác thực sẽ bị tắt hoặc chuyển sang log local.

### 4) Khởi tạo database

```bash
npx prisma generate
npx prisma migrate dev
npm run prisma:seed
```

Nếu chưa có dữ liệu mẫu, có thể chạy:

```bash
npx prisma db push
```

### 5) Chạy dev server

```bash
npm run dev
```

Mở trình duyệt:

```text
http://localhost:3000
```

---

## Chạy bằng Docker

Project đã có `docker-compose.yml` để chạy MySQL + ứng dụng cùng lúc.

```bash
docker compose up --build
```

Thông số mặc định trong Docker:

- Database: MySQL 8
- Port database: 3306
- Port web: 3000
- Database name: `cinema_booking`

---

## Tài khoản admin

Sau khi khởi tạo ứng dụng và có biến môi trường `ADMIN_EMAIL` + `ADMIN_PASSWORD`, hệ thống sẽ tự tạo tài khoản admin nếu chưa có.

Ví dụ:

```text
Email: admin@example.com
Password: Admin@123
```

---

## Các route quan trọng

- Trang chủ: `/`
- Đăng nhập: `/dang-nhap`
- Đăng ký: `/dang-ky`
- Quên mật khẩu: `/quen-mat-khau`
- Đặt vé: `/dat-ve`
- Giỏ hàng: `/gio-hang`
- Thanh toán: `/thanh-toan/[id]`
- Vé: `/ve/[id]`
- Admin login: `/admin/dang-nhap`
- Admin dashboard: `/admin`

---

## Lưu ý

- Hệ thống sử dụng MySQL làm database chính.
- SePay ở môi trường sandbox cần cấu hình đúng `SEPAY_MERCHANT_ID` và `SEPAY_SECRET_KEY`.
- AI features sẽ hoạt động khi có API key và cấu hình LLM hợp lệ.
- Email xác thực / reset mật khẩu sẽ hiển thị nội dung log nếu SMTP chưa được cấu hình.

---

## License

Dự án này được sử dụng cho mục đích học tập và phát triển nội bộ.
