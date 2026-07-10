import type { Mule } from '../types';
import { CURRENT_SCHEMA_VERSION, muleMigrate } from './muleMigrate';
import { createDebouncedStore, type DebouncedStore } from './debouncedStore';
import { defaultStoragePort } from './muleStorage';
import type { StoragePort } from './storagePort';

export type { StoragePort } from './storagePort';

/** `MuleStore` — the mule-data `DebouncedStore` consumed by `useMules`. */
export type MuleStore = DebouncedStore<Mule[]>;

function serialize(mules: Mule[]): string {
  return JSON.stringify({ schemaVersion: CURRENT_SCHEMA_VERSION, mules });
}

/**
 * Adapter binding `createDebouncedStore` to the mule **Schema Lineage**:
 * `muleMigrate` on load, `{ schemaVersion, mules }` on write, the
 * **Default Storage Port** unless a test injects its own.
 */
export function createMuleStore(port: StoragePort = defaultStoragePort): MuleStore {
  return createDebouncedStore<Mule[]>(port, { serialize, migrate: muleMigrate });
}
