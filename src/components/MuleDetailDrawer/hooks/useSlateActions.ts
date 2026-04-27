import { useCallback } from 'react';
import type { Mule } from '../../../types';
import { MuleBossSlate } from '../../../data/muleBossSlate';
import { conform, isPresetActive } from '../../../data/bossPresets';
import { toast } from '../../../lib/toast';
import type { PresetKey } from '../../MatrixToolbar';

/**
 * The narrow `usePresetPill` view this hook needs to wire override-clearing
 * notifications without coupling to the full pill return shape.
 */
export interface PresetPillView {
  clickCustom: () => void;
  clickCanonical: () => void;
  notifyWeeklyToggle: () => void;
  notifyReset: () => void;
}

/**
 * Owns the **Slate Toggle**, **Boss Preset**, and **Matrix Reset** action
 * channels for the drawer's Boss Matrix view, and routes the preset-pill
 * override-clearing notifications at the right moments:
 *
 * - `toggleKey(key)` consults `slate.canToggle(key)` first and surfaces a
 *   `toast.error("Weekly cap reached", …)` when the predicate rejects (a
 *   weekly *add* on a slate already at the **Weekly Crystal Cap**),
 *   skipping `onUpdate` and the preset-pill notification entirely. When
 *   permitted it calls `slate.toggle(key)`. When `next.weeklyCount !==
 *   slate.weeklyCount` (a weekly toggle that can change canonical match
 *   status), it fires `pill.notifyWeeklyToggle()` so the **Custom Preset**
 *   override clears and the derivation reasserts. Daily toggles never
 *   notify — they can't change canonical match status, so the override is
 *   intentionally preserved.
 * - `applyPreset('CUSTOM')` only flips the override on via `pill.clickCustom()`;
 *   it never persists (pills are apply-only and CUSTOM has no entries).
 * - `applyPreset(canonical)` calls `pill.clickCanonical()` to clear the
 *   override, then short-circuits when `isPresetActive(preset, selectedBosses)`
 *   so re-clicking the **Active Pill** is a no-op (zero `onUpdate` calls).
 *   Otherwise it runs **Conform** and persists.
 * - `resetBosses()` fires `pill.notifyReset()` first (authoritative even when
 *   the matrix is already empty), then persists `selectedBosses: []` and
 *   `partySizes: {}`.
 *
 * All dispatchers no-op when `muleId === null`.
 */
export function useSlateActions({
  muleId,
  selectedBosses,
  slate,
  pill,
  onUpdate,
}: {
  muleId: string | null;
  selectedBosses: readonly string[];
  slate: MuleBossSlate;
  pill: PresetPillView;
  onUpdate: (id: string, patch: Partial<Omit<Mule, 'id'>>) => void;
}): {
  toggleKey: (key: string) => void;
  applyPreset: (preset: PresetKey) => void;
  resetBosses: () => void;
} {
  const toggleKey = useCallback(
    (key: string) => {
      if (!muleId) return;
      if (!slate.canToggle(key)) {
        toast.error('Weekly cap reached', { description: 'Remove a boss first.' });
        return;
      }
      const next = slate.toggle(key);
      if (next.weeklyCount !== slate.weeklyCount) pill.notifyWeeklyToggle();
      onUpdate(muleId, { selectedBosses: next.keys as string[] });
    },
    [muleId, slate, onUpdate, pill],
  );

  const applyPreset = useCallback(
    (preset: PresetKey) => {
      if (!muleId) return;
      if (preset === 'CUSTOM') {
        pill.clickCustom();
        return;
      }
      pill.clickCanonical();
      if (isPresetActive(preset, selectedBosses)) return;
      const next = conform(slate.keys, preset);
      onUpdate(muleId, {
        selectedBosses: MuleBossSlate.from(next).keys as string[],
      });
    },
    [muleId, slate, selectedBosses, onUpdate, pill],
  );

  const resetBosses = useCallback(() => {
    if (!muleId) return;
    pill.notifyReset();
    onUpdate(muleId, { selectedBosses: [], partySizes: {} });
  }, [muleId, onUpdate, pill]);

  return { toggleKey, applyPreset, resetBosses };
}
