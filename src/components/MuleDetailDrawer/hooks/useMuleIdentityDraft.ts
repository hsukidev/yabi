import { useCallback, type ChangeEvent } from 'react';
import type { Mule } from '../../../types';
import { sanitizeMuleName } from '../../../utils/muleName';
import { useCommittedDraft } from './useCommittedDraft';

const LEVEL_MAX = 300;
const LEVEL_MIN_NONZERO = 1;

function clampLevel(raw: string): number {
  if (raw === '') return 0;
  return Math.min(LEVEL_MAX, Math.max(LEVEL_MIN_NONZERO, Number(raw)));
}

function parseLevelInput(raw: string): string {
  return raw.replace(/\D/g, '').slice(0, 3);
}

/**
 * Identity (name + level) adapter over `useCommittedDraft` — one instance
 * per field, so an external write to one field never blows away an
 * unblurred edit on the other. The lifecycle (Draft Source Resync,
 * Snapshot-before-rebase, Commit On Exit) lives in the generic; this hook
 * contributes only the field rules:
 *
 *  - Name: `sanitizeMuleName` on change, plain diff on commit.
 *  - Level: digits-only input (≤3 chars); blur and flush coerce the level
 *    string through `clampLevel` into an integer in [1, 300] so the input
 *    can briefly show "500" before blur clamps it visibly to 300; empty
 *    maps to 0.
 *
 * On a Mule Switch with both fields dirty, each instance flushes its own
 * patch (two `onUpdate` calls); `updateMule` merges functionally, so the
 * outcome matches the previous single merged patch.
 */
export function useMuleIdentityDraft(
  mule: Mule | null,
  onUpdate: (id: string, patch: Partial<Omit<Mule, 'id'>>) => void,
): {
  name: {
    draft: string;
    onChange: (e: ChangeEvent<HTMLInputElement>) => void;
    onBlur: () => void;
  };
  level: {
    draft: string;
    onChange: (e: ChangeEvent<HTMLInputElement>) => void;
    onBlur: () => void;
  };
} {
  const muleId = mule?.id ?? null;

  const name = useCommittedDraft({
    entityId: muleId,
    source: mule?.name ?? '',
    commit: (id, draft, source) => {
      if (draft !== source) onUpdate(id, { name: draft });
    },
  });

  const level = useCommittedDraft({
    entityId: muleId,
    source: mule?.level ? String(mule.level) : '',
    commit: (id, draft, source) => {
      if (draft !== source) onUpdate(id, { level: clampLevel(draft) });
    },
  });

  const { setDraft: setNameDraft } = name;
  const onNameChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      setNameDraft(sanitizeMuleName(e.currentTarget.value));
    },
    [setNameDraft],
  );

  const { setDraft: setLevelDraft, commitNow: commitLevelNow } = level;
  const onLevelChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      setLevelDraft(parseLevelInput(e.currentTarget.value));
    },
    [setLevelDraft],
  );

  const levelDraft = level.draft;
  const onLevelBlur = useCallback(() => {
    // Visible clamp: reflect the committed value back into the input, then
    // commit (the commit clamps the pre-reflect draft to the same value).
    const clampedStr = levelDraft === '' ? '' : String(clampLevel(levelDraft));
    if (clampedStr !== levelDraft) setLevelDraft(clampedStr);
    commitLevelNow();
  }, [levelDraft, setLevelDraft, commitLevelNow]);

  return {
    name: { draft: name.draft, onChange: onNameChange, onBlur: name.commitNow },
    level: { draft: levelDraft, onChange: onLevelChange, onBlur: onLevelBlur },
  };
}
