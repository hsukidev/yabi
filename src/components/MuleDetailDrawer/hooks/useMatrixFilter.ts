import { useMemo, useState } from 'react';
import type { BossCadence } from '../../../types';
import type { MuleBossSlate, SlateFamily } from '../../../data/muleBossSlate';
import type { CadenceFilter } from '../../MatrixToolbar';

function activeCadenceOf(filter: CadenceFilter): BossCadence | undefined {
  if (filter === 'Daily') return 'daily';
  if (filter === 'Weekly') return 'weekly';
  return undefined;
}

/**
 * Narrow `SlateFamily[]` to families whose rows include at least one row with
 * the requested cadence. Applied post-`slate.view(search)` so the cadence
 * filter composes with the search filter without reshaping slate internals.
 */
function filterFamiliesByCadence(families: SlateFamily[], filter: CadenceFilter): SlateFamily[] {
  const cadence = activeCadenceOf(filter);
  if (!cadence) return families;
  return families.filter((f) => f.rows.some((r) => r.cadence === cadence));
}

/**
 * Owns the **Boss Search** + **Cadence Filter** composition for the drawer's
 * Boss Matrix view.
 *
 * - `search` / `setSearch` and `filter` / `setFilter` are local state.
 * - `visibleBosses` is the cadence filter composed onto `slate.view(search)`.
 *   Monthly-only families remain visible under `All`, and stay hidden under
 *   the weekly/daily filters because they have no matching cadence rows.
 * - `search` and `filter` auto-reset on **Mule Switch** via the React-supported
 *   render-time "store info from previous renders" pattern, so opening the
 *   drawer on a new mule starts with a fresh filter state.
 */
export function useMatrixFilter({
  muleId,
  slate,
}: {
  muleId: string | null;
  slate: MuleBossSlate;
}): {
  search: string;
  setSearch: (s: string) => void;
  filter: CadenceFilter;
  setFilter: (f: CadenceFilter) => void;
  activeCadence: BossCadence | undefined;
  visibleBosses: SlateFamily[];
} {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<CadenceFilter>('All');

  const [lastMuleId, setLastMuleId] = useState<string | null>(muleId);
  if (lastMuleId !== muleId) {
    setLastMuleId(muleId);
    setSearch('');
    setFilter('All');
  }

  const visibleBosses = useMemo(
    () => filterFamiliesByCadence(slate.view(search), filter),
    [slate, search, filter],
  );

  return {
    search,
    setSearch,
    filter,
    setFilter,
    activeCadence: activeCadenceOf(filter),
    visibleBosses,
  };
}
