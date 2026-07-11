// Cycle Clock: pure math for the three Clear Mark cycles (daily / weekly / BM)
// and the derivational validity of a mark against the current cycle. All UTC,
// no dependencies beyond `nextWeeklyResetUtc` (the shared Reset Anchor math).
//
// Vocabulary (docs/CONTEXT.md): a Clear Mark carries only its Cycle Stamp — the
// identity of the cycle it was set in. A mark is *valid* iff its stamp equals
// the current cycle's stamp; a stale stamp is inert (no sweep, no rollover
// write). The stamp shapes mirror the persisted `Mule` fields:
//   daily  → UTC day string  "YYYY-MM-DD"
//   weekly → most recent past Reset Anchor timestamp (ms)
//   BM     → UTC month string "YYYY-MM"

import { nextWeeklyResetUtc } from './resetCountdown';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

// --- Next-boundary helpers (kin of `nextWeeklyResetUtc`) --------------------
// Each returns the absolute ms timestamp of the next boundary strictly after
// `nowMs`. "Strictly after" matches `nextWeeklyResetUtc`: called exactly at a
// boundary, it returns the following one, so a timeout-to-next-boundary loop
// can never fire twice for the same instant.

/**
 * Next UTC midnight (00:00:00.000) strictly after `nowMs` — the daily cycle
 * boundary.
 */
export function nextUtcMidnight(nowMs: number): number {
  const now = new Date(nowMs);
  return Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1);
}

/**
 * Next month boundary — the 1st of the following month at 00:00 UTC — strictly
 * after `nowMs`. `Date.UTC` normalizes a December `month + 1` into next
 * January, so year rollover is handled for free.
 */
export function nextMonthlyResetUtc(nowMs: number): number {
  const now = new Date(nowMs);
  return Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1);
}

// --- Current-cycle stamp helpers -------------------------------------------
// The stamp a freshly-set mark of each kind would carry at `nowMs`. These are
// also the values the validity predicates compare against.

/** Current daily Cycle Stamp — the UTC day as `"YYYY-MM-DD"`. */
export function currentDailyStamp(nowMs: number): string {
  const now = new Date(nowMs);
  return `${now.getUTCFullYear()}-${pad2(now.getUTCMonth() + 1)}-${pad2(now.getUTCDate())}`;
}

/**
 * Current weekly Cycle Stamp — the most recent past **Reset Anchor** (Thursday
 * 00:00 UTC) at or before `nowMs`, as an absolute ms timestamp. Derived from
 * `nextWeeklyResetUtc` (strictly-future) minus one week, so exactly at a Reset
 * Anchor the anchor that just occurred is the current stamp.
 */
export function currentWeeklyStamp(nowMs: number): number {
  return nextWeeklyResetUtc(nowMs) - 7 * MS_PER_DAY;
}

/** Current BM Cycle Stamp — the UTC month as `"YYYY-MM"`. */
export function currentBmStamp(nowMs: number): string {
  const now = new Date(nowMs);
  return `${now.getUTCFullYear()}-${pad2(now.getUTCMonth() + 1)}`;
}

// --- Validity predicates ----------------------------------------------------
// A mark is valid iff its stamp equals the current cycle's stamp. `undefined`
// (unmarked) and any stale stamp are both invalid.

/** Whether a daily Clear Mark stamp is valid for the cycle containing `nowMs`. */
export function isDailyMarkValid(mark: string | undefined, nowMs: number): boolean {
  return mark !== undefined && mark === currentDailyStamp(nowMs);
}

/** Whether a weekly Clear Mark stamp is valid for the cycle containing `nowMs`. */
export function isWeeklyMarkValid(mark: number | undefined, nowMs: number): boolean {
  return mark !== undefined && mark === currentWeeklyStamp(nowMs);
}

/** Whether a BM Clear Mark stamp is valid for the cycle containing `nowMs`. */
export function isBmMarkValid(mark: string | undefined, nowMs: number): boolean {
  return mark !== undefined && mark === currentBmStamp(nowMs);
}
