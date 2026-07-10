import { Grid3x3, LayoutGrid } from 'lucide-react';
import type { SlateDisplayMode } from '../hooks/useSlateDisplayMode';

/**
 * Segmented control that flips the **Slate Display Mode** — matrix-grid glyph
 * for the Boss Matrix, four-square glyph for the Boss Card View. Styled with
 * the shared `d-c-toggle` treatment (matching the cadence filter) and exposes
 * `role="group"` with a per-button pressed state.
 *
 * Both segments call the single `onToggle` flip: with only two modes, clicking
 * the inactive segment and clicking the active segment are both flips.
 */
const OPTIONS: ReadonlyArray<{
  value: SlateDisplayMode;
  Icon: typeof LayoutGrid;
  label: string;
}> = [
  { value: 'matrix', Icon: Grid3x3, label: 'Boss Matrix' },
  { value: 'cards', Icon: LayoutGrid, label: 'Boss Card View' },
];

export function SlateViewToggle({
  mode,
  onToggle,
}: {
  mode: SlateDisplayMode;
  onToggle: () => void;
}) {
  return (
    <div
      data-testid="slate-view-toggle"
      data-mode={mode}
      className="d-c-toggle"
      role="group"
      aria-label="Slate display mode"
    >
      {OPTIONS.map(({ value, Icon, label }) => {
        const isActive = mode === value;
        return (
          <button
            key={value}
            type="button"
            data-value={value}
            aria-label={label}
            aria-pressed={isActive}
            className={isActive ? 'on' : ''}
            onClick={onToggle}
          >
            <Icon size={12} strokeWidth={1.75} aria-hidden />
          </button>
        );
      })}
    </div>
  );
}
