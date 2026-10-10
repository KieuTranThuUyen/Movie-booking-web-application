import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { buildFallbackChatReply, formatMoviesForPrompt, getMoviesForAi, keywordSearchMovies, parseTimeIntent, getShowtimesByIntent, extractGenreFromMessage, isBookingQuestion, buildBookingAssistantReply, findMoviesByTitle, formatIntentDayLabel, isPopularQuestion, } from '@/lib/ai/movie-context';
import { runBookingFlow, type BookingFlowState, } from '@/lib/ai/booking-flow';
import { chatCompletion, isAiConfigured } from '@/lib/ai/openai';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
const bodySchema = z.object({
    message: z.string().min(1).max(1000),
    history: z
        .array(z.object({
        role: z.enum(['user', 'assistant']),
        content: z.string().max(2000),
    }))
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
const SYSTEM_PROMPT = `Bạn là trợ lý AI tư vấn phim cho website "DatVeXemPhim" (Việt Nam).
Nhiệm vụ:
- Tư vấn phim theo sở thích, thể loại, ngày chiếu.
- Gợi ý danh sách phim và suất chiếu phù hợp.
- Dừng ở gợi ý: user tự chọn phim/suất trên giao diện → sang trang /dat-ve để chọn ghế & thanh toán.
- KHÔNG hỏi ghế, combo, voucher, số người trong chat. KHÔNG tự tạo booking.
- Trả lời tiếng Việt, thân thiện, ngắn gọn. KHÔNG dùng markdown ** in đậm.
- Chỉ dùng phim / suất CÓ TRONG dữ liệu được cung cấp.`;
function movieCards(movies: {
    id: string;
    title: string;
    slug: string;
    genre: string;
    posterUrl: string;
    ageRating: string;
    isNowShowing: boolean;
}[]) {
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
async function handleBookingFlow(message: string, prevDraft: BookingFlowState | null | undefined) {
    const result = await runBookingFlow(message, prevDraft || null);
    const seatUrl = result.manualSeatUrl ||
        (result.bookingPayload?.showtimeId
            ? `/dat-ve?showtime=${encodeURIComponent(result.bookingPayload.showtimeId)}`
            : undefined);
    return {
        reply: result.reply,
        movies: [] as ReturnType<typeof movieCards>,
        bookingDraft: result.state,
        showtimeOptions: result.showtimeOptions,
        seatSuggestions: result.seatSuggestions,
        comboOptions: result.comboOptions,
        
        canCreateBooking: false,
        bookingPayload: undefined,
        confirmUrl: seatUrl,
        manualSeatUrl: seatUrl,
    };
}
export async function POST(req: NextRequest) {
    try {
        const json = await req.json();
        const parsed = bodySchema.safeParse(json);
        if (!parsed.success) {
            return NextResponse.json({ error: 'Tin nhắn không hợp lệ' }, { status: 400 });
        }
        const { message, history, bookingDraft } = parsed.data;
        const movies = await getMoviesForAi(60);
        const msgLower = message
            .toLowerCase()
            .normalize('NFC')
            .replace(/\bngày\s*mau\b/g, 'ngày mai')
            .replace(/\bngay\s*mai\b/g, 'ngày mai')
            .replace(/\bngay\s*mau\b/g, 'ngày mai')
            .replace(/\bhom\s*nay\b/g, 'hôm nay');
        
        const genresInMsg = extractGenreFromMessage(message);
        const isBrowseGenreQuery = genresInMsg.length > 0 &&
            /có\s*phim|phim\s+\S+|thể\s*loại|suất\s*chiếu|ngày\s*mai|hôm\s*nay|chiếu\s*gì|phim\s*nào|các\s*phim|thứ\s*[2-7]|chủ\s*nhật|\bt[2-7]\b|\bcn\b|ngày\s*\d{1,2}/.test(msgLower) &&
            !/chọn\s*phim\s+/.test(msgLower) &&
            !/chọn\s*suất\s*\d/.test(msgLower) &&
            !/(phim\s*này|các\s*phim\s*này|2\s*phim\s*này|những\s*phim\s*(này|trên|đó)|suất\s*(của\s*)?(2|các|cả))/.test(msgLower);
        
        const refersToListed = /(\d+\s*phim\s*(này|trên|đó|kia)|các\s*phim\s*(này|trên|đó|kia)|những\s*phim\s*(này|trên|đó|kia)|phim\s*(này|trên|đó)|cả\s*(2|hai|\d+)\s*phim|hai\s*phim\s*(này|trên)?|suất\s*(chiếu\s*)?(của\s*)?(các\s*)?(\d+\s*)?phim(\s*(này|trên|đó))?)/.test(msgLower);
        const draftListedIds: string[] = Array.isArray((bookingDraft as {
            lastListedMovieIds?: string[];
        } | null | undefined)
            ?.lastListedMovieIds)
            ? ((bookingDraft as {
                lastListedMovieIds: string[];
            }).lastListedMovieIds)
            : [];
        
        const pickFilm = message.match(/chọn\s*phim\s+(.+)/i);
        const filmQuery = pickFilm ? pickFilm[1].trim() : '';
        const wantsMultiple = /cả\s*(2|hai|\d+)|tất\s*cả|cả\s*các\s*phim|và\s+|\d+\s*phim|hai\s*phim/.test(msgLower);
        const titleLimit = wantsMultiple ? 8 : 1;
        
        let titledPick = filmQuery
            ? findMoviesByTitle(filmQuery, movies, titleLimit)
            : isBrowseGenreQuery || refersToListed
                ? []
                : findMoviesByTitle(message, movies, titleLimit);
        
        if (refersToListed && draftListedIds.length > 0) {
            titledPick = movies.filter((m) => draftListedIds.includes(m.id));
            titledPick.sort((a, b) => draftListedIds.indexOf(a.id) - draftListedIds.indexOf(b.id));
        }
        else if (refersToListed && draftListedIds.length === 0) {
            return NextResponse.json({
                reply: 'Mình chưa nhớ danh sách phim vừa rồi. Bạn hỏi lại (vd: "phim hot nhất", "phim hành động ngày mai") rồi chọn suất nhé.',
                movies: [],
                source: 'ref-listed-empty',
                bookingDraft: bookingDraft || null,
                showtimeOptions: [],
            });
        }
        const wantShowtimes = /các\s*suất|suất\s*chiếu|suất\s*của|xem\s*suất|cho\s*mình\s*suất/.test(msgLower) ||
            (titledPick.length > 0 &&
                /ngày\s*mai|hôm\s*nay|suất|thứ\s*[2-7]|\bt[2-7]\b|ngày\s*\d/.test(msgLower) &&
                !pickFilm);
        
        if (pickFilm && titledPick.length > 0 && !wantShowtimes && !refersToListed) {
            const m = titledPick[0];
            return NextResponse.json({
                reply: `"${m.title}" — bấm thẻ bên dưới để xem chi tiết phim.`,
                movies: movieCards([m]),
                source: 'pick-film-detail',
                bookingDraft: {
                    step: 'collect',
                    movieId: m.id,
                    movieTitle: m.title,
                    lastListedMovieIds: [m.id],
                    lastListedTitles: [m.title],
                },
                showtimeOptions: [],
                confirmUrl: `/phim/${encodeURIComponent(m.slug)}`,
            });
        }
        if (titledPick.length > 0 &&
            (wantShowtimes || refersToListed) &&
            !isBrowseGenreQuery) {
            const intent = parseTimeIntent(message);
            const timeIntent = intent.kind === 'none' || intent.kind === 'now_showing'
                ? { kind: 'tomorrow' as const } 
                : intent;
            
            const hist = history.map((h) => h.content).join(' ').toLowerCase();
            let useIntent = timeIntent;
            if (intent.kind === 'none') {
                const draftDay = (bookingDraft as {
                    dayOffset?: number;
                } | null)?.dayOffset;
                if (draftDay === 1 || /ngày\s*mai/.test(hist) || /ngày\s*mai/.test(msgLower)) {
                    useIntent = { kind: 'tomorrow' };
                }
                else if (draftDay === 0 || /hôm\s*nay/.test(hist) || /hôm\s*nay/.test(msgLower)) {
                    useIntent = { kind: 'today' };
                }
                else {
                    useIntent = { kind: 'today' };
                }
            }
            const dayLabel = formatIntentDayLabel(useIntent);
            const dayOffsetFromIntent = useIntent.kind === 'tomorrow'
                ? 1
                : useIntent.kind === 'day'
                    ? useIntent.dayOffset
                    : useIntent.kind === 'hour'
                        ? useIntent.dayOffset
                        : 0;
            const movieIds = new Set(titledPick.map((m) => m.id));
            let sts = await getShowtimesByIntent(useIntent, 60);
            sts = sts.filter((st) => movieIds.has(st.movie.id));
            if (sts.length === 0) {
                const names = titledPick.map((m) => `"${m.title}"`).join(', ');
                return NextResponse.json({
                    reply: `Hiện chưa có suất phù hợp cho ${names} ${dayLabel}. Bạn thử ngày khác nhé.`,
                    movies: movieCards(titledPick),
                    source: 'pick-film',
                    bookingDraft: {
                        movieId: titledPick[0].id,
                        movieTitle: titledPick[0].title,
                        movieQuery: titledPick[0].title,
                        dayOffset: dayOffsetFromIntent,
                        step: 'collect',
                    },
                    showtimeOptions: [],
                });
            }
            const movieById = new Map(titledPick.map((m) => [m.id, m]));
            const showtimeOptions = sts.slice(0, 15).map((st) => {
                const m = movieById.get(st.movie.id) || st.movie;
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
            const titles = titledPick.map((m) => m.title);
            const replyTitle = titles.length === 1
                ? `"${titles[0]}"`
                : titles.map((t) => `"${t}"`).join(' và ');
            return NextResponse.json({
                reply: `Suất chiếu ${replyTitle} ${dayLabel} — bấm suất bên dưới để chọn ghế & thanh toán:`,
                
                movies: [],
                source: 'pick-film',
                bookingDraft: {
                    movieId: titledPick[0].id,
                    movieTitle: titledPick[0].title,
                    movieQuery: titledPick.map((m) => m.title).join(', '),
                    dayOffset: dayOffsetFromIntent,
                    step: 'showtimes',
                    lastShowtimeOptions: showtimeOptions,
                    lastListedMovieIds: titledPick.map((m) => m.id),
                    lastListedTitles: titledPick.map((m) => m.title),
                },
                showtimeOptions,
            });
        }
        
        
        const isContinuingBooking = /chọn\s*suất\s*\d|chọn\s*[abc]\b/i.test(msgLower) ||
            (bookingDraft?.step === 'showtimes' &&
                /chọn\s*suất|suất\s*\d/i.test(msgLower));
        const richBooking = !isBrowseGenreQuery &&
            !refersToListed &&
            (isBookingQuestion(message) || isContinuingBooking);
        
        const looksLikeBookingNL = !isBrowseGenreQuery &&
            !refersToListed &&
            (/(tối\s*nay|ngày\s*mai|hôm\s*nay).{0,40}(vé|rạp|cgv|galaxy|lotte)/i.test(message) ||
                /(marvel|avengers|người\s*nhện).{0,60}(tối|ngày)/i.test(message));
        if (richBooking || looksLikeBookingNL) {
            const flowDraft: BookingFlowState | null = bookingDraft
                ? { ...bookingDraft, step: bookingDraft.step ?? 'collect' }
                : null;
            const result = await handleBookingFlow(message, isBrowseGenreQuery ? null : flowDraft);
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
        
        
        if (isBrowseGenreQuery || isPopularQuestion(message)) {
            const fb = await buildFallbackChatReply(message, movies);
            const intentBrowse = parseTimeIntent(message);
            const dayOff = intentBrowse.kind === 'tomorrow'
                ? 1
                : intentBrowse.kind === 'day'
                    ? intentBrowse.dayOffset
                    : intentBrowse.kind === 'hour'
                        ? intentBrowse.dayOffset
                        : 0;
            return NextResponse.json({
                reply: fb.reply,
                movies: movieCards(fb.movies),
                source: isPopularQuestion(message) ? 'popular' : 'browse-genre',
                bookingDraft: {
                    step: 'collect',
                    dayOffset: dayOff,
                    lastListedMovieIds: fb.movies.map((m) => m.id),
                    lastListedTitles: fb.movies.map((m) => m.title),
                },
                showtimeOptions: [],
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
            }
            else {
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
                        sts = sts.filter((st) => genres.some((g) => st.movie.genre.toLowerCase().includes(g)));
                    }
                    const uniq = new Map<string, (typeof movies)[0]>();
                    for (const st of sts)
                        uniq.set(st.movie.id, st.movie);
                    related = uniq.size ? Array.from(uniq.values()).slice(0, 6) : [];
                }
                else if (genres.length) {
                    related = movies
                        .filter((m) => genres.some((g) => m.genre.toLowerCase().includes(g)) &&
                        (m.isNowShowing || m.isComingSoon))
                        .slice(0, 6);
                }
                return NextResponse.json({
                    reply: result.content.replace(/\*\*/g, ''),
                    movies: movieCards(related),
                    source: 'llm',
                    model: result.model,
                    bookingDraft: related.length
                        ? {
                            step: 'collect',
                            dayOffset: intent.kind === 'tomorrow'
                                ? 1
                                : intent.kind === 'day'
                                    ? intent.dayOffset
                                    : intent.kind === 'hour'
                                        ? intent.dayOffset
                                        : 0,
                            lastListedMovieIds: related.map((m) => m.id),
                            lastListedTitles: related.map((m) => m.title),
                        }
                        : null,
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
                bookingDraft: fb.movies.length
                    ? {
                        step: 'collect',
                        lastListedMovieIds: fb.movies.map((m) => m.id),
                        lastListedTitles: fb.movies.map((m) => m.title),
                    }
                    : null,
                showtimeOptions: [],
            });
        }
        const fb = await buildFallbackChatReply(message, movies);
        const intentFb = parseTimeIntent(message);
        return NextResponse.json({
            reply: fb.reply,
            movies: movieCards(fb.movies),
            source: 'fallback',
            bookingDraft: fb.movies.length
                ? {
                    step: 'collect',
                    dayOffset: intentFb.kind === 'tomorrow'
                        ? 1
                        : intentFb.kind === 'day'
                            ? intentFb.dayOffset
                            : intentFb.kind === 'hour'
                                ? intentFb.dayOffset
                                : 0,
                    lastListedMovieIds: fb.movies.map((m) => m.id),
                    lastListedTitles: fb.movies.map((m) => m.title),
                }
                : null,
            showtimeOptions: [],
        });
    }
    catch (err) {
        console.error('[AI chat]', err);
        return NextResponse.json({ error: 'Lỗi máy chủ AI chatbot' }, { status: 500 });
    }
}
