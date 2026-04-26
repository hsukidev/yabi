import { useCallback, useEffect, useMemo, useRef } from 'react';
import type { Mule } from '../../../types';

const PARTY_SIZE_MIN = 1;
const PARTY_SIZE_MAX = 6;

/**
 * Owns the **Party-Size Clamp** [1, 6] write path and the `stablePartySizes`
 * memo that keeps the prop's identity stable across renders, so `BossMatrix`
 * can rely on referential equality for its `partySizes` map.
 *
 * `setPartySize` no-ops when `muleId === null` (drawer open with no mule).
 */
export function usePartySizes({
  muleId,
  partySizes,
  onUpdate,
}: {
  muleId: string | null;
  partySizes: Mule['partySizes'];
  onUpdate: (id: string, patch: Partial<Omit<Mule, 'id'>>) => void;
}): {
  stablePartySizes: Record<string, number>;
  setPartySize: (family: string, n: number) => void;
} {
  const stablePartySizes = useMemo(() => partySizes ?? {}, [partySizes]);

  // Mirror `stablePartySizes` into a ref so `setPartySize` can read the latest
  // value without listing it as a dep — keeps the callback identity stable
  // across `partySizes` changes so `BossMatrix.memo` doesn't bail.
  const stablePartySizesRef = useRef(stablePartySizes);
  useEffect(() => {
    stablePartySizesRef.current = stablePartySizes;
  }, [stablePartySizes]);

  const setPartySize = useCallback(
    (family: string, n: number) => {
      if (!muleId) return;
      const clamped = Math.max(PARTY_SIZE_MIN, Math.min(PARTY_SIZE_MAX, n));
      onUpdate(muleId, {
        partySizes: { ...stablePartySizesRef.current, [family]: clamped },
      });
    },
    [muleId, onUpdate],
  );

  return { stablePartySizes, setPartySize };
}
