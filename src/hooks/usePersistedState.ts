import { useEffect, useState, type Dispatch, type SetStateAction } from 'react';
import type { DebouncedStore } from '../persistence/debouncedStore';

/**
 * React side of the persistence lifecycle for a `DebouncedStore<T>`:
 * synchronous `useState(store.load)` hydration, save-on-change through the
 * store's **Storage Debounce**, and the flush triple —
 *
 * - `pagehide` — fires on tab close and bfcache navigation; mobile Safari
 *   doesn't fire `beforeunload` reliably.
 * - `beforeunload` — the desktop-browser close path.
 * - unmount — rescues a pending debounced write when the owning tree
 *   unmounts mid-edit.
 *
 * `store` is expected to be a module-scope singleton; the effects key on
 * its identity, so swapping stores mid-flight re-wires the listeners.
 */
export function usePersistedState<T>(store: DebouncedStore<T>): [T, Dispatch<SetStateAction<T>>] {
  const [value, setValue] = useState<T>(store.load);

  useEffect(() => {
    store.save(value);
  }, [store, value]);

  useEffect(() => {
    const flush = () => store.flush();
    window.addEventListener('pagehide', flush);
    window.addEventListener('beforeunload', flush);
    return () => {
      window.removeEventListener('pagehide', flush);
      window.removeEventListener('beforeunload', flush);
      store.flush();
    };
  }, [store]);

  return [value, setValue];
}
