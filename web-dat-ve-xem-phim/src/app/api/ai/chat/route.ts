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
  isBookingQuestion,
  buildBookingAssistantReply,
  findMoviesByTitle,
} from '@/lib/ai/movie-context';
import { type BookingDraft } from '@/lib/ai/booking-intent';
import {
  runBookingFlow,
  type BookingFlowState,
} from '@/lib/ai/booking-flow';
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
  bookingDraft: z
    .object({
      movieQuery: z.string().optional(),
      movieId: z.string().optional(),
      movieTitle: z.string().optional(),
      dayOffset: z.number().optional(),
      city: z.string().optional(),
      quantity: z.number().optional(),
      seatType: z.enum(['STANDARD', 'VIP', 'COUPLE', 'ANY']).optional(),
      showtimeId: z.string().optional(),
      cinemaName: z.string().optional(),
      startTimeLabel: z.string().optional(),
      step: z
        .enum(['collect', 'showtimes', 'seats', 'seat_confirm', 'combo', 'voucher', 'summary', 'confirm'])
        .optional(),
      seatCodes: z.array(z.string()).optional(),
      comboId: z.string().optional(),
      comboName: z.string().optional(),
      comboQty: z.number().optional(),
      voucherCode: z.string().optional(),
    })
    .passthrough()
    .optional()
    .nullable(),
});

const SYSTEM_PROMPT = `Bạn là trợ lý AI tư vấn phim VÀ hỗ trợ đặt vé cho website "DatVeXemPhim" (Việt Nam).
Nhiệm vụ:
- Tư vấn phim theo sở thích, tâm trạng, thể loại, độ tuổi.
- Hỗ trợ đặt vé hội thoại: phân tích yêu cầu (phim, ngày, thành phố, số người, loại ghế) → đề xuất suất → user chọn → xác nhận → đưa link /dat-ve?showtime=ID.
- KHÔNG tự tạo booking hay thanh toán. Chỉ đề xuất và chờ user xác nhận.
- Trả lời tiếng Việt, thân thiện, ngắn gọn. KHÔNG dùng markdown ** in đậm.
- Chỉ dùng phim / suất CÓ TRONG dữ liệu được cung cấp.`;

function movieCards(
  movies: { id: string; title: string; slug: string; genre: string; posterUrl: string; ageRating: string; isNowShowing: boolean }[],
) {
  return movies.map((m) => ({
    id: m.id,
    title: m.title,
    slug: m.slug,
    genre: m.genre,
    posterUrl: m.posterUrl,
    ageRating: m.ageRating,
    isNowShowing: m.isNowShowing,
  }));
}

async function handleBookingFlow(
  message: string,
  prevDraft: BookingFlowState | null | undefined,
) {
  const result = await runBookingFlow(message, prevDraft || null);
  return {
    reply: result.reply,
    movies: [] as ReturnType<typeof movieCards>,
    bookingDraft: result.state,
    showtimeOptions: result.showtimeOptions,
    seatSuggestions: result.seatSuggestions,
    comboOptions: result.comboOptions,
    canCreateBooking: result.canCreateBooking,
    bookingPayload: result.bookingPayload,
    confirmUrl: result.bookingPayload
      ? `/dat-ve?showtime=${encodeURIComponent(result.bookingPayload.showtimeId)}`
      : undefined,
    manualSeatUrl: result.manualSeatUrl,
  };
}

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

    const { message, history, bookingDraft } = parsed.data;
    const movies = await getMoviesForAi(60);

    // User chọn phim từ danh sách (sau khi hỏi suất theo thể loại/ngày)
    const pickFilm = message.match(/chọn\s*phim\s+(.+)/i) || message.match(/^phim\s+(.+)/i);
    const filmQuery = pickFilm ? pickFilm[1].trim() : '';
    const titledPick = filmQuery
      ? findMoviesByTitle(filmQuery, movies, 1)
      : findMoviesByTitle(message, movies, 1);
    const wantShowtimes =
      /chọn\s*phim|các\s*suất|suất\s*chiếu|suất\s*của/.test(message.toLowerCase()) ||
      (titledPick.length > 0 &&
        /ngày\s*mai|hôm\s*nay|suất/.test(message.toLowerCase()));

    if (titledPick.length > 0 && (pickFilm || wantShowtimes)) {
      const m = titledPick[0];
      const intent = parseTimeIntent(message);
      const timeIntent =
        intent.kind === 'none' || intent.kind === 'now_showing'
          ? { kind: 'tomorrow' as const } // mặc định mai nếu vừa xem list mai; fallback today
          : intent;
      // Ưu tiên: nếu history có "ngày mai" → tomorrow
      const hist = history.map((h) => h.content).join(' ').toLowerCase();
      let useIntent = timeIntent;
      if (intent.kind === 'none') {
        if (/ngày\s*mai/.test(hist) || /ngày\s*mai/.test(message.toLowerCase())) {
          useIntent = { kind: 'tomorrow' };
        } else if (/hôm\s*nay/.test(hist) || /hôm\s*nay/.test(message.toLowerCase())) {
          useIntent = { kind: 'today' };
        } else {
          useIntent = { kind: 'today' };
        }
      }
      let sts = await getShowtimesByIntent(useIntent, 30);
      sts = sts.filter((st) => st.movie.id === m.id);
      if (sts.length === 0) {
        return NextResponse.json({
          reply: `Hiện chưa có suất phù hợp cho "${m.title}". Bạn thử ngày khác nhé.`,
          movies: movieCards([m]),
          source: 'pick-film',
          bookingDraft: {
            movieId: m.id,
            movieTitle: m.title,
            movieQuery: m.title,
            step: 'collect',
          },
          showtimeOptions: [],
        });
      }
      const showtimeOptions = sts.slice(0, 10).map((st) => {
        const time = new Intl.DateTimeFormat('vi-VN', {
          timeZone: 'Asia/Ho_Chi_Minh',
          hour: '2-digit',
          minute: '2-digit',
          hour12: false,
        }).format(st.startTime);
        return {
          id: st.id,
          label: `${time} – ${st.cinemaName}`,
          time,
          cinema: st.cinemaName,
          city: st.cinemaCity,
          format: st.format,
          language: st.language,
          movieTitle: m.title,
          movieId: m.id,
          slug: m.slug,
          standardPrice: 0,
          vipPrice: 0,
          couplePrice: 0,
        };
      });
      const dayLabel =
        useIntent.kind === 'tomorrow' ? 'ngày mai' : 'hôm nay';
      return NextResponse.json({
        reply: `Suất chiếu "${m.title}" ${dayLabel} — chọn một suất bên dưới (hoặc gõ "Chọn suất 1"):`,
        movies: movieCards([m]),
        source: 'pick-film',
        bookingDraft: {
          movieId: m.id,
          movieTitle: m.title,
          movieQuery: m.title,
          dayOffset: useIntent.kind === 'tomorrow' ? 1 : 0,
          step: 'showtimes',
        },
        showtimeOptions,
      });
    }


    // Flow đặt vé hội thoại (ưu tiên nếu đang trong draft hoặc hỏi đặt vé giàu ngữ cảnh)
    const richBooking =
      isBookingQuestion(message) ||
      Boolean(bookingDraft?.step && bookingDraft.step !== 'collect') ||
      (bookingDraft &&
        (bookingDraft.movieQuery ||
          bookingDraft.city ||
          bookingDraft.quantity ||
          bookingDraft.seatType));

    // Câu mô tả đặt vé kiểu demo (có thành phố / số người / ghế)
    const looksLikeBookingNL =
      /(tối\s*nay|ngày\s*mai|hôm\s*nay).{0,40}(người|ghế|vé|rạp|cgv|galaxy|lotte)/i.test(
        message,
      ) ||
      /(marvel|avengers|người\s*nhện|kinh\s*dị|hài).{0,60}(tối|ngày|người|ghế)/i.test(
        message,
      ) ||
      /\d+\s*người/.test(message);

    if (richBooking || looksLikeBookingNL || bookingDraft?.showtimeId) {
      const result = await handleBookingFlow(
        message,
        bookingDraft as BookingDraft | null,
      );
      return NextResponse.json({
        reply: result.reply,
        movies: result.movies,
        source: 'booking-flow',
        bookingDraft: result.bookingDraft,
        showtimeOptions: result.showtimeOptions,
        seatSuggestions: result.seatSuggestions,
        comboOptions: result.comboOptions,
        canCreateBooking: result.canCreateBooking,
        bookingPayload: result.bookingPayload,
        confirmUrl: result.confirmUrl,
        manualSeatUrl: result.manualSeatUrl,
      });
    }

    const catalog = formatMoviesForPrompt(movies);
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
          related = uniq.size ? Array.from(uniq.values()).slice(0, 6) : [];
        } else if (genres.length) {
          related = movies
            .filter(
              (m) =>
                genres.some((g) => m.genre.toLowerCase().includes(g)) &&
                (m.isNowShowing || m.isComingSoon),
            )
            .slice(0, 6);
        }

        return NextResponse.json({
          reply: result.content.replace(/\*\*/g, ''),
          movies: movieCards(related),
          source: 'llm',
          model: result.model,
          bookingDraft: null,
          showtimeOptions: [],
        });
      }
    }

    if (isBookingQuestion(message)) {
      const fb = await buildBookingAssistantReply(message, movies);
      return NextResponse.json({
        reply: fb.reply,
        movies: movieCards(fb.movies),
        source: 'booking-simple',
        bookingDraft: null,
        showtimeOptions: [],
      });
    }

    const fb = await buildFallbackChatReply(message, movies);
    return NextResponse.json({
      reply: fb.reply,
      movies: movieCards(fb.movies),
      source: 'fallback',
      bookingDraft: null,
      showtimeOptions: [],
    });
  } catch (err) {
    console.error('[AI chat]', err);
    return NextResponse.json(
      { error: 'Lỗi máy chủ AI chatbot' },
      { status: 500 },
    );
  }
}
