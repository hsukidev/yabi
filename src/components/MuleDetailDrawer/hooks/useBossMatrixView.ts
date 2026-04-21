import { useCallback, useMemo, useState } from 'react';
import type { Mule } from '../../../types';
import { MuleBossSlate, type SlateFamily } from '../../../data/muleBossSlate';
import { conform, isPresetActive } from '../../../data/bossPresets';
import type { CadenceFilter, PresetKey } from '../../MatrixToolbar';

const CANONICAL_PRESETS: readonly PresetKey[] = ['CRA', 'LOMIEN', 'CTENE'];

const PARTY_SIZE_MIN = 1;
const PARTY_SIZE_MAX = 6;

/**
 * Narrow `SlateFamily[]` to families whose rows include at least one row with
 * the requested cadence. Applied post-`slate.view(search)` so the cadence
 * filter composes with the search filter without reshaping slate internals.
 */
function filterFamiliesByCadence(families: SlateFamily[], filter: CadenceFilter): SlateFamily[] {
  if (filter === 'All') return families;
  const cadence = filter === 'Weekly' ? 'weekly' : 'daily';
  return families.filter((f) => f.rows.some((r) => r.cadence === cadence));
}

/**
 * Owns the Boss Matrix view state for the drawer:
 *
 * - Search + cadence-filter composition with the `MuleBossSlate.view`
 *   projection.
 * - **Preset Pill** semantics — `activePill` is derived each render via
 *   **Same-Cadence Equality**; at most one canonical preset lights up, or
 *   `null` when no canonical preset matches. `applyPreset` runs **Conform**
 *   and short-circuits when the clicked preset is already the **Active
 *   Pill**.
 * - Party-Size Clamp to [1, 6] on write.
 * - Toggle / reset dispatches routed through `onUpdate`. All dispatchers
 *   no-op when `muleId === null`.
 * - `search` and `filter` auto-reset on Mule Switch (render-time pattern).
 * - `stablePartySizes` keeps identity stable across renders when the
 *   `partySizes` prop does not change, matching the prior drawer-local
 *   `useMemo` so `BossMatrix` can rely on referential equality.
 */
export function useBossMatrixView({
  muleId,
  selectedBosses,
  partySizes,
  onUpdate,
}: {
  muleId: string | null;
  selectedBosses: readonly string[];
  partySizes: Mule['partySizes'];
  onUpdate: (id: string, patch: Partial<Omit<Mule, 'id'>>) => void;
}): {
  search: string;
  setSearch: (s: string) => void;
  filter: CadenceFilter;
  setFilter: (f: CadenceFilter) => void;
  visibleBosses: SlateFamily[];
  weeklyCount: number;
  activePill: PresetKey | null;
  stablePartySizes: Record<string, number>;
  toggleKey: (key: string) => void;
  applyPreset: (preset: PresetKey) => void;
  setPartySize: (family: string, n: number) => void;
  resetBosses: () => void;
} {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<CadenceFilter>('All');

  // Reset search + filter on Mule Switch via the render-time pattern (same
  // shape as useDraftField's Draft Source Resync).
  const [lastMuleId, setLastMuleId] = useState<string | null>(muleId);
  if (lastMuleId !== muleId) {
    setLastMuleId(muleId);
    setSearch('');
    setFilter('All');
  }

  const slate = useMemo(() => MuleBossSlate.from(selectedBosses), [selectedBosses]);

  const visibleBosses = useMemo(
    () => filterFamiliesByCadence(slate.view(search), filter),
    [slate, search, filter],
  );

  const activePill = useMemo<PresetKey | null>(
    () => CANONICAL_PRESETS.find((p) => isPresetActive(p, selectedBosses)) ?? null,
    [selectedBosses],
  );

  const stablePartySizes = useMemo(() => partySizes ?? {}, [partySizes]);

  const toggleKey = useCallback(
    (key: string) => {
      if (!muleId) return;
      onUpdate(muleId, { selectedBosses: slate.toggle(key).keys as string[] });
    },
    [muleId, slate, onUpdate],
  );

  const applyPreset = useCallback(
    (preset: PresetKey) => {
      if (!muleId) return;
      // Re-click on the Active Pill: no state churn, no persist fire.
      if (activePill === preset) return;
      const next = conform(slate.keys, preset);
      onUpdate(muleId, {
        selectedBosses: MuleBossSlate.from(next).keys as string[],
      });
    },
    [muleId, slate, activePill, onUpdate],
  );

  const setPartySize = useCallback(
    (family: string, n: number) => {
      if (!muleId) return;
      const clamped = Math.max(PARTY_SIZE_MIN, Math.min(PARTY_SIZE_MAX, n));
      onUpdate(muleId, {
        partySizes: { ...stablePartySizes, [family]: clamped },
      });
    },
    [muleId, stablePartySizes, onUpdate],
  );

  const resetBosses = useCallback(() => {
    if (!muleId) return;
    onUpdate(muleId, { selectedBosses: [] });
  }, [muleId, onUpdate]);

  return {
    search,
    setSearch,
    filter,
    setFilter,
    visibleBosses,
    weeklyCount: slate.weeklyCount,
    activePill,
    stablePartySizes,
    toggleKey,
    applyPreset,
    setPartySize,
    resetBosses,
  };
}
