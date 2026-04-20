import { useCallback, useState } from 'react';

/**
 * Two-step delete confirmation state machine for the drawer's trash button.
 *
 * - `request()` flips `confirming` on without calling `onDelete` — the caller
 *   renders an inline "Delete?" prompt.
 * - `confirm()` calls `onDelete(muleId)` and the optional `onAfterDelete`
 *   (typically `onClose` so the drawer dismisses after the delete), then
 *   resets `confirming`.
 * - `cancel()` flips `confirming` off without touching `onDelete`.
 * - A `muleId` change auto-resets `confirming` so the next mule doesn't
 *   open pre-armed. Uses the render-time "reset state on prop change"
 *   pattern to keep the reset out of `useEffect`.
 *
 * `muleId === null` (drawer open but no mule selected) makes `confirm()` a
 * safe no-op — state still resets, but no delete fires.
 */
export function useDeleteConfirm({
  muleId,
  onDelete,
  onAfterDelete,
}: {
  muleId: string | null;
  onDelete: (id: string) => void;
  onAfterDelete?: () => void;
}): {
  confirming: boolean;
  request: () => void;
  confirm: () => void;
  cancel: () => void;
} {
  const [confirming, setConfirming] = useState(false);
  const [lastMuleId, setLastMuleId] = useState<string | null>(muleId);
  if (lastMuleId !== muleId) {
    setLastMuleId(muleId);
    setConfirming(false);
  }

  const request = useCallback(() => setConfirming(true), []);
  const cancel = useCallback(() => setConfirming(false), []);
  const confirm = useCallback(() => {
    if (muleId) {
      onDelete(muleId);
      onAfterDelete?.();
    }
    setConfirming(false);
  }, [muleId, onDelete, onAfterDelete]);

  return { confirming, request, confirm, cancel };
}
