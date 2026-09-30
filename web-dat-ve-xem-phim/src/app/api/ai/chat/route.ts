import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import {
  buildFallbackChatReply,
  formatMoviesForPrompt,
  getMoviesForAi,
  keywordSearchMovies,
  parseTimeIntent,
  getShowtimesByIntent,
  extractGenreFromMessage,
} from '@/lib/ai/movie-context';
import { chatCompletion, isAiConfigured } from '@/lib/ai/openai';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const bodySchema = z.object({
  message: z.string().min(1).max(1000),
  history: z
    .array(
      z.object({
        role: z.enum(['user', 'assistant']),
        content: z.string().max(2000),
      }),
    )
    .max(12)
    .optional()
    .default([]),
});

const SYSTEM_PROMPT = `Bạn là trợ lý AI tư vấn phim cho website đặt vé xem phim "DatVeXemPhim" (Việt Nam).
Nhiệm vụ:
- Tư vấn phim theo sở thích, tâm trạng, thể loại, độ tuổi.
- Trả lời câu hỏi về suất chiếu hôm nay / ngày mai / khung giờ nếu có dữ liệu suất chiếu kèm theo.
- Chỉ giới thiệu phim CÓ TRONG danh sách / suất chiếu được cung cấp.
- Trả lời bằng tiếng Việt, thân thiện, ngắn gọn (2–8 câu). KHÔNG dùng markdown ** in đậm.
- Khi đề xuất: ghi tên phim, thể loại, độ tuổi; nếu có giờ chiếu thì ghi rõ giờ và rạp.
- Có thể gợi ý vào trang /phim/[slug] hoặc /suat-chieu để đặt vé.
- Không bịa phim / suất không có trong dữ liệu.
- Nếu không chắc, hỏi thêm 1 câu.`;

export async function POST(req: NextRequest) {
  try {
    const json = await req.json();
    const parsed = bodySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Tin nhắn không hợp lệ' },
        { status: 400 },
      );
    }

    const { message, history } = parsed.data;
    const movies = await getMoviesForAi(60);
    const catalog = formatMoviesForPrompt(movies);

    // Bổ sung suất chiếu nếu user hỏi thời gian (cho cả LLM lẫn fallback)
    const intent = parseTimeIntent(message);
    let showtimeBlock = '';
    if (intent.kind !== 'none' && intent.kind !== 'now_showing') {
      const sts = await getShowtimesByIntent(intent, 25);
      if (sts.length) {
        showtimeBlock =
          '\n\n=== SUẤT CHIẾU LIÊN QUAN ===\n' +
          sts
            .slice(0, 20)
            .map((st) => {
              const t = new Intl.DateTimeFormat('vi-VN', {
                timeZone: 'Asia/Ho_Chi_Minh',
                hour: '2-digit',
                minute: '2-digit',
                day: '2-digit',
                month: '2-digit',
                hour12: false,
              }).format(st.startTime);
              return `- ${st.movie.title} | ${t} | ${st.cinemaName} (${st.cinemaCity}) | ${st.format}/${st.language}`;
            })
            .join('\n');
      } else {
        showtimeBlock =
          '\n\n=== SUẤT CHIẾU LIÊN QUAN ===\n(Không có suất nào khớp khung thời gian này trong DB)';
      }
    }

    // Có API key → gọi LLM
    if (isAiConfigured()) {
      const messages = [
        {
          role: 'system' as const,
          content: `${SYSTEM_PROMPT}\n\n=== DANH SÁCH PHIM ===\n${catalog}${showtimeBlock}`,
        },
        ...history.map((h) => ({
          role: h.role as 'user' | 'assistant',
          content: h.content,
        })),
        { role: 'user' as const, content: message },
      ];

      const result = await chatCompletion(messages, {
        temperature: 0.5,
        maxTokens: 700,
      });

      if (result) {
        const genres = extractGenreFromMessage(message);
        let related = keywordSearchMovies(movies, message, 4);
        if (intent.kind !== 'none' && intent.kind !== 'now_showing') {
          let sts = await getShowtimesByIntent(intent, 40);
          if (genres.length) {
            sts = sts.filter((st) =>
              genres.some((g) => st.movie.genre.toLowerCase().includes(g)),
            );
          }
          const uniq = new Map<string, (typeof movies)[0]>();
          for (const st of sts) uniq.set(st.movie.id, st.movie);
          // Không có suất → không hiện card
          related = uniq.size ? Array.from(uniq.values()).slice(0, 6) : [];
        } else if (genres.length) {
          related = movies
            .filter((m) =>
              genres.some((g) => m.genre.toLowerCase().includes(g)) &&
              (m.isNowShowing || m.isComingSoon),
            )
            .slice(0, 6);
        }

        // Bỏ markdown ** nếu model vẫn trả
        const cleanReply = result.content.replace(/\*\*/g, '');

        return NextResponse.json({
          reply: cleanReply,
          movies: related.map((m) => ({
            id: m.id,
            title: m.title,
            slug: m.slug,
            genre: m.genre,
            posterUrl: m.posterUrl,
            ageRating: m.ageRating,
            isNowShowing: m.isNowShowing,
          })),
          source: 'llm',
          model: result.model,
        });
      }
    }

    // Fallback rule-based (hiểu hôm nay / mai / giờ + không dùng **)
    const fb = await buildFallbackChatReply(message, movies);

    return NextResponse.json({
      reply: fb.reply,
      movies: fb.movies.map((m) => ({
        id: m.id,
        title: m.title,
        slug: m.slug,
        genre: m.genre,
        posterUrl: m.posterUrl,
        ageRating: m.ageRating,
        isNowShowing: m.isNowShowing,
      })),
      source: 'fallback',
    });
  } catch (err) {
    console.error('[AI chat]', err);
    return NextResponse.json(
      { error: 'Lỗi máy chủ AI chatbot' },
      { status: 500 },
    );
  }
}
