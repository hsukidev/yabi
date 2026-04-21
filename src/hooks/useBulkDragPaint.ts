import { useCallback, useEffect, useRef } from 'react';

/**
 * iPhone Photos-style drag-to-select gesture for Bulk Delete Mode.
 *
 * Owns all pointer state as refs so the drag produces zero re-renders from
 * the hook itself. On first `pointermove` after `pointerdown`, snapshots
 * every Mule's current selection (the Original Snapshot) and fixes the
 * Brush polarity from the inverse of the Start Card's snapshot value. The
 * Paint Range is recomputed on every move as
 * `[min(startIdx, curIdx), max(startIdx, curIdx)]` in Roster order; Mules
 * that leave the range revert to their Original Snapshot, Mules that enter
 * adopt the Brush. Zero-move pointerup falls through to the single-click
 * `toggle` path. `pointercancel` reverts everything. `onClickCapture`
 * swallows the browser's trailing synthetic click after an engaged gesture
 * so the Start Card isn't double-toggled.
 *
 * `pointermove` / `pointerup` / `pointercancel` are attached to `document`
 * while a gesture is active. This mirrors pointer-capture semantics
 * (events keep flowing even if the pointer leaves the boundary) but is
 * portable across JSDOM and real browsers without relying on
 * `setPointerCapture` support.
 */

type Brush = 'add' | 'remove';

interface Args {
  enabled: boolean;
  orderRef: React.RefObject<string[]>;
  isSelected: (id: string) => boolean;
  setSelected: (id: string, shouldBeSelected: boolean) => void;
}

interface PaintedRange {
  lo: number;
  hi: number;
}

interface Handlers {
  onPointerDown: (e: React.PointerEvent<HTMLElement>) => void;
  onClickCapture: (e: React.MouseEvent<HTMLElement>) => void;
}

function cardIdFromTarget(target: EventTarget | null): string | null {
  if (!(target instanceof Element)) return null;
  const card = target.closest('[data-mule-card]');
  if (!card) return null;
  return card.getAttribute('data-mule-card');
}

function cardIdFromPoint(x: number, y: number): string | null {
  // JSDOM doesn't implement `elementFromPoint` by default — guard so an
  // unrelated bulk-mode test that fires pointer events without mocking it
  // doesn't throw. Real browsers always provide this API.
  if (typeof document.elementFromPoint !== 'function') return null;
  const el = document.elementFromPoint(x, y);
  if (!el) return null;
  const card = el.closest('[data-mule-card]');
  if (!card) return null;
  return card.getAttribute('data-mule-card');
}

export function useBulkDragPaint({ enabled, orderRef, isSelected, setSelected }: Args): Handlers {
  const startIdRef = useRef<string | null>(null);
  const startIdxRef = useRef<number | null>(null);
  const pointerIdRef = useRef<number | null>(null);
  const brushRef = useRef<Brush | null>(null);
  const originalRef = useRef<Map<string, boolean>>(new Map());
  const paintedRangeRef = useRef<PaintedRange | null>(null);
  const suppressClickRef = useRef(false);
  // Document-level listener cleanup. Kept in a ref so pointerup/cancel can
  // remove the same functions we added on pointerdown.
  const detachDocListenersRef = useRef<(() => void) | null>(null);

  const resetGesture = useCallback(() => {
    startIdRef.current = null;
    startIdxRef.current = null;
    pointerIdRef.current = null;
    brushRef.current = null;
    originalRef.current = new Map();
    paintedRangeRef.current = null;
    if (detachDocListenersRef.current) {
      detachDocListenersRef.current();
      detachDocListenersRef.current = null;
    }
  }, []);

  const revertAll = useCallback(() => {
    const snapshot = originalRef.current;
    snapshot.forEach((wasSelected, id) => {
      setSelected(id, wasSelected);
    });
  }, [setSelected]);

  const applyRangeDiff = useCallback(
    (next: PaintedRange) => {
      const order = orderRef.current;
      const prev = paintedRangeRef.current;
      const brush = brushRef.current;
      if (brush === null) return;
      const brushValue = brush === 'add';
      // Cards leaving the range → revert to Original Snapshot.
      if (prev) {
        for (let i = prev.lo; i <= prev.hi; i += 1) {
          if (i < next.lo || i > next.hi) {
            const id = order[i];
            if (id === undefined) continue;
            const original = originalRef.current.get(id);
            if (original === undefined) continue;
            setSelected(id, original);
          }
        }
      }
      // Cards entering the range → adopt Brush.
      for (let i = next.lo; i <= next.hi; i += 1) {
        if (prev && i >= prev.lo && i <= prev.hi) continue;
        const id = order[i];
        if (id === undefined) continue;
        setSelected(id, brushValue);
      }
      paintedRangeRef.current = next;
    },
    [orderRef, setSelected],
  );

  const engageAtStart = useCallback(() => {
    const startId = startIdRef.current;
    const startIdx = startIdxRef.current;
    if (startId === null || startIdx === null) return;
    const snapshot = new Map<string, boolean>();
    for (const id of orderRef.current) {
      snapshot.set(id, isSelected(id));
    }
    originalRef.current = snapshot;
    const wasSelected = snapshot.get(startId) ?? false;
    brushRef.current = wasSelected ? 'remove' : 'add';
    paintedRangeRef.current = null;
    applyRangeDiff({ lo: startIdx, hi: startIdx });
  }, [applyRangeDiff, isSelected, orderRef]);

  const handleMove = useCallback(
    (e: PointerEvent) => {
      if (startIdRef.current === null || startIdxRef.current === null) return;
      if (pointerIdRef.current !== null && e.pointerId !== pointerIdRef.current) return;
      if (brushRef.current === null) {
        engageAtStart();
      }
      const curId = cardIdFromPoint(e.clientX, e.clientY);
      if (curId === null) return;
      const curIdx = orderRef.current.indexOf(curId);
      if (curIdx < 0) return;
      const startIdx = startIdxRef.current;
      const lo = Math.min(startIdx, curIdx);
      const hi = Math.max(startIdx, curIdx);
      applyRangeDiff({ lo, hi });
    },
    [applyRangeDiff, engageAtStart, orderRef],
  );

  const handleUp = useCallback(
    (e: PointerEvent) => {
      if (startIdRef.current === null) return;
      if (pointerIdRef.current !== null && e.pointerId !== pointerIdRef.current) return;
      const engaged = brushRef.current !== null;
      if (engaged) {
        // Engaged gesture → suppress the trailing synthetic click so the
        // Start Card isn't double-toggled by its panel's onClick.
        suppressClickRef.current = true;
      }
      // Zero-move release is a no-op for the hook — the browser's trailing
      // synthetic click fires through to the Character Card's existing
      // onClick, which already calls `toggleDelete`. That preserves today's
      // single-click behaviour without risking a double-toggle.
      resetGesture();
    },
    [resetGesture],
  );

  const handleCancel = useCallback(
    (e: PointerEvent) => {
      if (startIdRef.current === null) {
        resetGesture();
        return;
      }
      if (pointerIdRef.current !== null && e.pointerId !== pointerIdRef.current) return;
      if (brushRef.current !== null) {
        revertAll();
      }
      resetGesture();
    },
    [resetGesture, revertAll],
  );

  const onPointerDown = useCallback(
    (e: React.PointerEvent<HTMLElement>) => {
      if (!enabled) return;
      const id = cardIdFromTarget(e.target);
      if (!id) return;
      const idx = orderRef.current.indexOf(id);
      if (idx < 0) return;
      startIdRef.current = id;
      startIdxRef.current = idx;
      pointerIdRef.current = e.pointerId;
      brushRef.current = null;
      originalRef.current = new Map();
      paintedRangeRef.current = null;
      // Clear any leftover suppress flag. If the previous gesture released
      // outside the boundary and the browser never fired a trailing click,
      // the flag could be stuck true and would otherwise swallow the next
      // real click.
      suppressClickRef.current = false;

      // Attach document-level listeners for the duration of the gesture.
      // This keeps the gesture alive even if the pointer leaves the boundary
      // element mid-drag, and avoids depending on setPointerCapture (which
      // JSDOM doesn't implement).
      if (detachDocListenersRef.current) {
        detachDocListenersRef.current();
      }
      document.addEventListener('pointermove', handleMove);
      document.addEventListener('pointerup', handleUp);
      document.addEventListener('pointercancel', handleCancel);
      detachDocListenersRef.current = () => {
        document.removeEventListener('pointermove', handleMove);
        document.removeEventListener('pointerup', handleUp);
        document.removeEventListener('pointercancel', handleCancel);
      };
    },
    [enabled, handleCancel, handleMove, handleUp, orderRef],
  );

  const onClickCapture = useCallback((e: React.MouseEvent<HTMLElement>) => {
    if (!suppressClickRef.current) return;
    suppressClickRef.current = false;
    e.preventDefault();
    e.stopPropagation();
  }, []);

  // Detach any in-flight document listeners on unmount so we don't leak.
  useEffect(() => {
    return () => {
      if (detachDocListenersRef.current) {
        detachDocListenersRef.current();
        detachDocListenersRef.current = null;
      }
    };
  }, []);

  return {
    onPointerDown,
    onClickCapture,
  };
}
