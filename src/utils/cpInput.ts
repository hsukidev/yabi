/**
 * Combat Power **input** helpers — the digits-only / live-comma-grouping /
 * caret-by-digit-index machinery behind the Drawer's `CP` field.
 *
 * This module owns only the *entry* side of Combat Power (see the CP field
 * in `MuleIdentityFields` and its draft wiring in `useMuleIdentityDraft`).
 * The roster-surface abbreviation (`formatCp` → `410M`) is a separate,
 * later slice and lives in its own util so meso formatting and CP
 * abbreviation never share code by accident.
 */

/** The field accepts at most this many digits (≤ 9,999,999,999). */
export const CP_MAX_DIGITS = 10;

/** Strip a raw string to digits only, capped at {@link CP_MAX_DIGITS}. */
export function cpDigits(raw: string): string {
  return raw.replace(/\D/g, '').slice(0, CP_MAX_DIGITS);
}

/**
 * Group a raw string into the live `en-US` comma form (`410,042,525`).
 * Non-digits are stripped and the result is capped at 10 digits first.
 * Empty input → empty string. Digits are grouped as-is (leading zeros are
 * preserved so the caret math stays a pure function of digit count); the
 * commit path is what collapses a value to its numeric form.
 */
export function groupCp(raw: string): string {
  return cpDigits(raw).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

/**
 * Parse a (possibly grouped) CP string to its numeric value. Empty /
 * digit-less input → 0. Never exceeds 9,999,999,999 (well inside
 * `Number.MAX_SAFE_INTEGER`), so plain `Number` is exact.
 */
export function parseCpValue(raw: string): number {
  const digits = cpDigits(raw);
  return digits === '' ? 0 : Number(digits);
}

/** Count digit characters within the first `caret` chars of `value`. */
export function digitsBefore(value: string, caret: number): number {
  let n = 0;
  const end = Math.min(caret, value.length);
  for (let i = 0; i < end; i++) {
    const c = value.charCodeAt(i);
    if (c >= 48 && c <= 57) n++;
  }
  return n;
}

/**
 * The string index in `grouped` sitting just after the `count`-th digit
 * (0 → before all digits; ≥ digit count → end of string). Used to restore
 * the caret by digit index after a regroup.
 */
export function caretForDigitIndex(grouped: string, count: number): number {
  if (count <= 0) return 0;
  let seen = 0;
  for (let i = 0; i < grouped.length; i++) {
    const c = grouped.charCodeAt(i);
    if (c >= 48 && c <= 57) {
      seen++;
      if (seen === count) return i + 1;
    }
  }
  return grouped.length;
}

export interface CpGroupResult {
  /** The regrouped field value. */
  value: string;
  /** Caret index to restore, by digit position, in `value`. */
  caret: number;
}

/**
 * Regroup a raw post-edit field value and compute the caret position to
 * restore. `rawCaret` is the caret index in the browser's post-edit `raw`
 * value; the digits left of it (capped at the 10-digit truncation bound)
 * are counted and mapped onto the regrouped string.
 */
export function groupCpWithCaret(raw: string, rawCaret: number): CpGroupResult {
  const digitsLeft = Math.min(digitsBefore(raw, rawCaret), CP_MAX_DIGITS);
  const value = groupCp(raw);
  return { value, caret: caretForDigitIndex(value, digitsLeft) };
}
