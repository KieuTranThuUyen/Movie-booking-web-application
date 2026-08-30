/** Shared view types used by UI components */

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
