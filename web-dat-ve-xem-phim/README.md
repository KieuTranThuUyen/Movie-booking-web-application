# Web đặt vé xem phim

## Mô tả dự án

Xây dựng website đặt vé xem phim trực tuyến, hỗ trợ người dùng tìm kiếm và xem thông tin phim, lựa chọn suất chiếu, chọn ghế và thực hiện đặt vé.

Hệ thống gồm hai nhóm người dùng chính:

* **Khách hàng:** xem phim, chọn suất chiếu, chọn ghế, đặt vé, thanh toán, xem vé và lịch sử đặt vé.
* **Admin:** quản lý phim, rạp chiếu, phòng chiếu, sơ đồ ghế, suất chiếu, người dùng và đơn đặt vé.

Các chức năng chính:

* Xem danh sách phim đang chiếu và sắp chiếu.
* Xem thông tin chi tiết phim.
* Xem các suất chiếu của phim.
* Chọn phòng chiếu và ghế.
* Hỗ trợ giữ ghế tạm thời trong quá trình đặt vé.
* Thêm vé vào giỏ.
* Đặt vé trực tuyến.
* Thanh toán và cập nhật trạng thái đơn đặt vé.
* Xuất và xem thông tin vé sau khi đặt thành công.
* Hiển thị mã QR trên vé.
* Xem lịch sử đặt vé.
* Hỗ trợ hủy vé và cập nhật trạng thái vé.
* Đăng ký, đăng nhập và quản lý tài khoản.
* Phân quyền người dùng và Admin.
* Admin quản lý phim.
* Admin quản lý rạp và phòng chiếu.
* Admin quản lý sơ đồ ghế.
* Admin quản lý suất chiếu.
* Admin quản lý người dùng.
* Admin quản lý đơn đặt vé.
* Dashboard quản trị và thống kê tổng quan.

## Công nghệ sử dụng

### Frontend

* Next.js
* React
* TypeScript
* Tailwind CSS

### Backend

* Next.js API Routes
* Prisma ORM

### Database

* MySQL

### Deployment

* Docker
* Docker Compose

## Các chức năng đã triển khai

### Người dùng

* Trang chủ.
* Danh sách phim.
* Chi tiết phim.
* Xem suất chiếu.
* Chọn ghế.
* Giữ ghế tạm thời.
* Giỏ vé.
* Đặt vé.
* Thanh toán.
* Xem vé.
* Mã QR trên vé.
* Lịch sử đơn đặt vé.
* Hủy vé.
* Quản lý thông tin tài khoản.
* Đăng ký tài khoản.
* Đăng nhập.
* Đăng xuất.

### Quản trị viên

* Admin Dashboard.
* Quản lý phim.
* Quản lý rạp chiếu.
* Quản lý phòng chiếu.
* Quản lý sơ đồ ghế.
* Quản lý suất chiếu.
* Quản lý người dùng.
* Quản lý đơn đặt vé.
* Theo dõi trạng thái đặt vé và thanh toán.

### Cơ sở dữ liệu

* Thiết kế Prisma Schema cho MySQL.
* Quản lý người dùng và phân quyền.
* Quản lý phim.
* Quản lý rạp và phòng chiếu.
* Quản lý ghế.
* Quản lý suất chiếu.
* Quản lý đơn đặt vé.
* Quản lý chi tiết vé.
* Quản lý trạng thái thanh toán.
* Quản lý trạng thái vé.
* Quản lý giữ ghế tạm thời.

## Các form được tái sử dụng từ project PHP cũ

### Đăng nhập

* `name`
* `password`
* `remember`

### Đăng ký

* `name`
* `email`
* `phone`
* `password`
* `confirmPassword`

### Thanh toán

* `fullName`
* `phone`
* `email`
* `address`
* `city`
* `district`
* `note`
* `paymentMethod`

## Trạng thái hiện tại

Các chức năng cốt lõi của hệ thống đặt vé đã được triển khai và kết nối với cơ sở dữ liệu MySQL thông qua Prisma.

Một số chức năng vẫn đang trong quá trình hoàn thiện:

* Thanh toán trực tuyến hiện đang được mô phỏng, chưa tích hợp đầy đủ với cổng thanh toán thực tế như VNPay, MoMo hoặc ZaloPay.
* Chức năng hoàn tiền qua cổng thanh toán thực tế chưa được tích hợp.
* Thống kê doanh thu và báo cáo nâng cao cho Admin chưa hoàn thiện.
* Hệ thống email/thông báo xác nhận đặt vé chưa được triển khai.
* Cần tiếp tục kiểm thử và hoàn thiện các trường hợp lỗi trong quá trình đặt vé, thanh toán và hủy vé.
* Cần kiểm thử việc triển khai thực tế bằng Docker và tối ưu hệ thống trước khi đưa vào production.

## Chạy dự án

### 1. Cài đặt dependencies

```bash
npm install
```

### 2. Cấu hình biến môi trường

Sao chép file `.env.example` thành `.env` và cấu hình thông tin kết nối MySQL.

### 3. Sinh Prisma Client

```bash
npm run prisma:generate
```

### 4. Chạy dự án ở môi trường development

```bash
npm run dev
```

Sau đó truy cập:

```text
http://localhost:3000
```

## Chạy bằng Docker

### 1. Cấu hình `.env`

Đảm bảo biến `DATABASE_URL` trỏ đến MySQL được cấu hình trong Docker Compose.

### 2. Khởi động hệ thống

```bash
docker compose up --build
```

Ứng dụng chạy tại:

```text
http://localhost:3000
```

MySQL sử dụng cổng:

```text
3306
```

## Cấu trúc hệ thống

```text
Movie-booking-web-application/
├── prisma/
│   └── schema.prisma
├── src/
│   ├── app/
│   │   ├── api/
│   │   ├── admin/
│   │   ├── booking/
│   │   ├── movies/
│   │   └── ...
│   ├── components/
│   └── ...
├── public/
├── Dockerfile
├── docker-compose.yml
├── package.json
└── .env.example
```

## Định hướng hoàn thiện

Trong các giai đoạn tiếp theo, hệ thống sẽ tiếp tục được hoàn thiện theo các hướng:

1. Tích hợp cổng thanh toán trực tuyến thực tế.
2. Hoàn thiện quy trình hoàn tiền.
3. Bổ sung thống kê và biểu đồ doanh thu cho Admin.
4. Bổ sung email/thông báo sau khi đặt vé.
5. Tăng cường kiểm tra dữ liệu đầu vào và xử lý lỗi.
6. Kiểm thử toàn bộ quy trình đặt vé.
7. Tối ưu giao diện và trải nghiệm người dùng.
8. Hoàn thiện cấu hình triển khai production bằng Docker.

## Ghi chú

Đây là phiên bản đang trong quá trình phát triển của hệ thống đặt vé xem phim. Các chức năng cốt lõi đã được xây dựng, trong đó một số chức năng nâng cao như tích hợp thanh toán thực tế, hoàn tiền, thống kê chuyên sâu và thông báo email sẽ tiếp tục được hoàn thiện trong các giai đoạn tiếp theo.
