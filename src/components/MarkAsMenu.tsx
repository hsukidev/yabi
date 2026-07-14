import { ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu';
import type { ClearMarkKind } from '../utils/clearMark';
import { BM_GOLD, DAILY_CYAN, WEEKLY_PURPLE } from './RosterItem/CompletionChecks';

/** Eligible **Bulk-Selected Mule** counts per cadence — the row trailers. */
export interface MarkEligibleCounts {
  daily: number;
  weekly: number;
  bm: number;
}

interface MarkAsMenuProps {
  /** Bulk-Selected count. Zero disables the trigger. */
  selectedCount: number;
  /** Count of eligible Bulk-Selected Mules per cadence. Zero disables that row. */
  eligibleCounts: MarkEligibleCounts;
  /** Toggle the mark of `kind` per eligible selected mule (ineligible skip). */
  onMarkAs: (kind: ClearMarkKind) => void;
}

// Always-lit color-key dot leading each row — a cadence key, not a state
// indicator. Mirrors the retired Mule Actions Menu's dots.
function ColorDot({ color }: { color: string }) {
  return (
    <span
      aria-hidden
      style={{
        width: 8,
        height: 8,
        borderRadius: '50%',
        background: color,
        border: `1.5px solid ${color}`,
        flexShrink: 0,
      }}
    />
  );
}

const ROWS: ReadonlyArray<{
  kind: ClearMarkKind;
  label: string;
  color: string;
  key: keyof MarkEligibleCounts;
}> = [
  { kind: 'daily', label: 'Daily', color: DAILY_CYAN, key: 'daily' },
  { kind: 'weekly', label: 'Weekly', color: WEEKLY_PURPLE, key: 'weekly' },
  { kind: 'bm', label: 'BM', color: BM_GOLD, key: 'bm' },
];

/**
 * The **Mark As Menu** in the Bulk Action Bar's right cluster — Daily / Weekly
 * / BM rows, each led by its cadence color dot and trailed by a mono count of
 * eligible **Bulk-Selected Mules**. Choosing a row toggles that mark per mule
 * (each eligible selected mule flips its own current state); ineligible mules
 * silently skip. A row is disabled at zero eligible; the trigger is disabled at
 * zero selected. Built on the shared Base UI `DropdownMenu` primitives, so it
 * is keyboard-reachable for free.
 */
export function MarkAsMenu({ selectedCount, eligibleCounts, onMarkAs }: MarkAsMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={<Button size="sm" variant="outline" />}
        disabled={selectedCount === 0}
        data-mark-as-trigger
      >
        Mark as
        <ChevronDown data-icon="inline-end" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={6} className="min-w-44">
        {ROWS.map(({ kind, label, color, key }) => {
          const count = eligibleCounts[key];
          return (
            <DropdownMenuItem
              key={kind}
              data-mark-as-row={kind}
              disabled={count === 0}
              // Stay open on selection so several cadences can be toggled in
              // one visit; the menu closes on click-away / Esc only.
              closeOnClick={false}
              onClick={() => onMarkAs(kind)}
            >
              <ColorDot color={color} />
              <span style={{ flex: 1 }}>{label}</span>
              <span
                className="font-mono-nums"
                style={{ color: 'var(--muted-raw, var(--muted-foreground))', fontSize: 12 }}
              >
                {count}
              </span>
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
