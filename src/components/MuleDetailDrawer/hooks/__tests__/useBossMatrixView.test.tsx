import { describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';

import { useBossMatrixView } from '../useBossMatrixView';
import { bosses } from '../../../../data/bosses';
import { PRESET_FAMILIES, presetEntryFamily, presetEntryKey } from '../../../../data/bossPresets';
import { MuleBossSlate } from '../../../../data/muleBossSlate';

const LUCID_BOSS = bosses.find((b) => b.family === 'lucid')!;
const HARD_LUCID = `${LUCID_BOSS.id}:hard:weekly`;
const NORMAL_LUCID = `${LUCID_BOSS.id}:normal:weekly`;

const WILL_BOSS = bosses.find((b) => b.family === 'will')!;
const HARD_WILL = `${WILL_BOSS.id}:hard:weekly`;

const VELLUM_BOSS = bosses.find((b) => b.family === 'vellum')!;
const CRIMSON_QUEEN_BOSS = bosses.find((b) => b.family === 'crimson-queen')!;
const BLACK_MAGE_BOSS = bosses.find((b) => b.family === 'black-mage')!;
const HORNTAIL_BOSS = bosses.find((b) => b.family === 'horntail')!;
const MORI_BOSS = bosses.find((b) => b.family === 'mori-ranmaru')!;

const CRA_KEYS = PRESET_FAMILIES.CRA.map((entry) => presetEntryKey(entry)!);
const LOMIEN_KEYS = PRESET_FAMILIES.LOMIEN.map((entry) => presetEntryKey(entry)!);
const CTENE_KEYS = PRESET_FAMILIES.CTENE.map((entry) => presetEntryKey(entry)!);

describe('useBossMatrixView', () => {
  describe('toggleKey', () => {
    it('dispatches onUpdate with slate.toggle(key).keys', () => {
      const onUpdate = vi.fn();
      const { result } = renderHook(() =>
        useBossMatrixView({
          muleId: 'mule-1',
          selectedBosses: [],
          partySizes: undefined,
          onUpdate,
        }),
      );

      act(() => {
        result.current.toggleKey(HARD_LUCID);
      });
      expect(onUpdate).toHaveBeenCalledTimes(1);
      expect(onUpdate).toHaveBeenCalledWith('mule-1', {
        selectedBosses: [HARD_LUCID],
      });
    });

    it('tier-swaps within a (bossId, cadence) bucket', () => {
      const onUpdate = vi.fn();
      const { result } = renderHook(() =>
        useBossMatrixView({
          muleId: 'mule-1',
          selectedBosses: [NORMAL_LUCID],
          partySizes: undefined,
          onUpdate,
        }),
      );

      act(() => {
        result.current.toggleKey(HARD_LUCID);
      });
      expect(onUpdate).toHaveBeenCalledWith('mule-1', {
        selectedBosses: [HARD_LUCID],
      });
    });

    it('no-ops when muleId is null', () => {
      const onUpdate = vi.fn();
      const { result } = renderHook(() =>
        useBossMatrixView({
          muleId: null,
          selectedBosses: [],
          partySizes: undefined,
          onUpdate,
        }),
      );

      act(() => {
        result.current.toggleKey(HARD_LUCID);
      });
      expect(onUpdate).not.toHaveBeenCalled();
    });
  });

  describe('togglePreset (Preset Swap)', () => {
    it('applies preset on empty selection', () => {
      const onUpdate = vi.fn();
      const { result } = renderHook(() =>
        useBossMatrixView({
          muleId: 'mule-1',
          selectedBosses: [],
          partySizes: undefined,
          onUpdate,
        }),
      );

      act(() => {
        result.current.togglePreset('CRA');
      });
      const update = onUpdate.mock.calls[0][1] as { selectedBosses: string[] };
      expect(new Set(update.selectedBosses)).toEqual(new Set(CRA_KEYS));
    });

    it('strips other active presets before applying (swap semantics)', () => {
      const onUpdate = vi.fn();
      const { result } = renderHook(() =>
        useBossMatrixView({
          muleId: 'mule-1',
          selectedBosses: CRA_KEYS,
          partySizes: undefined,
          onUpdate,
        }),
      );

      act(() => {
        result.current.togglePreset('CTENE');
      });
      const update = onUpdate.mock.calls[0][1] as { selectedBosses: string[] };
      // All CTENE keys present.
      for (const k of CTENE_KEYS) {
        expect(update.selectedBosses).toContain(k);
      }
      // CRA-only families cleared.
      const cteneFamilies = new Set(PRESET_FAMILIES.CTENE.map(presetEntryFamily));
      for (const entry of PRESET_FAMILIES.CRA) {
        if (cteneFamilies.has(presetEntryFamily(entry))) continue;
        expect(update.selectedBosses).not.toContain(presetEntryKey(entry)!);
      }
    });

    it('clicking the currently active preset deselects it', () => {
      const onUpdate = vi.fn();
      const { result } = renderHook(() =>
        useBossMatrixView({
          muleId: 'mule-1',
          selectedBosses: CRA_KEYS,
          partySizes: undefined,
          onUpdate,
        }),
      );

      act(() => {
        result.current.togglePreset('CRA');
      });
      const update = onUpdate.mock.calls[0][1] as { selectedBosses: string[] };
      expect(update.selectedBosses).toEqual([]);
    });

    it('preserves hand-picked non-preset keys on a swap', () => {
      const onUpdate = vi.fn();
      const HARD_HORNTAIL = `${HORNTAIL_BOSS.id}:chaos:daily`;
      const { result } = renderHook(() =>
        useBossMatrixView({
          muleId: 'mule-1',
          selectedBosses: [...CRA_KEYS, HARD_HORNTAIL],
          partySizes: undefined,
          onUpdate,
        }),
      );

      act(() => {
        result.current.togglePreset('CTENE');
      });
      const update = onUpdate.mock.calls[0][1] as { selectedBosses: string[] };
      expect(update.selectedBosses).toContain(HARD_HORNTAIL);
    });

    it('normalizes resulting keys through MuleBossSlate.from (Selection Invariant)', () => {
      const onUpdate = vi.fn();
      const { result } = renderHook(() =>
        useBossMatrixView({
          muleId: 'mule-1',
          selectedBosses: [],
          partySizes: undefined,
          onUpdate,
        }),
      );

      act(() => {
        result.current.togglePreset('CRA');
      });
      const update = onUpdate.mock.calls[0][1] as { selectedBosses: string[] };
      // `MuleBossSlate.from` round-trips to the same key set.
      expect(new Set(update.selectedBosses)).toEqual(
        new Set(MuleBossSlate.from(update.selectedBosses).keys),
      );
    });

    it('no-ops when muleId is null', () => {
      const onUpdate = vi.fn();
      const { result } = renderHook(() =>
        useBossMatrixView({
          muleId: null,
          selectedBosses: [],
          partySizes: undefined,
          onUpdate,
        }),
      );

      act(() => {
        result.current.togglePreset('CRA');
      });
      expect(onUpdate).not.toHaveBeenCalled();
    });
  });

  describe('activePresets', () => {
    it('is empty when no preset is fully selected', () => {
      const { result } = renderHook(() =>
        useBossMatrixView({
          muleId: 'mule-1',
          selectedBosses: [HARD_LUCID],
          partySizes: undefined,
          onUpdate: vi.fn(),
        }),
      );
      expect(result.current.activePresets.size).toBe(0);
    });

    it('includes CRA when all CRA keys selected', () => {
      const { result } = renderHook(() =>
        useBossMatrixView({
          muleId: 'mule-1',
          selectedBosses: CRA_KEYS,
          partySizes: undefined,
          onUpdate: vi.fn(),
        }),
      );
      expect(result.current.activePresets.has('CRA')).toBe(true);
    });

    it('excludes CRA when LOMIEN is active (LOMIEN supersedes)', () => {
      const { result } = renderHook(() =>
        useBossMatrixView({
          muleId: 'mule-1',
          selectedBosses: LOMIEN_KEYS,
          partySizes: undefined,
          onUpdate: vi.fn(),
        }),
      );
      expect(result.current.activePresets.has('LOMIEN')).toBe(true);
      expect(result.current.activePresets.has('CRA')).toBe(false);
    });
  });

  describe('setPartySize (Party-Size Clamp 1–6)', () => {
    it('dispatches onUpdate with the clamped partySizes map', () => {
      const onUpdate = vi.fn();
      const { result } = renderHook(() =>
        useBossMatrixView({
          muleId: 'mule-1',
          selectedBosses: [],
          partySizes: undefined,
          onUpdate,
        }),
      );

      act(() => {
        result.current.setPartySize('lucid', 3);
      });
      expect(onUpdate).toHaveBeenCalledWith('mule-1', {
        partySizes: { lucid: 3 },
      });
    });

    it('clamps values above 6 to 6', () => {
      const onUpdate = vi.fn();
      const { result } = renderHook(() =>
        useBossMatrixView({
          muleId: 'mule-1',
          selectedBosses: [],
          partySizes: { lucid: 6 },
          onUpdate,
        }),
      );

      act(() => {
        result.current.setPartySize('lucid', 99);
      });
      expect(onUpdate).toHaveBeenCalledWith('mule-1', {
        partySizes: { lucid: 6 },
      });
    });

    it('clamps values below 1 to 1', () => {
      const onUpdate = vi.fn();
      const { result } = renderHook(() =>
        useBossMatrixView({
          muleId: 'mule-1',
          selectedBosses: [],
          partySizes: { lucid: 1 },
          onUpdate,
        }),
      );

      act(() => {
        result.current.setPartySize('lucid', 0);
      });
      expect(onUpdate).toHaveBeenCalledWith('mule-1', {
        partySizes: { lucid: 1 },
      });
    });

    it('preserves other families in partySizes when updating one', () => {
      const onUpdate = vi.fn();
      const { result } = renderHook(() =>
        useBossMatrixView({
          muleId: 'mule-1',
          selectedBosses: [],
          partySizes: { 'black-mage': 3, lucid: 1 },
          onUpdate,
        }),
      );

      act(() => {
        result.current.setPartySize('lucid', 2);
      });
      expect(onUpdate).toHaveBeenCalledWith('mule-1', {
        partySizes: { 'black-mage': 3, lucid: 2 },
      });
    });

    it('no-ops when muleId is null', () => {
      const onUpdate = vi.fn();
      const { result } = renderHook(() =>
        useBossMatrixView({
          muleId: null,
          selectedBosses: [],
          partySizes: undefined,
          onUpdate,
        }),
      );

      act(() => {
        result.current.setPartySize('lucid', 3);
      });
      expect(onUpdate).not.toHaveBeenCalled();
    });
  });

  describe('visibleBosses (search + cadence filter)', () => {
    it('returns every family when search is empty and filter is All', () => {
      const { result } = renderHook(() =>
        useBossMatrixView({
          muleId: 'mule-1',
          selectedBosses: [],
          partySizes: undefined,
          onUpdate: vi.fn(),
        }),
      );
      expect(result.current.visibleBosses.length).toBe(bosses.length);
    });

    it('responds to search (narrows to families matching substring)', () => {
      const { result } = renderHook(() =>
        useBossMatrixView({
          muleId: 'mule-1',
          selectedBosses: [],
          partySizes: undefined,
          onUpdate: vi.fn(),
        }),
      );

      act(() => {
        result.current.setSearch('vell');
      });
      expect(result.current.visibleBosses).toHaveLength(1);
      expect(result.current.visibleBosses[0].displayName).toBe(VELLUM_BOSS.name);
    });

    it('responds to cadence filter (Weekly hides daily-only families)', () => {
      const { result } = renderHook(() =>
        useBossMatrixView({
          muleId: 'mule-1',
          selectedBosses: [],
          partySizes: undefined,
          onUpdate: vi.fn(),
        }),
      );

      act(() => {
        result.current.setFilter('Weekly');
      });
      const names = result.current.visibleBosses.map((f) => f.displayName);
      expect(names).not.toContain(HORNTAIL_BOSS.name);
      expect(names).not.toContain(MORI_BOSS.name);
      expect(names).toContain(BLACK_MAGE_BOSS.name);
      expect(names).toContain(VELLUM_BOSS.name);
    });

    it('responds to cadence filter (Daily hides weekly-only families)', () => {
      const { result } = renderHook(() =>
        useBossMatrixView({
          muleId: 'mule-1',
          selectedBosses: [],
          partySizes: undefined,
          onUpdate: vi.fn(),
        }),
      );

      act(() => {
        result.current.setFilter('Daily');
      });
      const names = result.current.visibleBosses.map((f) => f.displayName);
      expect(names).not.toContain(BLACK_MAGE_BOSS.name);
      expect(names).toContain(HORNTAIL_BOSS.name);
      expect(names).toContain(VELLUM_BOSS.name);
    });

    it('composes search + filter (Weekly + "vell" → Vellum only)', () => {
      const { result } = renderHook(() =>
        useBossMatrixView({
          muleId: 'mule-1',
          selectedBosses: [],
          partySizes: undefined,
          onUpdate: vi.fn(),
        }),
      );

      act(() => {
        result.current.setFilter('Weekly');
      });
      act(() => {
        result.current.setSearch('vell');
      });
      expect(result.current.visibleBosses).toHaveLength(1);
      expect(result.current.visibleBosses[0].displayName).toBe(VELLUM_BOSS.name);
    });

    it('is case-insensitive (VELL matches Vellum)', () => {
      const { result } = renderHook(() =>
        useBossMatrixView({
          muleId: 'mule-1',
          selectedBosses: [],
          partySizes: undefined,
          onUpdate: vi.fn(),
        }),
      );

      act(() => {
        result.current.setSearch('VELL');
      });
      expect(result.current.visibleBosses).toHaveLength(1);
      expect(result.current.visibleBosses[0].displayName).toBe(VELLUM_BOSS.name);
    });

    it('search matches family slug (cri → Crimson Queen)', () => {
      const { result } = renderHook(() =>
        useBossMatrixView({
          muleId: 'mule-1',
          selectedBosses: [],
          partySizes: undefined,
          onUpdate: vi.fn(),
        }),
      );

      act(() => {
        result.current.setSearch('cri');
      });
      expect(
        result.current.visibleBosses.some((f) => f.displayName === CRIMSON_QUEEN_BOSS.name),
      ).toBe(true);
    });
  });

  describe('muleId change', () => {
    it('auto-resets search and filter on muleId change', () => {
      const { result, rerender } = renderHook(
        ({ muleId }: { muleId: string | null }) =>
          useBossMatrixView({
            muleId,
            selectedBosses: [],
            partySizes: undefined,
            onUpdate: vi.fn(),
          }),
        { initialProps: { muleId: 'mule-1' as string | null } },
      );

      act(() => {
        result.current.setSearch('vell');
      });
      act(() => {
        result.current.setFilter('Weekly');
      });
      expect(result.current.search).toBe('vell');
      expect(result.current.filter).toBe('Weekly');

      rerender({ muleId: 'mule-2' });

      expect(result.current.search).toBe('');
      expect(result.current.filter).toBe('All');
    });
  });

  describe('weeklyCount', () => {
    it('counts weekly selections', () => {
      const { result } = renderHook(() =>
        useBossMatrixView({
          muleId: 'mule-1',
          selectedBosses: [HARD_LUCID, HARD_WILL],
          partySizes: undefined,
          onUpdate: vi.fn(),
        }),
      );
      expect(result.current.weeklyCount).toBe(2);
    });

    it('returns 0 when no selections', () => {
      const { result } = renderHook(() =>
        useBossMatrixView({
          muleId: 'mule-1',
          selectedBosses: [],
          partySizes: undefined,
          onUpdate: vi.fn(),
        }),
      );
      expect(result.current.weeklyCount).toBe(0);
    });
  });

  describe('stablePartySizes', () => {
    it('keeps identity stable across renders when partySizes does not change', () => {
      const partySizes = { lucid: 2 };
      const { result, rerender } = renderHook(() =>
        useBossMatrixView({
          muleId: 'mule-1',
          selectedBosses: [],
          partySizes,
          onUpdate: vi.fn(),
        }),
      );
      const first = result.current.stablePartySizes;
      rerender();
      expect(result.current.stablePartySizes).toBe(first);
    });

    it('returns an empty object for undefined input', () => {
      const { result } = renderHook(() =>
        useBossMatrixView({
          muleId: 'mule-1',
          selectedBosses: [],
          partySizes: undefined,
          onUpdate: vi.fn(),
        }),
      );
      expect(result.current.stablePartySizes).toEqual({});
    });
  });

  describe('resetBosses', () => {
    it('dispatches onUpdate with empty selectedBosses', () => {
      const onUpdate = vi.fn();
      const { result } = renderHook(() =>
        useBossMatrixView({
          muleId: 'mule-1',
          selectedBosses: [HARD_LUCID],
          partySizes: undefined,
          onUpdate,
        }),
      );

      act(() => {
        result.current.resetBosses();
      });
      expect(onUpdate).toHaveBeenCalledTimes(1);
      expect(onUpdate).toHaveBeenCalledWith('mule-1', { selectedBosses: [] });
    });

    it('payload contains only selectedBosses', () => {
      const onUpdate = vi.fn();
      const { result } = renderHook(() =>
        useBossMatrixView({
          muleId: 'mule-1',
          selectedBosses: [HARD_LUCID],
          partySizes: undefined,
          onUpdate,
        }),
      );

      act(() => {
        result.current.resetBosses();
      });
      const update = onUpdate.mock.calls[0][1];
      expect(Object.keys(update)).toEqual(['selectedBosses']);
    });

    it('no-ops when muleId is null', () => {
      const onUpdate = vi.fn();
      const { result } = renderHook(() =>
        useBossMatrixView({
          muleId: null,
          selectedBosses: [],
          partySizes: undefined,
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
