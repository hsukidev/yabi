import { describe, expect, it, vi } from 'vitest';
import { renderHook } from '@testing-library/react';

import { useCommitOnExit } from '../useCommitOnExit';

type IdentityDrafts = { name: string; level: number };

describe('useCommitOnExit', () => {
  it('does NOT flush on initial mount', () => {
    const commit = vi.fn();
    renderHook(() => useCommitOnExit<IdentityDrafts>('mule-1', { name: 'A', level: 10 }, commit));
    expect(commit).not.toHaveBeenCalled();
  });

  it('flushes previous muleId drafts on Mule Switch', () => {
    const commit = vi.fn();
    const { rerender } = renderHook(
      ({ muleId, drafts }: { muleId: string | null; drafts: IdentityDrafts }) =>
        useCommitOnExit(muleId, drafts, commit),
      { initialProps: { muleId: 'mule-1' as string | null, drafts: { name: 'Alpha', level: 10 } } },
    );

    // No flush on initial mount.
    expect(commit).not.toHaveBeenCalled();

    rerender({
      muleId: 'mule-2',
      drafts: { name: 'Beta', level: 20 },
    });

    // Must flush previous mule (mule-1) with its last-seen drafts.
    expect(commit).toHaveBeenCalledTimes(1);
    expect(commit).toHaveBeenCalledWith('mule-1', { name: 'Alpha', level: 10 });
  });

  it('flushes current muleId drafts on unmount (Drawer Close)', () => {
    const commit = vi.fn();
    const { unmount, rerender } = renderHook(
      ({ drafts }: { drafts: IdentityDrafts }) => useCommitOnExit('mule-1', drafts, commit),
      { initialProps: { drafts: { name: 'Alpha', level: 10 } } },
    );

    // Edit then unmount — should flush the latest drafts.
    rerender({ drafts: { name: 'AlphaEdit', level: 15 } });
    unmount();

    expect(commit).toHaveBeenCalledTimes(1);
    expect(commit).toHaveBeenCalledWith('mule-1', { name: 'AlphaEdit', level: 15 });
  });

  it('no-op when muleId is null on mount (no flush, no error)', () => {
    const commit = vi.fn();
    const { unmount } = renderHook(() =>
      useCommitOnExit<IdentityDrafts>(null, { name: '', level: 0 }, commit),
    );
    unmount();
    expect(commit).not.toHaveBeenCalled();
  });

  it('no-op on unmount when current muleId is null', () => {
    const commit = vi.fn();
    const { rerender, unmount } = renderHook(
      ({ muleId }: { muleId: string | null }) =>
        useCommitOnExit<IdentityDrafts>(muleId, { name: 'A', level: 1 }, commit),
      { initialProps: { muleId: 'mule-1' as string | null } },
    );

    // Switch to null — previous mule should flush, then unmount is a no-op.
    rerender({ muleId: null });
    expect(commit).toHaveBeenCalledTimes(1);
    expect(commit).toHaveBeenCalledWith('mule-1', { name: 'A', level: 1 });

    commit.mockClear();
    unmount();
    expect(commit).not.toHaveBeenCalled();
  });

  it('uses latest drafts at the moment of Mule Switch, not drafts at prior render', () => {
    const commit = vi.fn();
    const { rerender } = renderHook(
      ({ muleId, drafts }: { muleId: string; drafts: IdentityDrafts }) =>
        useCommitOnExit(muleId, drafts, commit),
      { initialProps: { muleId: 'mule-1', drafts: { name: 'A', level: 1 } } },
    );

    // User edits drafts several times before switching.
    rerender({ muleId: 'mule-1', drafts: { name: 'AA', level: 2 } });
    rerender({ muleId: 'mule-1', drafts: { name: 'AAA', level: 3 } });
    expect(commit).not.toHaveBeenCalled();

    rerender({ muleId: 'mule-2', drafts: { name: 'B', level: 10 } });

    expect(commit).toHaveBeenCalledTimes(1);
    expect(commit).toHaveBeenCalledWith('mule-1', { name: 'AAA', level: 3 });
  });

  it('uses the latest commit callback reference on unmount', () => {
    const firstCommit = vi.fn();
    const secondCommit = vi.fn();
    const { rerender, unmount } = renderHook(
      ({ commit }: { commit: typeof firstCommit }) =>
        useCommitOnExit<IdentityDrafts>('mule-1', { name: 'A', level: 1 }, commit),
      { initialProps: { commit: firstCommit } },
    );

    rerender({ commit: secondCommit });
    unmount();

    expect(firstCommit).not.toHaveBeenCalled();
    expect(secondCommit).toHaveBeenCalledTimes(1);
    expect(secondCommit).toHaveBeenCalledWith('mule-1', { name: 'A', level: 1 });
  });
});
