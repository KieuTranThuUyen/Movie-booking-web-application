import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const movies = [
  {
    title: 'Vũ Điệu Rạp Chiếu',
    slug: 'vu-dieu-rap-chieu',
    genre: 'Tâm lý, Lãng mạn',
    duration: 128,
    ageRating: 'T13',
    synopsis:
      'Một biên tập viên trẻ tìm lại giấc mơ điện ảnh khi gặp lại người bạn cũ tại rạp phim nơi cả hai từng hẹn hò.',
    posterUrl:
      'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=1200&q=80',
    trailerUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    releaseDate: new Date('2026-08-01'),
    isNowShowing: true,
    isComingSoon: false,
  },
  {
    title: 'Đường Đèn Số 7',
    slug: 'duong-den-so-7',
    genre: 'Hành động, Bí ẩn',
    duration: 136,
    ageRating: 'T16',
    synopsis:
      'Khi một chuỗi sự cố bí ẩn làm tê liệt hệ thống chiếu phim của thành phố, một kỹ thuật viên âm thanh phải lần theo dấu vết sự thật.',
    posterUrl:
      'https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?auto=format&fit=crop&w=1200&q=80',
    trailerUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    releaseDate: new Date('2026-07-25'),
    isNowShowing: true,
    isComingSoon: false,
  },
  {
    title: 'Ký Ức Mùa Hè',
    slug: 'ky-uc-mua-he',
    genre: 'Gia đình, Hài',
    duration: 102,
    ageRating: 'P',
    synopsis:
      'Một nhóm học sinh biến rạp phim cũ trong khu phố thành nơi khơi lại những ký ức đẹp nhất của mùa hè cuối cùng trước khi trưởng thành.',
    posterUrl:
      'https://images.unsplash.com/photo-1505686994434-e3cc5abf1330?auto=format&fit=crop&w=1200&q=80',
    trailerUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    releaseDate: new Date('2026-09-12'),
    isNowShowing: false,
    isComingSoon: true,
  },
];

async function main() {
  console.log('Seeding movies...');

  for (const movie of movies) {
    await prisma.movie.upsert({
      where: { slug: movie.slug },
      update: movie,
      create: movie,
    });
  }

  console.log(`Seeded ${movies.length} movies.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });