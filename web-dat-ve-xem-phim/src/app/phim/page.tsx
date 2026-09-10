import { MovieCard } from '@/components/movie/movie-card';
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

  const where: {
    title?: { contains: string };
    isNowShowing?: boolean;
    isComingSoon?: boolean;
  } = {};

  if (search) {
    where.title = { contains: search };
  }

  if (status === 'now' || status === 'dang-chieu') {
    where.isNowShowing = true;
  } else if (status === 'coming' || status === 'sap-chieu') {
    where.isComingSoon = true;
  }

  const movies = await prisma.movie.findMany({
    where: Object.keys(where).length > 0 ? where : undefined,
    orderBy: [
      { isNowShowing: 'desc' },
      { releaseDate: 'desc' },
    ],
  });

  const title =
    status === 'now' || status === 'dang-chieu'
      ? 'Phim đang chiếu'
      : status === 'coming' || status === 'sap-chieu'
        ? 'Phim sắp chiếu'
        : search
          ? 'Kết quả tìm kiếm'
          : 'Danh sách phim';

  const subtitle =
    status === 'now' || status === 'dang-chieu'
      ? 'Tất cả phim đang chiếu tại rạp'
      : status === 'coming' || status === 'sap-chieu'
        ? 'Tất cả phim sắp ra mắt'
        : search
          ? `Các phim phù hợp với "${search}"`
          : 'Phim đang chiếu và sắp chiếu';

  return (
    <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div>
        <p className="text-sm uppercase tracking-[0.35em] text-sky-300/80">
          Phim
        </p>

        <h1 className="mt-2 text-3xl font-semibold text-white">{title}</h1>

        <p className="mt-2 text-slate-400">{subtitle}</p>
      </div>

      {movies.length === 0 ? (
        <div className="mt-10 rounded-2xl border border-white/10 bg-white/5 p-10 text-center">
          <p className="text-lg font-medium text-white">
            Không tìm thấy phim phù hợp
          </p>

          <p className="mt-2 text-sm text-slate-400">
            {search
              ? 'Thử tìm kiếm với tên phim khác.'
              : 'Hiện chưa có phim trong danh mục này.'}
          </p>
        </div>
      ) : (
        <div className="mt-10 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {movies.map((movie) => (
            <MovieCard key={movie.id} movie={movie} />
          ))}
        </div>
      )}
    </main>
  );
}