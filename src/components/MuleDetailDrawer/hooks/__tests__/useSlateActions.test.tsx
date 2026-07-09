import { describe, expect, it, vi, beforeEach } from 'vitest';
import { act, renderHook } from '@testing-library/react';

const toastMock = vi.hoisted(() => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('../../../../lib/toast', () => toastMock);

import { useSlateActions } from '../useSlateActions';
import { bosses } from '../../../../data/bosses';
import { PRESET_FAMILIES, presetEntryKey } from '../../../../data/bossPresets';
import { MuleBossSlate } from '../../../../data/muleBossSlate';
import type { UserPreset } from '../../../../data/userPresets';

const LUCID_BOSS = bosses.find((b) => b.family === 'lucid')!;
const HARD_LUCID = `${LUCID_BOSS.id}:hard:weekly`;
const NORMAL_LUCID = `${LUCID_BOSS.id}:normal:weekly`;

const HORNTAIL_BOSS = bosses.find((b) => b.family === 'horntail')!;
const HORNTAIL_DAILY = `${HORNTAIL_BOSS.id}:chaos:daily`;

const BLACK_MAGE_BOSS = bosses.find((b) => b.family === 'black-mage')!;
const BLACK_MAGE_EXTREME = `${BLACK_MAGE_BOSS.id}:extreme:monthly`;

const BALDRIX_BOSS = bosses.find((b) => b.family === 'baldrix')!;

const CRA_KEYS = PRESET_FAMILIES.CRA.map((entry) => presetEntryKey(entry)!);
const CTENE_KEYS = PRESET_FAMILIES.CTENE.map((entry) => presetEntryKey(entry)!);

function makeSlate(keys: readonly string[]): MuleBossSlate {
  return MuleBossSlate.from(keys);
}

function preset(
  id: string,
  name: string,
  slateKeys: readonly string[],
  partySizes: Record<string, number> = {},
): UserPreset {
  return { id, name, slateKeys, partySizes };
}

/**
 * Pick `count` distinct-family Weekly Cadence keys, in `bosses[]`
 * declaration order. Used to fabricate at-the-cap slates for the
 * Weekly Crystal Cap gate tests.
 */
function pickDistinctWeeklyKeys(count: number): string[] {
  const picks: string[] = [];
  for (const b of bosses) {
    const diff = b.difficulty.find((d) => d.cadence === 'weekly');
    if (!diff) continue;
    picks.push(`${b.id}:${diff.tier}:weekly`);
    if (picks.length === count) break;
  }
  if (picks.length < count) {
    throw new Error(`Only found ${picks.length} weekly-capable families`);
  }
  return picks;
}

beforeEach(() => {
  toastMock.toast.error.mockClear();
  toastMock.toast.success.mockClear();
});

describe('useSlateActions', () => {
  describe('toggleKey', () => {
    it('dispatches onUpdate with slate.toggle(key).keys', () => {
      const onUpdate = vi.fn();
      const { result } = renderHook(() =>
        useSlateActions({
          muleId: 'mule-1',
          partySizes: {},
          slate: makeSlate([]),
          userPresets: [],
          onUpdate,
        }),
      );

      act(() => {
        result.current.toggleKey(HARD_LUCID);
      });
      expect(onUpdate).toHaveBeenCalledWith('mule-1', { selectedBosses: [HARD_LUCID] });
    });

    it('tier-swaps within a (bossId, cadence) bucket', () => {
      const onUpdate = vi.fn();
      const { result } = renderHook(() =>
        useSlateActions({
          muleId: 'mule-1',
          partySizes: {},
          slate: makeSlate([NORMAL_LUCID]),
          userPresets: [],
          onUpdate,
        }),
      );

      act(() => {
        result.current.toggleKey(HARD_LUCID);
      });
      expect(onUpdate).toHaveBeenCalledWith('mule-1', { selectedBosses: [HARD_LUCID] });
    });

    it('no-ops when muleId is null', () => {
      const onUpdate = vi.fn();
      const { result } = renderHook(() =>
        useSlateActions({
          muleId: null,
          partySizes: {},
          slate: makeSlate([]),
          userPresets: [],
          onUpdate,
        }),
      );

      act(() => {
        result.current.toggleKey(HARD_LUCID);
      });
      expect(onUpdate).not.toHaveBeenCalled();
    });
  });

  describe('toggleKey — Weekly Crystal Cap gate', () => {
    it('rejects a 15th weekly add: fires toast.error with the documented copy and skips onUpdate', () => {
      const fourteen = pickDistinctWeeklyKeys(14);
      const fifteenth = pickDistinctWeeklyKeys(15)[14];
      const onUpdate = vi.fn();
      const { result } = renderHook(() =>
        useSlateActions({
          muleId: 'mule-1',
          partySizes: {},
          slate: makeSlate(fourteen),
          userPresets: [],
          onUpdate,
        }),
      );

      act(() => {
        result.current.toggleKey(fifteenth);
      });
      expect(toastMock.toast.error).toHaveBeenCalledTimes(1);
      expect(toastMock.toast.error).toHaveBeenCalledWith('Weekly cap reached', {
        description: 'Remove a boss first',
      });
      expect(onUpdate).not.toHaveBeenCalled();
    });

    it('allows a weekly tier-swap at the cap: no toast, onUpdate fires', () => {
      // Derive the swap family from the capped slate rather than assuming any
      // one boss sits within the first 14 weekly picks. Pick a family already
      // in the slate that offers both a Normal and a Hard weekly tier; swapping
      // it Normal → Hard stays in the same bucket, so the count is unchanged.
      const fourteen = pickDistinctWeeklyKeys(14);
      const swapIdx = fourteen.findIndex((k) => {
        const boss = bosses.find((b) => b.id === k.split(':')[0])!;
        const weeklyTiers = new Set(
          boss.difficulty.filter((d) => d.cadence === 'weekly').map((d) => d.tier),
        );
        return weeklyTiers.has('normal') && weeklyTiers.has('hard');
      });
      expect(swapIdx).toBeGreaterThanOrEqual(0);
      const swapId = fourteen[swapIdx].split(':')[0];
      fourteen[swapIdx] = `${swapId}:normal:weekly`;
      const onUpdate = vi.fn();
      const { result } = renderHook(() =>
        useSlateActions({
          muleId: 'mule-1',
          partySizes: {},
          slate: makeSlate(fourteen),
          userPresets: [],
          onUpdate,
        }),
      );

      act(() => {
        result.current.toggleKey(`${swapId}:hard:weekly`);
      });
      expect(toastMock.toast.error).not.toHaveBeenCalled();
      expect(onUpdate).toHaveBeenCalledTimes(1);
    });

    it('allows a weekly remove at the cap: no toast, onUpdate fires', () => {
      const fourteen = pickDistinctWeeklyKeys(14);
      const onUpdate = vi.fn();
      const { result } = renderHook(() =>
        useSlateActions({
          muleId: 'mule-1',
          partySizes: {},
          slate: makeSlate(fourteen),
          userPresets: [],
          onUpdate,
        }),
      );

      act(() => {
        result.current.toggleKey(fourteen[0]);
      });
      expect(toastMock.toast.error).not.toHaveBeenCalled();
      expect(onUpdate).toHaveBeenCalledTimes(1);
    });

    it('allows a daily add at the weekly cap: no toast, onUpdate fires', () => {
      const fourteen = pickDistinctWeeklyKeys(14);
      const onUpdate = vi.fn();
      const { result } = renderHook(() =>
        useSlateActions({
          muleId: 'mule-1',
          partySizes: {},
          slate: makeSlate(fourteen),
          userPresets: [],
          onUpdate,
        }),
      );

      act(() => {
        result.current.toggleKey(HORNTAIL_DAILY);
      });
      expect(toastMock.toast.error).not.toHaveBeenCalled();
      expect(onUpdate).toHaveBeenCalledTimes(1);
    });
  });

  describe('applyPreset', () => {
    it('CUSTOM click is a no-op (no onUpdate, no errors)', () => {
      const onUpdate = vi.fn();
      const { result } = renderHook(() =>
        useSlateActions({
          muleId: 'mule-1',
          partySizes: {},
          slate: makeSlate([]),
          userPresets: [],
          onUpdate,
        }),
      );

      act(() => {
        result.current.applyPreset('CUSTOM');
      });
      expect(onUpdate).not.toHaveBeenCalled();
    });

    it('CUSTOM click on a CRA-equal slate is still a no-op', () => {
      const onUpdate = vi.fn();
      const { result } = renderHook(() =>
        useSlateActions({
          muleId: 'mule-1',
          partySizes: {},
          slate: makeSlate(CRA_KEYS),
          userPresets: [],
          onUpdate,
        }),
      );

      act(() => {
        result.current.applyPreset('CUSTOM');
      });
      expect(onUpdate).not.toHaveBeenCalled();
    });

    it('canonical click on Active Pill short-circuits (zero onUpdate)', () => {
      const onUpdate = vi.fn();
      const { result } = renderHook(() =>
        useSlateActions({
          muleId: 'mule-1',
          partySizes: {},
          slate: makeSlate(CRA_KEYS),
          userPresets: [],
          onUpdate,
        }),
      );

      act(() => {
        result.current.applyPreset('CRA');
      });
      expect(onUpdate).not.toHaveBeenCalled();
    });

    it('canonical click runs Conform when not the Active Pill', () => {
      const onUpdate = vi.fn();
      const { result } = renderHook(() =>
        useSlateActions({
          muleId: 'mule-1',
          partySizes: {},
          slate: makeSlate([]),
          userPresets: [],
          onUpdate,
        }),
      );

      act(() => {
        result.current.applyPreset('CRA');
      });
      expect(onUpdate).toHaveBeenCalledTimes(1);
      const update = onUpdate.mock.calls[0][1] as { selectedBosses: string[] };
      expect(new Set(update.selectedBosses)).toEqual(new Set(CRA_KEYS));
    });

    it('canonical click wipes non-preset weeklies (CRA + Baldrix → CRA)', () => {
      const baldrixKey = `${BALDRIX_BOSS.id}:hard:weekly`;
      const onUpdate = vi.fn();
      const initial = [...CRA_KEYS, baldrixKey];
      const { result } = renderHook(() =>
        useSlateActions({
          muleId: 'mule-1',
          partySizes: {},
          slate: makeSlate(initial),
          userPresets: [],
          onUpdate,
        }),
      );

      act(() => {
        result.current.applyPreset('CRA');
      });
      const update = onUpdate.mock.calls[0][1] as { selectedBosses: string[] };
      expect(update.selectedBosses).not.toContain(baldrixKey);
      for (const k of CRA_KEYS) expect(update.selectedBosses).toContain(k);
    });

    it('canonical swap CRA → CTENE adds CTENE keys', () => {
      const onUpdate = vi.fn();
      const { result } = renderHook(() =>
        useSlateActions({
          muleId: 'mule-1',
          partySizes: {},
          slate: makeSlate(CRA_KEYS),
          userPresets: [],
          onUpdate,
        }),
      );

      act(() => {
        result.current.applyPreset('CTENE');
      });
      const update = onUpdate.mock.calls[0][1] as { selectedBosses: string[] };
      for (const k of CTENE_KEYS) expect(update.selectedBosses).toContain(k);
    });

    it('wipes daily keys on conform (Full-Slate Equality: post-Conform is pure-Canonical)', () => {
      const onUpdate = vi.fn();
      const { result } = renderHook(() =>
        useSlateActions({
          muleId: 'mule-1',
          partySizes: {},
          slate: makeSlate([HORNTAIL_DAILY]),
          userPresets: [],
          onUpdate,
        }),
      );

      act(() => {
        result.current.applyPreset('CRA');
      });
      const update = onUpdate.mock.calls[0][1] as { selectedBosses: string[] };
      expect(update.selectedBosses).not.toContain(HORNTAIL_DAILY);
      for (const k of CRA_KEYS) expect(update.selectedBosses).toContain(k);
    });

    it('normalizes resulting keys through MuleBossSlate.from (Selection Invariant)', () => {
      const onUpdate = vi.fn();
      const { result } = renderHook(() =>
        useSlateActions({
          muleId: 'mule-1',
          partySizes: {},
          slate: makeSlate([]),
          userPresets: [],
          onUpdate,
        }),
      );

      act(() => {
        result.current.applyPreset('CRA');
      });
      const update = onUpdate.mock.calls[0][1] as { selectedBosses: string[] };
      expect(new Set(update.selectedBosses)).toEqual(
        new Set(MuleBossSlate.from(update.selectedBosses).keys),
      );
    });

    it('no-ops when muleId is null', () => {
      const onUpdate = vi.fn();
      const { result } = renderHook(() =>
        useSlateActions({
          muleId: null,
          partySizes: {},
          slate: makeSlate([]),
          userPresets: [],
          onUpdate,
        }),
      );

      act(() => {
        result.current.applyPreset('CRA');
      });
      expect(onUpdate).not.toHaveBeenCalled();
    });
  });

  describe('applyUserPreset', () => {
    it('replaces selectedBosses with the snapshot atomically', () => {
      const onUpdate = vi.fn();
      const customKeys = [HARD_LUCID, HORNTAIL_DAILY];
      const userPresets = [preset('p1', 'My Mix', customKeys)];
      const { result } = renderHook(() =>
        useSlateActions({
          muleId: 'mule-1',
          partySizes: {},
          slate: makeSlate(CRA_KEYS),
          userPresets,
          onUpdate,
        }),
      );

      act(() => {
        result.current.applyUserPreset('p1');
      });
      expect(onUpdate).toHaveBeenCalledTimes(1);
      const update = onUpdate.mock.calls[0][1] as { selectedBosses: string[] };
      expect(new Set(update.selectedBosses)).toEqual(new Set(customKeys));
      // Full replacement — none of the prior CRA keys leak through
      // (except those that happen to be in the snapshot, which here is none).
      for (const k of CRA_KEYS) {
        expect(update.selectedBosses).not.toContain(k);
      }
    });

    it('normalises the snapshot through MuleBossSlate.from (cap-validity)', () => {
      const onUpdate = vi.fn();
      // A snapshot containing a malformed key — MuleBossSlate.from drops it.
      const userPresets = [preset('p1', 'Mix', [HARD_LUCID, 'malformed:key'])];
      const { result } = renderHook(() =>
        useSlateActions({
          muleId: 'mule-1',
          partySizes: {},
          slate: makeSlate([]),
          userPresets,
          onUpdate,
        }),
      );

      act(() => {
        result.current.applyUserPreset('p1');
      });
      const update = onUpdate.mock.calls[0][1] as { selectedBosses: string[] };
      expect(update.selectedBosses).toEqual([HARD_LUCID]);
    });

    it('no-ops on an unknown presetId', () => {
      const onUpdate = vi.fn();
      const { result } = renderHook(() =>
        useSlateActions({
          muleId: 'mule-1',
          partySizes: {},
          slate: makeSlate([]),
          userPresets: [preset('p1', 'A', [HARD_LUCID])],
          onUpdate,
        }),
      );

      act(() => {
        result.current.applyUserPreset('does-not-exist');
      });
      expect(onUpdate).not.toHaveBeenCalled();
    });

    it('no-ops when muleId is null', () => {
      const onUpdate = vi.fn();
      const { result } = renderHook(() =>
        useSlateActions({
          muleId: null,
          partySizes: {},
          slate: makeSlate([]),
          userPresets: [preset('p1', 'A', [HARD_LUCID])],
          onUpdate,
        }),
      );

      act(() => {
        result.current.applyUserPreset('p1');
      });
      expect(onUpdate).not.toHaveBeenCalled();
    });

    it('replaces partySizes wholesale with the snapshot (residuals wiped)', () => {
      const onUpdate = vi.fn();
      const userPresets = [preset('p1', 'Sized', [HARD_LUCID], { lucid: 4 })];
      const { result } = renderHook(() =>
        useSlateActions({
          muleId: 'mule-1',
          partySizes: {},
          slate: makeSlate(CRA_KEYS),
          userPresets,
          onUpdate,
        }),
      );

      act(() => {
        result.current.applyUserPreset('p1');
      });
      const update = onUpdate.mock.calls[0][1] as {
        selectedBosses: string[];
        partySizes: Record<string, number>;
      };
      expect(update.partySizes).toEqual({ lucid: 4 });
    });

    it('applies monthly Black Mage keys and Black Mage party size from the snapshot', () => {
      const onUpdate = vi.fn();
      const userPresets = [
        preset('p1', 'Monthly BM', [HARD_LUCID, BLACK_MAGE_EXTREME], {
          lucid: 2,
          'black-mage': 6,
        }),
      ];
      const { result } = renderHook(() =>
        useSlateActions({
          muleId: 'mule-1',
          partySizes: {},
          slate: makeSlate([]),
          userPresets,
          onUpdate,
        }),
      );

      act(() => {
        result.current.applyUserPreset('p1');
      });
      const update = onUpdate.mock.calls[0][1] as {
        selectedBosses: string[];
        partySizes: Record<string, number>;
      };
      expect(new Set(update.selectedBosses)).toEqual(new Set([HARD_LUCID, BLACK_MAGE_EXTREME]));
      expect(update.partySizes).toEqual({ lucid: 2, 'black-mage': 6 });
    });

    it('short-circuits (zero onUpdate) when the snapshot already matches the current state', () => {
      const onUpdate = vi.fn();
      const userPresets = [preset('p1', 'Sized', [HARD_LUCID], { lucid: 4 })];
      const { result } = renderHook(() =>
        useSlateActions({
          muleId: 'mule-1',
          partySizes: { lucid: 4 },
          slate: makeSlate([HARD_LUCID]),
          userPresets,
          onUpdate,
        }),
      );

      act(() => {
        result.current.applyUserPreset('p1');
      });
      expect(onUpdate).not.toHaveBeenCalled();
    });
  });

  describe('resetBosses', () => {
    it('persists [] + {}', () => {
      const onUpdate = vi.fn();
      const { result } = renderHook(() =>
        useSlateActions({
          muleId: 'mule-1',
          partySizes: {},
          slate: makeSlate([HARD_LUCID]),
          userPresets: [],
          onUpdate,
        }),
      );

      act(() => {
        result.current.resetBosses();
      });
      expect(onUpdate).toHaveBeenCalledWith('mule-1', {
        selectedBosses: [],
        partySizes: {},
      });
    });

    it('payload contains selectedBosses and partySizes only', () => {
      const onUpdate = vi.fn();
      const { result } = renderHook(() =>
        useSlateActions({
          muleId: 'mule-1',
          partySizes: {},
          slate: makeSlate([HARD_LUCID]),
          userPresets: [],
          onUpdate,
        }),
      );

      act(() => {
        result.current.resetBosses();
      });
      const update = onUpdate.mock.calls[0][1];
      expect(Object.keys(update).sort()).toEqual(['partySizes', 'selectedBosses']);
    });

    it('no-ops when muleId is null', () => {
      const onUpdate = vi.fn();
      const { result } = renderHook(() =>
        useSlateActions({
          muleId: null,
          partySizes: {},
          slate: makeSlate([]),
          userPresets: [],
          onUpdate,
        }),
      );

      act(() => {
        result.current.resetBosses();
      });
      expect(onUpdate).not.toHaveBeenCalled();
    });
  });
});
