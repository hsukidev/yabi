import { useCallback } from 'react';
import type { Mule } from '../../../types';
import { MuleBossSlate } from '../../../data/muleBossSlate';
import { clampPartySizes } from '../../../data/bosses';
import type { UserPreset } from '../../../data/userPresets';
import { toast } from '../../../lib/toast';
import type { PresetKey } from '../../MatrixToolbar';

/**
 * Owns the **Slate Toggle**, **Boss Preset**, **User Preset**, and
 * **Matrix Reset** action channels for the drawer's Boss Matrix view.
 *
 * - `toggleKey(key)` consults `slate.canToggle(key)` first and surfaces a
 *   `toast.error("Weekly cap reached", …)` when the predicate rejects
 *   (a weekly *add* on a slate already at the **Weekly Crystal Cap**),
 *   skipping `onUpdate` entirely. When permitted it calls
 *   `slate.toggle(key)` and persists.
 * - `applyPreset('CUSTOM')` is a **no-op**. The popover owns
 *   click-actions for the Custom Preset pill — opening the popover is
 *   the toolbar's responsibility, not this hook's.
 * - `applyPreset(canonical)` delegates to `slate.applyCanonical(preset)`
 *   and persists only when `changed === true`. The no-op short-circuit
 *   for an already-**Active Preset** lives inside the slate.
 * - `applyUserPreset(presetId)` looks up the snapshot in
 *   `userPresets[]`, runs `MuleBossSlate.from(snapshot.slateKeys)` for
 *   cap-validity normalisation, and replaces `selectedBosses` *and*
 *   `partySizes` atomically. Full replacement: residual `partySizes`
 *   entries on the live mule for families not in the snapshot are
 *   wiped. Snapshots saved from a cap-valid slate stay cap-valid; the
 *   slate normalisation is defensive (e.g. against a hand-edited
 *   `localStorage` payload).
 * - `resetBosses()` persists `selectedBosses: []` and `partySizes: {}`.
 *
 * All dispatchers no-op when `muleId === null`.
 */
export function useSlateActions({
  muleId,
  partySizes,
  slate,
  userPresets,
  onUpdate,
}: {
  muleId: string | null;
  partySizes: Record<string, number>;
  slate: MuleBossSlate;
  userPresets: readonly UserPreset[];
  onUpdate: (id: string, patch: Partial<Omit<Mule, 'id'>>) => void;
}): {
  toggleKey: (key: string) => void;
  applyPreset: (preset: PresetKey) => void;
  applyUserPreset: (presetId: string) => void;
  resetBosses: () => void;
} {
  const toggleKey = useCallback(
    (key: string) => {
      if (!muleId) return;
      if (!slate.canToggle(key)) {
        toast.error('Weekly cap reached', { description: 'Remove a boss first' });
        return;
      }
      const next = slate.toggle(key);
      onUpdate(muleId, { selectedBosses: next.keys as string[] });
    },
    [muleId, slate, onUpdate],
  );

  const applyPreset = useCallback(
    (preset: PresetKey) => {
      if (!muleId) return;
      // CUSTOM click is owned by the toolbar (popover open/close); the
      // pill's lit state is derived from the slate, not from a click.
      if (preset === 'CUSTOM') return;
      const next = slate.applyCanonical(preset);
      if (!next.changed) return;
      onUpdate(muleId, { selectedBosses: next.slate.keys as string[] });
    },
    [muleId, slate, onUpdate],
  );

  const applyUserPreset = useCallback(
    (presetId: string) => {
      if (!muleId) return;
      const snapshot = userPresets.find((p) => p.id === presetId);
      if (!snapshot) return;
      // Short-circuit when the snapshot already matches the current state — same
      // contract as `applyPreset` for canonical pills (zero `onUpdate` on re-click).
      if (slate.matchedUserPreset([snapshot], partySizes)) return;
      onUpdate(muleId, {
        selectedBosses: MuleBossSlate.from(snapshot.slateKeys).keys as string[],
        // Defensive re-clamp against each family's Max Party Size — loaded
        // snapshots are already clamped by `userPresetMigrate`, but this
        // guards a hand-edited in-memory preset the same way `from` guards
        // the slate keys.
        partySizes: clampPartySizes(snapshot.partySizes),
      });
    },
    [muleId, slate, partySizes, userPresets, onUpdate],
  );

  const resetBosses = useCallback(() => {
    if (!muleId) return;
    onUpdate(muleId, { selectedBosses: [], partySizes: {} });
  }, [muleId, onUpdate]);

  return { toggleKey, applyPreset, applyUserPreset, resetBosses };
}
