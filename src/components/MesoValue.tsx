import type { CSSProperties, ReactNode } from 'react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
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
 * Open delay is NOT set here: both host views wrap themselves in a scoped
 * `TooltipProvider delay={1000}`, which shadows the app root's instant
 * provider. It must live on a provider — under a provider, Base UI's delay
 * group substitutes the provider's `open` delay for any per-trigger `delay`,
 * so a trigger-level prop is silently ignored.
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
    <Tooltip>
      <TooltipTrigger render={<span data-testid={testId} className={className} style={style} />}>
        {body}
      </TooltipTrigger>
      <TooltipContent side="top" className="normal-case tracking-normal text-[11px]">
        {formatMeso(value, false)}
      </TooltipContent>
    </Tooltip>
  );
}
