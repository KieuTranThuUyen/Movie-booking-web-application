import {
  extractGenreFromMessage,
  formatMoviesForPrompt,
  getMoviesForAi,
  keywordSearchMovies,
  movieAiSelect,
  type MovieAi,
} from '@/lib/ai/movie-context';
import { chatCompletion, extractJson, isAiConfigured } from '@/lib/ai/openai';
import { prisma } from '@/lib/db/prisma';

/**
 * Query kiểu thể loại / mô tả (không phải tên phim cụ thể)?
 * VD: "phim kinh dị", "hài gia đình", "đang chiếu hành động"
 */
function isGenreOrDescriptiveQuery(query: string, genres: string[]): boolean {
  const q = query.toLowerCase().normalize('NFC').trim();

  // Có nhận diện thể loại rõ
  if (genres.length > 0) {
    // Bỏ từ thừa rồi còn ngắn → coi là hỏi thể loại
    const stripped = q
      .replace(/phim|xem|cho|mình|tôi|các|những|đang\s*chiếu|sắp\s*chiếu|hay|nhất/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    // "kinh dị", "hài", "phim hài gia đình"
    if (stripped.length <= 40) return true;
  }

  // Cụm mô tả phổ biến không phải tên riêng
  if (
    /^(các\s+)?phim\s+/.test(q) ||
    /\b(thể\s*loại|genre)\b/.test(q) ||
    /\b(đang\s*chiếu|sắp\s*chiếu)\b/.test(q)
  ) {
    return true;
  }

  return false;
}

/**
 * Tìm phim:
 * - Tên cụ thể → chỉ phim khớp tên (ưu tiên exact / contains)
 * - Thể loại / mô tả → toàn bộ phim thuộc thể loại (+ AI bổ sung)
 */
export async function unifiedMovieSearch(
  query: string,
  limit = 40,
): Promise<{ movies: MovieAi[]; interpretation: string }> {
  const q = query.trim();
  if (!q) {
    const all = await prisma.movie.findMany({
      select: movieAiSelect,
      orderBy: [{ isNowShowing: 'desc' }, { releaseDate: 'desc' }],
      take: limit,
    });
    return { movies: all, interpretation: '' };
  }

  const genres = extractGenreFromMessage(q);
  const descriptive = isGenreOrDescriptiveQuery(q, genres);

  // ---------- A) Hỏi theo thể loại / mô tả ----------
  if (descriptive && genres.length > 0) {
    const all = await getMoviesForAi(100);
    const filtered = all.filter((m) =>
      genres.some((g) => m.genre.toLowerCase().includes(g.toLowerCase())),
    );

    // Ưu tiên đang chiếu
    filtered.sort(
      (a, b) => Number(b.isNowShowing) - Number(a.isNowShowing),
    );

    const label = genres.join(', ');
    return {
      movies: filtered.slice(0, limit),
      interpretation:
        filtered.length > 0
          ? `${filtered.length} phim thể loại ${label}.`
          : `Không có phim thể loại ${label} trong hệ thống.`,
    };
  }

  if (descriptive && genres.length === 0) {
    // Mô tả chung không bắt được genre → keyword / AI
    const catalog = await getMoviesForAi(80);
    let hits = keywordSearchMovies(catalog, q, limit);

    if (isAiConfigured() && q.length >= 4 && hits.length < 3) {
      const result = await chatCompletion(
        [
          {
            role: 'system',
            content: 'Chỉ trả JSON: {"ids":["id"],"interpretation":"câu ngắn"}',
          },
          {
            role: 'user',
            content: `Tìm phim: "${q}"\n${formatMoviesForPrompt(catalog)}`,
          },
        ],
        { temperature: 0.2, maxTokens: 350 },
      );
      if (result) {
        const picked = extractJson<{ ids: string[]; interpretation: string }>(
          result.content,
        );
        if (picked?.ids?.length) {
          hits = picked.ids
            .map((id) => catalog.find((m) => m.id === id))
            .filter(Boolean) as MovieAi[];
          return {
            movies: hits.slice(0, limit),
            interpretation: picked.interpretation || `Kết quả cho "${q}".`,
          };
        }
      }
    }

    return {
      movies: hits.slice(0, limit),
      interpretation:
        hits.length > 0
          ? `Gợi ý liên quan tới "${q}".`
          : `Không tìm thấy phim phù hợp với "${q}".`,
    };
  }

  // ---------- B) Tìm theo tên phim ----------
  // Exact (không phân biệt hoa thường) rồi contains
  const allMovies = await prisma.movie.findMany({
    select: movieAiSelect,
    orderBy: [{ isNowShowing: 'desc' }, { releaseDate: 'desc' }],
  });

  const qLower = q.toLowerCase();
  const exact = allMovies.filter(
    (m) => m.title.toLowerCase() === qLower,
  );
  if (exact.length > 0) {
    return {
      movies: exact,
      interpretation: `Phim khớp tên "${q}".`,
    };
  }

  // Title chứa query hoặc query chứa title (tên dài)
  const strong = allMovies.filter((m) => {
    const t = m.title.toLowerCase();
    return t.includes(qLower) || (qLower.length >= 4 && qLower.includes(t));
  });

  if (strong.length > 0) {
    // Sắp xếp: tên bắt đầu bằng query trước, rồi chứa
    strong.sort((a, b) => {
      const as = a.title.toLowerCase().startsWith(qLower) ? 0 : 1;
      const bs = b.title.toLowerCase().startsWith(qLower) ? 0 : 1;
      if (as !== bs) return as - bs;
      return Number(b.isNowShowing) - Number(a.isNowShowing);
    });
    return {
      movies: strong.slice(0, limit),
      interpretation:
        strong.length === 1
          ? `Phim khớp tên "${q}".`
          : `${strong.length} phim khớp tên "${q}".`,
    };
  }

  // Không khớp tên → thử keyword nhẹ (chỉ khi query đủ dài)
  if (q.length >= 4) {
    const fuzzy = keywordSearchMovies(allMovies, q, 8);
    // Chỉ giữ nếu score-like: title thật sự gần (đã lọc trong keyword)
    // Tránh nhiễu: nếu keyword trả quá nhiều và không liên quan title → bỏ
    const titleish = fuzzy.filter((m) => {
      const t = m.title.toLowerCase();
      const tokens = qLower.split(/\s+/).filter((x) => x.length >= 3);
      return tokens.some((tok) => t.includes(tok));
    });
    if (titleish.length > 0) {
      return {
        movies: titleish.slice(0, limit),
        interpretation: `${titleish.length} phim gần với "${q}".`,
      };
    }
  }

  return {
    movies: [],
    interpretation: `Không tìm thấy phim tên "${q}". Thử gõ đủ tên hoặc tìm theo thể loại (vd: kinh dị, hài).`,
  };
}
