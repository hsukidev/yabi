import { useState, useEffect, useCallback } from 'react';
import { arrayMove } from '@dnd-kit/sortable';
import { v4 as uuidv4 } from 'uuid';
import type { Mule } from '../types';
import { MuleBossSlate } from '../data/muleBossSlate';
import { createMuleStore } from '../persistence/muleStore';

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
  const [mules, setMules] = useState<Mule[]>(store.load);

  useEffect(() => {
    store.save(mules);
  }, [mules]);

  useEffect(() => {
    const flush = () => store.flush();
    // `pagehide` fires on tab close and bfcache navigation; mobile Safari
    // doesn't fire `beforeunload` reliably. Listening to both rescues a
    // pending debounced write when the user closes the tab mid-edit.
    window.addEventListener('pagehide', flush);
    window.addEventListener('beforeunload', flush);
    return () => {
      window.removeEventListener('pagehide', flush);
      window.removeEventListener('beforeunload', flush);
      store.flush();
    };
  }, []);

  const addMule = useCallback(() => {
    const newMule: Mule = {
      id: uuidv4(),
      name: '',
      level: 0,
      muleClass: '',
      selectedBosses: [],
      partySizes: {},
      active: true,
    };
    setMules((prev) => [...prev, newMule]);
    return newMule.id;
  }, []);

  const updateMule = useCallback((id: string, updates: Partial<Omit<Mule, 'id'>>) => {
    setMules((prev) =>
      prev.map((m) => {
        if (m.id !== id) return m;
        const merged = { ...m, ...updates };
        if (updates.selectedBosses) {
          merged.selectedBosses = [...MuleBossSlate.from(updates.selectedBosses).keys];
        }
        return merged;
      }),
    );
  }, []);

  const deleteMule = useCallback((id: string) => {
    setMules((prev) => prev.filter((m) => m.id !== id));
  }, []);

  /**
   * Batch delete. Removes every mule whose id is in `ids` in a single
   * `setMules` pass so React re-renders once and the store schedules one
   * write (not N). Unknown ids are silently ignored and an empty `ids`
   * array is a no-op — we preserve the prior array reference so
   * downstream `useMemo`/`useEffect` consumers don't re-run.
   */
  const deleteMules = useCallback((ids: string[]) => {
    if (ids.length === 0) return;
    const idSet = new Set(ids);
    setMules((prev) => {
      const next = prev.filter((m) => !idSet.has(m.id));
      return next.length === prev.length ? prev : next;
    });
  }, []);

  const reorderMules = useCallback((oldIndex: number, newIndex: number) => {
    setMules((prev) => arrayMove(prev, oldIndex, newIndex));
  }, []);

  return { mules, addMule, updateMule, deleteMule, deleteMules, reorderMules };
}
