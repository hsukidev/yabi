import { useCallback, type ChangeEvent } from 'react';
import type { Mule } from '../../../types';
import { sanitizeMuleNotes } from '../../../utils/muleNotes';
import { useCommittedDraft } from './useCommittedDraft';

/**
 * Notes Field adapter over `useCommittedDraft` (which owns the resync /
 * snapshot / Commit On Exit lifecycle). This hook contributes only the
 * notes-specific normalization:
 *
 *  - Empty normalization: trim-equality drives the diff; whitespace-only
 *    drafts commit as `notes: undefined` so Has Notes stays a single
 *    length-after-trim predicate.
 *  - Input sanitization via `sanitizeMuleNotes` on change.
 */
export function useMuleNotesDraft(
  mule: Mule | null,
  onUpdate: (id: string, patch: Partial<Omit<Mule, 'id'>>) => void,
): {
  draft: string;
  onChange: (e: ChangeEvent<HTMLTextAreaElement>) => void;
  onBlur: () => void;
} {
  const { draft, setDraft, commitNow } = useCommittedDraft({
    entityId: mule?.id ?? null,
    source: mule?.notes ?? '',
    commit: (id, d, source) => {
      const trimmed = d.trim();
      if (trimmed === source.trim()) return;
      onUpdate(id, { notes: trimmed === '' ? undefined : trimmed });
    },
  });

  const onChange = useCallback(
    (e: ChangeEvent<HTMLTextAreaElement>) => {
      setDraft(sanitizeMuleNotes(e.currentTarget.value));
    },
    [setDraft],
  );

  return { draft, onChange, onBlur: commitNow };
}
