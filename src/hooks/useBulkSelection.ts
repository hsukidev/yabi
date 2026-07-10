import { useCallback, useEffect, useRef, useState } from 'react';
import type { Mule } from '../types';
import { useBulkDragPaint } from './useBulkDragPaint';

/**
 * **Bulk Delete Mode** lifecycle for the Dashboard: the mode flag, the
 * **Deletion-Marked** set, and all the marshalling `useBulkDragPaint`
 * needs (live order/selection refs, exact-state setter). The gesture hook
 * itself stays surface-agnostic per ADR-0008 — this hook is the
 * delete-workflow side of that seam. The confirm UI (Roster Header
 * buttons) stays with the caller.
 */
export function useBulkSelection(
  mulesInWorld: readonly Mule[],
  deleteMules: (ids: string[]) => void,
): {
  bulkMode: boolean;
  toDelete: ReadonlySet<string>;
  enterBulk: () => void;
  exitBulk: () => void;
  toggleDelete: (id: string) => void;
  /** Delete every Deletion-Marked mule and exit bulk mode. No-op when nothing is marked. */
  deleteSelected: () => void;
  dragPaintHandlers: ReturnType<typeof useBulkDragPaint>['handlers'];
  isPaintEngaged: boolean;
} {
  const [bulkMode, setBulkMode] = useState(false);
  const [toDelete, setToDelete] = useState<Set<string>>(() => new Set());

  const enterBulk = useCallback(() => {
    setBulkMode(true);
    setToDelete(new Set());
  }, []);

  const exitBulk = useCallback(() => {
    setBulkMode(false);
    setToDelete(new Set());
  }, []);

  const toggleDelete = useCallback((id: string) => {
    setToDelete((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  // Exact-state setter used by the drag-paint hook. Returning `prev` when
  // the value already matches keeps React from scheduling a re-render on
  // every move frame that brushes an already-correct card.
  const setSelected = useCallback((id: string, shouldBeSelected: boolean) => {
    setToDelete((prev) => {
      if (prev.has(id) === shouldBeSelected) return prev;
      const next = new Set(prev);
      if (shouldBeSelected) next.add(id);
      else next.delete(id);
      return next;
    });
  }, []);

  // Live refs for the drag-paint hook: mule order feeds range math, and
  // `isSelected` drives the Original Snapshot. Routing through refs lets
  // the hook read current values across multi-frame gestures without
  // recreating its callbacks on every toggle.
  const orderRef = useRef<string[]>([]);
  useEffect(() => {
    orderRef.current = mulesInWorld.map((m) => m.id);
  }, [mulesInWorld]);

  const toDeleteRef = useRef(toDelete);
  useEffect(() => {
    toDeleteRef.current = toDelete;
  }, [toDelete]);

  const isSelected = useCallback((id: string) => toDeleteRef.current.has(id), []);

  const { handlers: dragPaintHandlers, isPaintEngaged } = useBulkDragPaint({
    enabled: bulkMode,
    orderRef,
    isSelected,
    setSelected,
  });

  const deleteSelected = useCallback(() => {
    if (toDelete.size === 0) return;
    deleteMules([...toDelete]);
    exitBulk();
  }, [toDelete, deleteMules, exitBulk]);

  return {
    bulkMode,
    toDelete,
    enterBulk,
    exitBulk,
    toggleDelete,
    deleteSelected,
    dragPaintHandlers,
    isPaintEngaged,
  };
}
