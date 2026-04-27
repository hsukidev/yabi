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

const LUCID_BOSS = bosses.find((b) => b.family === 'lucid')!;
const HARD_LUCID = `${LUCID_BOSS.id}:hard:weekly`;
const NORMAL_LUCID = `${LUCID_BOSS.id}:normal:weekly`;

const HORNTAIL_BOSS = bosses.find((b) => b.family === 'horntail')!;
const HORNTAIL_DAILY = `${HORNTAIL_BOSS.id}:chaos:daily`;

const ARKARIUM_BOSS = bosses.find((b) => b.family === 'arkarium')!;

const CRA_KEYS = PRESET_FAMILIES.CRA.map((entry) => presetEntryKey(entry)!);
const CTENE_KEYS = PRESET_FAMILIES.CTENE.map((entry) => presetEntryKey(entry)!);

function makePill() {
  return {
    clickCustom: vi.fn<() => void>(),
    clickCanonical: vi.fn<() => void>(),
    notifyWeeklyToggle: vi.fn<() => void>(),
    notifyReset: vi.fn<() => void>(),
  };
}

function makeSlate(keys: readonly string[]): MuleBossSlate {
  return MuleBossSlate.from(keys);
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
      const pill = makePill();
      const { result } = renderHook(() =>
        useSlateActions({
          muleId: 'mule-1',
          selectedBosses: [],
          slate: makeSlate([]),
          pill,
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
      const pill = makePill();
      const { result } = renderHook(() =>
        useSlateActions({
          muleId: 'mule-1',
          selectedBosses: [NORMAL_LUCID],
          slate: makeSlate([NORMAL_LUCID]),
          pill,
          onUpdate,
        }),
      );

      act(() => {
        result.current.toggleKey(HARD_LUCID);
      });
      expect(onUpdate).toHaveBeenCalledWith('mule-1', { selectedBosses: [HARD_LUCID] });
    });

    it('calls pill.notifyWeeklyToggle when weeklyCount changes (toggle ON)', () => {
      const pill = makePill();
      const { result } = renderHook(() =>
        useSlateActions({
          muleId: 'mule-1',
          selectedBosses: [],
          slate: makeSlate([]),
          pill,
          onUpdate: vi.fn(),
        }),
      );

      act(() => {
        result.current.toggleKey(HARD_LUCID);
      });
      expect(pill.notifyWeeklyToggle).toHaveBeenCalledTimes(1);
    });

    it('calls pill.notifyWeeklyToggle when weeklyCount changes (toggle OFF)', () => {
      const pill = makePill();
      const { result } = renderHook(() =>
        useSlateActions({
          muleId: 'mule-1',
          selectedBosses: [HARD_LUCID],
          slate: makeSlate([HARD_LUCID]),
          pill,
          onUpdate: vi.fn(),
        }),
      );

      act(() => {
        result.current.toggleKey(HARD_LUCID);
      });
      expect(pill.notifyWeeklyToggle).toHaveBeenCalledTimes(1);
    });

    it('does NOT call pill.notifyWeeklyToggle on a tier-swap (weeklyCount unchanged)', () => {
      const pill = makePill();
      const { result } = renderHook(() =>
        useSlateActions({
          muleId: 'mule-1',
          selectedBosses: [NORMAL_LUCID],
          slate: makeSlate([NORMAL_LUCID]),
          pill,
          onUpdate: vi.fn(),
        }),
      );

      act(() => {
        result.current.toggleKey(HARD_LUCID);
      });
      expect(pill.notifyWeeklyToggle).not.toHaveBeenCalled();
    });

    it('does NOT call pill.notifyWeeklyToggle when toggling a daily key', () => {
      const pill = makePill();
      const { result } = renderHook(() =>
        useSlateActions({
          muleId: 'mule-1',
          selectedBosses: [],
          slate: makeSlate([]),
          pill,
          onUpdate: vi.fn(),
        }),
      );

      act(() => {
        result.current.toggleKey(HORNTAIL_DAILY);
      });
      expect(pill.notifyWeeklyToggle).not.toHaveBeenCalled();
    });

    it('no-ops when muleId is null', () => {
      const onUpdate = vi.fn();
      const pill = makePill();
      const { result } = renderHook(() =>
        useSlateActions({
          muleId: null,
          selectedBosses: [],
          slate: makeSlate([]),
          pill,
          onUpdate,
        }),
      );

      act(() => {
        result.current.toggleKey(HARD_LUCID);
      });
      expect(onUpdate).not.toHaveBeenCalled();
      expect(pill.notifyWeeklyToggle).not.toHaveBeenCalled();
    });
  });

  describe('toggleKey — Weekly Crystal Cap gate', () => {
    it('rejects a 15th weekly add: fires toast.error with the documented copy and skips onUpdate/pill', () => {
      const fourteen = pickDistinctWeeklyKeys(14);
      const fifteenth = pickDistinctWeeklyKeys(15)[14];
      const onUpdate = vi.fn();
      const pill = makePill();
      const { result } = renderHook(() =>
        useSlateActions({
          muleId: 'mule-1',
          selectedBosses: fourteen,
          slate: makeSlate(fourteen),
          pill,
          onUpdate,
        }),
      );

      act(() => {
        result.current.toggleKey(fifteenth);
      });
      expect(toastMock.toast.error).toHaveBeenCalledTimes(1);
      expect(toastMock.toast.error).toHaveBeenCalledWith('Weekly cap reached', {
        description: 'Remove a boss first.',
      });
      expect(onUpdate).not.toHaveBeenCalled();
      expect(pill.notifyWeeklyToggle).not.toHaveBeenCalled();
    });

    it('allows a weekly tier-swap at the cap: no toast, onUpdate fires', () => {
      const fourteen = pickDistinctWeeklyKeys(14);
      const lucidIdx = fourteen.findIndex((k) => k.startsWith(`${LUCID_BOSS.id}:`));
      expect(lucidIdx).toBeGreaterThanOrEqual(0);
      fourteen[lucidIdx] = NORMAL_LUCID;
      const onUpdate = vi.fn();
      const pill = makePill();
      const { result } = renderHook(() =>
        useSlateActions({
          muleId: 'mule-1',
          selectedBosses: fourteen,
          slate: makeSlate(fourteen),
          pill,
          onUpdate,
        }),
      );

      act(() => {
        result.current.toggleKey(HARD_LUCID);
      });
      expect(toastMock.toast.error).not.toHaveBeenCalled();
      expect(onUpdate).toHaveBeenCalledTimes(1);
    });

    it('allows a weekly remove at the cap: no toast, onUpdate fires', () => {
      const fourteen = pickDistinctWeeklyKeys(14);
      const onUpdate = vi.fn();
      const pill = makePill();
      const { result } = renderHook(() =>
        useSlateActions({
          muleId: 'mule-1',
          selectedBosses: fourteen,
          slate: makeSlate(fourteen),
          pill,
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
      const pill = makePill();
      const { result } = renderHook(() =>
        useSlateActions({
          muleId: 'mule-1',
          selectedBosses: fourteen,
          slate: makeSlate(fourteen),
          pill,
          onUpdate,
        }),
      );

      act(() => {
        result.current.toggleKey(HORNTAIL_DAILY);
      });
      expect(toastMock.toast.error).not.toHaveBeenCalled();
      expect(onUpdate).toHaveBeenCalledTimes(1);
    });

    it('allows a monthly add at the weekly cap: no toast, onUpdate fires', () => {
      const fourteen = pickDistinctWeeklyKeys(14);
      const blackMageBoss = bosses.find((b) => b.family === 'black-mage')!;
      const bmExtreme = `${blackMageBoss.id}:extreme:monthly`;
      const onUpdate = vi.fn();
      const pill = makePill();
      const { result } = renderHook(() =>
        useSlateActions({
          muleId: 'mule-1',
          selectedBosses: fourteen,
          slate: makeSlate(fourteen),
          pill,
          onUpdate,
        }),
      );

      act(() => {
        result.current.toggleKey(bmExtreme);
      });
      expect(toastMock.toast.error).not.toHaveBeenCalled();
      expect(onUpdate).toHaveBeenCalledTimes(1);
    });

    it('rapid repeat clicks at the cap fire one toast per click (no dedupe at this layer)', () => {
      const fourteen = pickDistinctWeeklyKeys(14);
      const fifteenth = pickDistinctWeeklyKeys(15)[14];
      const pill = makePill();
      const { result } = renderHook(() =>
        useSlateActions({
          muleId: 'mule-1',
          selectedBosses: fourteen,
          slate: makeSlate(fourteen),
          pill,
          onUpdate: vi.fn(),
        }),
      );

      act(() => {
        result.current.toggleKey(fifteenth);
        result.current.toggleKey(fifteenth);
        result.current.toggleKey(fifteenth);
      });
      expect(toastMock.toast.error).toHaveBeenCalledTimes(3);
    });
  });

  describe('applyPreset', () => {
    it('CUSTOM click calls pill.clickCustom and does not persist', () => {
      const onUpdate = vi.fn();
      const pill = makePill();
      const { result } = renderHook(() =>
        useSlateActions({
          muleId: 'mule-1',
          selectedBosses: [],
          slate: makeSlate([]),
          pill,
          onUpdate,
        }),
      );

      act(() => {
        result.current.applyPreset('CUSTOM');
      });
      expect(pill.clickCustom).toHaveBeenCalledTimes(1);
      expect(onUpdate).not.toHaveBeenCalled();
    });

    it('CUSTOM click does not call pill.clickCanonical', () => {
      const pill = makePill();
      const { result } = renderHook(() =>
        useSlateActions({
          muleId: 'mule-1',
          selectedBosses: CRA_KEYS,
          slate: makeSlate(CRA_KEYS),
          pill,
          onUpdate: vi.fn(),
        }),
      );

      act(() => {
        result.current.applyPreset('CUSTOM');
      });
      expect(pill.clickCanonical).not.toHaveBeenCalled();
    });

    it('canonical click on Active Pill short-circuits (zero onUpdate, but clears override)', () => {
      const onUpdate = vi.fn();
      const pill = makePill();
      const { result } = renderHook(() =>
        useSlateActions({
          muleId: 'mule-1',
          selectedBosses: CRA_KEYS,
          slate: makeSlate(CRA_KEYS),
          pill,
          onUpdate,
        }),
      );

      act(() => {
        result.current.applyPreset('CRA');
      });
      expect(onUpdate).not.toHaveBeenCalled();
      // Override clearing must happen even on the Active Pill so a stale
      // CUSTOM override doesn't survive a confirming canonical click.
      expect(pill.clickCanonical).toHaveBeenCalledTimes(1);
    });

    it('canonical click runs Conform when not the Active Pill', () => {
      const onUpdate = vi.fn();
      const pill = makePill();
      const { result } = renderHook(() =>
        useSlateActions({
          muleId: 'mule-1',
          selectedBosses: [],
          slate: makeSlate([]),
          pill,
          onUpdate,
        }),
      );

      act(() => {
        result.current.applyPreset('CRA');
      });
      expect(onUpdate).toHaveBeenCalledTimes(1);
      const update = onUpdate.mock.calls[0][1] as { selectedBosses: string[] };
      expect(new Set(update.selectedBosses)).toEqual(new Set(CRA_KEYS));
      expect(pill.clickCanonical).toHaveBeenCalledTimes(1);
    });

    it('canonical click wipes non-preset weeklies (CRA + Arkarium → CRA)', () => {
      const arkariumKey = `${ARKARIUM_BOSS.id}:normal:weekly`;
      const onUpdate = vi.fn();
      const pill = makePill();
      const initial = [...CRA_KEYS, arkariumKey];
      const { result } = renderHook(() =>
        useSlateActions({
          muleId: 'mule-1',
          selectedBosses: initial,
          slate: makeSlate(initial),
          pill,
          onUpdate,
        }),
      );

      act(() => {
        result.current.applyPreset('CRA');
      });
      const update = onUpdate.mock.calls[0][1] as { selectedBosses: string[] };
      expect(update.selectedBosses).not.toContain(arkariumKey);
      for (const k of CRA_KEYS) expect(update.selectedBosses).toContain(k);
    });

    it('canonical swap CRA → CTENE adds CTENE keys', () => {
      const onUpdate = vi.fn();
      const pill = makePill();
      const { result } = renderHook(() =>
        useSlateActions({
          muleId: 'mule-1',
          selectedBosses: CRA_KEYS,
          slate: makeSlate(CRA_KEYS),
          pill,
          onUpdate,
        }),
      );

      act(() => {
        result.current.applyPreset('CTENE');
      });
      const update = onUpdate.mock.calls[0][1] as { selectedBosses: string[] };
      for (const k of CTENE_KEYS) expect(update.selectedBosses).toContain(k);
    });

    it('preserves daily keys on conform', () => {
      const onUpdate = vi.fn();
      const pill = makePill();
      const { result } = renderHook(() =>
        useSlateActions({
          muleId: 'mule-1',
          selectedBosses: [HORNTAIL_DAILY],
          slate: makeSlate([HORNTAIL_DAILY]),
          pill,
          onUpdate,
        }),
      );

      act(() => {
        result.current.applyPreset('CRA');
      });
      const update = onUpdate.mock.calls[0][1] as { selectedBosses: string[] };
      expect(update.selectedBosses).toContain(HORNTAIL_DAILY);
    });

    it('normalizes resulting keys through MuleBossSlate.from (Selection Invariant)', () => {
      const onUpdate = vi.fn();
      const pill = makePill();
      const { result } = renderHook(() =>
        useSlateActions({
          muleId: 'mule-1',
          selectedBosses: [],
          slate: makeSlate([]),
          pill,
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
      const pill = makePill();
      const { result } = renderHook(() =>
        useSlateActions({
          muleId: null,
          selectedBosses: [],
          slate: makeSlate([]),
          pill,
          onUpdate,
        }),
      );

      act(() => {
        result.current.applyPreset('CRA');
      });
      expect(onUpdate).not.toHaveBeenCalled();
      expect(pill.clickCanonical).not.toHaveBeenCalled();
    });
  });

  describe('resetBosses', () => {
    it('calls pill.notifyReset and persists [] + {}', () => {
      const onUpdate = vi.fn();
      const pill = makePill();
      const { result } = renderHook(() =>
        useSlateActions({
          muleId: 'mule-1',
          selectedBosses: [HARD_LUCID],
          slate: makeSlate([HARD_LUCID]),
          pill,
          onUpdate,
        }),
      );

      act(() => {
        result.current.resetBosses();
      });
      expect(pill.notifyReset).toHaveBeenCalledTimes(1);
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
          selectedBosses: [HARD_LUCID],
          slate: makeSlate([HARD_LUCID]),
          pill: makePill(),
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
      const pill = makePill();
      const { result } = renderHook(() =>
        useSlateActions({
          muleId: null,
          selectedBosses: [],
          slate: makeSlate([]),
          pill,
          onUpdate,
        }),
      );

      act(() => {
        result.current.resetBosses();
      });
      expect(onUpdate).not.toHaveBeenCalled();
      expect(pill.notifyReset).not.toHaveBeenCalled();
    });
  });
});
