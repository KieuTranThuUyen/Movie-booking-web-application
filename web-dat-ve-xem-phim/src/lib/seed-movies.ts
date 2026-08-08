import { prisma } from '@/lib/prisma';
import { movies as mockMovies } from '@/lib/mock-data';

const globalForMovies = globalThis as unknown as {
  movieSeedPromise?: Promise<void>;
};

async function runMovieSeed(): Promise<void> {
  for (const movie of mockMovies) {
    const existingMovie = await prisma.movie.findUnique({
      where: {
        slug: movie.slug,
      },
    });

    if (!existingMovie) {
      await prisma.movie.create({
        data: {
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
          isComingSoon: movie.isComingSoon,
        },
      });
    }
  }
}

export function ensureMoviesSeeded(): Promise<void> {
  if (!globalForMovies.movieSeedPromise) {
    globalForMovies.movieSeedPromise = runMovieSeed().finally(() => {
      globalForMovies.movieSeedPromise = undefined;
    });
  }

  return globalForMovies.movieSeedPromise;
}