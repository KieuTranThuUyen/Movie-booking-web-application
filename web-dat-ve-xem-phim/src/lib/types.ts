export type Movie = {
  id: string;
  title: string;
  slug: string;
  genre: string;
  duration: number;
  ageRating: string;
  synopsis: string;
  posterUrl: string;
  trailerUrl?: string | null;
  releaseDate: string | Date;
  isNowShowing: boolean;
  isComingSoon: boolean;
};

export type Showtime = {
  id: string;
  movieSlug: string;
  cinemaName: string;
  hallName: string;
  startTime: string;
  format: string;
  language: string;
  basePrice: number;
};

export type BookingRecord = {
  code: string;
  movieTitle: string;
  cinemaName: string;
  seats: string[];
  time: string;
  status: 'Chờ xử lý' | 'Đã xác nhận' | 'Đã hủy';
  total: number;
};