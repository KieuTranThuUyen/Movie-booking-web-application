import { prisma } from '@/lib/db/prisma';
import { movieAiSelect, type MovieAi, vnDayRangeUtc, vnNowParts, } from '@/lib/ai/movie-context';
export type SeatPref = 'STANDARD' | 'VIP' | 'COUPLE' | 'ANY';
export type BookingDraft = {
    
    movieQuery?: string;
    movieId?: string;
    movieTitle?: string;
    
    dayOffset?: number;
    city?: string;
    quantity?: number;
    seatType?: SeatPref;
    
    showtimeId?: string;
    cinemaName?: string;
    startTimeLabel?: string;
    step?: 'collect' | 'showtimes' | 'seats' | 'seat_confirm' | 'combo' | 'voucher' | 'summary' | 'confirm';
};
export type ShowtimeOption = {
    id: string;
    label: string;
    time: string;
    cinema: string;
    city: string;
    format: string;
    language: string;
    movieTitle: string;
    movieId: string;
    slug: string;
    standardPrice: number;
    vipPrice: number;
    couplePrice: number;
};
const CITY_MAP: {
    keys: string[];
    city: string;
}[] = [
    { keys: ['hcm', 'tp.hcm', 'tp hcm', 'sài gòn', 'saigon', 'hồ chí minh', 'ho chi minh'], city: 'Hồ Chí Minh' },
    { keys: ['hà nội', 'ha noi', 'hn'], city: 'Hà Nội' },
    { keys: ['đà nẵng', 'da nang'], city: 'Đà Nẵng' },
    { keys: ['cần thơ', 'can tho'], city: 'Cần Thơ' },
];

export function parseBookingIntent(message: string, prev?: BookingDraft | null): BookingDraft {
    const q = message.toLowerCase().normalize('NFC');
    const draft: BookingDraft = { ...(prev || {}), step: prev?.step || 'collect' };
    
    const qtyMatch = q.match(/(\d+)\s*(người|vé|ghế|chỗ)/);
    if (qtyMatch)
        draft.quantity = Number(qtyMatch[1]);
    if (/hai\s*người|cặp\s*đôi|2\s*người/.test(q))
        draft.quantity = 2;
    
    if (/ghế\s*đôi|couple|đôi/.test(q))
        draft.seatType = 'COUPLE';
    else if (/vip/.test(q))
        draft.seatType = 'VIP';
    else if (/thường|standard/.test(q))
        draft.seatType = 'STANDARD';
    
    if (/hôm\s*nay|hom\s*nay|tối\s*nay|chiều\s*nay|sáng\s*nay/.test(q))
        draft.dayOffset = 0;
    else if (/ngày\s*mai|ngày\s*mau|ngay\s*mai|ngay\s*mau|mai\s+/.test(q) || /\bmai\b/.test(q))
        draft.dayOffset = 1;
    
    for (const c of CITY_MAP) {
        if (c.keys.some((k) => q.includes(k))) {
            draft.city = c.city;
            break;
        }
    }
    
    let mq = message
        .replace(/\d+\s*(người|vé|ghế|chỗ)|ghế\s*đôi|couple|vip|thường|hôm\s*nay|hom\s*nay|tối\s*nay|ngày\s*mai|ngày\s*mau|ngay\s*mai|\bmai\b|tp\.?\s*hcm|hồ\s*chí\s*minh|sài\s*gòn|hà\s*nội|đà\s*nẵng|muốn|xem|phim|ở|và|với|em|mình|tôi|cho|đặt\s*vé|mua\s*vé|có\s*suất\s*chiếu|suất\s*chiếu|có\s*suất|chiếu|nào|không|gì|các|của|ngày|mau/gi, ' ')
        .replace(/\s+/g, ' ')
        .trim();
    
    if (/marvel|avengers|spider|người\s*nhện|iron\s*man/.test(q)) {
        mq = mq || 'Marvel';
        draft.movieQuery = /avengers/.test(q)
            ? 'Avengers'
            : /người\s*nhện|spider/.test(q)
                ? 'Người Nhện'
                : mq.includes('Marvel') || /marvel/.test(q)
                    ? 'Marvel'
                    : mq;
    }
    else if (mq.length >= 2) {
        draft.movieQuery = mq;
    }
    if (draft.dayOffset === undefined)
        draft.dayOffset = 0;
    if (!draft.seatType)
        draft.seatType = draft.quantity === 2 ? 'COUPLE' : 'ANY';
    if (!draft.quantity)
        draft.quantity = draft.seatType === 'COUPLE' ? 2 : 1;
    return draft;
}
function formatVnTime(d: Date): string {
    return new Intl.DateTimeFormat('vi-VN', {
        timeZone: 'Asia/Ho_Chi_Minh',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
    }).format(d);
}
function normalize(s: string): string {
    return s
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/đ/g, 'd');
}

export async function findMatchingShowtimes(draft: BookingDraft, limit = 8): Promise<ShowtimeOption[]> {
    const dayOffset = draft.dayOffset ?? 0;
    const range = vnDayRangeUtc(dayOffset);
    let start = range.start;
    if (dayOffset === 0 && start < new Date())
        start = new Date();
    const rows = await prisma.showtime.findMany({
        where: {
            startTime: { gte: start, lt: range.end },
        },
        orderBy: { startTime: 'asc' },
        take: 120,
        select: {
            id: true,
            startTime: true,
            format: true,
            language: true,
            standardPrice: true,
            vipPrice: true,
            couplePrice: true,
            movie: { select: { ...movieAiSelect, slug: true } },
            hall: {
                select: {
                    name: true,
                    cinema: { select: { name: true, city: true } },
                },
            },
        },
    });
    let filtered = rows;
    if (draft.city) {
        const nc = normalize(draft.city);
        filtered = filtered.filter((r) => normalize(r.hall.cinema.city).includes(nc) ||
            nc.includes(normalize(r.hall.cinema.city)) ||
            
            (nc.includes('ho chi minh') && /ho chi minh|sai gon|hcm/.test(normalize(r.hall.cinema.city))));
    }
    
    if (draft.movieId) {
        filtered = filtered.filter((r) => r.movie.id === draft.movieId);
    }
    else if (draft.movieQuery) {
        const nq = normalize(draft.movieQuery).trim();
        const tokens = nq.split(/\s+/).filter((t) => t.length >= 2);
        
        if (nq.includes('marvel') || nq.includes('avengers')) {
            filtered = filtered.filter((r) => {
                const t = normalize(r.movie.title);
                return /marvel|avengers|spider|nguoi nhen|iron man|thor|deadpool|venom|captain/.test(t);
            });
        }
        else {
            
            let byPhrase = filtered.filter((r) => normalize(r.movie.title).includes(nq));
            
            if (!byPhrase.length && tokens.length) {
                byPhrase = filtered.filter((r) => {
                    const t = normalize(r.movie.title);
                    return tokens.every((tok) => t.includes(tok));
                });
            }
            
            if (!byPhrase.length) {
                const genreKeys = [
                    'kinh di',
                    'hai',
                    'hanh dong',
                    'tinh cam',
                    'hoat hinh',
                    'gia dinh',
                    'phieu luu',
                    'khoa hoc',
                    'than thoai',
                    'tam ly',
                    'horror',
                    'comedy',
                    'action',
                    'romance',
                    'animation',
                ];
                if (genreKeys.some((g) => nq.includes(g) || g.includes(nq))) {
                    byPhrase = filtered.filter((r) => normalize(r.movie.genre).includes(nq) ||
                        tokens.some((tok) => normalize(r.movie.genre).includes(tok)));
                }
            }
            
            filtered = byPhrase;
        }
    }
    
    
    return filtered.slice(0, limit).map((r) => {
        const time = formatVnTime(r.startTime);
        const cinema = r.hall.cinema.name;
        return {
            id: r.id,
            label: `${time} – ${cinema}`,
            time,
            cinema,
            city: r.hall.cinema.city,
            format: r.format,
            language: r.language,
            movieTitle: r.movie.title,
            movieId: r.movie.id,
            slug: r.movie.slug,
            standardPrice: r.standardPrice,
            vipPrice: r.vipPrice,
            couplePrice: r.couplePrice,
        };
    });
}

export function summarizeDraft(d: BookingDraft): string {
    const parts: string[] = [];
    if (d.movieTitle || d.movieQuery)
        parts.push(`phim: ${d.movieTitle || d.movieQuery}`);
    parts.push(d.dayOffset === 1 ? 'ngày mai' : 'hôm nay');
    if (d.city)
        parts.push(`khu vực: ${d.city}`);
    if (d.quantity)
        parts.push(`${d.quantity} người`);
    if (d.seatType && d.seatType !== 'ANY')
        parts.push(d.seatType === 'COUPLE'
            ? 'ghế đôi'
            : d.seatType === 'VIP'
                ? 'ghế VIP'
                : 'ghế thường');
    return parts.join(', ');
}
