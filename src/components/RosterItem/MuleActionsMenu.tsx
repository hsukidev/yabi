import { useRef, useState } from 'react';
import { EllipsisVertical, Trash2 } from 'lucide-react';
import type { Mule } from '../../types';
import type { ClearMarkKind } from '../../utils/clearMark';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { BM_GOLD, DAILY_CYAN, WEEKLY_PURPLE } from './CompletionChecks';

interface MuleActionsMenuProps {
  mule: Mule;
  /** Parent hover state (card panel). The kebab also reveals on its own
   *  keyboard focus and stays pinned while the menu is open. */
  revealed: boolean;
  /** Current validity of each Clear Mark — drives the action wording (inverse
   *  of current state) and the set/clear direction. */
  dailyValid: boolean;
  weeklyValid: boolean;
  bmValid: boolean;
  /** Weekly-basis daily crystal count; zero hides the Daily row. */
  dailyCount: number;
  /** Monthly Cadence key count; zero hides the BM row. */
  monthlyCount: number;
  onToggleActive: (id: string, active: boolean) => void;
  onSetMark: (id: string, kind: ClearMarkKind, marked: boolean) => void;
  /** Drawer only (the touch marking path): appends a destructive `Delete`
   *  row that hands off to the existing Delete?/Yes/Cancel confirmation — it
   *  never deletes directly. Omitted on roster surfaces, which carry no
   *  per-item delete. */
  onDelete?: () => void;
  kebabSize?: number;
}

// Always-lit color-key dot leading each row. The dots are a color key (which
// cadence), not a state indicator — the row's wording carries the state.
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

/**
 * The **Mule Actions Menu** on a roster Character Card — a hover-revealed
 * kebab that replaces the card's Roster Active Switch. Rows flip the Active
 * Flag and set/clear the three Clear Marks; each row is worded as the action
 * (the inverse of the current state). Cadence rows hide when the slate lacks
 * that cadence.
 *
 * The card body is click-to-open AND a dnd-kit drag surface, so the whole
 * control swallows every activation path (click / pointerdown / keydown /
 * touchstart) on a guard wrapper — the same rationale as RosterActiveSwitch,
 * whose Base UI hidden-input re-bubble gotcha this menu's plain-button
 * trigger avoids, but the guard is still needed so the trigger's own click
 * never reaches the card.
 */
export function MuleActionsMenu({
  mule,
  revealed,
  dailyValid,
  weeklyValid,
  bmValid,
  dailyCount,
  monthlyCount,
  onToggleActive,
  onSetMark,
  onDelete,
  kebabSize = 26,
}: MuleActionsMenuProps) {
  const [open, setOpen] = useState(false);
  const [focused, setFocused] = useState(false);
  // Only keyboard focus pins the kebab visible (the `:focus-visible`
  // heuristic, tracked manually because Base UI focuses the trigger on click
  // too). Mirrors RosterActiveSwitch so a pointer click doesn't leave the
  // kebab revealed after the pointer moves off the card.
  const pointerDownRef = useRef(false);

  const visible = revealed || open || focused;

  function stopPropagation(e: React.SyntheticEvent) {
    e.stopPropagation();
  }

  return (
    <span
      style={{ display: 'inline-flex', position: 'relative' }}
      onClick={stopPropagation}
      onPointerDown={(e) => {
        pointerDownRef.current = true;
        stopPropagation(e);
      }}
      onKeyDown={stopPropagation}
      onTouchStart={stopPropagation}
    >
      <DropdownMenu open={open} onOpenChange={setOpen}>
        <DropdownMenuTrigger
          aria-label="Mule actions"
          className="inline-flex items-center justify-center rounded-md cursor-pointer"
          style={{
            width: kebabSize,
            height: kebabSize,
            border: '1px solid var(--border)',
            background: 'var(--surface-2, var(--surface-raised))',
            color: 'var(--muted-raw, var(--muted-foreground))',
            opacity: visible ? 1 : 0,
            transition: 'opacity 140ms',
          }}
          onFocus={() => {
            setFocused(!pointerDownRef.current);
            pointerDownRef.current = false;
          }}
          onBlur={() => setFocused(false)}
        >
          <EllipsisVertical size={Math.round(kebabSize * 0.58)} />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" sideOffset={6} className="min-w-48">
          <DropdownMenuItem onClick={() => onToggleActive(mule.id, !mule.active)}>
            <ColorDot color="var(--chart-4, #4ade80)" />
            <span style={{ flex: 1 }}>{mule.active ? 'Set Inactive' : 'Set Active'}</span>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          {dailyCount > 0 && (
            <DropdownMenuItem onClick={() => onSetMark(mule.id, 'daily', !dailyValid)}>
              <ColorDot color={DAILY_CYAN} />
              <span style={{ flex: 1 }}>{dailyValid ? 'Daily Incomplete' : 'Daily Complete'}</span>
            </DropdownMenuItem>
          )}
          <DropdownMenuItem onClick={() => onSetMark(mule.id, 'weekly', !weeklyValid)}>
            <ColorDot color={WEEKLY_PURPLE} />
            <span style={{ flex: 1 }}>{weeklyValid ? 'Weekly Incomplete' : 'Weekly Complete'}</span>
          </DropdownMenuItem>
          {monthlyCount > 0 && (
            <DropdownMenuItem onClick={() => onSetMark(mule.id, 'bm', !bmValid)}>
              <ColorDot color={BM_GOLD} />
              <span style={{ flex: 1 }}>{bmValid ? 'BM Incomplete' : 'BM Complete'}</span>
            </DropdownMenuItem>
          )}
          {onDelete && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onDelete} style={{ color: 'var(--destructive)' }}>
                <Trash2 size={14} />
                <span style={{ flex: 1 }}>Delete</span>
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </span>
  );
}
