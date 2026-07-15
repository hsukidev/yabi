import { memo } from 'react';
import { Check } from 'lucide-react';

interface SelectionIndicatorProps {
  selected: boolean;
}

// Matches the Bulk Action Bar's accent chrome (see RosterHeader).
const ACCENT = 'var(--accent-raw, var(--accent))';
const accentAlpha = (pct: number) =>
  `color-mix(in oklab, var(--accent-raw, var(--accent)) ${pct}%, transparent)`;

export const SelectionIndicator = memo(function SelectionIndicator({
  selected,
}: SelectionIndicatorProps) {
  return (
    <span
      aria-hidden
      data-selection-indicator
      style={{
        width: 22,
        height: 22,
        borderRadius: 6,
        border: `1.5px solid ${selected ? ACCENT : accentAlpha(50)}`,
        background: selected ? ACCENT : 'transparent',
        color: selected ? 'var(--accent-foreground)' : 'transparent',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'background 140ms, border-color 140ms',
      }}
    >
      {selected && <Check style={{ width: 14, height: 14, strokeWidth: 3 }} />}
    </span>
  );
});
