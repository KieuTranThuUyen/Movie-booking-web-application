import { MovieCard } from '@/components/movie/movie-card';
import { unifiedMovieSearch } from '@/lib/ai/search-movies';
import { prisma } from '@/lib/db/prisma';

type MoviesPageProps = {
  searchParams: Promise<{
    search?: string;
    status?: string;
  }>;
};

export default async function MoviesPage({
  searchParams,
}: MoviesPageProps) {
  const params = await searchParams;

  const search = params.search?.trim() ?? '';
  const status = params.status?.trim() ?? '';

  let movies: Awaited<ReturnType<typeof prisma.movie.findMany>>;
  let interpretation = '';

  if (search) {
    const result = await unifiedMovieSearch(search, 40);
    movies = result.movies;
    interpretation = result.interpretation;
  } else {
    const where: {
      isNowShowing?: boolean;
      isComingSoon?: boolean;
    } = {};

    if (status === 'now' || status === 'dang-chieu') {
      where.isNowShowing = true;
    } else if (status === 'coming' || status === 'sap-chieu') {
      where.isComingSoon = true;
    }

    movies = await prisma.movie.findMany({
      where: Object.keys(where).length > 0 ? where : undefined,
      orderBy: [
        { isNowShowing: 'desc' },
        { releaseDate: 'desc' },
      ],
    });
  }

  const title =
    status === 'now' || status === 'dang-chieu'
      ? 'Phim đang chiếu'
      : status === 'coming' || status === 'sap-chieu'
        ? 'Phim sắp chiếu'
        : search
          ? 'Kết quả tìm kiếm'
          : 'Danh sách phim';

  const subtitle = search
    ? interpretation || `Kết quả cho "${search}"`
    : status === 'now' || status === 'dang-chieu'
      ? 'Tất cả phim đang chiếu tại rạp'
      : status === 'coming' || status === 'sap-chieu'
        ? 'Tất cả phim sắp ra mắt'
        : 'Phim đang chiếu và sắp chiếu';

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-10">
      <div className="mx-auto max-w-7xl sm:px-2 lg:px-4">
        <div>
          <p className="text-sm uppercase tracking-[0.35em] text-sky-300/80">
            Phim
          </p>

          <h1 className="mt-2 text-3xl font-semibold text-white">
            {title}
          </h1>

          <p className="mt-2 text-slate-400">
            {subtitle}
          </p>
        </div>

        {movies.length === 0 ? (
          <div className="mt-10 rounded-2xl border border-white/10 bg-white/5 p-10 text-center">
            <p className="text-lg font-medium text-white">
              Không tìm thấy phim phù hợp
            </p>
            <p className="mt-2 text-sm text-slate-400">
              {search
                ? 'Thử từ khóa hoặc mô tả khác trên thanh tìm kiếm phía trên.'
                : 'Hiện chưa có phim trong danh mục này.'}
            </p>
          </div>
        ) : (
          <div className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {movies.map((movie) => (
              <MovieCard key={movie.id} movie={movie} />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
