import { Grid3x3, LayoutGrid } from 'lucide-react';
import type { SlateDisplayMode } from '../hooks/useSlateDisplayMode';

/**
 * Segmented control that selects the **Slate Display Mode** — four-square
 * glyph for the Boss Card View (the default, listed first), matrix-grid glyph
 * for the Boss Matrix. Styled with the shared `d-c-toggle` treatment (matching
 * the cadence filter and preset pills) and exposes `role="group"` with a
 * per-button pressed state.
 *
 * Each segment selects its own mode (standard segmented-control semantics);
 * clicking the already-active segment is a no-op upstream.
 */
const OPTIONS: ReadonlyArray<{
  value: SlateDisplayMode;
  Icon: typeof LayoutGrid;
  label: string;
}> = [
  { value: 'cards', Icon: LayoutGrid, label: 'Boss Card View' },
  { value: 'matrix', Icon: Grid3x3, label: 'Boss Matrix' },
];

export function SlateViewToggle({
  mode,
  onSelect,
}: {
  mode: SlateDisplayMode;
  onSelect: (mode: SlateDisplayMode) => void;
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
            onClick={() => onSelect(value)}
          >
            <Icon size={14} strokeWidth={1.75} aria-hidden />
          </button>
        );
      })}
    </div>
  );
}
