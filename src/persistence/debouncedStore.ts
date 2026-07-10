import type { StoragePort } from './storagePort';

/**
 * `DebouncedStore<T>` — the persistence facade consumed by app-state hooks
 * (via `usePersistedState`). `load()` stays synchronous so it can
 * initialize `useState`; `save(value)` is coalesced over a 200ms
 * **Storage Debounce**; `flush()` forces any pending write to land
 * immediately (used on `pagehide` / `beforeunload` / unmount).
 */
export interface DebouncedStore<T> {
  load(): T;
  save(value: T): void;
  flush(): void;
}

/**
 * Per-store adapter config: how a `T` becomes the persisted string and how
 * a raw persisted string (or `null`) becomes a validated `T`. Migration,
 * schema versioning, and pruning all live inside `migrate`.
 */
export interface DebouncedStoreConfig<T> {
  serialize(value: T): string;
  migrate(raw: string | null): T;
}

/**
 * Debounce window for **Storage Debounce**. 200ms coalesces keystroke
 * bursts in drawer inputs into a single `port.write` without making the
 * save-on-blur flow feel laggy. Deliberately not configurable — every
 * store shares the same policy until a real second policy shows up.
 */
const STORAGE_DEBOUNCE_MS = 200;

/**
 * Build a `DebouncedStore<T>` bound to `port`. Each call produces an
 * independent store with its own closure-local `pending` + `timer` refs —
 * no module-level state — so tests can spin up many isolated stores in
 * the same process.
 */
export function createDebouncedStore<T>(
  port: StoragePort,
  { serialize, migrate }: DebouncedStoreConfig<T>,
): DebouncedStore<T> {
  let pending: T | null = null;
  let timer: ReturnType<typeof setTimeout> | null = null;

  function drain(): void {
    if (timer !== null) {
      clearTimeout(timer);
      timer = null;
    }
    const snapshot = pending;
    pending = null;
    if (snapshot !== null) port.write(serialize(snapshot));
  }

  return {
    load(): T {
      return migrate(port.read());
    },
    save(value: T): void {
      pending = value;
      if (timer !== null) clearTimeout(timer);
      timer = setTimeout(drain, STORAGE_DEBOUNCE_MS);
    },
    flush: drain,
  };
}
