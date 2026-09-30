import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import {
  formatMoviesForPrompt,
  getMoviesForAi,
  keywordSearchMovies,
  type MovieAi,
} from '@/lib/ai/movie-context';
import { chatCompletion, extractJson, isAiConfigured } from '@/lib/ai/openai';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const bodySchema = z.object({
  query: z.string().min(1).max(500),
  limit: z.number().int().min(1).max(20).optional().default(10),
});

type AiSearch = {
  ids: string[];
  interpretation: string;
};

/**
 * AI tìm kiếm phim bằng ngôn ngữ tự nhiên.
 * Ví dụ: "phim hài gia đình dưới 2 tiếng đang chiếu", "phim giống Avengers"
 */
export async function POST(req: NextRequest) {
  try {
    const json = await req.json();
    const parsed = bodySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Query không hợp lệ' }, { status: 400 });
    }

    const { query, limit } = parsed.data;
    const movies = await getMoviesForAi(80);

    if (isAiConfigured()) {
      const catalog = formatMoviesForPrompt(movies);
      const prompt = `Người dùng tìm phim bằng ngôn ngữ tự nhiên: "${query}"

Từ danh sách phim, chọn tối đa ${limit} phim khớp nhất (thể loại, tâm trạng, thời lượng, độ tuổi, đang/sắp chiếu…).
Trả về ĐÚNG JSON (không markdown):
{"ids":["id1","id2"],"interpretation":"1 câu tiếng Việt diễn giải lại yêu cầu"}

=== DANH SÁCH PHIM ===
${catalog}`;

      const result = await chatCompletion(
        [
          {
            role: 'system',
            content:
              'Bạn là bộ máy tìm kiếm phim ngôn ngữ tự nhiên. Chỉ trả JSON hợp lệ.',
          },
          { role: 'user', content: prompt },
        ],
        { temperature: 0.2, maxTokens: 400 },
      );

      if (result) {
        const picked = extractJson<AiSearch>(result.content);
        if (picked?.ids?.length) {
          const ordered = picked.ids
            .map((id) => movies.find((m) => m.id === id))
            .filter(Boolean) as MovieAi[];

          if (ordered.length) {
            return NextResponse.json({
              query,
              interpretation:
                picked.interpretation || `Kết quả cho: "${query}"`,
              movies: ordered.slice(0, limit).map(toPublic),
              source: 'llm',
            });
          }
        }
      }
    }

    // Fallback keyword
    const hits = keywordSearchMovies(movies, query, limit);
    return NextResponse.json({
      query,
      interpretation:
        hits.length > 0
          ? `Tìm thấy ${hits.length} phim liên quan tới "${query}".`
          : `Không tìm thấy phim khớp với "${query}".`,
      movies: hits.map(toPublic),
      source: 'fallback',
    });
  } catch (err) {
    console.error('[AI search]', err);
    return NextResponse.json({ error: 'Lỗi tìm kiếm AI' }, { status: 500 });
  }
}

function toPublic(m: MovieAi) {
  return {
    id: m.id,
    title: m.title,
    slug: m.slug,
    genre: m.genre,
    duration: m.duration,
    ageRating: m.ageRating,
    posterUrl: m.posterUrl,
    imageUrl: m.imageUrl,
    synopsis: m.synopsis.slice(0, 220),
    isNowShowing: m.isNowShowing,
    isComingSoon: m.isComingSoon,
  };
}
