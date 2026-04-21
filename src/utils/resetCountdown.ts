// Reset Countdown helpers: pure math for the next Reset Anchor (Thursday 00:00 UTC)
// and for rendering a remaining duration in either the Live Countdown Format or the
// Smart Countdown Format. No dependencies — all UTC math via built-in Date / Date.UTC.

const MS_PER_SECOND = 1000;
const MS_PER_MINUTE = 60 * MS_PER_SECOND;
const MS_PER_HOUR = 60 * MS_PER_MINUTE;
const MS_PER_DAY = 24 * MS_PER_HOUR;

// JS getUTCDay() returns 0..6 with 4 = Thursday (ISO weekday 4).
const THURSDAY = 4;

/**
 * Returns the absolute ms timestamp of the next Thursday 00:00:00.000 UTC
 * strictly after `nowMs`. At (or just after) a Thursday 00:00 UTC, returns the
 * following Thursday — the reset that just happened is not the "next" one.
 */
export function nextWeeklyResetUtc(nowMs: number): number {
  const now = new Date(nowMs);
  const todayUtcMidnight = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  // Days until the next Thursday, strictly in the future. If today is Thursday
  // and we're past 00:00 UTC, or exactly at 00:00 UTC, we want +7 days.
  const daysUntil = (THURSDAY - now.getUTCDay() + 7) % 7 || 7;
  return todayUtcMidnight + daysUntil * MS_PER_DAY;
}

export type CountdownVariant = 'live' | 'smart';

/**
 * Formats a remaining duration for the Reset Countdown widget.
 *
 * - 'live':  "{D}D HH:MM:SS" — days unbounded, hours zero-padded to 2.
 * - 'smart': ≥24h → "{d}D {h}H", ≥1h → "{h}H {m}M", ≥1m → "{m}M", <1m → "<1M".
 *
 * Negative or zero remainingMs clamps to 0 — in practice that branch only runs
 * for a single frame between Date.now() crossing the old target and the
 * component recomputing the new target.
 */
export function formatCountdown(remainingMs: number, variant: CountdownVariant): string {
  const ms = Math.max(0, remainingMs);
  const days = Math.floor(ms / MS_PER_DAY);
  const hours = Math.floor((ms % MS_PER_DAY) / MS_PER_HOUR);
  const minutes = Math.floor((ms % MS_PER_HOUR) / MS_PER_MINUTE);

  if (variant === 'live') {
    const seconds = Math.floor((ms % MS_PER_MINUTE) / MS_PER_SECOND);
    return `${days}D ${pad2(hours)}:${pad2(minutes)}:${pad2(seconds)}`;
  }

  if (days > 0) return `${days}D ${hours}H`;
  if (hours > 0) return `${hours}H ${minutes}M`;
  if (minutes > 0) return `${minutes}M`;
  return '<1M';
}

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}
