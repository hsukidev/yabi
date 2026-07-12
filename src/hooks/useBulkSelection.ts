import { useCallback, useEffect, useRef, useState } from 'react';
import type { Mule } from '../types';
import { useBulkDragPaint } from './useBulkDragPaint';

/**
 * **Bulk Select Mode** lifecycle for the Dashboard: the mode flag, the
 * **Bulk-Selected Mule** set, and all the marshalling `useBulkDragPaint`
 * needs (live order/selection refs, exact-state setter). The gesture hook
 * itself stays surface-agnostic per ADR-0008 — this hook is the
 * selection-workflow side of that seam. The confirm UI (Bulk Action Bar
 * buttons) stays with the caller.
 *
 * The mode is **persistent**: no action exits it or clears the selection.
 * Cancel (`exitBulk`) is the only exit. Deleting prunes the deleted mules
 * from the selection and keeps the mode.
 */
export function useBulkSelection(
  mulesInWorld: readonly Mule[],
  deleteMules: (ids: string[]) => void,
): {
  bulkMode: boolean;
  toDelete: ReadonlySet<string>;
  /** Whether the whole World-Lens roster is currently selected (false when empty). */
  allSelected: boolean;
  enterBulk: () => void;
  exitBulk: () => void;
  toggleDelete: (id: string) => void;
  /** Select every mule in the World-Lens roster. */
  selectAll: () => void;
  /** Clear the selection without leaving Bulk Select Mode. */
  clearSelection: () => void;
  /**
   * Delete every Bulk-Selected mule, prune them from the selection, and
   * stay in Bulk Select Mode. No-op when nothing is selected.
   */
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

  // Select-all / clear read the live roster off `orderRef`, so both keep a
  // stable identity across selection and roster changes.
  const selectAll = useCallback(() => {
    setToDelete(new Set(orderRef.current));
  }, []);

  const clearSelection = useCallback(() => {
    setToDelete(new Set());
  }, []);

  // Persistent mode: deleting prunes the deleted mules from the selection and
  // keeps Bulk Select Mode. Cancel (`exitBulk`) is the only exit.
  const deleteSelected = useCallback(() => {
    if (toDelete.size === 0) return;
    const ids = [...toDelete];
    deleteMules(ids);
    setToDelete((prev) => {
      const next = new Set(prev);
      for (const id of ids) next.delete(id);
      return next;
    });
  }, [toDelete, deleteMules]);

  const allSelected =
    mulesInWorld.length > 0 && mulesInWorld.every((mule) => toDelete.has(mule.id));

  return {
    bulkMode,
    toDelete,
    allSelected,
    enterBulk,
    exitBulk,
    toggleDelete,
    selectAll,
    clearSelection,
    deleteSelected,
    dragPaintHandlers,
    isPaintEngaged,
  };
}
