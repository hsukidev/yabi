import type { UserPreset } from '../data/userPresets';
import { CURRENT_USER_PRESET_SCHEMA_VERSION, userPresetMigrate } from './userPresetMigrate';
import { createDebouncedStore, type DebouncedStore } from './debouncedStore';
import { defaultUserPresetStoragePort } from './userPresetStorage';
import type { StoragePort } from './storagePort';

export { CURRENT_USER_PRESET_SCHEMA_VERSION, userPresetMigrate } from './userPresetMigrate';

/**
 * `UserPresetStore` — the **User Preset Library's** `DebouncedStore`,
 * consumed by `useUserPresets`. Uses its own `StoragePort` (separate
 * `localStorage` key) so the **Storage Lineage** is independent from the
 * mule data.
 */
export type UserPresetStore = DebouncedStore<UserPreset[]>;

function serialize(presets: UserPreset[]): string {
  return JSON.stringify({
    schemaVersion: CURRENT_USER_PRESET_SCHEMA_VERSION,
    userPresets: presets,
  });
}

/**
 * Adapter binding `createDebouncedStore` to the user-preset lineage:
 * `userPresetMigrate` on load, `{ schemaVersion, userPresets }` on write,
 * the **Default User Preset Storage Port** unless a test injects its own.
 */
export function createUserPresetStore(
  port: StoragePort = defaultUserPresetStoragePort,
): UserPresetStore {
  return createDebouncedStore<UserPreset[]>(port, { serialize, migrate: userPresetMigrate });
}
