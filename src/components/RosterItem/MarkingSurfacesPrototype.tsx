/**
 * PROTOTYPE — throwaway code. Question (wayfinder ticket #296, resolved):
 * marking affordances on List View rows and the touch path (Drawer).
 * **Variant C won** (see MarkingSurfacesPrototype.NOTES.md) and is now
 * pinned: row hover kebab replacing the Active Switch + drawer COMPLETION
 * panel. The losing variants' components remain below but are unreachable.
 *
 * The ?variant= URL param + floating bar moved on to KpiReadoutPrototype.tsx.
 *
 * Shares the in-memory marks store with CardMenuPrototype so card checks,
 * row controls, and drawer controls stay in sync. Dev builds only.
 */
import { Check } from 'lucide-react';
import type { Mule } from '../../types';
import {
  BM_GOLD,
  DAILY_CYAN,
  WEEKLY_PURPLE,
  guardProps,
  MarkMenu,
  MarkChecks,
  toggleMark,
  useMarks,
  type Marks,
} from './CardMenuPrototype';

export type MarkingVariant = 'a' | 'b' | 'c';

const MARK_META: { key: keyof Marks; label: string; color: string }[] = [
  { key: 'daily', label: 'Daily', color: DAILY_CYAN },
  { key: 'weekly', label: 'Weekly', color: WEEKLY_PURPLE },
  { key: 'bm', label: 'BM', color: BM_GOLD },
];

// Pinned to the winning variant; null in prod/test keeps the real controls.
export function useMarkingVariant(): MarkingVariant | null {
  return import.meta.env.DEV && import.meta.env.MODE !== 'test' ? 'c' : null;
}
/* ── Shared chip ────────────────────────────────────────────────────────── */

function MarkChip({
  color,
  label,
  on,
  onClick,
  size = 20,
}: {
  color: string;
  label: string;
  on: boolean;
  onClick: () => void;
  size?: number;
}) {
  return (
    <button
      aria-label={label}
      aria-pressed={on}
      title={label}
      onClick={onClick}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: size,
        height: size,
        borderRadius: '50%',
        border: `1px solid ${on ? `color-mix(in oklab, ${color} 60%, transparent)` : 'var(--border)'}`,
        background: on
          ? `color-mix(in oklab, ${color} 22%, transparent)`
          : 'var(--surface-2, var(--surface-raised))',
        color: on ? color : 'var(--muted-raw, var(--muted-foreground))',
        cursor: 'pointer',
        flexShrink: 0,
      }}
    >
      <Check size={Math.round(size * 0.62)} strokeWidth={3} />
    </button>
  );
}

/* ── List View row mount ────────────────────────────────────────────────── */

export function RowMarkingControls({
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
  const variant = useMarkingVariant();
  const m = useMarks(mule.id);
  if (!variant) return null;

  if (variant === 'b') {
    // Chips only — the row keeps its RosterActiveSwitch (rendered by the row).
    return (
      <span {...guardProps} style={{ display: 'inline-flex', gap: 5, zIndex: 2 }}>
        {MARK_META.map(({ key, label, color }) => {
          if (key === 'daily' && dailyCount === 0) return null;
          if (key === 'bm' && monthlyCount === 0) return null;
          return (
            <MarkChip
              key={key}
              color={color}
              label={`${label} ${m[key] ? 'incomplete' : 'complete'}`}
              on={m[key]}
              onClick={() => toggleMark(mule.id, key)}
            />
          );
        })}
      </span>
    );
  }

  // Variants A and C: hover kebab replacing the Active Switch, plus inline
  // checks after it so marks stay readable without opening the menu.
  return (
    <span
      {...guardProps}
      style={{ display: 'inline-flex', alignItems: 'center', gap: 5, zIndex: 2 }}
    >
      <MarkMenu
        mule={mule}
        visible={isHovered}
        dailyCount={dailyCount}
        monthlyCount={monthlyCount}
        onToggleActive={onToggleActive}
        kebabSize={22}
      />
      <MarkChecks marks={m} size={13} />
    </span>
  );
}

/* ── Drawer mounts (touch path) ─────────────────────────────────────────── */

/** Variant A: kebab in the drawer's top-right cluster (marks only). */
export function DrawerMarksKebab({
  mule,
  dailyCount,
  monthlyCount,
}: {
  mule: Mule;
  dailyCount: number;
  monthlyCount: number;
}) {
  const variant = useMarkingVariant();
  if (variant !== 'a') return null;
  return (
    <span style={{ display: 'inline-flex' }}>
      <MarkMenu
        mule={mule}
        visible
        dailyCount={dailyCount}
        monthlyCount={monthlyCount}
        kebabSize={30}
      />
    </span>
  );
}

/** Variant B: labeled chip row in the header stack, near the Active Toggle. */
export function DrawerMarksChipRow({
  mule,
  dailyCount,
  monthlyCount,
}: {
  mule: Mule;
  dailyCount: number;
  monthlyCount: number;
}) {
  const variant = useMarkingVariant();
  const m = useMarks(mule.id);
  if (variant !== 'b') return null;
  return (
    <div style={{ display: 'inline-flex', gap: 6, flexWrap: 'wrap' }}>
      {MARK_META.map(({ key, label, color }) => {
        if (key === 'daily' && dailyCount === 0) return null;
        if (key === 'bm' && monthlyCount === 0) return null;
        const on = m[key];
        return (
          <button
            key={key}
            aria-pressed={on}
            onClick={() => toggleMark(mule.id, key)}
            className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-sans uppercase tracking-[0.18em]"
            style={{
              background: on
                ? `color-mix(in oklab, ${color} 16%, transparent)`
                : 'color-mix(in srgb, var(--surface-2) 92%, transparent)',
              border: `1px solid ${
                on
                  ? `color-mix(in oklab, ${color} 55%, transparent)`
                  : 'color-mix(in srgb, var(--border) 60%, transparent)'
              }`,
              color: on ? color : 'var(--muted-foreground)',
              cursor: 'pointer',
              minHeight: 32,
            }}
          >
            <Check size={13} strokeWidth={3} style={{ opacity: on ? 1 : 0.35 }} />
            {label}
          </button>
        );
      })}
    </div>
  );
}

/** Variant C: full-width COMPLETION panel between header and fields. */
export function DrawerMarksPanel({
  mule,
  dailyCount,
  monthlyCount,
}: {
  mule: Mule;
  dailyCount: number;
  monthlyCount: number;
}) {
  const variant = useMarkingVariant();
  const m = useMarks(mule.id);
  if (variant !== 'c') return null;
  return (
    <div className="px-8 pt-5">
      <div className="eyebrow-plain" style={{ opacity: 0.7, marginBottom: 8 }}>
        COMPLETION
      </div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {MARK_META.map(({ key, label, color }) => {
          if (key === 'daily' && dailyCount === 0) return null;
          if (key === 'bm' && monthlyCount === 0) return null;
          const on = m[key];
          return (
            <button
              key={key}
              aria-pressed={on}
              onClick={() => toggleMark(mule.id, key)}
              className="inline-flex items-center gap-2 rounded-lg px-4 text-xs font-sans uppercase tracking-[0.18em]"
              style={{
                background: 'color-mix(in srgb, var(--surface-2) 92%, transparent)',
                boxShadow:
                  'inset 0 1px 0 color-mix(in srgb, white 6%, transparent), 0 1px 2px color-mix(in srgb, black 8%, transparent)',
                border: '1px solid color-mix(in srgb, var(--border) 60%, transparent)',
                color: on ? color : 'var(--muted-foreground)',
                minHeight: 38,
                cursor: 'pointer',
              }}
            >
              <span
                aria-hidden
                style={{
                  display: 'inline-block',
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  background: on ? color : 'transparent',
                  border: `1.5px solid ${on ? color : 'var(--border)'}`,
                }}
              />
              {label} {on ? 'Complete' : 'Incomplete'}
            </button>
          );
        })}
      </div>
    </div>
  );
}
