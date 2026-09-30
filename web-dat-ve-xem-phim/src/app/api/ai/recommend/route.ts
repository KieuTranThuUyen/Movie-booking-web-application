import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import {
  fallbackRecommend,
  formatMoviesForPrompt,
  getMoviesForAi,
  type MovieAi,
} from '@/lib/ai/movie-context';
import { chatCompletion, extractJson, isAiConfigured } from '@/lib/ai/openai';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const bodySchema = z.object({
  genres: z.array(z.string()).max(8).optional(),
  mood: z.string().max(200).optional(),
  ageRating: z.string().max(20).optional(),
  limit: z.number().int().min(1).max(12).optional().default(6),
  /** ID phim đang xem – để gợi ý tương tự */
  basedOnMovieId: z.string().optional(),
});

type AiPick = {
  ids: string[];
  reason: string;
};

export async function POST(req: NextRequest) {
  try {
    const json = await req.json().catch(() => ({}));
    const parsed = bodySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Payload không hợp lệ' }, { status: 400 });
    }

    const { genres, mood, ageRating, limit, basedOnMovieId } = parsed.data;
    const movies = await getMoviesForAi(80);

    let baseMovie: MovieAi | undefined;
    if (basedOnMovieId) {
      baseMovie = movies.find((m) => m.id === basedOnMovieId);
    }

    if (isAiConfigured()) {
      const catalog = formatMoviesForPrompt(movies);
      const prefs = [
        genres?.length ? `Thể loại ưa thích: ${genres.join(', ')}` : null,
        mood ? `Tâm trạng / mô tả: ${mood}` : null,
        ageRating ? `Độ tuổi: ${ageRating}` : null,
        baseMovie
          ? `Gợi ý phim tương tự: "${baseMovie.title}" (${baseMovie.genre})`
          : null,
      ]
        .filter(Boolean)
        .join('\n');

      const prompt = `Dựa trên sở thích người dùng và danh sách phim, chọn tối đa ${limit} phim phù hợp nhất.
Chỉ dùng id có trong danh sách. Trả về ĐÚNG JSON (không markdown):
{"ids":["id1","id2"],"reason":"1-2 câu tiếng Việt giải thích chung"}

Sở thích:
${prefs || 'Không có – chọn phim đang chiếu đa dạng thể loại.'}

=== DANH SÁCH PHIM ===
${catalog}`;

      const result = await chatCompletion(
        [
          {
            role: 'system',
            content:
              'Bạn là hệ thống đề xuất phim. Chỉ trả JSON hợp lệ, không giải thích ngoài JSON.',
          },
          { role: 'user', content: prompt },
        ],
        { temperature: 0.3, maxTokens: 400 },
      );

      if (result) {
        const picked = extractJson<AiPick>(result.content);
        if (picked?.ids?.length) {
          const idSet = new Set(picked.ids);
          const ordered = picked.ids
            .map((id) => movies.find((m) => m.id === id))
            .filter(Boolean) as MovieAi[];
          // Bổ sung nếu thiếu
          if (ordered.length < limit) {
            const extra = fallbackRecommend(movies, {
              genres,
              mood: mood || baseMovie?.genre,
              limit: limit - ordered.length,
            }).filter((m) => !idSet.has(m.id));
            ordered.push(...extra);
          }

          return NextResponse.json({
            movies: ordered.slice(0, limit).map(toPublic),
            reason: picked.reason || 'Gợi ý dựa trên sở thích của bạn.',
            source: 'llm',
          });
        }
      }
    }

    // Fallback
    const moodQuery = [mood, ...(genres || []), baseMovie?.genre, ageRating]
      .filter(Boolean)
      .join(' ');
    const list = fallbackRecommend(movies, {
      genres,
      mood: moodQuery || undefined,
      limit,
    });

    return NextResponse.json({
      movies: list.map(toPublic),
      reason: baseMovie
        ? `Gợi ý phim gần với "${baseMovie.title}".`
        : genres?.length
          ? `Gợi ý theo thể loại: ${genres.join(', ')}.`
          : 'Một số phim đang chiếu đáng xem.',
      source: 'fallback',
    });
  } catch (err) {
    console.error('[AI recommend]', err);
    return NextResponse.json({ error: 'Lỗi đề xuất phim' }, { status: 500 });
  }
}

/** GET: đề xuất mặc định (đang chiếu) – tiện embed SSR */
export async function GET(req: NextRequest) {
  const limit = Number(req.nextUrl.searchParams.get('limit') || 6);
  const mood = req.nextUrl.searchParams.get('mood') || undefined;
  const movies = await getMoviesForAi(80);
  const list = fallbackRecommend(movies, { mood, limit: Math.min(limit, 12) });
  return NextResponse.json({
    movies: list.map(toPublic),
    reason: 'Phim đang chiếu được đề xuất.',
    source: 'fallback',
  });
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
    synopsis: m.synopsis.slice(0, 200),
    isNowShowing: m.isNowShowing,
    isComingSoon: m.isComingSoon,
  };
}
