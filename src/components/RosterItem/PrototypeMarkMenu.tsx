/**
 * PROTOTYPE — throwaway shared kebab menu + inline checks for the remaining
 * marking-surface prototypes (List View row + Drawer). Extracted out of the
 * old `CardMenuPrototype.tsx` when the Character Card slice (#302) shipped its
 * real `MuleActionsMenu` / `CompletionChecks`. These render against the
 * in-memory `prototypeMarks` store and stay until the List/Drawer slices land.
 *
 * Exports only React components so `react-refresh/only-export-components`
 * stays quiet; the store + constants live in `prototypeMarks.ts`.
 */
import { useState } from 'react';
import { Check, EllipsisVertical, Trash2 } from 'lucide-react';
import type { Mule } from '../../types';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  BM_GOLD,
  DAILY_CYAN,
  WEEKLY_PURPLE,
  toggleMark,
  useMarks,
  type Marks,
} from './prototypeMarks';

function KebabButton({ visible, size = 26 }: { visible: boolean; size?: number }) {
  return (
    <span
      role="button"
      aria-label="Card actions"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: size,
        height: size,
        borderRadius: 6,
        border: '1px solid var(--border)',
        background: 'var(--surface-2, var(--surface-raised))',
        color: 'var(--muted-raw, var(--muted-foreground))',
        cursor: 'pointer',
        opacity: visible ? 1 : 0,
        transition: 'opacity 140ms',
      }}
    >
      <EllipsisVertical size={Math.round(size * 0.58)} />
    </span>
  );
}

function StatusDot({ color }: { color: string }) {
  return (
    <span
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

export interface MarkMenuProps {
  mule: Mule;
  visible: boolean;
  // Decided visibility rules: zero daily keys → no Daily row; zero monthly
  // keys → no BM row. Weekly row always shown.
  dailyCount: number;
  monthlyCount: number;
  // Omit to drop the Set Active/Set Inactive row.
  onToggleActive?: (id: string, active: boolean) => void;
  // Drawer only: appends a destructive Delete row (hands off to the
  // existing confirmation flow — this never deletes directly).
  onDelete?: () => void;
  kebabSize?: number;
}

export function MarkMenu({
  mule,
  visible,
  dailyCount,
  monthlyCount,
  onToggleActive,
  onDelete,
  kebabSize,
}: MarkMenuProps) {
  const m = useMarks(mule.id);
  const [open, setOpen] = useState(false);
  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger
        render={(props) => (
          <span {...(props as object)}>
            <KebabButton visible={visible || open} size={kebabSize} />
          </span>
        )}
      />
      <DropdownMenuContent align="end" sideOffset={6} className="min-w-48">
        {/* Labels name the ACTION (inverse of current state); dots are
            color keys, always lit. */}
        {onToggleActive && (
          <>
            <DropdownMenuItem onClick={() => onToggleActive(mule.id, !mule.active)}>
              <StatusDot color="var(--chart-4, #4ade80)" />
              <span style={{ flex: 1 }}>{mule.active ? 'Set Inactive' : 'Set Active'}</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
          </>
        )}
        {dailyCount > 0 && (
          <DropdownMenuItem onClick={() => toggleMark(mule.id, 'daily')}>
            <StatusDot color={DAILY_CYAN} />
            <span style={{ flex: 1 }}>{m.daily ? 'Daily Incomplete' : 'Daily Complete'}</span>
          </DropdownMenuItem>
        )}
        <DropdownMenuItem onClick={() => toggleMark(mule.id, 'weekly')}>
          <StatusDot color={WEEKLY_PURPLE} />
          <span style={{ flex: 1 }}>{m.weekly ? 'Weekly Incomplete' : 'Weekly Complete'}</span>
        </DropdownMenuItem>
        {monthlyCount > 0 && (
          <DropdownMenuItem onClick={() => toggleMark(mule.id, 'bm')}>
            <StatusDot color={BM_GOLD} />
            <span style={{ flex: 1 }}>{m.bm ? 'BM Incomplete' : 'BM Complete'}</span>
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
  );
}

/** Inline colored checks for the current marks — used inside pills/rows. */
export function MarkChecks({ marks, size = 12 }: { marks: Marks; size?: number }) {
  return (
    <>
      {marks.daily && (
        <Check
          size={size}
          strokeWidth={3.5}
          color={DAILY_CYAN}
          role="img"
          aria-label="Daily complete"
        />
      )}
      {marks.weekly && (
        <Check
          size={size}
          strokeWidth={3.5}
          color={WEEKLY_PURPLE}
          role="img"
          aria-label="Weekly complete"
        />
      )}
      {marks.bm && (
        <Check size={size} strokeWidth={3.5} color={BM_GOLD} role="img" aria-label="BM complete" />
      )}
    </>
  );
}
