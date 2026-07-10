import type { CSSProperties, HTMLAttributes, ReactNode } from 'react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { formatMeso } from '../utils/meso';
import { MetricTooltip } from './MetricTooltip';

/**
 * **Meso Display** — the single owner of the app-wide meso rendering
 * convention (CONTEXT.md): amounts render abbreviated inline, with the
 * full-precision value exposed by a hover/focus tooltip only when the
 * value is non-zero; a zero renders as plain text with no tooltip.
 *
 * Two adapters, one convention:
 *
 * - `MesoMetric` — standalone interactive readout (roster rows, Character
 *   Card income lines, KPI bignums, Drawer header chips). Tooltip trigger
 *   is a real button via `MetricTooltip`.
 * - `MesoValue` — passive readout for amounts *inside* an interactive
 *   surface (Boss Matrix cell, Boss Card Difficulty Row). Trigger is a
 *   plain hover-only `<span>` because a nested `<button>` would be
 *   invalid HTML.
 */

/** Abbreviated + full-precision strings for one meso amount. */
function mesoStrings(
  value: number,
  narrow: boolean = false,
): {
  abbreviated: string;
  full: string;
} {
  return { abbreviated: formatMeso(value, true, narrow), full: formatMeso(value, false) };
}

interface MesoMetricProps extends HTMLAttributes<HTMLSpanElement> {
  /** Raw meso amount; drives the zero-branch, formatting, and tooltip. */
  value: number;
  /** Aria prefix — the full-precision value is appended: `${label} ${full}`. */
  label: string;
  /** Drop decimals in the abbreviated form (KPI Card below 375px). */
  narrow?: boolean;
  /**
   * Without `children`: `className`/`style` and the remaining span
   * attributes (data hooks, testids) land on the abbreviated-value
   * `<span>`; the tooltip trigger keeps `MetricTooltip`'s default chrome.
   * With `children` (chip mode — e.g. the Drawer's eyebrow+value chip):
   * `className`/`style` shape the whole trigger surface, and the zero
   * branch renders the same content in a plain wrapper that keeps the
   * aria-label. `children` defaults to the abbreviated value.
   */
  children?: ReactNode;
}

export function MesoMetric({
  value,
  label,
  narrow = false,
  className,
  style,
  children,
  ...rest
}: MesoMetricProps) {
  const { abbreviated, full } = mesoStrings(value, narrow);
  const ariaLabel = `${label} ${full}`;

  if (children !== undefined) {
    // Chip mode — className/style shape the whole trigger surface.
    if (value === 0) {
      return (
        <span aria-label={ariaLabel} className={className} style={style} {...rest}>
          {children}
        </span>
      );
    }
    return (
      <MetricTooltip ariaLabel={ariaLabel} tooltip={full} className={className} style={style}>
        {children}
      </MetricTooltip>
    );
  }

  const body = (
    <span className={className} style={style} {...rest}>
      {abbreviated}
    </span>
  );
  if (value === 0) {
    return body;
  }
  return (
    <MetricTooltip ariaLabel={ariaLabel} tooltip={full}>
      {body}
    </MetricTooltip>
  );
}

interface MesoValueProps {
  /** Raw meso amount; rendered abbreviated inline per the Meso Display convention. */
  value: number;
  className?: string;
  style?: CSSProperties;
  'data-testid'?: string;
  /** Extra inline content after the amount, inside the trigger (e.g. the matrix's "x 7" chip). */
  children?: ReactNode;
}

/**
 * **Meso Display** value for amounts that sit *inside* an interactive surface
 * (Boss Matrix cell, Boss Card Difficulty Row — both `<button>`s). Renders the
 * abbreviated amount inline and, when non-zero, exposes the full-precision
 * value in the same hover tooltip the roster meso values use.
 *
 * Unlike `MesoMetric`, the trigger renders as a plain `<span>` (a nested
 * `<button>` would be invalid HTML inside the toggle button) and never stops
 * propagation — clicking the value still toggles the surrounding row/cell.
 *
 * Deliberately hover-only: making the span focusable (`tabIndex`) would be the
 * same nested-interactive violation, and intercepting tap/click for the
 * tooltip would break the toggle. Keyboard/touch users see the abbreviated
 * value only — exactly what the native `title` this replaces offered.
 *
 * Every hover waits the full 0.5s: each value carries its own one-tooltip
 * `TooltipProvider` (`delay={500}`, `timeout={0}`), shadowing the app root's
 * instant provider. The delay must live on a provider — under a provider,
 * Base UI's delay group substitutes the provider's `open` delay for any
 * per-trigger `delay` prop, silently ignoring it. Per-value providers (rather
 * than one around the view) also kill the delay group's "open instantly while
 * moving between triggers" behavior, and `timeout={0}` kills the post-close
 * grace window — so no hover is ever instant.
 */
export function MesoValue({
  value,
  className,
  style,
  'data-testid': testId,
  children,
}: MesoValueProps) {
  const body = (
    <>
      {formatMeso(value, true)}
      {children}
    </>
  );
  if (value === 0) {
    return (
      <span data-testid={testId} className={className} style={style}>
        {body}
      </span>
    );
  }
  return (
    <TooltipProvider delay={500} timeout={0}>
      {/* disableHoverablePopup renders the popup inert (pointer-events: none),
          so it never steals the pointer from the toggle button beneath — the
          cursor stays `pointer` the whole time the tooltip is up. A value
          readout has no reason to be hoverable. */}
      <Tooltip disableHoverablePopup>
        <TooltipTrigger render={<span data-testid={testId} className={className} style={style} />}>
          {body}
        </TooltipTrigger>
        <TooltipContent side="top" className="normal-case tracking-normal text-[11px]">
          {formatMeso(value, false)}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
