import type { StoragePort } from './muleStore';

/**
 * **Default Storage Port** — binds the generic `StoragePort` interface to
 * `window.localStorage` (primary) and `window.sessionStorage` (fallback).
 * Implements the **Storage Fallback Ladder** on both read and write:
 *
 * - `read()` tries `localStorage.getItem`; if that throws or returns
 *   `null`, it tries `sessionStorage.getItem`; returns `null` if both
 *   fail.
 * - `write(data)` tries `localStorage.setItem`; on throw (e.g.
 *   `QuotaExceededError`), falls through to `sessionStorage.setItem`;
 *   on a second throw it swallows silently (state still lives in React).
 *
 * The port deals only in raw strings — JSON (de)serialization happens in
 * `muleStore.ts`, so tests that inject an in-memory port never touch
 * JSON at all.
 */

export const STORAGE_KEY = 'maplestory-mule-tracker';
const FALLBACK_KEY = 'maplestory-mule-tracker-fallback';

export const defaultStoragePort: StoragePort = {
  read(): string | null {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      if (data !== null) return data;
    } catch {
      // fall through to sessionStorage
    }
    try {
      return sessionStorage.getItem(FALLBACK_KEY);
    } catch {
      return null;
    }
  },
  write(data: string): void {
    try {
      localStorage.setItem(STORAGE_KEY, data);
      return;
    } catch {
      // fall through to sessionStorage
    }
    try {
      sessionStorage.setItem(FALLBACK_KEY, data);
    } catch {
      // Both storages failed; data persists in React state only.
    }
  },
};
