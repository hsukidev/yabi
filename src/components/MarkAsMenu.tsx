import { ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
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
  /** Count of eligible Bulk-Selected Mules per cadence. Zero disables both of that cadence's rows. */
  eligibleCounts: MarkEligibleCounts;
  /**
   * Converge the mark of `kind` to `complete` across the eligible
   * Bulk-Selected Mules (ineligible and already-matching mules skip).
   * Directional, not a toggle — mirrors `onSetActive`.
   */
  onMarkAs: (kind: ClearMarkKind, complete: boolean) => void;
  /**
   * Converge every Bulk-Selected Mule to the chosen Active Flag state
   * (`true` = Set Active, `false` = Set Inactive). Applied by the caller to
   * the whole selection; matching mules no-op.
   */
  onSetActive: (active: boolean) => void;
}

// The Active Flag color key — matches the green dot the Mule Actions Menu
// leads its Active row with, keeping the flag's visual language consistent.
const ACTIVE_GREEN = 'var(--success, #4ade80)';

// Always-lit color-key dot leading each row — a color key (which cadence /
// the Active Flag), not a state indicator. Mirrors the Mule Actions Menu dots.
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

const CADENCES: ReadonlyArray<{
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
 * The **Mark As Menu** in the Bulk Action Bar's right cluster — the bulk
 * counterpart of the Mule Actions Menu kebab, carrying the same options minus
 * Delete. Rows are directional (a bulk selection has mixed states, so each
 * row converges rather than toggles):
 *
 * - **Set Active / Set Inactive** — converge the whole selection's Active
 *   Flag; already-matching mules no-op.
 * - **Daily / Weekly / BM Complete + Incomplete** — converge that Clear Mark
 *   across the eligible Bulk-Selected Mules; ineligible mules silently skip.
 *   Each cadence row is trailed by a mono count of eligible mules and both of
 *   a cadence's rows disable at zero eligible.
 *
 * The trigger is disabled at zero selected. Rows stay open on selection so
 * several actions can be applied in one visit; the menu closes on click-away /
 * Esc only. Built on the shared Base UI `DropdownMenu` primitives, so it is
 * keyboard-reachable for free.
 */
export function MarkAsMenu({
  selectedCount,
  eligibleCounts,
  onMarkAs,
  onSetActive,
}: MarkAsMenuProps) {
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
      <DropdownMenuContent align="end" sideOffset={6} className="min-w-48">
        <DropdownMenuItem
          data-mark-as-row="set-active"
          closeOnClick={false}
          onClick={() => onSetActive(true)}
        >
          <ColorDot color={ACTIVE_GREEN} />
          <span style={{ flex: 1 }}>Set Active</span>
        </DropdownMenuItem>
        <DropdownMenuItem
          data-mark-as-row="set-inactive"
          closeOnClick={false}
          onClick={() => onSetActive(false)}
        >
          <ColorDot color={ACTIVE_GREEN} />
          <span style={{ flex: 1 }}>Set Inactive</span>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        {CADENCES.flatMap(({ kind, label, color, key }) => {
          const count = eligibleCounts[key];
          return [true, false].map((complete) => (
            <DropdownMenuItem
              key={`${kind}-${complete}`}
              data-mark-as-row={`${kind}-${complete ? 'complete' : 'incomplete'}`}
              disabled={count === 0}
              closeOnClick={false}
              onClick={() => onMarkAs(kind, complete)}
            >
              <ColorDot color={color} />
              <span style={{ flex: 1 }}>
                {label} {complete ? 'Complete' : 'Incomplete'}
              </span>
              <span
                className="font-mono-nums"
                style={{ color: 'var(--muted-raw, var(--muted-foreground))', fontSize: 12 }}
              >
                {count}
              </span>
            </DropdownMenuItem>
          ));
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
