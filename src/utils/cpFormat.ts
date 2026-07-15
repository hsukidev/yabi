/**
 * Combat Power **display** abbreviation — the roster-surface `410M` form.
 *
 * This is the *output* counterpart to `cpInput` (the Drawer's digits-only
 * entry machinery). It lives in its own module, deliberately sharing no code
 * with `formatMeso`: CP rounds **half-up to whole units** with unit promotion,
 * whereas meso keeps up to two fractional digits. Coupling the two would let a
 * CP rule silently shift every meso surface (and its committed visual
 * baselines), so they stay independent by construction.
 */

const UNITS: readonly { divisor: number; suffix: string }[] = [
  { divisor: 1_000, suffix: 'K' },
  { divisor: 1_000_000, suffix: 'M' },
  { divisor: 1_000_000_000, suffix: 'B' },
];

/**
 * Abbreviate a Combat Power value to its roster form: plain integer below
 * 1,000, otherwise a whole-unit `K`/`M`/`B` value **rounded half-up**.
 *
 * Rounding that rolls a unit over its 1,000 boundary **promotes** to the next
 * unit rather than printing `1000M`: `999,999,999 → 1B`, `999,500 → 1M`. A
 * single promotion always suffices — the promoted quotient is `< 1,000` by
 * construction — so there is no promotion cascade.
 *
 * The value is floored to a non-negative integer first, mirroring the
 * persistence layer's read-side floor; `0` and any negative render as `"0"`.
 */
export function formatCp(value: number): string {
  const cp = Math.max(0, Math.floor(value));
  if (cp < 1_000) return String(cp);

  // Largest unit whose divisor still leaves a whole part >= 1.
  let idx = 0;
  for (let i = UNITS.length - 1; i >= 0; i--) {
    if (cp >= UNITS[i].divisor) {
      idx = i;
      break;
    }
  }

  let rounded = Math.round(cp / UNITS[idx].divisor);
  // Promotion: the round rolled over the boundary (e.g. 999.5K → 1000K → 1M).
  if (rounded >= 1_000 && idx < UNITS.length - 1) {
    idx += 1;
    rounded = Math.round(cp / UNITS[idx].divisor);
  }
  return `${rounded}${UNITS[idx].suffix}`;
}
