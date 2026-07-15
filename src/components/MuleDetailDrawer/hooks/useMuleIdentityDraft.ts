import { useCallback, useEffect, useLayoutEffect, useRef, type ChangeEvent } from 'react';
import type { Mule } from '../../../types';
import { sanitizeMuleName } from '../../../utils/muleName';
import { groupCp, groupCpWithCaret, parseCpValue } from '../../../utils/cpInput';
import { useCommittedDraft } from './useCommittedDraft';

const LEVEL_MAX = 300;
const LEVEL_MIN_NONZERO = 1;

// Run the caret restore before paint in the browser (no flicker) but fall
// back to `useEffect` under prerender / SSR so React never warns that
// `useLayoutEffect` does nothing on the server.
const useIsomorphicLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect;

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
 *  - Combat Power: digits-only with live `en-US` comma grouping (≤10
 *    digits), caret restored by digit index after each regroup. The draft
 *    is the grouped string; commit collapses it to a number and **omits**
 *    the field (writes `combatPower: undefined`) when 0 / empty, per the
 *    `0 ≡ unset` rule. The header reads this draft live, so — like name and
 *    level — this instance MUST stay lifted at the drawer level (CLAUDE.md).
 *
 * On a Mule Switch with dirty fields, each instance flushes its own patch;
 * `updateMule` merges functionally, so the outcome matches a single merged
 * patch.
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
  combatPower: {
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

  // Combat Power. The draft is the grouped display string; the commit
  // compares NUMERIC values (0 for empty) so typing "0" into an unset field
  // is a no-op and clearing a set value writes `combatPower: undefined`
  // (which `updateMule` merges as a removal — the field drops on
  // serialization and re-read). 0 ≡ unset, no max clamp.
  const combatPower = useCommittedDraft({
    entityId: muleId,
    source: mule?.combatPower ? groupCp(String(mule.combatPower)) : '',
    commit: (id, draft, source) => {
      const next = parseCpValue(draft);
      if (next === parseCpValue(source)) return;
      onUpdate(id, { combatPower: next > 0 ? next : undefined });
    },
  });

  // Caret-by-digit-index restore. `onChange` stores the live DOM node (from
  // the synthetic event; React 17+ keeps `currentTarget` valid) plus the
  // target caret, and the layout effect re-applies it after React re-renders
  // the controlled value to the regrouped string — otherwise the caret would
  // snap to the end on every keystroke.
  const { setDraft: setCpDraft } = combatPower;
  const cpElRef = useRef<HTMLInputElement | null>(null);
  const pendingCpCaretRef = useRef<number | null>(null);
  const onCpChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const el = e.currentTarget;
      const rawCaret = el.selectionStart ?? el.value.length;
      const { value, caret } = groupCpWithCaret(el.value, rawCaret);
      cpElRef.current = el;
      pendingCpCaretRef.current = caret;
      setCpDraft(value);
    },
    [setCpDraft],
  );

  const cpDraft = combatPower.draft;
  useIsomorphicLayoutEffect(() => {
    const pos = pendingCpCaretRef.current;
    if (pos === null) return;
    pendingCpCaretRef.current = null;
    const el = cpElRef.current;
    if (el && typeof el.setSelectionRange === 'function') {
      el.setSelectionRange(pos, pos);
    }
  }, [cpDraft]);

  return {
    name: { draft: name.draft, onChange: onNameChange, onBlur: name.commitNow },
    level: { draft: levelDraft, onChange: onLevelChange, onBlur: onLevelBlur },
    combatPower: { draft: cpDraft, onChange: onCpChange, onBlur: combatPower.commitNow },
  };
}
