import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Đang xóa toàn bộ dữ liệu...');

  // Con trước → cha sau (tránh lỗi FK)
  await prisma.ticket.deleteMany();
  await prisma.seatHold.deleteMany();
  await prisma.payment.deleteMany(); // thêm dòng này
  await prisma.booking.deleteMany();
  await prisma.showtime.deleteMany();
  await prisma.hallLayoutBlock.deleteMany();
  await prisma.seat.deleteMany();
  await prisma.hall.deleteMany();
  await prisma.cinema.deleteMany();
  await prisma.movie.deleteMany();
  await prisma.user.deleteMany();

  console.log('Đã xóa hết dữ liệu.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });