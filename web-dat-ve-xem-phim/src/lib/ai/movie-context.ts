import { prisma } from '@/lib/db/prisma';

/** Field tối thiểu dùng cho AI context – tránh payload lớn */
export const movieAiSelect = {
  id: true,
  title: true,
  slug: true,
  genre: true,
  duration: true,
  ageRating: true,
  synopsis: true,
  posterUrl: true,
  imageUrl: true,
  releaseDate: true,
  isNowShowing: true,
  isComingSoon: true,
} as const;

export type MovieAi = {
  id: string;
  title: string;
  slug: string;
  genre: string;
  duration: number;
  ageRating: string;
  synopsis: string;
  posterUrl: string;
  imageUrl: string;
  releaseDate: Date;
  isNowShowing: boolean;
  isComingSoon: boolean;
};

export type ShowtimeHit = {
  id: string;
  startTime: Date;
  format: string;
  language: string;
  movie: MovieAi;
  cinemaName: string;
  cinemaCity: string;
  hallName: string;
};

/** Lấy danh sách phim (giới hạn) để đưa vào prompt AI */
export async function getMoviesForAi(limit = 80): Promise<MovieAi[]> {
  return prisma.movie.findMany({
    select: movieAiSelect,
    orderBy: [{ isNowShowing: 'desc' }, { releaseDate: 'desc' }],
    take: limit,
  });
}

/** Rút gọn mô tả phim cho prompt (tiết kiệm token) */
export function formatMoviesForPrompt(movies: MovieAi[]): string {
  return movies
    .map((m, i) => {
      const status = m.isNowShowing
        ? 'Đang chiếu'
        : m.isComingSoon
          ? 'Sắp chiếu'
          : 'Khác';
      const syn =
        m.synopsis.length > 180 ? m.synopsis.slice(0, 180) + '…' : m.synopsis;
      return `${i + 1}. [${m.id}] "${m.title}" | Thể loại: ${m.genre} | ${m.duration} phút | ${m.ageRating} | ${status} | Tóm tắt: ${syn}`;
    })
    .join('\n');
}

/** Keyword fallback: tìm phim theo từ khóa tiếng Việt/Anh đơn giản */
export function keywordSearchMovies(
  movies: MovieAi[],
  query: string,
  limit = 12,
): MovieAi[] {
  const q = query.toLowerCase().trim();
  if (!q) return movies.slice(0, limit);

  const tokens = q
    .split(/[\s,;.!?]+/)
    .map((t) => t.trim())
    .filter((t) => t.length >= 2);

  const synonyms: Record<string, string[]> = {
    hành: ['hành động', 'action'],
    action: ['hành động', 'action'],
    hài: ['hài', 'comedy', 'hài hước'],
    comedy: ['hài', 'comedy'],
    tình: ['tình cảm', 'romance', 'lãng mạn'],
    romance: ['tình cảm', 'romance'],
    kinh: ['kinh dị', 'horror'],
    horror: ['kinh dị', 'horror'],
    hoạt: ['hoạt hình', 'animation', 'anime'],
    animation: ['hoạt hình', 'animation'],
    khoa: ['khoa học viễn tưởng', 'sci-fi', 'viễn tưởng'],
    'sci-fi': ['khoa học', 'viễn tưởng', 'sci-fi'],
    chiến: ['chiến tranh', 'war'],
    phiêu: ['phiêu lưu', 'adventure'],
    gia: ['gia đình', 'family'],
    trẻ: ['thiếu nhi', 'family', 'hoạt hình'],
    thần: ['thần thoại', 'fantasy'],
  };

  // Bỏ token thời gian / hỏi chung – không dùng để score genre
  const noise = new Set([
    'phim',
    'nào',
    'có',
    'không',
    'hôm',
    'nay',
    'mai',
    'chiếu',
    'suất',
    'lúc',
    'tầm',
    'khoảng',
    'giờ',
    'ngày',
    'cho',
    'mình',
    'bạn',
    'đi',
    'xem',
    'muốn',
    'gợi',
    'ý',
    'đề',
    'xuất',
  ]);

  const expanded = new Set<string>();
  for (const t of tokens) {
    if (noise.has(t)) continue;
    expanded.add(t);
    for (const [k, vals] of Object.entries(synonyms)) {
      if (t.includes(k) || k.includes(t)) {
        vals.forEach((v) => expanded.add(v));
      }
    }
  }

  if (expanded.size === 0) {
    return movies.filter((m) => m.isNowShowing).slice(0, limit);
  }

  const scored = movies.map((m) => {
    const hay = `${m.title} ${m.genre} ${m.synopsis} ${m.ageRating}`.toLowerCase();
    let score = 0;
    for (const t of expanded) {
      if (hay.includes(t)) score += t.length >= 4 ? 3 : 2;
    }
    if (m.title.toLowerCase().includes(q)) score += 10;
    if (m.isNowShowing) score += 1;
    return { m, score };
  });

  return scored
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((x) => x.m);
}

/** Gợi ý theo thể loại / trạng thái (fallback recommend) */
export function fallbackRecommend(
  movies: MovieAi[],
  prefs?: { genres?: string[]; mood?: string; limit?: number },
): MovieAi[] {
  const limit = prefs?.limit ?? 8;
  let pool = movies.filter((m) => m.isNowShowing || m.isComingSoon);

  if (prefs?.genres?.length) {
    const gset = prefs.genres.map((g) => g.toLowerCase());
    const filtered = pool.filter((m) =>
      gset.some((g) => m.genre.toLowerCase().includes(g)),
    );
    if (filtered.length) pool = filtered;
  }

  if (prefs?.mood) {
    const byMood = keywordSearchMovies(pool, prefs.mood, limit * 2);
    if (byMood.length) return byMood.slice(0, limit);
  }

  return [...pool]
    .sort((a, b) => Number(b.isNowShowing) - Number(a.isNowShowing))
    .slice(0, limit);
}

/* ========== Thời gian theo múi VN ========== */

const VN_TZ = 'Asia/Ho_Chi_Minh';

export function vnNowParts(d = new Date()) {
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: VN_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  const parts = Object.fromEntries(
    fmt.formatToParts(d).map((p) => [p.type, p.value]),
  );
  return {
    y: Number(parts.year),
    m: Number(parts.month),
    d: Number(parts.day),
    hour: Number(parts.hour),
    minute: Number(parts.minute),
  };
}

/** Khoảng UTC tương ứng 1 ngày lịch VN (00:00–24:00) */
export function vnDayRangeUtc(offsetDays = 0): { start: Date; end: Date } {
  const p = vnNowParts();
  // VN = UTC+7 → 00:00 VN = 17:00 UTC ngày trước
  const start = new Date(Date.UTC(p.y, p.m - 1, p.d + offsetDays, -7, 0, 0));
  const end = new Date(Date.UTC(p.y, p.m - 1, p.d + offsetDays + 1, -7, 0, 0));
  return { start, end };
}

export type TimeIntent =
  | { kind: 'today' }
  | { kind: 'tomorrow' }
  | { kind: 'hour'; dayOffset: number; hour: number; hourEnd?: number }
  | { kind: 'now_showing' }
  | { kind: 'none' };


/** Trích thể loại từ câu hỏi (kinh dị, hài, hành động…) */
export function extractGenreFromMessage(message: string): string[] {
  const q = message.toLowerCase().normalize('NFC');
  const genres: { keys: string[]; label: string }[] = [
    { keys: ['kinh dị', 'kinhdi', 'horror', 'ma', 'quỷ', 'quỷ'], label: 'kinh dị' },
    { keys: ['hài', 'hài hước', 'comedy', 'hài kịch'], label: 'hài' },
    { keys: ['hành động', 'action', 'hànhđộng'], label: 'hành động' },
    { keys: ['tình cảm', 'lãng mạn', 'romance', 'tìnhcảm'], label: 'tình cảm' },
    { keys: ['hoạt hình', 'animation', 'anime', 'hoạthình'], label: 'hoạt hình' },
    { keys: ['gia đình', 'family', 'thiếu nhi'], label: 'gia đình' },
    { keys: ['phiêu lưu', 'adventure'], label: 'phiêu lưu' },
    { keys: ['khoa học', 'viễn tưởng', 'sci-fi', 'scifi'], label: 'khoa học' },
    { keys: ['thần thoại', 'fantasy'], label: 'thần thoại' },
    { keys: ['tâm lý', 'drama'], label: 'tâm lý' },
  ];
  const found: string[] = [];
  for (const g of genres) {
    if (g.keys.some((k) => q.includes(k))) found.push(g.label);
  }
  return found;
}

function movieMatchesGenres(movie: MovieAi, genres: string[]): boolean {
  if (!genres.length) return true;
  const g = movie.genre.toLowerCase();
  return genres.some((want) => g.includes(want.toLowerCase()));
}

/** Phân tích câu hỏi có nhắc thời gian chiếu không */
export function parseTimeIntent(message: string): TimeIntent {
  const q = message.toLowerCase().normalize('NFC');

  const hasToday =
    /\bhôm\s*nay\b/.test(q) ||
    /\bhnay\b/.test(q) ||
    /\bngày\s*hôm\s*nay\b/.test(q);
  const hasTomorrow =
    /\bngày\s*mai\b/.test(q) ||
    /\bmai\b/.test(q) ||
    /\btomorrow\b/.test(q);

  // "tầm 8h", "lúc 20h", "khoảng 8 giờ", "8:30"
  const hourMatch = q.match(
    /(?:tầm|lúc|khoảng|vào)?\s*(\d{1,2})\s*(?::|h|giờ|g)(?:\s*(\d{1,2}))?/,
  );
  let hour: number | null = null;
  if (hourMatch) {
    hour = Number(hourMatch[1]);
    if (hour >= 0 && hour <= 23) {
      if (/\btối\b|\bđêm\b/.test(q) && hour >= 1 && hour <= 11) {
        hour += 12;
      }
    } else {
      hour = null;
    }
  }

  if (hour !== null && (hasToday || hasTomorrow || /chiếu|suất|lúc|tầm/.test(q))) {
    return {
      kind: 'hour',
      dayOffset: hasTomorrow ? 1 : 0,
      hour,
      hourEnd: hour + 2,
    };
  }
  if (hasTomorrow) return { kind: 'tomorrow' };
  if (
    hasToday ||
    /chiếu\s*(hôm\s*nay|gì|nào)/.test(q) ||
    /có\s*phim.*chiếu/.test(q)
  ) {
    return { kind: 'today' };
  }
  if (/đang\s*chiếu|now\s*showing/.test(q)) return { kind: 'now_showing' };
  return { kind: 'none' };
}

/** Query suất chiếu theo intent thời gian */
export async function getShowtimesByIntent(
  intent: TimeIntent,
  limit = 30,
): Promise<ShowtimeHit[]> {
  if (intent.kind === 'none' || intent.kind === 'now_showing') {
    return [];
  }

  let start: Date;
  let end: Date;

  if (intent.kind === 'today') {
    const r = vnDayRangeUtc(0);
    start = new Date(Math.max(r.start.getTime(), Date.now()));
    end = r.end;
  } else if (intent.kind === 'tomorrow') {
    const r = vnDayRangeUtc(1);
    start = r.start;
    end = r.end;
  } else {
    const p = vnNowParts();
    const day = p.d + intent.dayOffset;
    const hStart = intent.hour - 1;
    const hEnd = intent.hourEnd ?? intent.hour + 2;
    start = new Date(Date.UTC(p.y, p.m - 1, day, hStart - 7, 0, 0));
    end = new Date(Date.UTC(p.y, p.m - 1, day, hEnd - 7, 0, 0));
    if (intent.dayOffset === 0 && start < new Date()) {
      start = new Date();
    }
  }

  const rows = await prisma.showtime.findMany({
    where: {
      startTime: { gte: start, lt: end },
    },
    orderBy: { startTime: 'asc' },
    take: limit,
    select: {
      id: true,
      startTime: true,
      format: true,
      language: true,
      movie: { select: movieAiSelect },
      hall: {
        select: {
          name: true,
          cinema: { select: { name: true, city: true } },
        },
      },
    },
  });

  return rows.map((st) => ({
    id: st.id,
    startTime: st.startTime,
    format: st.format,
    language: st.language,
    movie: st.movie,
    cinemaName: st.hall.cinema.name,
    cinemaCity: st.hall.cinema.city,
    hallName: st.hall.name,
  }));
}

function formatVnTime(d: Date): string {
  return new Intl.DateTimeFormat('vi-VN', {
    timeZone: VN_TZ,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(d);
}

/**
 * Xây câu trả lời fallback thông minh (không dùng markdown **).
 * Ưu tiên suất chiếu nếu user hỏi thời gian.
 */

/** Chuẩn hóa chuỗi để so khớp tên phim (bỏ dấu, lower, bỏ ký tự đặc biệt) */
function normalizeTitle(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Tìm phim theo tên trong câu hỏi.
 * Ưu tiên khớp dài nhất / chính xác nhất.
 */
export function findMoviesByTitle(
  message: string,
  movies: MovieAi[],
  limit = 3,
): MovieAi[] {
  const q = normalizeTitle(message);
  if (q.length < 2) return [];

  const scored = movies.map((m) => {
    const t = normalizeTitle(m.title);
    let score = 0;
    if (t === q) score = 100;
    else if (q.includes(t) && t.length >= 4) score = 80 + Math.min(t.length, 20);
    else if (t.includes(q) && q.length >= 4) score = 60 + Math.min(q.length, 20);
    else {
      // token overlap
      const qt = q.split(' ').filter((x) => x.length >= 2);
      const tt = new Set(t.split(' ').filter((x) => x.length >= 2));
      let hit = 0;
      for (const x of qt) if (tt.has(x)) hit++;
      if (hit >= 2 || (hit === 1 && qt.length === 1 && t.includes(qt[0]))) {
        score = 30 + hit * 10;
      }
    }
    return { m, score };
  });

  return scored
    .filter((x) => x.score >= 30)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((x) => x.m);
}

/** Câu hỏi xin mô tả / chi tiết / thông tin phim */
export function isDetailQuestion(message: string): boolean {
  const q = message.toLowerCase();
  return (
    /mô\s*tả|chi\s*tiết|tóm\s*tắt|nội\s*dung|thông\s*tin|giới\s*thiệu|synopsis|review|kể\s*về|nói\s*về|phim\s+.+\s+(là\s+gì|ra\s+sao)/.test(
      q,
    ) || /^(kể|nói|cho)\s+(mình\s+)?(biết\s+)?(về\s+)?phim/.test(q)
  );
}


/** Câu hỏi phim hot / nhiều người đặt / phổ biến */
export function isPopularQuestion(message: string): boolean {
  const q = message.toLowerCase().normalize('NFC');
  return (
    /nhiều\s*(người|bạn|khách)?\s*(đặt|xem|mua)/.test(q) ||
    /đặt\s*nhiều\s*nhất/.test(q) ||
    /phim\s*(hot|nóng|hot nhất|best|bán\s*chạy)/.test(q) ||
    /phổ\s*biến\s*nhất/.test(q) ||
    /top\s*(phim|đặt|booking)/.test(q) ||
    /xem\s*nhiều\s*nhất/.test(q) ||
    /đông\s*khách/.test(q)
  );
}

/**
 * Phim có nhiều đơn đặt nhất (đếm Booking qua Showtime).
 * Ưu tiên CONFIRMED / PAID; nếu không có thì đếm mọi booking.
 */
export async function getPopularMovies(
  limit = 6,
): Promise<{ movie: MovieAi; bookingCount: number }[]> {
  // Group bookings by movie via showtime
  const groups = await prisma.booking.groupBy({
    by: ['showtimeId'],
    where: {
      OR: [
        { status: 'CONFIRMED' },
        { paymentStatus: 'PAID' },
      ],
    },
    _count: { id: true },
  });

  let rows = groups;
  if (rows.length === 0) {
    rows = await prisma.booking.groupBy({
      by: ['showtimeId'],
      _count: { id: true },
    });
  }

  if (rows.length === 0) return [];

  const showtimeIds = rows.map((r) => r.showtimeId);
  const showtimes = await prisma.showtime.findMany({
    where: { id: { in: showtimeIds } },
    select: { id: true, movieId: true },
  });
  const stToMovie = new Map(showtimes.map((s) => [s.id, s.movieId]));

  const countByMovie = new Map<string, number>();
  for (const r of rows) {
    const mid = stToMovie.get(r.showtimeId);
    if (!mid) continue;
    countByMovie.set(mid, (countByMovie.get(mid) || 0) + r._count.id);
  }

  const ranked = Array.from(countByMovie.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit);

  if (!ranked.length) return [];

  const movieIds = ranked.map(([id]) => id);
  const movieList = await prisma.movie.findMany({
    where: { id: { in: movieIds } },
    select: movieAiSelect,
  });
  const byId = new Map(movieList.map((m) => [m.id, m]));

  return ranked
    .map(([id, bookingCount]) => {
      const movie = byId.get(id);
      return movie ? { movie, bookingCount } : null;
    })
    .filter(Boolean) as { movie: MovieAi; bookingCount: number }[];
}


/** Câu hỏi / yêu cầu đặt vé */
export function isBookingQuestion(message: string): boolean {
  const q = message.toLowerCase().normalize('NFC');
  return (
    /đặt\s*vé|mua\s*vé|book(ing)?|chọn\s*ghế|giữ\s*ghế/.test(q) ||
    /hướng\s*dẫn\s*(đặt|mua)/.test(q) ||
    /muốn\s*(đặt|mua|xem)\s*vé/.test(q) ||
    /đặt\s*(cho|giúp|hộ)/.test(q) ||
    /làm\s*sao\s*(để\s*)?(đặt|mua)\s*vé/.test(q) ||
    /đặt\s*phim/.test(q)
  );
}

/**
 * Trợ lý đặt vé: gợi ý phim + suất + link đặt.
 * Không đặt hộ (cần chọn ghế/thanh toán trên web).
 */
export async function buildBookingAssistantReply(
  message: string,
  movies: MovieAi[],
): Promise<{ reply: string; movies: MovieAi[] }> {
  const titled = findMoviesByTitle(message, movies, 3);
  const genres = extractGenreFromMessage(message);
  const intent = parseTimeIntent(message);

  // Có tên phim cụ thể
  if (titled.length > 0) {
    const m = titled[0];
    let showtimes = await getShowtimesByIntent(
      intent.kind === 'none' ? { kind: 'today' } : intent,
      20,
    );
    showtimes = showtimes.filter((st) => st.movie.id === m.id);

    // Nếu hôm nay không có, thử ngày mai
    if (showtimes.length === 0 && intent.kind === 'none') {
      showtimes = (
        await getShowtimesByIntent({ kind: 'tomorrow' }, 20)
      ).filter((st) => st.movie.id === m.id);
    }

    const lines: string[] = [
      `Mình hỗ trợ đặt vé phim: ${m.title} (${m.genre}, ${m.ageRating}).`,
      '',
    ];

    if (showtimes.length > 0) {
      lines.push('Một số suất gần đây:');
      const seen = new Set<string>();
      let n = 0;
      for (const st of showtimes) {
        const t = formatVnTime(st.startTime);
        const key = `${t}-${st.cinemaName}`;
        if (seen.has(key)) continue;
        seen.add(key);
        lines.push(`- ${t} · ${st.cinemaName} (${st.format})`);
        n++;
        if (n >= 5) break;
      }
      lines.push('');
    } else {
      lines.push(
        'Hiện chưa thấy suất phù hợp khung thời gian này. Bạn xem thêm lịch trên trang Suất chiếu.',
        '',
      );
    }

    lines.push(
      `Cách đặt vé nhanh:`,
      `1. Vào trang phim: /phim/${m.slug}`,
      `2. Chọn suất chiếu → chọn ghế → thanh toán`,
      `3. Hoặc mở /suat-chieu để xem toàn bộ lịch`,
      '',
      'Bạn muốn suất hôm nay, ngày mai, hay rạp cụ thể?',
    );

    return { reply: lines.join('\n'), movies: [m] };
  }

  // Có thể loại / thời gian → gợi ý phim + hướng dẫn
  if (intent.kind !== 'none' && intent.kind !== 'now_showing') {
    let sts = await getShowtimesByIntent(intent, 30);
    if (genres.length) {
      sts = sts.filter((st) =>
        genres.some((g) => st.movie.genre.toLowerCase().includes(g)),
      );
    }
    if (sts.length === 0) {
      return {
        reply:
          'Chưa có suất khớp yêu cầu đặt vé. Bạn thử khung giờ khác, hoặc vào /suat-chieu xem lịch đầy đủ nhé.',
        movies: [],
      };
    }
    const byMovie = new Map<string, MovieAi>();
    for (const st of sts) byMovie.set(st.movie.id, st.movie);
    const list = Array.from(byMovie.values()).slice(0, 5);
    const lines = list.map(
      (m, i) => `${i + 1}. ${m.title} (${m.genre}) → /phim/${m.slug}`,
    );
    return {
      reply: `Các phim có suất để đặt vé:\n\n${lines.join('\n')}\n\nChọn phim → mở link → chọn suất & ghế. Bạn muốn đặt phim nào?`,
      movies: list,
    };
  }

  // Hướng dẫn chung
  if (genres.length) {
    const hits = movies
      .filter(
        (m) =>
          m.isNowShowing &&
          genres.some((g) => m.genre.toLowerCase().includes(g)),
      )
      .slice(0, 5);
    if (hits.length) {
      const lines = hits.map(
        (m, i) => `${i + 1}. ${m.title} → /phim/${m.slug}`,
      );
      return {
        reply: `Phim ${genres.join(', ')} đang chiếu – chọn phim để đặt vé:\n\n${lines.join('\n')}\n\nQuy trình: chọn phim → suất chiếu → ghế → thanh toán. Bạn muốn đặt phim nào?`,
        movies: hits,
      };
    }
  }

  return {
    reply: [
      'Mình là trợ lý đặt vé DatVeXemPhim. Có thể giúp bạn:',
      '- Gợi ý phim theo thể loại / tâm trạng',
      '- Xem suất hôm nay / ngày mai / khung giờ',
      '- Hướng dẫn đặt vé từng bước',
      '',
      'Quy trình đặt vé:',
      '1. Chọn phim (trang /phim hoặc nói tên phim cho mình)',
      '2. Chọn suất chiếu',
      '3. Chọn ghế',
      '4. Thanh toán',
      '',
      'Bạn muốn đặt phim gì, hoặc xem suất hôm nay?',
    ].join('\n'),
    movies: movies.filter((m) => m.isNowShowing).slice(0, 4),
  };
}

export async function buildFallbackChatReply(
  message: string,
  movies: MovieAi[],
): Promise<{
  reply: string;
  movies: MovieAi[];
}> {
  const intent = parseTimeIntent(message);
  const genres = extractGenreFromMessage(message);
  const genreLabel = genres.length ? genres.join(', ') : '';

  // --- Trợ lý đặt vé ---
  if (isBookingQuestion(message)) {
    return buildBookingAssistantReply(message, movies);
  }

  // --- Hỏi mô tả / chi tiết 1 phim cụ thể ---
  const titled = findMoviesByTitle(message, movies, 3);
  if (titled.length > 0 && (isDetailQuestion(message) || titled[0] && normalizeTitle(message).includes(normalizeTitle(titled[0].title).slice(0, 12)))) {
    // Nếu user nêu tên phim rõ (hoặc xin mô tả) → trả chi tiết, không list lung tung
    const primary = titled[0];
    // Chỉ dùng titled[0] nếu điểm cao: tên xuất hiện trong câu hoặc là câu detail
    const qn = normalizeTitle(message);
    const tn = normalizeTitle(primary.title);
    const nameMentioned =
      qn.includes(tn) ||
      tn.split(' ').filter((w) => w.length >= 3).some((w) => qn.includes(w));

    if (isDetailQuestion(message) || nameMentioned) {
      const status = primary.isNowShowing
        ? 'Đang chiếu'
        : primary.isComingSoon
          ? 'Sắp chiếu'
          : '';
      const syn =
        primary.synopsis?.trim() ||
        'Chưa có tóm tắt chi tiết trong hệ thống.';
      const reply = [
        `${primary.title}`,
        `Thể loại: ${primary.genre} · Độ tuổi: ${primary.ageRating} · Thời lượng: ${primary.duration} phút${status ? ` · ${status}` : ''}`,
        '',
        syn,
        '',
        'Bạn muốn xem suất chiếu hôm nay / ngày mai của phim này, hay đặt vé luôn?',
      ].join('\n');

      return { reply, movies: [primary] };
    }
  }

  // --- Phim nhiều người đặt / hot ---
  if (isPopularQuestion(message)) {
    const popular = await getPopularMovies(6);
    if (popular.length === 0) {
      // Không có booking → fallback đang chiếu
      const showing = movies.filter((m) => m.isNowShowing).slice(0, 5);
      return {
        reply: showing.length
          ? `Hiện chưa đủ dữ liệu đặt vé để xếp hạng. Một số phim đang chiếu:\n\n${showing
              .map((m, i) => `${i + 1}. ${m.title} (${m.genre}, ${m.ageRating})`)
              .join('\n')}`
          : 'Hiện chưa có dữ liệu đặt vé để thống kê phim nhiều người đặt nhất.',
        movies: showing,
      };
    }
    const lines = popular.map(
      (p, i) =>
        `${i + 1}. ${p.movie.title} (${p.movie.genre}, ${p.movie.ageRating}) – ${p.bookingCount} đơn đặt`,
    );
    return {
      reply: `Top phim được đặt nhiều nhất trên hệ thống:\n\n${lines.join('\n')}\n\nBạn muốn xem chi tiết hoặc suất chiếu phim nào?`,
      movies: popular.map((p) => p.movie),
    };
  }

  // --- Hỏi suất / hôm nay / mai / giờ ---
  if (intent.kind !== 'none' && intent.kind !== 'now_showing') {
    // Nếu user đã nêu tên phim cụ thể → trả suất của phim đó (để chọn)
    const titled = findMoviesByTitle(message, movies, 3);
    const nameInMsg =
      titled.length > 0 &&
      (isDetailQuestion(message) ||
        normalizeTitle(message).includes(
          normalizeTitle(titled[0].title).slice(0, 10),
        ) ||
        /chọn\s*phim|suất\s*của|các\s*suất/.test(message.toLowerCase()));

    if (titled.length > 0 && nameInMsg) {
      const m = titled[0];
      let showtimes = await getShowtimesByIntent(intent, 40);
      showtimes = showtimes.filter((st) => st.movie.id === m.id);
      if (genres.length) {
        // keep only this movie if genre matches or ignore genre when named
      }
      if (showtimes.length === 0) {
        return {
          reply: `Hiện chưa có suất chiếu của "${m.title}" ${
            intent.kind === 'tomorrow' ||
            (intent.kind === 'hour' && intent.dayOffset === 1)
              ? 'ngày mai'
              : intent.kind === 'hour'
                ? `khoảng ${intent.hour}h`
                : 'hôm nay'
          }. Bạn thử ngày khác hoặc chọn phim khác nhé.`,
          movies: [m],
        };
      }
      const lines = showtimes.slice(0, 8).map((st, i) => {
        const t = formatVnTime(st.startTime);
        return `${i + 1}. ${t} – ${st.cinemaName} (${st.format})`;
      });
      const dayLabel =
        intent.kind === 'tomorrow' ||
        (intent.kind === 'hour' && intent.dayOffset === 1)
          ? 'ngày mai'
          : 'hôm nay';
      return {
        reply: `Suất chiếu "${m.title}" ${dayLabel}:\n\n${lines.join('\n')}\n\nGõ số suất (vd: "Chọn suất 2") hoặc giờ để đặt vé.`,
        movies: [m],
        // showtime meta encoded in reply; chat route booking flow handles "Chọn suất"
      };
    }

    let showtimes = await getShowtimesByIntent(intent, 60);

    if (genres.length) {
      showtimes = showtimes.filter((st) =>
        movieMatchesGenres(st.movie, genres),
      );
    }

    const dayLabel =
      intent.kind === 'tomorrow' ||
      (intent.kind === 'hour' && intent.dayOffset === 1)
        ? 'ngày mai'
        : 'hôm nay';

    const timeLabel =
      intent.kind === 'hour'
        ? `khoảng ${intent.hour}h ${dayLabel}`
        : dayLabel;

    if (showtimes.length === 0) {
      const genrePart = genreLabel ? ` thể loại ${genreLabel}` : '';
      return {
        reply: `Hiện chưa có suất chiếu nào ${timeLabel}${genrePart} trong hệ thống. Bạn thử khung giờ khác, hoặc xem lịch tại trang Suất chiếu nhé.`,
        movies: [],
      };
    }

    // Chỉ danh sách PHIM (không liệt kê giờ trong text — user chọn phim rồi mới xem suất)
    const byMovie = new Map<string, MovieAi>();
    for (const st of showtimes) {
      if (!byMovie.has(st.movie.id)) byMovie.set(st.movie.id, st.movie);
    }
    const uniqueMovies = Array.from(byMovie.values()).slice(0, 12);

    const head = genreLabel
      ? `Có ${uniqueMovies.length} phim ${genreLabel} có suất ${timeLabel}. Chọn một phim bên dưới để xem các suất chiếu.`
      : `Có ${uniqueMovies.length} phim có suất ${timeLabel}. Chọn một phim bên dưới để xem các suất chiếu.`;

    return {
      reply: head,
      movies: uniqueMovies,
    };
  }

  // --- Hỏi đang chiếu ---
  if (intent.kind === 'now_showing' || /đang\s*chiếu/.test(message.toLowerCase())) {
    let showing = movies.filter((m) => m.isNowShowing);
    if (genres.length) {
      showing = showing.filter((m) => movieMatchesGenres(m, genres));
    }
    showing = showing.slice(0, 6);
    if (!showing.length) {
      return {
        reply: genres.length
          ? `Hiện chưa có phim ${genreLabel} đang chiếu trong hệ thống.`
          : 'Hiện chưa có phim đánh dấu đang chiếu. Bạn xem mục Phim trên website nhé.',
        movies: [],
      };
    }
    const lines = showing.map(
      (m, i) => `${i + 1}. ${m.title} (${m.genre}, ${m.ageRating})`,
    );
    return {
      reply: genres.length
        ? `Phim ${genreLabel} đang chiếu:\n\n${lines.join('\n')}\n\nBạn muốn xem suất hôm nay / ngày mai không?`
        : `Một số phim đang chiếu:\n\n${lines.join('\n')}\n\nBạn muốn xem thể loại nào cụ thể hơn không?`,
      movies: showing,
    };
  }

  // --- Keyword / thể loại (không hỏi giờ) ---
  let hits: MovieAi[];
  if (genres.length) {
    hits = movies
      .filter((m) => movieMatchesGenres(m, genres) && (m.isNowShowing || m.isComingSoon))
      .slice(0, 6);
    // Bổ sung keyword nếu ít
    if (hits.length < 3) {
      const extra = keywordSearchMovies(movies, message, 6).filter(
        (m) => !hits.some((h) => h.id === m.id),
      );
      hits = [...hits, ...extra].slice(0, 6);
    }
  } else {
    hits = keywordSearchMovies(movies, message, 5);
  }

  if (hits.length === 0) {
    return {
      reply:
        'Mình chưa tìm thấy phim khớp mô tả. Bạn thử nói rõ thể loại (kinh dị, hài, hành động…), hoặc hỏi “phim hôm nay chiếu” / “suất 8h ngày mai” nhé!',
      movies: [],
    };
  }

  const lines = hits.slice(0, 5).map(
    (m, i) =>
      `${i + 1}. ${m.title} (${m.genre}, ${m.ageRating}) – ${m.isNowShowing ? 'đang chiếu' : 'sắp chiếu'}`,
  );

  return {
    reply: genres.length
      ? `Phim ${genreLabel} gợi ý cho bạn:\n\n${lines.join('\n')}\n\nBạn muốn xem suất chiếu hôm nay / ngày mai không?`
      : `Gợi ý theo yêu cầu của bạn:\n\n${lines.join('\n')}\n\nBạn muốn biết chi tiết phim nào, suất chiếu hôm nay, hay lọc theo độ tuổi?`,
    movies: hits,
  };
}
