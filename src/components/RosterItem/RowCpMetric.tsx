import { memo } from 'react';
import { formatCp } from '../../utils/cpFormat';
import { MetricTooltip } from '../MetricTooltip';

const MONO = 'Geist Mono, monospace';

interface RowCpMetricProps {
  /**
   * Raw Combat Power. The caller guarantees `> 0` — absent/zero CP renders no
   * element at all (0 ≡ unset), so this component never handles the zero case.
   */
  value: number;
  /**
   * Comfy-pairing flag. When `true` the pill takes the enlarged metrics
   * (`3px 8px` padding, fixed 11px font) so it reads as a matched pair with the
   * enlarged Lv pill; when `false` (Compact) both pills revert to the original
   * smaller metrics (`2px 6px` padding, `var(--row-level-size, 11px)`).
   */
  enlarged: boolean;
}

/**
 * **List View row** Combat Power pill: `CP` eyebrow (muted) beside the
 * abbreviated value (`410M`) in accent, rendered in the same Lv-pill chrome
 * (border + raised surface) and placed after the Lv pill, before the Notes
 * icon.
 *
 * The full grouped value (`410,042,525`) rides the same **Meso Display**
 * tooltip chrome the income line uses. `MetricTooltip` is also the activation
 * guard for this click-to-activate surface: it `stopPropagation`s
 * click/pointerdown/touchstart, so tapping CP neither opens the Drawer nor
 * starts a dnd-kit drag (see CLAUDE.md — guarding controls inside a roster
 * surface).
 *
 * Accent applies whenever CP > 0, independent of meso income; only row-wide
 * chrome (the inactive dim overlay) dims it, so no active/muted state is
 * threaded in.
 *
 * `memo` + two primitive props (`value`, `enlarged`) keeps the row's memo
 * barrier intact — CP arrives via the existing `mule` prop, adding no unstable
 * props.
 */
export const RowCpMetric = memo(function RowCpMetric({ value, enlarged }: RowCpMetricProps) {
  const grouped = value.toLocaleString('en-US');
  return (
    <MetricTooltip
      ariaLabel={`Combat Power ${grouped}`}
      tooltip={grouped}
      data-row-cp
      className="inline-flex shrink-0 items-center cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
      style={{
        gap: 5,
        fontFamily: MONO,
        fontSize: enlarged ? 11 : 'var(--row-level-size, 11px)',
        letterSpacing: '0.1em',
        padding: enlarged ? '3px 8px' : '2px 6px',
        borderRadius: 4,
        border: '1px solid var(--border)',
        background: 'var(--surface-2, var(--surface-raised))',
        whiteSpace: 'nowrap',
      }}
    >
      <span
        style={{
          color: 'var(--muted-raw, var(--muted-foreground))',
          textTransform: 'uppercase',
        }}
      >
        CP
      </span>
      <span style={{ color: 'var(--accent-raw, var(--accent))' }}>{formatCp(value)}</span>
    </MetricTooltip>
  );
});
