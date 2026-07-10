import { createFallbackStoragePort } from './storagePort';

/**
 * **Default User Preset Storage Port** — the **User Preset Library's**
 * binding of the **Storage Fallback Ladder** (`createFallbackStoragePort`).
 * Writes under its own key so the user preset library has an independent
 * **Storage Lineage** from the mule data.
 */

export const USER_PRESET_STORAGE_KEY = 'maplestory-mule-tracker-user-presets';
const FALLBACK_KEY = 'maplestory-mule-tracker-user-presets-fallback';

export const defaultUserPresetStoragePort = createFallbackStoragePort(
  USER_PRESET_STORAGE_KEY,
  FALLBACK_KEY,
);
