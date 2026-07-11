import { useMemo, useRef } from 'react';
import type { Mule } from '../types';
import type { MuleContribution } from '../modules/worldIncome';
import { rosterRowMetrics, type RosterRowMetrics } from './rosterRowMetrics';

/**
 * Per-mule cache entry: the produced metrics plus the exact inputs
 * `rosterRowMetrics` derived them from. When those inputs are unchanged the
 * cached object is reused so its identity survives, preserving the
 * `MuleCharacterCard` / `MuleListRow` memo barriers.
 */
interface CacheEntry {
  metrics: RosterRowMetrics;
  selectedBosses: Mule['selectedBosses'];
  partySizes: Mule['partySizes'];
  worldId: Mule['worldId'];
  active: boolean;
  contributedMeso: number;
  droppedKeys: MuleContribution['droppedKeys'] | undefined;
  total: number;
}

function droppedKeysEqual(
  a: MuleContribution['droppedKeys'] | undefined,
  b: MuleContribution['droppedKeys'] | undefined,
): boolean {
  if (a === b) return true;
  if (!a || !b || a.size !== b.size) return false;
  for (const [k, v] of a) if (b.get(k) !== v) return false;
  return true;
}

/**
 * Build the per-mule metrics map with **stable object identity**.
 *
 * `useWorldIncome` and any `mules`-keyed `useMemo` both re-run on every mule
 * mutation, handing every mule a freshly-allocated metrics object — so a
 * change to one mule (e.g. setting a **Clear Mark**, which doesn't affect
 * income at all) would otherwise re-render *every* roster item. This hook
 * caches each mule's metrics against the precise inputs `rosterRowMetrics`
 * reads (slate keys / world / party sizes / active flag / this mule's
 * contribution / the world total). A Clear Mark touches none of those, so the
 * cached metrics object is reused and only the mutated mule's card re-renders
 * (through its own changed `mule` prop).
 */
export function useStableRosterMetrics(
  mulesInWorld: readonly Mule[],
  capPerMule: ReadonlyMap<string, MuleContribution>,
  totalContributedMeso: number,
): ReadonlyMap<string, RosterRowMetrics> {
  const cacheRef = useRef<Map<string, CacheEntry>>(new Map());

  return useMemo(() => {
    const cache = cacheRef.current;
    const next = new Map<string, RosterRowMetrics>();
    const live = new Set<string>();

    for (const mule of mulesInWorld) {
      live.add(mule.id);
      const contribution = capPerMule.get(mule.id);
      const contributedMeso = contribution?.contributedMeso ?? 0;
      const droppedKeys = contribution?.droppedKeys;
      const prev = cache.get(mule.id);

      if (
        prev &&
        prev.selectedBosses === mule.selectedBosses &&
        prev.partySizes === mule.partySizes &&
        prev.worldId === mule.worldId &&
        prev.active === mule.active &&
        prev.contributedMeso === contributedMeso &&
        prev.total === totalContributedMeso &&
        droppedKeysEqual(prev.droppedKeys, droppedKeys)
      ) {
        next.set(mule.id, prev.metrics);
        continue;
      }

      const metrics = rosterRowMetrics(mule, contribution, totalContributedMeso);
      cache.set(mule.id, {
        metrics,
        selectedBosses: mule.selectedBosses,
        partySizes: mule.partySizes,
        worldId: mule.worldId,
        active: mule.active,
        contributedMeso,
        droppedKeys,
        total: totalContributedMeso,
      });
      next.set(mule.id, metrics);
    }

    // Drop cache entries for mules no longer in the lens.
    for (const id of cache.keys()) if (!live.has(id)) cache.delete(id);

    return next;
  }, [mulesInWorld, capPerMule, totalContributedMeso]);
}
