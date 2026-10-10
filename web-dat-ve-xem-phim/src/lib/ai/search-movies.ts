import { extractGenreFromMessage, formatMoviesForPrompt, getMoviesForAi, keywordSearchMovies, movieAiSelect, type MovieAi, } from '@/lib/ai/movie-context';
import { chatCompletion, extractJson, isAiConfigured } from '@/lib/ai/openai';
import { prisma } from '@/lib/db/prisma';




function isGenreOrDescriptiveQuery(query: string, genres: string[]): boolean {
    const q = query.toLowerCase().normalize('NFC').trim();
    
    if (genres.length > 0) {
        
        const stripped = q
            .replace(/phim|xem|cho|mình|tôi|các|những|đang\s*chiếu|sắp\s*chiếu|hay|nhất/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
        
        if (stripped.length <= 40)
            return true;
    }
    
    if (/^(các\s+)?phim\s+/.test(q) ||
        /\b(thể\s*loại|genre)\b/.test(q) ||
        /\b(đang\s*chiếu|sắp\s*chiếu)\b/.test(q)) {
        return true;
    }
    return false;
}





export async function unifiedMovieSearch(query: string, limit = 40): Promise<{
    movies: MovieAi[];
    interpretation: string;
}> {
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
    
    if (descriptive && genres.length > 0) {
        const all = await getMoviesForAi(100);
        const filtered = all.filter((m) => genres.some((g) => m.genre.toLowerCase().includes(g.toLowerCase())));
        
        filtered.sort((a, b) => Number(b.isNowShowing) - Number(a.isNowShowing));
        const label = genres.join(', ');
        return {
            movies: filtered.slice(0, limit),
            interpretation: filtered.length > 0
                ? `${filtered.length} phim thể loại ${label}.`
                : `Không có phim thể loại ${label} trong hệ thống.`,
        };
    }
    if (descriptive && genres.length === 0) {
        
        const catalog = await getMoviesForAi(80);
        let hits = keywordSearchMovies(catalog, q, limit);
        if (isAiConfigured() && q.length >= 4 && hits.length < 3) {
            const result = await chatCompletion([
                {
                    role: 'system',
                    content: 'Chỉ trả JSON: {"ids":["id"],"interpretation":"câu ngắn"}',
                },
                {
                    role: 'user',
                    content: `Tìm phim: "${q}"\n${formatMoviesForPrompt(catalog)}`,
                },
            ], { temperature: 0.2, maxTokens: 350 });
            if (result) {
                const picked = extractJson<{
                    ids: string[];
                    interpretation: string;
                }>(result.content);
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
            interpretation: hits.length > 0
                ? `Gợi ý liên quan tới "${q}".`
                : `Không tìm thấy phim phù hợp với "${q}".`,
        };
    }
    
    
    const allMovies = await prisma.movie.findMany({
        select: movieAiSelect,
        orderBy: [{ isNowShowing: 'desc' }, { releaseDate: 'desc' }],
    });
    const qLower = q.toLowerCase();
    const exact = allMovies.filter((m) => m.title.toLowerCase() === qLower);
    if (exact.length > 0) {
        return {
            movies: exact,
            interpretation: `Phim khớp tên "${q}".`,
        };
    }
    
    const strong = allMovies.filter((m) => {
        const t = m.title.toLowerCase();
        return t.includes(qLower) || (qLower.length >= 4 && qLower.includes(t));
    });
    if (strong.length > 0) {
        
        strong.sort((a, b) => {
            const as = a.title.toLowerCase().startsWith(qLower) ? 0 : 1;
            const bs = b.title.toLowerCase().startsWith(qLower) ? 0 : 1;
            if (as !== bs)
                return as - bs;
            return Number(b.isNowShowing) - Number(a.isNowShowing);
        });
        return {
            movies: strong.slice(0, limit),
            interpretation: strong.length === 1
                ? `Phim khớp tên "${q}".`
                : `${strong.length} phim khớp tên "${q}".`,
        };
    }
    
    if (q.length >= 4) {
        const fuzzy = keywordSearchMovies(allMovies, q, 8);
        
        
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
