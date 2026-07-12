import { describe, expect, it, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useBulkSelection } from '../useBulkSelection';
import type { Mule } from '../../types';

/**
 * Direct suite for `useBulkSelection` — the Bulk Delete Mode lifecycle
 * (mode flag, Deletion-Marked set, exact-state setter) plus the ref
 * marshalling into `useBulkDragPaint`. Previously this state lived loose
 * in Dashboard and was covered only through full-app renders; the gesture
 * mechanics themselves stay covered by bulkDragPaint.test.tsx.
 */

function muleFixture(id: string): Mule {
  return {
    id,
    name: id,
    level: 200,
    muleClass: 'Hero',
    selectedBosses: [],
    partySizes: {},
    active: true,
  };
}

const MULES = [muleFixture('a'), muleFixture('b'), muleFixture('c')];

function setup(mules: Mule[] = MULES) {
  const deleteMules = vi.fn();
  const view = renderHook(
    ({ mulesInWorld }: { mulesInWorld: Mule[] }) => useBulkSelection(mulesInWorld, deleteMules),
    { initialProps: { mulesInWorld: mules } },
  );
  return { deleteMules, ...view };
}

describe('useBulkSelection', () => {
  it('starts outside bulk mode with an empty selection', () => {
    const { result } = setup();
    expect(result.current.bulkMode).toBe(false);
    expect(result.current.toDelete.size).toBe(0);
  });

  it('enterBulk flips the mode on with a fresh selection', () => {
    const { result } = setup();
    act(() => {
      result.current.enterBulk();
    });
    expect(result.current.bulkMode).toBe(true);
    expect(result.current.toDelete.size).toBe(0);
  });

  it('toggleDelete adds then removes an id', () => {
    const { result } = setup();
    act(() => {
      result.current.enterBulk();
      result.current.toggleDelete('a');
    });
    expect(result.current.toDelete.has('a')).toBe(true);
    act(() => {
      result.current.toggleDelete('a');
    });
    expect(result.current.toDelete.has('a')).toBe(false);
  });

  it('exitBulk leaves the mode and clears the selection', () => {
    const { result } = setup();
    act(() => {
      result.current.enterBulk();
      result.current.toggleDelete('a');
    });
    act(() => {
      result.current.exitBulk();
    });
    expect(result.current.bulkMode).toBe(false);
    expect(result.current.toDelete.size).toBe(0);
  });

  it('re-entering bulk mode starts from an empty selection', () => {
    const { result } = setup();
    act(() => {
      result.current.enterBulk();
      result.current.toggleDelete('a');
      result.current.exitBulk();
    });
    act(() => {
      result.current.enterBulk();
    });
    expect(result.current.toDelete.size).toBe(0);
  });

  describe('deleteSelected (persistent Bulk Select Mode)', () => {
    it('deletes the selected ids, prunes them, and stays in bulk mode', () => {
      const { result, deleteMules } = setup();
      act(() => {
        result.current.enterBulk();
        result.current.toggleDelete('a');
        result.current.toggleDelete('c');
      });
      act(() => {
        result.current.deleteSelected();
      });
      expect(deleteMules).toHaveBeenCalledTimes(1);
      expect(new Set(deleteMules.mock.calls[0][0] as string[])).toEqual(new Set(['a', 'c']));
      // Persistent mode: mode stays on, deleted ids leave the selection.
      expect(result.current.bulkMode).toBe(true);
      expect(result.current.toDelete.size).toBe(0);
    });

    it('is a no-op on an empty selection and stays in bulk mode', () => {
      const { result, deleteMules } = setup();
      act(() => {
        result.current.enterBulk();
      });
      act(() => {
        result.current.deleteSelected();
      });
      expect(deleteMules).not.toHaveBeenCalled();
      expect(result.current.bulkMode).toBe(true);
    });

    it('Cancel (exitBulk) is the only exit from the mode', () => {
      const { result } = setup();
      act(() => {
        result.current.enterBulk();
        result.current.toggleDelete('a');
      });
      act(() => {
        result.current.deleteSelected();
      });
      // Still in mode after delete.
      expect(result.current.bulkMode).toBe(true);
      act(() => {
        result.current.exitBulk();
      });
      expect(result.current.bulkMode).toBe(false);
    });
  });

  describe('select all / clear selection', () => {
    it('selectAll selects every mule in the World-Lens roster', () => {
      const { result } = setup();
      act(() => {
        result.current.enterBulk();
        result.current.selectAll();
      });
      expect(result.current.toDelete).toEqual(new Set(['a', 'b', 'c']));
      expect(result.current.allSelected).toBe(true);
    });

    it('clearSelection empties the selection without leaving bulk mode', () => {
      const { result } = setup();
      act(() => {
        result.current.enterBulk();
        result.current.selectAll();
      });
      act(() => {
        result.current.clearSelection();
      });
      expect(result.current.toDelete.size).toBe(0);
      expect(result.current.bulkMode).toBe(true);
      expect(result.current.allSelected).toBe(false);
    });

    it('allSelected is false on a partial selection', () => {
      const { result } = setup();
      act(() => {
        result.current.enterBulk();
        result.current.toggleDelete('a');
      });
      expect(result.current.allSelected).toBe(false);
    });

    it('allSelected is false when the roster is empty', () => {
      const { result } = setup([]);
      act(() => {
        result.current.enterBulk();
      });
      expect(result.current.allSelected).toBe(false);
    });
  });

  it('exposes the drag-paint seam (handlers + engagement flag)', () => {
    const { result } = setup();
    expect(typeof result.current.dragPaintHandlers.onPointerDown).toBe('function');
    expect(typeof result.current.dragPaintHandlers.onClickCapture).toBe('function');
    expect(result.current.isPaintEngaged).toBe(false);
  });

  it('keeps stable identities for the lifecycle callbacks across selection changes', () => {
    const { result } = setup();
    const { enterBulk, exitBulk, toggleDelete, selectAll, clearSelection, deleteSelected } =
      result.current;
    act(() => {
      result.current.enterBulk();
      result.current.toggleDelete('b');
    });
    expect(result.current.enterBulk).toBe(enterBulk);
    expect(result.current.exitBulk).toBe(exitBulk);
    expect(result.current.toggleDelete).toBe(toggleDelete);
    expect(result.current.selectAll).toBe(selectAll);
    expect(result.current.clearSelection).toBe(clearSelection);
    // deleteSelected depends on the live selection by design (it reads toDelete).
    expect(typeof deleteSelected).toBe('function');
  });
});
