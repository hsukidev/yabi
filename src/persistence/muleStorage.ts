import { createFallbackStoragePort } from './storagePort';

/**
 * **Default Storage Port** — the mule data binding of the **Storage
 * Fallback Ladder** (`createFallbackStoragePort`): `localStorage` primary,
 * `sessionStorage` fallback, swallow on double failure.
 */

export const STORAGE_KEY = 'maplestory-mule-tracker';
const FALLBACK_KEY = 'maplestory-mule-tracker-fallback';

export const defaultStoragePort = createFallbackStoragePort(STORAGE_KEY, FALLBACK_KEY);
