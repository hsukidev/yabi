import { describe, expect, it } from 'vitest';
import { act, renderHook } from '@testing-library/react';

import { useMatrixFilter } from '../useMatrixFilter';
import { bosses } from '../../../../data/bosses';
import { MuleBossSlate } from '../../../../data/muleBossSlate';

const VELLUM_BOSS = bosses.find((b) => b.family === 'vellum')!;
const CRIMSON_QUEEN_BOSS = bosses.find((b) => b.family === 'crimson-queen')!;
const BLACK_MAGE_BOSS = bosses.find((b) => b.family === 'black-mage')!;
const HORNTAIL_BOSS = bosses.find((b) => b.family === 'horntail')!;
const MORI_BOSS = bosses.find((b) => b.family === 'mori-ranmaru')!;
const FIRST_ADVERSARY_BOSS = bosses.find((b) => b.family === 'first-adversary')!;

function makeSlate(keys: readonly string[] = []): MuleBossSlate {
  return MuleBossSlate.from(keys);
}

describe('useMatrixFilter', () => {
  describe('visibleBosses (search + cadence filter)', () => {
    it('returns every family including Black Mage when search is empty and filter is All', () => {
      const { result } = renderHook(() =>
        useMatrixFilter({ muleId: 'mule-1', slate: makeSlate() }),
      );
      expect(result.current.visibleBosses.length).toBe(bosses.length);
      expect(result.current.visibleBosses.map((f) => f.family)).toContain('black-mage');
    });

    it('responds to search (narrows to families matching substring)', () => {
      const { result } = renderHook(() =>
        useMatrixFilter({ muleId: 'mule-1', slate: makeSlate() }),
      );

      act(() => {
        result.current.setSearch('vell');
      });
      expect(result.current.visibleBosses).toHaveLength(1);
      expect(result.current.visibleBosses[0].displayName).toBe(VELLUM_BOSS.name);
    });

    it('responds to cadence filter (Weekly hides daily-only and monthly-only families)', () => {
      const { result } = renderHook(() =>
        useMatrixFilter({ muleId: 'mule-1', slate: makeSlate() }),
      );

      act(() => {
        result.current.setFilter('Weekly');
      });
      const names = result.current.visibleBosses.map((f) => f.displayName);
      expect(names).not.toContain(HORNTAIL_BOSS.name);
      expect(names).not.toContain(MORI_BOSS.name);
      expect(names).not.toContain(BLACK_MAGE_BOSS.name);
      expect(names).toContain(FIRST_ADVERSARY_BOSS.name);
      expect(names).toContain(VELLUM_BOSS.name);
    });

    it('responds to cadence filter (Daily hides weekly-only families)', () => {
      const { result } = renderHook(() =>
        useMatrixFilter({ muleId: 'mule-1', slate: makeSlate() }),
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
        useMatrixFilter({ muleId: 'mule-1', slate: makeSlate() }),
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
        useMatrixFilter({ muleId: 'mule-1', slate: makeSlate() }),
      );

      act(() => {
        result.current.setSearch('VELL');
      });
      expect(result.current.visibleBosses).toHaveLength(1);
      expect(result.current.visibleBosses[0].displayName).toBe(VELLUM_BOSS.name);
    });

    it('search matches family slug (cri → Crimson Queen)', () => {
      const { result } = renderHook(() =>
        useMatrixFilter({ muleId: 'mule-1', slate: makeSlate() }),
      );

      act(() => {
        result.current.setSearch('cri');
      });
      expect(
        result.current.visibleBosses.some((f) => f.displayName === CRIMSON_QUEEN_BOSS.name),
      ).toBe(true);
    });

    it('Black Mage remains searchable when filter is All', () => {
      const { result } = renderHook(() =>
        useMatrixFilter({ muleId: 'mule-1', slate: makeSlate() }),
      );
      act(() => {
        result.current.setSearch('black mage');
      });
      expect(result.current.visibleBosses.map((f) => f.family)).toEqual(['black-mage']);
    });
  });

  describe('activeCadence (derived from filter)', () => {
    it('is undefined when filter is All', () => {
      const { result } = renderHook(() =>
        useMatrixFilter({ muleId: 'mule-1', slate: makeSlate() }),
      );
      expect(result.current.activeCadence).toBeUndefined();
    });

    it('is "daily" when filter is Daily', () => {
      const { result } = renderHook(() =>
        useMatrixFilter({ muleId: 'mule-1', slate: makeSlate() }),
      );
      act(() => {
        result.current.setFilter('Daily');
      });
      expect(result.current.activeCadence).toBe('daily');
    });

    it('is "weekly" when filter is Weekly', () => {
      const { result } = renderHook(() =>
        useMatrixFilter({ muleId: 'mule-1', slate: makeSlate() }),
      );
      act(() => {
        result.current.setFilter('Weekly');
      });
      expect(result.current.activeCadence).toBe('weekly');
    });
  });

  describe('Mule Switch reset', () => {
    it('auto-resets search and filter on muleId change', () => {
      const { result, rerender } = renderHook(
        ({ muleId }: { muleId: string | null }) => useMatrixFilter({ muleId, slate: makeSlate() }),
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

    it('does not reset when muleId is unchanged', () => {
      const { result, rerender } = renderHook(() =>
        useMatrixFilter({ muleId: 'mule-1', slate: makeSlate() }),
      );

      act(() => {
        result.current.setSearch('vell');
      });
      rerender();
      expect(result.current.search).toBe('vell');
    });
  });
});
