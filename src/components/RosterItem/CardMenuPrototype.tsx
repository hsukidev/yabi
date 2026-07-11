/**
 * PROTOTYPE — throwaway code. Delete or absorb when the effort's PRD lands.
 *
 * Originally three card-kebab variants; variant C won (see
 * CardMenuPrototype.NOTES.md) and is now pinned. This file keeps:
 *  - the shared in-memory marks store (daily / weekly / BM),
 *  - the shared 4-row kebab MarkMenu (variant-C styling, action-worded
 *    labels, always-lit color-key dots),
 *  - the card's Lv-pill checks and card control mount.
 *
 * The ?variant= URL param + floating bar now belong to
 * MarkingSurfacesPrototype.tsx (List View / Drawer affordances).
 *
 * Marks are in-memory only — refresh wipes them. Dev builds only; in
 * production the real Roster Active Switch renders instead.
 */
import { useState, useSyncExternalStore } from 'react';
import { Check, EllipsisVertical, Trash2 } from 'lucide-react';
import type { Mule } from '../../types';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';

// Sampled from the crystal PNGs in src/assets/
export const WEEKLY_PURPLE = '#a855f7';
export const BM_GOLD = '#f5b02e';
export const DAILY_CYAN = '#3fb6f5';

/* ── In-memory completion store (no persistence — that's the point) ────── */

export interface Marks {
  daily: boolean;
  weekly: boolean;
  bm: boolean;
}
const NO_MARKS: Marks = { daily: false, weekly: false, bm: false };
const marksById = new Map<string, Marks>();
const storeListeners = new Set<() => void>();

export function toggleMark(id: string, key: keyof Marks) {
  const prev = marksById.get(id) ?? NO_MARKS;
  marksById.set(id, { ...prev, [key]: !prev[key] });
  marksVersion++;
  storeListeners.forEach((l) => l());
}

export function useMarks(id: string): Marks {
  return useSyncExternalStore(
    (cb) => {
      storeListeners.add(cb);
      return () => storeListeners.delete(cb);
    },
    () => marksById.get(id) ?? NO_MARKS,
  );
}

export function getMarks(id: string): Marks {
  return marksById.get(id) ?? NO_MARKS;
}

// Whole-store subscription for aggregate consumers (KPI readout prototype):
// bumps on every toggle; recompute aggregates keyed on this version.
let marksVersion = 0;
export function useMarksVersion(): number {
  return useSyncExternalStore(
    (cb) => {
      storeListeners.add(cb);
      return () => storeListeners.delete(cb);
    },
    () => marksVersion,
  );
}

/* ── Shared bits ────────────────────────────────────────────────────────── */

// Roster items are click-to-open AND drag surfaces — swallow every
// activation path (same guard rationale as RosterActiveSwitch).
function stopAll(e: React.SyntheticEvent) {
  e.stopPropagation();
}
export const guardProps = {
  onClick: stopAll,
  onPointerDown: stopAll,
  onKeyDown: stopAll,
  onTouchStart: stopAll,
};

// Mirrors the card level badge's typography so an invisible replica has the
// exact same width (used to place checks right after the badge).
const levelBadgeStyle: React.CSSProperties = {
  fontFamily: 'Geist Mono, monospace',
  fontSize: 'var(--mule-level-size, 11px)',
  letterSpacing: '0.1em',
  padding: '3px 8px',
  borderRadius: 4,
  border: '1px solid var(--border)',
};

export function KebabButton({ visible, size = 26 }: { visible: boolean; size?: number }) {
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

/* ── Shared 4-row mark menu (variant-C verdict, now incl. Daily) ────────── */

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

/* ── Card mount: kebab top-right + checks inside the Lv pill ────────────── */

// Opaque replacement pill drawn exactly over the real badge, extending it
// with inline colored checks: `Lv.250 ✓✓✓`.
function CardLvPillChecks({ mule }: { mule: Mule }) {
  const m = useMarks(mule.id);
  if (mule.level <= 0 || (!m.daily && !m.weekly && !m.bm)) return null;
  return (
    <span
      style={{
        ...levelBadgeStyle,
        position: 'absolute',
        top: 12,
        left: 12,
        display: 'inline-flex',
        alignItems: 'center',
        gap: 5,
        color: 'var(--muted-raw, var(--muted-foreground))',
        background: 'var(--surface-2, var(--surface-raised))',
        pointerEvents: 'none',
      }}
    >
      Lv.{mule.level}
      <MarkChecks marks={m} />
    </span>
  );
}

export function useCardMenuVariant(): 'c' | null {
  return import.meta.env.DEV && import.meta.env.MODE !== 'test' ? 'c' : null;
}

export function PrototypeCardControls({
  mule,
  isHovered,
  onToggleActive,
  dailyCount,
  monthlyCount,
}: {
  mule: Mule;
  isHovered: boolean;
  onToggleActive: (id: string, active: boolean) => void;
  dailyCount: number;
  monthlyCount: number;
}) {
  if (!import.meta.env.DEV || import.meta.env.MODE === 'test') return null;
  return (
    <>
      {/* zIndex 2 lifts above InactiveDimOverlay (zIndex 1), same as the switch */}
      <span
        {...guardProps}
        style={{ position: 'absolute', top: 10, right: 10, display: 'flex', zIndex: 2 }}
      >
        <MarkMenu
          mule={mule}
          visible={isHovered}
          dailyCount={dailyCount}
          monthlyCount={monthlyCount}
          onToggleActive={onToggleActive}
        />
      </span>
      <CardLvPillChecks mule={mule} />
    </>
  );
}
