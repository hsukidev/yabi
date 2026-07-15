/**
 * Combat Power **display** abbreviation — the roster-surface `410M` / `4.5B`
 * form.
 *
 * This is the *output* counterpart to `cpInput` (the Drawer's digits-only
 * entry machinery). It lives in its own module, deliberately sharing no code
 * with `formatMeso`: CP rounds **half-up to one decimal** (trailing `.0`
 * trimmed) with unit promotion, whereas meso keeps up to two fractional
 * digits. Coupling the two would let a CP rule silently shift every meso
 * surface (and its committed visual baselines), so they stay independent by
 * construction.
 */

const UNITS: readonly { divisor: number; suffix: string }[] = [
  { divisor: 1_000, suffix: 'K' },
  { divisor: 1_000_000, suffix: 'M' },
  { divisor: 1_000_000_000, suffix: 'B' },
];

/**
 * Abbreviate a Combat Power value to its roster form: plain integer below
 * 1,000, otherwise a `K`/`M`/`B` value **rounded half-up to one decimal**
 * with a trailing `.0` trimmed: `4,523,213,145 → 4.5B`, `410,042,525 → 410M`,
 * `1,234 → 1.2K`.
 *
 * Rounding that rolls a unit over its 1,000.0 boundary **promotes** to the
 * next unit rather than printing `1000M`: `999,950,000 → 1B`, `999,950 → 1M`
 * (while `999,500 → 999.5K` — the tenths keep it under the boundary). A
 * single promotion always suffices — the promoted quotient is `< 1,000` by
 * construction — so there is no promotion cascade.
 *
 * The tenths digit is computed in integer space (`Math.round` of value ×
 * 10 / divisor), so no `toFixed` float artifacts.
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

  // Whole-and-tenths as a single integer count of tenths, rounded half-up.
  let tenths = Math.round((cp / UNITS[idx].divisor) * 10);
  // Promotion: the round rolled over the boundary (999.95K → 1000.0K → 1M).
  if (tenths >= 10_000 && idx < UNITS.length - 1) {
    idx += 1;
    tenths = Math.round((cp / UNITS[idx].divisor) * 10);
  }
  const whole = Math.floor(tenths / 10);
  const frac = tenths % 10;
  return `${whole}${frac === 0 ? '' : `.${frac}`}${UNITS[idx].suffix}`;
}
