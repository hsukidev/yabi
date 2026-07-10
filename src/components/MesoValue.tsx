import type { CSSProperties, ReactNode } from 'react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { formatMeso } from '../utils/meso';

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
 * Unlike `MetricTooltip`, the trigger renders as a plain `<span>` (a nested
 * `<button>` would be invalid HTML inside the toggle button) and never stops
 * propagation — clicking the value still toggles the surrounding row/cell.
 *
 * Deliberately hover-only: making the span focusable (`tabIndex`) would be the
 * same nested-interactive violation, and intercepting tap/click for the
 * tooltip would break the toggle. Keyboard/touch users see the abbreviated
 * value only — exactly what the native `title` this replaces offered.
 *
 * Every hover waits the full 0.7s: each value carries its own one-tooltip
 * `TooltipProvider` (`delay={700}`, `timeout={0}`), shadowing the app root's
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
    <TooltipProvider delay={700} timeout={0}>
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
