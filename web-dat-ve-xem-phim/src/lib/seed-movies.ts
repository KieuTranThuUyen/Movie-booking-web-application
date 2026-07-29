import { prisma } from '@/lib/prisma';
import { movies as mockMovies } from '@/lib/mock-data';

const globalForMovies = globalThis as unknown as {
  movieSeedPromise?: Promise<void>;
};

async function runMovieSeed() {
  for (const movie of mockMovies) {
    await prisma.movie.upsert({
      where: { slug: movie.slug },
      update: {
        title: movie.title,
        genre: movie.genre,
        duration: movie.duration,
        ageRating: movie.ageRating,
        synopsis: movie.synopsis,
        posterUrl: movie.posterUrl,
        trailerUrl: movie.trailerUrl,
        releaseDate: new Date(movie.releaseDate),
        isNowShowing: movie.isNowShowing,
        isComingSoon: movie.isComingSoon
      },
      create: {
        title: movie.title,
        slug: movie.slug,
        genre: movie.genre,
        duration: movie.duration,
        ageRating: movie.ageRating,
        synopsis: movie.synopsis,
        posterUrl: movie.posterUrl,
        trailerUrl: movie.trailerUrl,
        releaseDate: new Date(movie.releaseDate),
        isNowShowing: movie.isNowShowing,
        isComingSoon: movie.isComingSoon
      }
    });
  }
}

export function ensureMoviesSeeded() {
  if (!globalForMovies.movieSeedPromise) {
    globalForMovies.movieSeedPromise = runMovieSeed().finally(() => {
      globalForMovies.movieSeedPromise = undefined;
    });
  }

  return globalForMovies.movieSeedPromise;
}
