import { memo } from 'react';
import { formatCp } from '../../utils/cpFormat';
import { MetricTooltip } from '../MetricTooltip';

interface CardCpMetricProps {
  /**
   * Raw Combat Power. The caller guarantees `> 0` — absent/zero CP renders no
   * element at all (0 ≡ unset), so this component never handles the zero case.
   */
  value: number;
}

/**
 * **Character Card** Combat Power readout: a muted `CP` eyebrow beside the
 * abbreviated value (`410M`) in accent, at the character name's size/weight.
 *
 * The full grouped value (`410,042,525`) rides the same **Meso Display**
 * tooltip chrome the income line uses. `MetricTooltip` is also the activation
 * guard for this click-to-activate surface: it `stopPropagation`s
 * click/pointerdown/touchstart, so tapping CP neither opens the Drawer nor
 * starts a dnd-kit drag (see CLAUDE.md — guarding controls inside a roster
 * surface).
 *
 * Accent applies whenever CP > 0, independent of meso income; only card-wide
 * chrome (the inactive dim overlay) dims it, so no active/muted state is
 * threaded in.
 *
 * `memo` + a single primitive `value` prop keeps the card's memo barrier
 * intact — CP arrives via the existing `mule` prop, adding no unstable props.
 */
export const CardCpMetric = memo(function CardCpMetric({ value }: CardCpMetricProps) {
  const grouped = value.toLocaleString('en-US');
  return (
    <MetricTooltip
      ariaLabel={`Combat Power ${grouped}`}
      tooltip={grouped}
      className="inline-flex shrink-0 items-baseline gap-1 bg-transparent p-0 border-0 cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
    >
      <span
        style={{
          color: 'var(--muted-raw, var(--muted-foreground))',
          fontFamily: 'Geist Mono, monospace',
          fontSize: 11,
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
        }}
      >
        CP
      </span>
      <span
        style={{
          color: 'var(--accent-raw, var(--accent))',
          fontWeight: 600,
          fontSize: 'var(--mule-name-size, 14px)',
          whiteSpace: 'nowrap',
        }}
      >
        {formatCp(value)}
      </span>
    </MetricTooltip>
  );
});
