import { prisma } from '@/lib/db/prisma';
import {
  findMatchingShowtimes,
  parseBookingIntent,
  summarizeDraft,
  type BookingDraft,
  type ShowtimeOption,
  type SeatPref,
} from '@/lib/ai/booking-intent';

export type FlowStep =
  | 'collect'
  | 'showtimes'
  | 'seats'
  | 'seat_confirm'
  | 'combo'
  | 'voucher'
  | 'summary'
  | 'confirm';

export type BookingFlowState = BookingDraft & {
  step: FlowStep;
  seatCodes?: string[];
  comboId?: string;
  comboName?: string;
  comboQty?: number;
  voucherCode?: string;
  lastShowtimeOptions?: ShowtimeOption[];
};

export type ComboOption = {
  id: string;
  name: string;
  price: number;
  description: string | null;
};

export type FlowResult = {
  reply: string;
  state: BookingFlowState;
  showtimeOptions: ShowtimeOption[];
  seatSuggestions: string[];
  comboOptions: ComboOption[];
  canCreateBooking: boolean;
  bookingPayload?: {
    showtimeId: string;
    seats: string;
    combos?: { id: string; quantity: number }[];
    voucherCode?: string;
  };
  /** Link trang chọn ghế thủ công */
  manualSeatUrl?: string;
};

function emptyResult(
  reply: string,
  state: BookingFlowState,
  extra?: Partial<FlowResult>,
): FlowResult {
  return {
    reply,
    state,
    showtimeOptions: [],
    seatSuggestions: [],
    comboOptions: [],
    canCreateBooking: false,
    ...extra,
  };
}

function letters(i: number): string {
  return String.fromCharCode(65 + i); // A, B, C...
}

export async function getAvailableSeatCodes(
  showtimeId: string,
  seatType: SeatPref | undefined,
  quantity: number,
): Promise<{ codes: string[]; allFree: { code: string; type: string }[] }> {
  const showtime = await prisma.showtime.findUnique({
    where: { id: showtimeId },
    select: {
      id: true,
      hall: {
        select: {
          seats: {
            where: { isActive: true },
            select: { id: true, code: true, type: true },
            orderBy: [{ rowLabel: 'asc' }, { seatNumber: 'asc' }],
          },
        },
      },
    },
  });
  if (!showtime) return { codes: [], allFree: [] };

  const now = new Date();
  const [held, ticketed] = await Promise.all([
    prisma.seatHold.findMany({
      where: { showtimeId, expiresAt: { gt: now } },
      select: { seatId: true },
    }),
    prisma.ticket.findMany({
      where: {
        booking: {
          showtimeId,
          status: { in: ['PENDING', 'CONFIRMED'] },
        },
      },
      select: { seatId: true },
    }),
  ]);

  const busy = new Set([
    ...held.map((h) => h.seatId),
    ...ticketed.map((t) => t.seatId),
  ]);

  const free = showtime.hall.seats
    .filter((s) => !busy.has(s.id))
    .map((s) => ({ code: s.code, type: s.type }));

  const prefer = (seatType || 'ANY').toUpperCase();
  let pool =
    prefer === 'ANY'
      ? free
      : free.filter((s) => s.type.toUpperCase() === prefer);

  if (prefer === 'COUPLE' && pool.length < quantity) {
    pool = [...pool, ...free.filter((s) => s.type.toUpperCase() === 'STANDARD')];
  }
  if (pool.length < quantity) pool = free;

  const codes = pool.slice(0, Math.max(1, quantity)).map((s) => s.code);
  return { codes, allFree: free };
}

export async function listActiveCombos(limit = 6): Promise<ComboOption[]> {
  return prisma.combo.findMany({
    where: { isActive: true, stock: { gt: 0 } },
    orderBy: { price: 'asc' },
    take: limit,
    select: { id: true, name: true, price: true, description: true },
  });
}

function isReset(q: string) {
  return /hủy\s*đặt|bỏ\s*đặt|đặt\s*lại|bắt\s*đầu\s*lại/.test(q);
}

function parseSeatCodes(message: string): string[] {
  const found = message.toUpperCase().match(/\b[A-Z]\d{1,2}\b/g);
  return found ? [...new Set(found)] : [];
}

function summaryText(state: BookingFlowState): string {
  return [
    'Tóm tắt đơn đặt vé:',
    `• Phim: ${state.movieTitle || state.movieQuery || '—'}`,
    `• Ngày: ${state.dayOffset === 1 ? 'Ngày mai' : 'Hôm nay'}`,
    `• Rạp / suất: ${state.cinemaName || '—'} · ${state.startTimeLabel || '—'}`,
    `• Ghế: ${state.seatCodes?.join(', ') || '—'}`,
    `• Combo: ${state.comboName ? `${state.comboName} x${state.comboQty || 1}` : 'Không'}`,
    `• Voucher: ${state.voucherCode || 'Không'}`,
    '',
    'Bấm "Xác nhận → Thanh toán" hoặc gõ "xác nhận".',
    'AI không tự trừ tiền — hệ thống tạo đơn rồi mở trang thanh toán.',
  ].join('\n');
}

function payloadFrom(state: BookingFlowState) {
  if (!state.showtimeId || !state.seatCodes?.length) return undefined;
  return {
    showtimeId: state.showtimeId,
    seats: state.seatCodes.join(','),
    combos:
      state.comboId && (state.comboQty || 1)
        ? [{ id: state.comboId, quantity: state.comboQty || 1 }]
        : undefined,
    voucherCode: state.voucherCode,
  };
}

/**
 * Flow:
 * Đặt vé [phim] [ngày]
 *   → suất A/B/C → khách chọn
 *   → hỏi ghế → khách nhập (vd B5)
 *   → xác nhận ghế → [Tiếp tục AI] / [Tự chọn]
 *   → menu Combo → Có/Không
 *   → menu Voucher
 *   → tổng hợp → Xác nhận → thanh toán
 */
export async function runBookingFlow(
  message: string,
  prev: BookingFlowState | null | undefined,
): Promise<FlowResult> {
  const q = message.toLowerCase().normalize('NFC');

  if (isReset(q)) {
    return emptyResult(
      'Đã hủy phiên đặt vé. Bạn gõ lại, ví dụ: "Đặt vé Út Lan ngày mai".',
      { step: 'collect' },
    );
  }

  // Merge intent
  let state: BookingFlowState = {
    step: 'collect',
    ...(prev || {}),
    ...parseBookingIntent(message, prev || null),
  };

  // Giữ step/tiến trình từ prev trừ khi đang collect mới
  if (prev?.step && prev.step !== 'collect') {
    state.step = prev.step;
    state.showtimeId = prev.showtimeId ?? state.showtimeId;
    state.seatCodes = prev.seatCodes ?? state.seatCodes;
    state.comboId = prev.comboId ?? state.comboId;
    state.comboName = prev.comboName ?? state.comboName;
    state.comboQty = prev.comboQty ?? state.comboQty;
    state.voucherCode = prev.voucherCode ?? state.voucherCode;
    state.cinemaName = prev.cinemaName ?? state.cinemaName;
    state.startTimeLabel = prev.startTimeLabel ?? state.startTimeLabel;
    state.movieTitle = prev.movieTitle ?? state.movieTitle;
    state.movieId = prev.movieId ?? state.movieId;
    state.lastShowtimeOptions = prev.lastShowtimeOptions;
  }

  if (state.dayOffset === undefined && /ngày\s*mai|\bmai\b/.test(q)) {
    state.dayOffset = 1;
  }
  if (state.dayOffset === undefined) state.dayOffset = 0;
  if (!state.quantity) state.quantity = state.seatType === 'COUPLE' ? 2 : 1;
  if (!state.seatType) state.seatType = 'ANY';

  // ===== SUMMARY / CONFIRM =====
  if (state.step === 'summary' || state.step === 'confirm') {
    if (/xác\s*nhận|đồng\s*ý|thanh\s*toán|đặt\s*đi|ok\b/.test(q)) {
      const bookingPayload = payloadFrom(state);
      if (!bookingPayload) {
        return emptyResult(
          'Thiếu suất hoặc ghế. Gõ "đặt lại" để bắt đầu lại.',
          { step: 'collect' },
        );
      }
      return {
        reply: [
          'Xác nhận thành công. Đang tạo đơn và mở trang thanh toán…',
          'Bạn cần đăng nhập. AI không tự thanh toán.',
        ].join('\n'),
        state: { ...state, step: 'confirm' },
        showtimeOptions: [],
        seatSuggestions: state.seatCodes || [],
        comboOptions: [],
        canCreateBooking: true,
        bookingPayload,
      };
    }
    // show summary again
    return {
      reply: summaryText(state),
      state: { ...state, step: 'summary' },
      showtimeOptions: [],
      seatSuggestions: state.seatCodes || [],
      comboOptions: [],
      canCreateBooking: true,
      bookingPayload: payloadFrom(state),
    };
  }

  // ===== VOUCHER =====
  if (state.step === 'voucher') {
    if (/không|no|bỏ\s*qua|không\s*voucher|ko\b/.test(q) && !/voucher\s+[a-z0-9]/i.test(message)) {
      state.voucherCode = undefined;
      state.step = 'summary';
      return {
        reply: summaryText(state),
        state,
        showtimeOptions: [],
        seatSuggestions: state.seatCodes || [],
        comboOptions: [],
        canCreateBooking: true,
        bookingPayload: payloadFrom(state),
      };
    }
    const vm = message.match(
      /(?:voucher|mã)\s*[:\s]*([A-Za-z0-9_-]+)|^\s*([A-Za-z0-9_-]{3,})\s*$/i,
    );
    if (vm) {
      state.voucherCode = (vm[1] || vm[2]).toUpperCase();
      state.step = 'summary';
      return {
        reply: summaryText(state),
        state,
        showtimeOptions: [],
        seatSuggestions: state.seatCodes || [],
        comboOptions: [],
        canCreateBooking: true,
        bookingPayload: payloadFrom(state),
      };
    }
    return emptyResult(
      [
        'Bạn có mã voucher không?',
        '• Gõ mã (vd: VOUCHER A / SALE10)',
        '• Hoặc gõ "Không" nếu không dùng voucher',
      ].join('\n'),
      { ...state, step: 'voucher' },
    );
  }

  // ===== COMBO =====
  if (state.step === 'combo') {
    const combos = await listActiveCombos(8);
    if (/không|no|bỏ\s*qua|không\s*combo|ko\b/.test(q)) {
      state.comboId = undefined;
      state.comboName = undefined;
      state.comboQty = undefined;
      state.step = 'voucher';
      return emptyResult(
        [
          'Đã bỏ qua combo.',
          '',
          'Bạn có mã voucher không?',
          '• Gõ mã voucher',
          '• Hoặc gõ "Không"',
        ].join('\n'),
        state,
      );
    }
    const pickNum = q.match(/(?:combo\s*)?(\d+)\b/);
    const pickLet = q.match(/(?:^|\s)([a-f])(?:\s|$)/i);
    let idx = -1;
    if (pickNum) idx = Number(pickNum[1]) - 1;
    else if (pickLet) idx = pickLet[1].toUpperCase().charCodeAt(0) - 65;
    if (idx >= 0 && idx < combos.length) {
        state.comboId = combos[idx].id;
        state.comboName = combos[idx].name;
        state.comboQty = 1;
        state.step = 'voucher';
        return emptyResult(
          [
            `Đã chọn combo: ${combos[idx].name}.`,
            '',
            'Bạn có mã voucher không?',
            '• Gõ mã voucher',
            '• Hoặc gõ "Không"',
          ].join('\n'),
          state,
          { comboOptions: combos },
        );
    }
    const lines = combos.map(
      (c, i) =>
        `${letters(i)}. ${c.name} – ${c.price.toLocaleString('vi-VN')}đ`,
    );
    return {
      reply: [
        'Menu Combo:',
        ...(lines.length ? lines : ['(Không có combo khả dụng)']),
        '',
        'Chọn combo (vd: "A" hoặc "Combo 1"), hoặc gõ "Không".',
      ].join('\n'),
      state: { ...state, step: 'combo' },
      showtimeOptions: [],
      seatSuggestions: state.seatCodes || [],
      comboOptions: combos,
      canCreateBooking: false,
    };
  }

  // ===== SEAT CONFIRM: tiếp tục AI / tự chọn =====
  if (state.step === 'seat_confirm') {
    if (/tự\s*chọn|tự\s*chọn\s*ghế|thủ\s*công|mở\s*sơ\s*đồ/.test(q)) {
      const url = state.showtimeId
        ? `/dat-ve?showtime=${encodeURIComponent(state.showtimeId)}`
        : '/suat-chieu';
      return emptyResult(
        [
          'Bạn có thể tự chọn ghế trên sơ đồ.',
          `Mở: ${url}`,
          'Sau khi đặt xong trên web, không cần xác nhận lại trong chat.',
        ].join('\n'),
        state,
        { manualSeatUrl: url },
      );
    }
    if (/tiếp\s*tục|tiếp|combo|được|ok|yes|tiếp\s*tục\s*ai/.test(q)) {
      state.step = 'combo';
      const combos = await listActiveCombos(8);
      const lines = combos.map(
        (c, i) =>
          `${letters(i)}. ${c.name} – ${c.price.toLocaleString('vi-VN')}đ`,
      );
      return {
        reply: [
          'Tiếp tục với AI.',
          '',
          'Menu Combo:',
          ...(lines.length ? lines : ['(Không có combo)']),
          '',
          'Chọn combo (A/B/…) hoặc gõ "Không".',
        ].join('\n'),
        state,
        showtimeOptions: [],
        seatSuggestions: state.seatCodes || [],
        comboOptions: combos,
        canCreateBooking: false,
      };
    }
    return emptyResult(
      [
        `Ghế ${state.seatCodes?.join(', ')} đã ghi nhận.`,
        '',
        'Bạn muốn:',
        '• "Tiếp tục AI" → chọn combo / voucher trong chat',
        '• "Tự chọn" → mở trang sơ đồ ghế thủ công',
      ].join('\n'),
      state,
      {
        seatSuggestions: state.seatCodes || [],
        manualSeatUrl: state.showtimeId
          ? `/dat-ve?showtime=${encodeURIComponent(state.showtimeId)}`
          : undefined,
      },
    );
  }

  // ===== SEATS =====
  if (state.step === 'seats') {
    if (!state.showtimeId) {
      state.step = 'showtimes';
    } else {
      const explicit = parseSeatCodes(message);
      if (explicit.length > 0) {
        // Validate seats are free
        const { allFree } = await getAvailableSeatCodes(
          state.showtimeId,
          'ANY',
          30,
        );
        const freeSet = new Set(allFree.map((s) => s.code.toUpperCase()));
        const invalid = explicit.filter((c) => !freeSet.has(c));
        if (invalid.length) {
          const suggest = allFree.slice(0, 8).map((s) => s.code);
          return emptyResult(
            [
              `Ghế ${invalid.join(', ')} không khả dụng.`,
              suggest.length
                ? `Gợi ý ghế trống: ${suggest.join(', ')}`
                : 'Suất này gần hết ghế.',
              'Nhập lại mã ghế (vd: B5) hoặc "Tự chọn" để mở sơ đồ.',
            ].join('\n'),
            state,
            {
              seatSuggestions: suggest,
              manualSeatUrl: `/dat-ve?showtime=${encodeURIComponent(state.showtimeId)}`,
            },
          );
        }
        state.seatCodes = explicit;
        state.step = 'seat_confirm';
        return emptyResult(
          [
            `Đã chọn ghế: ${explicit.join(', ')}.`,
            '',
            'Xác nhận ghế này?',
            '• "Tiếp tục AI" → combo / voucher',
            '• "Tự chọn" → tự chọn trên sơ đồ ghế',
          ].join('\n'),
          state,
          {
            seatSuggestions: explicit,
            manualSeatUrl: `/dat-ve?showtime=${encodeURIComponent(state.showtimeId)}`,
          },
        );
      }

      // Đồng ý ghế gợi ý
      if (/đồng\s*ý\s*ghế|ok\s*ghế|lấy\s*ghế\s*này|được\s*ghế/.test(q)) {
        const { codes } = await getAvailableSeatCodes(
          state.showtimeId,
          state.seatType,
          state.quantity || 1,
        );
        const pick = (state.seatCodes && state.seatCodes.length)
          ? state.seatCodes
          : codes;
        if (!pick.length) {
          return emptyResult(
            'Không còn ghế trống để đồng ý. Hãy nhập mã ghế khác hoặc đổi suất.',
            state,
          );
        }
        state.seatCodes = pick;
        state.step = 'seat_confirm';
        return emptyResult(
          [
            `Đã chọn ghế: ${pick.join(', ')}.`,
            '',
            'Xác nhận ghế này?',
            '• "Tiếp tục AI" → combo / voucher',
            '• "Tự chọn" → mở sơ đồ (ghế đã được giữ nếu bạn đã đăng nhập)',
          ].join('\n'),
          state,
          {
            seatSuggestions: pick,
            manualSeatUrl: `/dat-ve?showtime=${encodeURIComponent(state.showtimeId)}&seats=${encodeURIComponent(pick.join(','))}`,
          },
        );
      }

      // Gợi ý nếu user xin gợi ý
      if (/gợi\s*ý|gợi\s*ý\s*ghế|chọn\s*hộ|đề\s*xuất\s*ghế/.test(q)) {
        const { codes } = await getAvailableSeatCodes(
          state.showtimeId,
          state.seatType,
          state.quantity || 1,
        );
        return emptyResult(
          [
            codes.length
              ? `Gợi ý ghế: ${codes.join(', ')}. Gõ mã ghế để chọn (vd: ${codes[0]}).`
              : 'Không còn ghế trống. Hãy đổi suất.',
          ].join('\n'),
          state,
          { seatSuggestions: codes },
        );
      }

      if (/tự\s*chọn/.test(q)) {
        const url = `/dat-ve?showtime=${encodeURIComponent(state.showtimeId)}`;
        return emptyResult(
          `Mở trang chọn ghế: ${url}`,
          state,
          { manualSeatUrl: url },
        );
      }

      const { codes } = await getAvailableSeatCodes(
        state.showtimeId,
        state.seatType,
        state.quantity || 1,
      );
      return emptyResult(
        [
          `Suất ${state.startTimeLabel} – ${state.cinemaName}.`,
          'Mời bạn chọn ghế: gõ mã ghế (vd: B5 hoặc B5,B6).',
          codes.length ? `Gợi ý: ${codes.join(', ')}` : '',
          'Hoặc gõ "Tự chọn" để mở sơ đồ ghế.',
        ]
          .filter(Boolean)
          .join('\n'),
        state,
        {
          seatSuggestions: codes,
          manualSeatUrl: `/dat-ve?showtime=${encodeURIComponent(state.showtimeId)}`,
        },
      );
    }
  }

  // ===== SHOWTIMES: pick A/B/C or 1/2/3 =====
  if (state.step === 'showtimes' || state.step === 'seats') {
    const options =
      state.lastShowtimeOptions?.length
        ? state.lastShowtimeOptions
        : await findMatchingShowtimes(state, 8);

    // Letter A/B/C or "chọn C" or number
    let chosen: ShowtimeOption | undefined;
    const letter = q.match(/(?:^|\s)([abc])(?:\s|$|\.|\,)/i) || q.match(/chọn\s*([abc])/i);
    if (letter) {
      const idx = letter[1].toUpperCase().charCodeAt(0) - 65;
      if (idx >= 0 && idx < options.length) chosen = options[idx];
    }
    const num = q.match(/(?:chọn\s*)?(?:suất\s*)?(\d+)\b/);
    if (!chosen && num) {
      const idx = Number(num[1]) - 1;
      if (idx >= 0 && idx < options.length) chosen = options[idx];
    }
    if (!chosen) {
      chosen = options.find(
        (o) => q.includes(o.time) || q.includes(o.time.replace(':', 'h')),
      );
    }

    if (chosen) {
      state.showtimeId = chosen.id;
      state.cinemaName = chosen.cinema;
      state.startTimeLabel = chosen.time;
      state.movieTitle = chosen.movieTitle;
      state.movieId = chosen.movieId;
      state.lastShowtimeOptions = options;
      state.step = 'seats';
      state.seatCodes = undefined;

      const { codes } = await getAvailableSeatCodes(
        chosen.id,
        state.seatType,
        state.quantity || 1,
      );

      return emptyResult(
        [
          `Đã chọn suất ${letters(options.indexOf(chosen))}. ${chosen.time} – ${chosen.cinema} (${chosen.movieTitle}).`,
          '',
          'Bước chọn ghế: gõ mã ghế (vd: B5).',
          codes.length ? `Gợi ý ghế trống: ${codes.join(', ')}` : 'Suất này đang ít ghế trống.',
          'Hoặc "Tự chọn" để mở sơ đồ.',
        ].join('\n'),
        state,
        {
          showtimeOptions: [chosen],
          seatSuggestions: codes,
          manualSeatUrl: `/dat-ve?showtime=${encodeURIComponent(chosen.id)}`,
        },
      );
    }

    if (state.step === 'showtimes' && options.length) {
      // re-list
      const lines = options.map((o, i) => {
        const price =
          state.seatType === 'COUPLE'
            ? o.couplePrice
            : state.seatType === 'VIP'
              ? o.vipPrice
              : o.standardPrice;
        return `${letters(i)}. ${o.time} – ${o.cinema} (${o.city}) · ${o.movieTitle} · từ ${price.toLocaleString('vi-VN')}đ`;
      });
      return {
        reply: [
          `Suất chiếu phù hợp (${summarizeDraft(state)}):`,
          ...lines,
          '',
          'Chọn suất: gõ A / B / C (hoặc "Chọn suất 1").',
        ].join('\n'),
        state: { ...state, step: 'showtimes', lastShowtimeOptions: options },
        showtimeOptions: options,
        seatSuggestions: [],
        comboOptions: [],
        canCreateBooking: false,
      };
    }
  }

  // ===== COLLECT + SEARCH =====
  if (!state.movieQuery && !state.movieTitle && !state.movieId) {
    return emptyResult(
      [
        'Bạn muốn đặt phim nào, ngày nào?',
        'Ví dụ: "Đặt vé Út Lan ngày mai"',
        'hoặc: "Marvel tối nay ở TP.HCM, 2 người ghế đôi"',
      ].join('\n'),
      { step: 'collect' },
    );
  }

  const options = await findMatchingShowtimes(state, 8);
  if (!options.length) {
    return emptyResult(
      `Chưa có suất cho: ${summarizeDraft(state)}. Thử đổi ngày hoặc tên phim.`,
      { ...state, step: 'collect' },
    );
  }

  state.step = 'showtimes';
  state.lastShowtimeOptions = options;
  if (!state.movieTitle) {
    state.movieTitle = options[0].movieTitle;
    state.movieId = options[0].movieId;
  }

  const lines = options.map((o, i) => {
    const price =
      state.seatType === 'COUPLE'
        ? o.couplePrice
        : state.seatType === 'VIP'
          ? o.vipPrice
          : o.standardPrice;
    return `${letters(i)}. ${o.time} – ${o.cinema} (${o.city}) · ${o.movieTitle} · từ ${price.toLocaleString('vi-VN')}đ`;
  });

  return {
    reply: [
      `Đặt vé: ${state.movieTitle || state.movieQuery} · ${state.dayOffset === 1 ? 'ngày mai' : 'hôm nay'}`,
      'Các suất phù hợp:',
      ...lines,
      '',
      'Chọn suất: A / B / C (hoặc bấm nút bên dưới).',
    ].join('\n'),
    state,
    showtimeOptions: options,
    seatSuggestions: [],
    comboOptions: [],
    canCreateBooking: false,
  };
}
