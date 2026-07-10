import { useCallback, useEffect, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import type { UserPreset } from '../data/userPresets';
import { getBossById } from '../data/bosses';
import { parseKey } from '../data/bossPresets';
import { createUserPresetStore } from '../persistence/userPresetStore';
import { usePersistedState } from './usePersistedState';

const MAX_NAME_LENGTH = 40;

/**
 * Capture-only-snapshot-families: build the snapshot's `partySizes` from
 * the live mule's record, restricted to families that appear in
 * `slateKeys`. Each captured family resolves to `mulePartySizes[family]
 * ?? 1` so the default-aware match in `MuleBossSlate.matchedUserPreset`
 * doesn't have to carry the empty/1 distinction at compare time.
 */
function captureSnapshotPartySizes(
  slateKeys: readonly string[],
  mulePartySizes: Record<string, number>,
): Record<string, number> {
  const families = new Set<string>();
  for (const key of slateKeys) {
    const parsed = parseKey(key);
    if (!parsed) continue;
    const boss = getBossById(parsed.bossId);
    if (boss) families.add(boss.family);
  }
  const captured: Record<string, number> = {};
  for (const family of families) {
    captured[family] = mulePartySizes[family] ?? 1;
  }
  return captured;
}

// Module-scope singleton — the hook is itself used as a singleton
// (App-wide state) so one store instance is the right shape.
const store = createUserPresetStore();

/**
 * Outcome of `createUserPreset`. Discriminated union so callers can
 * surface the right UI state (red border + tooltip on `'empty'`,
 * collision tooltip on `'duplicate'`) without pattern-matching strings.
 *
 * The hook owns the validation rules:
 * - `'empty'` — name is empty (or whitespace-only) after trim.
 * - `'duplicate'` — case-insensitive name match against an existing
 *   preset.
 * - `'too-long'` — > 40 chars after trim. The popover's input enforces
 *   `maxLength={40}` upstream, but the hook is the source of truth.
 */
export type CreateUserPresetResult =
  | { ok: true; preset: UserPreset }
  | { ok: false; reason: 'empty' | 'duplicate' | 'too-long' };

/**
 * React CRUD facade over the **User Preset Store**. Mirrors `useMules`
 * shape: state lives in React, the store handles persistence with a
 * 200ms **Storage Debounce** and `flush()` on `pagehide`/`beforeunload`.
 *
 * Owns name validation (trim + non-empty + case-insensitive unique +
 * `≤ 40` chars). Memoises the array reference around mutation so
 * downstream `useMemo`/memo barriers don't bust on unrelated rerenders.
 */
export function useUserPresets(): {
  userPresets: UserPreset[];
  createUserPreset: (
    name: string,
    slateKeys: readonly string[],
    mulePartySizes?: Record<string, number>,
  ) => CreateUserPresetResult;
  deleteUserPreset: (id: string) => void;
} {
  const [userPresets, setUserPresets] = usePersistedState(store);

  // Read current presets through a ref so `createUserPreset` can return its
  // outcome synchronously (the `setUserPresets` updater fires asynchronously
  // and would leave the caller staring at `null`). The ref tracks the
  // committed array so collision checks see the latest state, not whatever
  // was captured in `useCallback`'s closure.
  const userPresetsRef = useRef(userPresets);
  useEffect(() => {
    userPresetsRef.current = userPresets;
  }, [userPresets]);

  const createUserPreset = useCallback(
    (
      name: string,
      slateKeys: readonly string[],
      mulePartySizes: Record<string, number> = {},
    ): CreateUserPresetResult => {
      const trimmed = name.trim();
      if (trimmed.length === 0) return { ok: false, reason: 'empty' };
      if (trimmed.length > MAX_NAME_LENGTH) return { ok: false, reason: 'too-long' };
      const lower = trimmed.toLowerCase();
      const collision = userPresetsRef.current.some((p) => p.name.toLowerCase() === lower);
      if (collision) return { ok: false, reason: 'duplicate' };
      const preset: UserPreset = {
        id: uuidv4(),
        name: trimmed,
        slateKeys: [...slateKeys],
        partySizes: captureSnapshotPartySizes(slateKeys, mulePartySizes),
      };
      userPresetsRef.current = [...userPresetsRef.current, preset];
      setUserPresets(userPresetsRef.current);
      return { ok: true, preset };
    },
    [setUserPresets],
  );

  const deleteUserPreset = useCallback(
    (id: string) => {
      setUserPresets((prev) => {
        const next = prev.filter((p) => p.id !== id);
        return next.length === prev.length ? prev : next;
      });
    },
    [setUserPresets],
  );

  return { userPresets, createUserPreset, deleteUserPreset };
}
