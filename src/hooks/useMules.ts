import { useCallback } from 'react';
import { arrayMove } from '@dnd-kit/sortable';
import { v4 as uuidv4 } from 'uuid';
import type { Mule } from '../types';
import type { WorldId } from '../data/worlds';
import { MuleBossSlate } from '../data/muleBossSlate';
import { createMuleStore } from '../persistence/muleStore';
import { usePersistedState } from './usePersistedState';

// Module-scope singleton — the hook is itself used as a singleton (App-wide
// state) so one store instance is the right shape. Each `createMuleStore`
// call owns its own pending/timer refs, so tests that need isolation can
// still spin up fresh stores directly.
const store = createMuleStore();

/**
 * React CRUD facade over the **Mule Store**. The hook owns nothing about
 * storage, migration, debounce, or schema versions — it just translates
 * React state transitions into `store.save` / `store.flush` calls.
 */
export function useMules() {
  const [mules, setMules] = usePersistedState(store);

  const addMule = useCallback(
    (worldId: WorldId) => {
      const newMule: Mule = {
        id: uuidv4(),
        name: '',
        level: 0,
        muleClass: '',
        selectedBosses: [],
        partySizes: {},
        active: true,
        worldId,
      };
      setMules((prev) => [...prev, newMule]);
      return newMule.id;
    },
    [setMules],
  );

  const updateMule = useCallback(
    (id: string, updates: Partial<Omit<Mule, 'id'>>) => {
      setMules((prev) =>
        prev.map((m) => {
          if (m.id !== id) return m;
          const merged = { ...m, ...updates };
          if (updates.selectedBosses) {
            // Single chokepoint for every `selectedBosses` write: the slate is
            // normalized here for *all* callers (toggle, Conform, Apply User
            // Preset, reset), so Mark Invalidation is enforced here too rather
            // than per-caller. A slate edit that removes a Clear Mark's income
            // basis deletes that mark (cycle classification reuses the slate's
            // own cadence-count getters).
            const slate = MuleBossSlate.from(updates.selectedBosses);
            merged.selectedBosses = [...slate.keys];
            const hasDaily = slate.dailyCount > 0;
            const hasWeekly = slate.weeklyCount > 0;
            const hasMonthly = slate.monthlyCount > 0;
            if (!hasDaily) merged.dailyClearMark = undefined;
            if (!hasWeekly && !hasDaily) merged.weeklyClearMark = undefined;
            if (!hasMonthly) merged.bmClearMark = undefined;
          }
          return merged;
        }),
      );
    },
    [setMules],
  );

  const deleteMule = useCallback(
    (id: string) => {
      setMules((prev) => prev.filter((m) => m.id !== id));
    },
    [setMules],
  );

  /**
   * Batch delete. Removes every mule whose id is in `ids` in a single
   * `setMules` pass so React re-renders once and the store schedules one
   * write (not N). Unknown ids are silently ignored and an empty `ids`
   * array is a no-op — we preserve the prior array reference so
   * downstream `useMemo`/`useEffect` consumers don't re-run.
   */
  const deleteMules = useCallback(
    (ids: string[]) => {
      if (ids.length === 0) return;
      const idSet = new Set(ids);
      setMules((prev) => {
        const next = prev.filter((m) => !idSet.has(m.id));
        return next.length === prev.length ? prev : next;
      });
    },
    [setMules],
  );

  const reorderMules = useCallback(
    (oldIndex: number, newIndex: number) => {
      setMules((prev) => arrayMove(prev, oldIndex, newIndex));
    },
    [setMules],
  );

  /**
   * Batch restore. Snapshots must carry their original index. We sort by
   * index ascending and splice in that order — each later insert naturally
   * shifts earlier-inserted items right, so every mule lands at its
   * original slot.
   */
  const restoreMules = useCallback(
    (snapshots: Array<{ mule: Mule; index: number }>) => {
      if (snapshots.length === 0) return;
      setMules((prev) => {
        const sorted = [...snapshots].sort((a, b) => a.index - b.index);
        const next = [...prev];
        for (const { mule, index } of sorted) {
          const clamped = Math.min(Math.max(index, 0), next.length);
          next.splice(clamped, 0, mule);
        }
        return next;
      });
    },
    [setMules],
  );

  const restoreMule = useCallback(
    (mule: Mule, index: number) => restoreMules([{ mule, index }]),
    [restoreMules],
  );

  return {
    mules,
    addMule,
    updateMule,
    deleteMule,
    deleteMules,
    reorderMules,
    restoreMule,
    restoreMules,
  };
}
