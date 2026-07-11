import { formatMeso } from '../utils/meso';

/**
 * **Progress Readout** presentation — the inline-slash rendering of
 * cleared-versus-expected worn by the KPI card's two income blocks and its
 * DAILY / WEEKLY / MONTHLY crystal tiles. The **Cleared Meso** numerator sits
 * in the accent tone; the expected denominator is a smaller muted mono on the
 * same baseline. A numerator of 0 softens to `ZERO_NUMERATOR_TONE`.
 *
 * Purely presentational: numerators are computed upstream by
 * `markedProgress` (post-**World Cap Cut**), so no clamping happens here.
 */

const ACCENT = 'var(--accent-raw, var(--accent))';
const MUTED = 'var(--muted-raw, var(--muted-foreground))';

/**
 * Zero-state numerator tone — softened foreground, between the full text tone
 * and the muted denominator. Shared with the Drawer header income pills' plain
 * `0` (the fully-dropped muted-dim `0` keeps its own dim tone). Formula from
 * the settled prototype (wayfinder #297).
 */
export const ZERO_NUMERATOR_TONE =
  'color-mix(in srgb, var(--text, var(--foreground)) 65%, var(--muted-raw, var(--muted-foreground)))';

interface IncomeReadoutProps {
  /** **Cleared Meso** numerator (already post-Cap-Cut). */
  x: number;
  /** Expected income denominator. */
  expected: number;
  /** Drop decimals in the abbreviated form (KPI Card below 375px). */
  narrow: boolean;
  /** Aria prefix — the combined label reads `${label}: X of expected`. */
  label: string;
}

/**
 * Income block readout: `X / {expected}`. `X` in the accent `bignum`,
 * ` / {expected}` in smaller muted mono on the same baseline. Exposes one
 * combined aria-label ("Expected weekly income: 312.5M of 504.3M").
 */
export function IncomeReadout({ x, expected, narrow, label }: IncomeReadoutProps) {
  const xStr = formatMeso(x, true, narrow);
  const expStr = formatMeso(expected, true, narrow);
  return (
    <span
      aria-label={`${label}: ${xStr} of ${expStr}`}
      style={{
        display: 'inline-flex',
        alignItems: 'baseline',
        gap: 6,
        minWidth: 0,
        whiteSpace: 'nowrap',
      }}
    >
      <span className="bignum" style={{ color: x > 0 ? ACCENT : ZERO_NUMERATOR_TONE }}>
        {xStr}
      </span>
      <span style={{ fontFamily: 'Geist Mono, monospace', fontSize: 18, color: MUTED }}>
        / {expStr}
      </span>
    </span>
  );
}

interface TileReadoutProps {
  /** Cleared-slot numerator (already post-Cap-Cut for daily/weekly). */
  x: number;
  /** Total slot count for the tile — today's displayed count. */
  total: number;
}

/**
 * Crystal-tile readout: `x / total`. Accent numerator at the tile's 28px mono
 * (inherited from the surrounding stat cell), `/ total` stepped down to 16px
 * muted mono on the same baseline, echoing the income block treatment.
 */
export function TileReadout({ x, total }: TileReadoutProps) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'baseline', gap: 3 }}>
      <span style={{ color: x > 0 ? ACCENT : ZERO_NUMERATOR_TONE }}>{x}</span>
      <span style={{ color: MUTED, fontSize: 16 }}>/ {total}</span>
    </span>
  );
}
