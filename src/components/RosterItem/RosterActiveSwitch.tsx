import { useState } from 'react';
import { Switch } from '@/components/ui/switch';

interface RosterActiveSwitchProps {
  muleId: string;
  active: boolean;
  // Parent hover state (card panel / list row). The switch also reveals
  // itself on its own keyboard focus, so hover isn't the only way in.
  revealed: boolean;
  onToggleActive: (id: string, active: boolean) => void;
}

// The **Roster Active Switch** — flips the **Active Flag** in place from a
// roster item, without opening the Drawer. Instant, no confirmation: the
// flip is reversible, unlike the per-card delete this control replaced.
// Callers must not render it in bulk mode or on coarse pointers (touch has
// no hover; the Drawer's **Active Toggle** is the touch path).
export function RosterActiveSwitch({
  muleId,
  active,
  revealed,
  onToggleActive,
}: RosterActiveSwitchProps) {
  const [focused, setFocused] = useState(false);
  const visible = revealed || focused;

  function stopPropagation(e: React.SyntheticEvent) {
    e.stopPropagation();
  }

  return (
    // The row/card body is itself click-to-open and (in Card View) the drag
    // surface — swallow every activation path on a wrapper so a flip never
    // opens the drawer or engages drag. The guard must sit ABOVE the switch:
    // Base UI toggles through a hidden <input>, whose re-dispatched click
    // bubbles separately from the visible button's.
    <span
      style={{ display: 'inline-flex' }}
      onClick={stopPropagation}
      onPointerDown={stopPropagation}
      onKeyDown={stopPropagation}
    >
      <Switch
        aria-label="Active"
        checked={active}
        onCheckedChange={(checked) => onToggleActive(muleId, checked)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        className="data-checked:bg-(--chart-4)"
        style={{
          opacity: visible ? 1 : 0,
          transition: 'opacity 140ms',
        }}
      />
    </span>
  );
}
