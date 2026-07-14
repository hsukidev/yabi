import { useState } from 'react';
import { EllipsisVertical, Trash2 } from 'lucide-react';
import type { Mule } from '../../types';
import { clearMarkUpdate } from '../../utils/clearMark';
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
  /** Identity-stable writer. The menu builds its own patches — active flips
   *  and `clearMarkUpdate` stamps — and writes them through this. */
  updateMule: (id: string, patch: Partial<Mule>) => void;
  /** Deletes the mule instantly (no confirmation); the caller wires the
   *  single-mule delete that fires the undo toast. */
  onDelete: () => void;
  /** Current validity of each Clear Mark — drives the action wording (inverse
   *  of current state) and the set/clear direction. */
  dailyValid: boolean;
  weeklyValid: boolean;
  bmValid: boolean;
  /** Canonical Mark-eligibility per cadence (same predicate as Mark
   *  Invalidation); an ineligible cadence hides its row so a mark is never
   *  written that would immediately invalidate. */
  dailyEligible: boolean;
  weeklyEligible: boolean;
  bmEligible: boolean;
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
 * The **Mule Actions Menu** on a roster Character Card — an always-visible
 * kebab in the card's top-right corner. Rows flip the Active Flag, set/clear
 * the three Clear Marks, and delete the mule; each mark/active row is worded as
 * the action (the inverse of the current state). Cadence rows hide when the
 * mule is not Mark-eligible for that cadence (a boss-less mule shows only Set
 * Active/Inactive + Delete). Delete is instant — recovery is the undo toast.
 *
 * The card body is click-to-open AND a dnd-kit drag surface, so the whole
 * control swallows every activation path (click / pointerdown / keydown /
 * touchstart) on a guard wrapper — otherwise a tap on the kebab would also
 * open the Drawer or start a drag (see CLAUDE.md).
 */
export function MuleActionsMenu({
  mule,
  updateMule,
  onDelete,
  dailyValid,
  weeklyValid,
  bmValid,
  dailyEligible,
  weeklyEligible,
  bmEligible,
  kebabSize = 26,
}: MuleActionsMenuProps) {
  const [open, setOpen] = useState(false);

  function stopPropagation(e: React.SyntheticEvent) {
    e.stopPropagation();
  }

  function toggleMark(kind: 'daily' | 'weekly' | 'bm', valid: boolean) {
    updateMule(mule.id, clearMarkUpdate(kind, !valid, Date.now()));
  }

  return (
    <span
      style={{ display: 'inline-flex', position: 'relative' }}
      onClick={stopPropagation}
      onPointerDown={stopPropagation}
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
          }}
        >
          <EllipsisVertical size={Math.round(kebabSize * 0.58)} />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" sideOffset={6} className="min-w-48 rounded-md">
          {/* Toggle rows stay open on selection (closeOnClick={false}) — the
              wording flips in place so repeated toggles read live. Only Delete
              closes, since its anchor unmounts with the mule. */}
          <DropdownMenuItem
            closeOnClick={false}
            onClick={() => updateMule(mule.id, { active: !mule.active })}
          >
            <ColorDot color="var(--success, #4ade80)" />
            <span style={{ flex: 1 }}>{mule.active ? 'Set Inactive' : 'Set Active'}</span>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          {dailyEligible && (
            <DropdownMenuItem closeOnClick={false} onClick={() => toggleMark('daily', dailyValid)}>
              <ColorDot color={DAILY_CYAN} />
              <span style={{ flex: 1 }}>{dailyValid ? 'Daily Incomplete' : 'Daily Complete'}</span>
            </DropdownMenuItem>
          )}
          {weeklyEligible && (
            <DropdownMenuItem
              closeOnClick={false}
              onClick={() => toggleMark('weekly', weeklyValid)}
            >
              <ColorDot color={WEEKLY_PURPLE} />
              <span style={{ flex: 1 }}>
                {weeklyValid ? 'Weekly Incomplete' : 'Weekly Complete'}
              </span>
            </DropdownMenuItem>
          )}
          {bmEligible && (
            <DropdownMenuItem closeOnClick={false} onClick={() => toggleMark('bm', bmValid)}>
              <ColorDot color={BM_GOLD} />
              <span style={{ flex: 1 }}>{bmValid ? 'BM Incomplete' : 'BM Complete'}</span>
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={onDelete} style={{ color: 'var(--destructive)' }}>
            <Trash2 size={14} />
            <span style={{ flex: 1 }}>Delete</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </span>
  );
}
