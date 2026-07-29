import type { BookingRecord, Movie, Showtime } from '@/lib/types';

export const movies: Movie[] = [
  {
    id: 'm1',
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
    releaseDate: '2026-08-01',
    isNowShowing: true,
    isComingSoon: false
  },
  {
    id: 'm2',
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
    releaseDate: '2026-07-25',
    isNowShowing: true,
    isComingSoon: false
  },
  {
    id: 'm3',
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
    releaseDate: '2026-09-12',
    isNowShowing: false,
    isComingSoon: true
  }
];

export const showtimes: Showtime[] = [
  {
    id: 'st1',
    movieSlug: 'vu-dieu-rap-chieu',
    cinemaName: 'Galaxy Center',
    hallName: 'Phòng 1',
    startTime: '2026-07-25T18:30:00',
    format: '2D',
    language: 'VietSub',
    basePrice: 85000
  },
  {
    id: 'st2',
    movieSlug: 'vu-dieu-rap-chieu',
    cinemaName: 'CGV Landmark',
    hallName: 'Phòng IMAX',
    startTime: '2026-07-25T20:15:00',
    format: 'IMAX',
    language: 'VietSub',
    basePrice: 120000
  },
  {
    id: 'st3',
    movieSlug: 'duong-den-so-7',
    cinemaName: 'Lotte Cinema',
    hallName: 'Phòng 4',
    startTime: '2026-07-26T19:45:00',
    format: '2D',
    language: 'Sub',
    basePrice: 90000
  }
];

export const bookingHistory: BookingRecord[] = [
  {
    code: 'BK20260725001',
    movieTitle: 'Vũ Điệu Rạp Chiếu',
    cinemaName: 'Galaxy Center',
    seats: ['A1', 'A2'],
    time: '2026-07-25 18:30',
    status: 'Đã xác nhận',
    total: 170000
  },
  {
    code: 'BK20260724088',
    movieTitle: 'Đường Đèn Số 7',
    cinemaName: 'CGV Landmark',
    seats: ['D6'],
    time: '2026-07-24 20:15',
    status: 'Chờ xử lý',
    total: 120000
  }
];

export const cinemas = [
  {
    id: 'c1',
    name: 'Galaxy Center',
    city: 'TP. Hồ Chí Minh',
    address: '123 Nguyễn Huệ, Quận 1'
  },
  {
    id: 'c2',
    name: 'CGV Landmark',
    city: 'TP. Hồ Chí Minh',
    address: '720A Điện Biên Phủ, Bình Thạnh'
  },
  {
    id: 'c3',
    name: 'Lotte Cinema',
    city: 'Hà Nội',
    address: '54 Liễu Giai, Ba Đình'
  }
];