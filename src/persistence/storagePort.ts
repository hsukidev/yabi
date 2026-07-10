/**
 * `StoragePort` — the narrow outbound seam every persisted store writes
 * through. Two primitives: `read()` returns the raw persisted string (or
 * `null` when nothing is stored / storage failed), `write(data)` persists
 * the raw string. JSON (de)serialization and each store's schema lineage
 * live above the port; the port itself knows nothing about the domain.
 */
export interface StoragePort {
  read(): string | null;
  write(data: string): void;
}

/**
 * Build a `StoragePort` implementing the **Storage Fallback Ladder** over
 * `window.localStorage` (primary, under `primaryKey`) and
 * `window.sessionStorage` (fallback, under `fallbackKey`):
 *
 * - `read()` tries `localStorage.getItem(primaryKey)`; if that throws or
 *   returns `null`, it tries `sessionStorage.getItem(fallbackKey)`;
 *   returns `null` if both fail.
 * - `write(data)` tries `localStorage.setItem(primaryKey, data)`; on throw
 *   (e.g. `QuotaExceededError`), falls through to
 *   `sessionStorage.setItem(fallbackKey, data)`; on a second throw it
 *   swallows silently (state still lives in React).
 *
 * The port deals only in raw strings, so tests that inject an in-memory
 * port never touch JSON at all.
 */
export function createFallbackStoragePort(primaryKey: string, fallbackKey: string): StoragePort {
  return {
    read(): string | null {
      try {
        const data = localStorage.getItem(primaryKey);
        if (data !== null) return data;
      } catch {
        // fall through to sessionStorage
      }
      try {
        return sessionStorage.getItem(fallbackKey);
      } catch {
        return null;
      }
    },
    write(data: string): void {
      try {
        localStorage.setItem(primaryKey, data);
        return;
      } catch {
        // fall through to sessionStorage
      }
      try {
        sessionStorage.setItem(fallbackKey, data);
      } catch {
        // Both storages failed; data persists in React state only.
      }
    },
  };
}
