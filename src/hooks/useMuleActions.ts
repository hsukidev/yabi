import { useCallback, useEffect, useRef } from 'react';
import { useMules } from './useMules';
import { toast } from '../lib/toast';

export function useMuleActions() {
  const {
    mules,
    deleteMule: baseDeleteMule,
    deleteMules: baseDeleteMules,
    restoreMule,
    restoreMules,
    ...rest
  } = useMules();

  // Route `mules` reads through a ref so the delete callbacks keep a stable
  // identity — consumers like memoized <MuleCharacterCard> pass deleteMule
  // as a prop, and listing `mules` in deps would bust memoization on every
  // state change.
  const mulesRef = useRef(mules);
  useEffect(() => {
    mulesRef.current = mules;
  }, [mules]);

  const deleteMule = useCallback(
    (id: string) => {
      const current = mulesRef.current;
      const index = current.findIndex((m) => m.id === id);
      if (index < 0) return;
      const snapshot = current[index];
      baseDeleteMule(id);
      const name = snapshot.name.trim() || 'Mule';
      toast.success('Successfully deleted', {
        description: `${name} removed from roster`,
        action: { label: 'Undo', onClick: () => restoreMule(snapshot, index) },
      });
    },
    [baseDeleteMule, restoreMule],
  );

  const deleteMules = useCallback(
    (ids: string[]) => {
      if (ids.length === 0) return;
      const current = mulesRef.current;
      const idSet = new Set(ids);
      const snapshots = current
        .map((mule, index) => ({ mule, index }))
        .filter(({ mule }) => idSet.has(mule.id));
      if (snapshots.length === 0) return;
      baseDeleteMules(ids);
      const count = snapshots.length;
      const description =
        count === 1
          ? `${snapshots[0].mule.name.trim() || 'Mule'} removed from roster`
          : `${count} mules removed`;
      toast.success('Successfully deleted', {
        description,
        action: { label: 'Undo', onClick: () => restoreMules(snapshots) },
      });
    },
    [baseDeleteMules, restoreMules],
  );

  return { ...rest, mules, deleteMule, deleteMules };
}
