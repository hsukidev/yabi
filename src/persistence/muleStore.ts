import type { Mule } from '../types';
import { CURRENT_SCHEMA_VERSION, muleMigrate } from './muleMigrate';
import { defaultStoragePort } from './muleStorage';

/**
 * `StoragePort` — the narrow outbound seam every `MuleStore` writes
 * through. Two primitives: `read()` returns the raw persisted string (or
 * `null` when nothing is stored / storage failed), `write(data)`
 * persists the raw string. JSON (de)serialization and the **Schema
 * Lineage** live above the port; the port itself knows nothing about
 * **Mules**.
 */
export interface StoragePort {
  read(): string | null;
  write(data: string): void;
}

/**
 * `MuleStore` — the persistence facade consumed by `useMules`. `load()`
 * stays synchronous so it can initialize `useState`; `save(mules)` is
 * coalesced over a 200ms **Storage Debounce**; `flush()` forces any
 * pending write to land immediately (used on `pagehide` /
 * `beforeunload`).
 */
export interface MuleStore {
  load(): Mule[];
  save(mules: Mule[]): void;
  flush(): void;
}

/**
 * Debounce window for **Storage Debounce**. 200ms coalesces keystroke
 * bursts in drawer inputs into a single `port.write` without making the
 * save-on-blur flow feel laggy.
 */
const STORAGE_DEBOUNCE_MS = 200;

function serialize(mules: Mule[]): string {
  return JSON.stringify({ schemaVersion: CURRENT_SCHEMA_VERSION, mules });
}

/**
 * Build a `MuleStore` bound to `port` (defaults to the **Default Storage
 * Port**). Each call produces an independent store with its own
 * closure-local `pending` + `timer` refs — no module-level state — so
 * tests can spin up many isolated stores in the same process.
 */
export function createMuleStore(port: StoragePort = defaultStoragePort): MuleStore {
  let pending: Mule[] | null = null;
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
    load(): Mule[] {
      return muleMigrate(port.read());
    },
    save(mules: Mule[]): void {
      pending = mules;
      if (timer !== null) clearTimeout(timer);
      timer = setTimeout(drain, STORAGE_DEBOUNCE_MS);
    },
    flush: drain,
  };
}
