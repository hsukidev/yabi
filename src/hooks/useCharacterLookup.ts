import { useCallback, useEffect, useRef, useState } from 'react';
import type { WorldId } from '../data/worlds';
import {
  lookupCharacter,
  type CharacterLookupResult,
} from '../lib/characterLookup/lookupCharacter';

/**
 * `useCharacterLookup` — wraps the `lookupCharacter` library with a
 * loading flag and an `AbortController` so closing the drawer (or
 * unmounting the hook for any reason) cancels the in-flight request.
 *
 * The hook does not own toast or `onUpdate` side-effects; the caller
 * pattern-matches on the discriminated union returned from `run()` and
 * decides what to do. Keeping side-effects in the caller means the
 * button can stay test-friendly (no global toast plumbing in this
 * hook's tests) and a future caller can re-use the same hook to drive
 * a different surface (bulk lookup, a settings preview, etc.).
 */
export interface UseCharacterLookupResult {
  loading: boolean;
  run: (args: { name: string; worldId: WorldId }) => Promise<CharacterLookupResult>;
}

export function useCharacterLookup(): UseCharacterLookupResult {
  const [loading, setLoading] = useState(false);
  const controllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => {
      controllerRef.current?.abort();
      controllerRef.current = null;
    };
  }, []);

  const run = useCallback(
    async (args: { name: string; worldId: WorldId }): Promise<CharacterLookupResult> => {
      // Cancel any prior in-flight request — only one lookup at a time.
      controllerRef.current?.abort();
      const controller = new AbortController();
      controllerRef.current = controller;
      setLoading(true);
      const result = await lookupCharacter({ ...args, signal: controller.signal });
      // `signal.aborted` covers both unmount (cleanup aborts) and a
      // superseding `run()` call (which aborts before kicking off).
      if (controller.signal.aborted) return { kind: 'aborted' };
      controllerRef.current = null;
      setLoading(false);
      return result;
    },
    [],
  );

  return { loading, run };
}
