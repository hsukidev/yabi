import { useCallback, useMemo, useState } from 'react';
import { isPresetActive, type CanonicalPresetKey } from '../../../data/bossPresets';
import type { PresetKey } from '../../MatrixToolbar';

const CANONICAL_PRESETS: readonly CanonicalPresetKey[] = ['CRA', 'LOMIEN', 'CTENE'];

/**
 * Owns the **Preset Pill** state machine: the transient `customClicked`
 * override and the `activePill` derivation by **Same-Cadence Equality**.
 *
 * Derivation order:
 * 1. Override wins unconditionally — a Custom click confirms even on an
 *    empty matrix and beats a canonical match.
 * 2. With no weekly selection and no override, no pill lights.
 * 3. Otherwise the first canonical preset that matches lights, falling
 *    back to `'CUSTOM'` when no canonical match exists but weekly ≥ 1.
 *
 * Auto-clearing rules (reads — fired in render via the React-supported
 * "store info from previous renders" pattern):
 * - **Mule Switch**: a fresh `muleId` clears the override.
 * - **Selection Empty**: a non-empty → empty transition clears the
 *   override (e.g. parent reset / deselect-all).
 *
 * Action-driven clearing rules (writes — explicit notify channels the
 * caller invokes):
 * - `clickCustom()`: lights `'CUSTOM'` (visible click confirmation).
 * - `clickCanonical()`: clears the override; derivation picks.
 * - `notifyWeeklyToggle()`: clears the override after a weekly slate
 *   toggle persists (caller passes only `next.weeklyCount !==
 *   slate.weeklyCount` toggles — daily toggles leave it intact since
 *   they can't change canonical match status).
 * - `notifyReset()`: clears the override on Matrix Reset (authoritative
 *   even when the matrix is already empty, where the empty-transition
 *   effect wouldn't fire).
 */
export function usePresetPill({
  muleId,
  selectedBosses,
  weeklyCount,
}: {
  muleId: string | null;
  selectedBosses: readonly string[];
  weeklyCount: number;
}): {
  activePill: PresetKey | null;
  clickCustom: () => void;
  clickCanonical: () => void;
  notifyWeeklyToggle: () => void;
  notifyReset: () => void;
} {
  const [customClicked, setCustomClicked] = useState(false);

  const [lastMuleId, setLastMuleId] = useState<string | null>(muleId);
  if (lastMuleId !== muleId) {
    setLastMuleId(muleId);
    setCustomClicked(false);
  }

  const selectionEmpty = selectedBosses.length === 0;
  const [wasSelectionEmpty, setWasSelectionEmpty] = useState(selectionEmpty);
  if (wasSelectionEmpty !== selectionEmpty) {
    setWasSelectionEmpty(selectionEmpty);
    if (selectionEmpty) setCustomClicked(false);
  }

  const activePill = useMemo<PresetKey | null>(() => {
    if (customClicked) return 'CUSTOM';
    if (weeklyCount === 0) return null;
    const canonical = CANONICAL_PRESETS.find((p) => isPresetActive(p, selectedBosses));
    return canonical ?? 'CUSTOM';
  }, [customClicked, weeklyCount, selectedBosses]);

  const clickCustom = useCallback(() => setCustomClicked(true), []);
  const clickCanonical = useCallback(() => setCustomClicked(false), []);
  const notifyWeeklyToggle = useCallback(() => setCustomClicked(false), []);
  const notifyReset = useCallback(() => setCustomClicked(false), []);

  // The four callbacks have empty `useCallback` deps and are guaranteed
  // stable, so they're omitted from the memo deps. Object identity becomes
  // stable iff `activePill` is stable, which is the contract `useSlateActions`
  // and `BossMatrix.memo` rely on to avoid spurious callback churn.
  return useMemo(
    () => ({
      activePill,
      clickCustom,
      clickCanonical,
      notifyWeeklyToggle,
      notifyReset,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [activePill],
  );
}
