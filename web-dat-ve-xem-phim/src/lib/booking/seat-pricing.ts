export const SEAT_PRICES = {
  STANDARD: 70000,
  VIP: 90000,
  COUPLE: 140000,
} as const;

export type SeatType = keyof typeof SEAT_PRICES;

export function getSeatPrice(
  type?: string | null
): number {
  const normalizedType = type?.toUpperCase();

  switch (normalizedType) {
    case 'VIP':
      return SEAT_PRICES.VIP;

    case 'COUPLE':
      return SEAT_PRICES.COUPLE;

    case 'STANDARD':
    default:
      return SEAT_PRICES.STANDARD;
  }
}

export function formatSeatType(
  type?: string | null
): SeatType {
  const normalizedType = type?.toUpperCase();

  switch (normalizedType) {
    case 'VIP':
      return 'VIP';

    case 'COUPLE':
      return 'COUPLE';

    case 'STANDARD':
    default:
      return 'STANDARD';
  }
}