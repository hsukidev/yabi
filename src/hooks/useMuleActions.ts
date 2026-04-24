import { useCallback } from 'react';
import { useMules } from './useMules';
import { toast } from '../lib/toast';

export function useMuleActions() {
  const { deleteMule: baseDeleteMule, deleteMules: baseDeleteMules, ...rest } = useMules();

  const deleteMule = useCallback(
    (id: string) => {
      baseDeleteMule(id);
      toast.success('Successfully deleted!');
    },
    [baseDeleteMule],
  );

  const deleteMules = useCallback(
    (ids: string[]) => {
      if (ids.length === 0) return;
      baseDeleteMules(ids);
      toast.success('Successfully deleted!');
    },
    [baseDeleteMules],
  );

  return { ...rest, deleteMule, deleteMules };
}
