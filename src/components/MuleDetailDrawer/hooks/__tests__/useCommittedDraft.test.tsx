import { describe, expect, it, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useCommittedDraft } from '../useCommittedDraft';

/**
 * Lifecycle suite for the generic `useCommittedDraft` — the single owner
 * of the Drawer draft-editing machinery: Draft Source Resync
 * (render-time setState), Snapshot-before-rebase, and Commit On Exit
 * (Mule Switch + unmount). `useMuleIdentityDraft` / `useMuleNotesDraft`
 * are per-field adapters; their suites cover only clamp/trim specifics.
 */

type Props = { entityId: string | null; source: string };

function setup(initial: Props) {
  const commits: Array<{ id: string; draft: string; source: string }> = [];
  const view = renderHook(
    ({ entityId, source }: Props) =>
      useCommittedDraft({
        entityId,
        source,
        // Diff against the source PARAMETER (the source the draft was
        // edited against), per the commit contract.
        commit: (id, draft, draftSource) => {
          if (draft !== draftSource) commits.push({ id, draft, source: draftSource });
        },
      }),
    { initialProps: initial },
  );
  return { commits, ...view };
}

describe('useCommittedDraft', () => {
  it('initializes the draft from source', () => {
    const { result } = setup({ entityId: 'a', source: 'hello' });
    expect(result.current.draft).toBe('hello');
  });

  it('setDraft updates the draft without committing', () => {
    const { result, commits } = setup({ entityId: 'a', source: 'hello' });
    act(() => {
      result.current.setDraft('edited');
    });
    expect(result.current.draft).toBe('edited');
    expect(commits).toHaveLength(0);
  });

  describe('Draft Source Resync', () => {
    it('rebases the draft when source changes externally', () => {
      const { result, rerender } = setup({ entityId: 'a', source: 'hello' });
      rerender({ entityId: 'a', source: 'external' });
      expect(result.current.draft).toBe('external');
    });

    it('keeps an unblurred edit when an unrelated render happens (source unchanged)', () => {
      const { result, rerender } = setup({ entityId: 'a', source: 'hello' });
      act(() => {
        result.current.setDraft('edited');
      });
      rerender({ entityId: 'a', source: 'hello' });
      expect(result.current.draft).toBe('edited');
    });
  });

  describe('commitNow', () => {
    it('commits the current draft under the current entity id', () => {
      const { result, commits } = setup({ entityId: 'a', source: 'hello' });
      act(() => {
        result.current.setDraft('edited');
      });
      act(() => {
        result.current.commitNow();
      });
      expect(commits).toEqual([{ id: 'a', draft: 'edited', source: 'hello' }]);
    });

    it('is a no-op when entityId is null', () => {
      const { result, commits } = setup({ entityId: null, source: '' });
      act(() => {
        result.current.setDraft('edited');
      });
      act(() => {
        result.current.commitNow();
      });
      expect(commits).toHaveLength(0);
    });

    it('is referentially stable across renders', () => {
      const { result, rerender } = setup({ entityId: 'a', source: 'hello' });
      const first = result.current.commitNow;
      rerender({ entityId: 'a', source: 'changed' });
      expect(result.current.commitNow).toBe(first);
    });
  });

  describe('Commit On Exit — entity switch', () => {
    it('flushes the OUTGOING entity’s unblurred draft when entityId changes', () => {
      const { result, rerender, commits } = setup({ entityId: 'a', source: 'a-source' });
      act(() => {
        result.current.setDraft('a-edited');
      });
      rerender({ entityId: 'b', source: 'b-source' });
      expect(commits).toEqual([{ id: 'a', draft: 'a-edited', source: 'a-source' }]);
      // Draft has rebased to the incoming entity's source.
      expect(result.current.draft).toBe('b-source');
    });

    it('does not commit on switch when the draft equals source', () => {
      const { rerender, commits } = setup({ entityId: 'a', source: 'a-source' });
      rerender({ entityId: 'b', source: 'b-source' });
      expect(commits).toHaveLength(0);
    });

    it('suppresses the initial mount (null → id is not a switch)', () => {
      const { rerender, commits } = setup({ entityId: null, source: '' });
      rerender({ entityId: 'a', source: 'a-source' });
      expect(commits).toHaveLength(0);
    });

    it('does not drop an edit that happens to equal the INCOMING entity’s source', () => {
      // Regression: the pre-generic hooks diffed the outgoing draft against
      // the freshly-rebased source prop, silently losing this edit.
      const { result, rerender, commits } = setup({ entityId: 'a', source: 'a-source' });
      act(() => {
        result.current.setDraft('b-source');
      });
      rerender({ entityId: 'b', source: 'b-source' });
      expect(commits).toEqual([{ id: 'a', draft: 'b-source', source: 'a-source' }]);
    });
  });

  describe('Commit On Exit — unmount', () => {
    it('flushes an unblurred draft on unmount', () => {
      const { result, unmount, commits } = setup({ entityId: 'a', source: 'a-source' });
      act(() => {
        result.current.setDraft('a-edited');
      });
      unmount();
      expect(commits).toEqual([{ id: 'a', draft: 'a-edited', source: 'a-source' }]);
    });

    it('does not commit on unmount when nothing was edited', () => {
      const { unmount, commits } = setup({ entityId: 'a', source: 'a-source' });
      unmount();
      expect(commits).toHaveLength(0);
    });
  });

  it('uses the freshest commit closure (not the mount-time one)', () => {
    const first = vi.fn();
    const second = vi.fn();
    const { result, rerender } = renderHook(
      ({ commit }: { commit: (id: string, draft: string, source: string) => void }) =>
        useCommittedDraft({ entityId: 'a', source: 's', commit }),
      { initialProps: { commit: first } },
    );
    rerender({ commit: second });
    act(() => {
      result.current.setDraft('edited');
    });
    act(() => {
      result.current.commitNow();
    });
    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledWith('a', 'edited', 's');
  });
});
