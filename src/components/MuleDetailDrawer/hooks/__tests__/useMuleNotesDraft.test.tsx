import { describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import type { Mule } from '../../../../types';
import { useMuleNotesDraft } from '../useMuleNotesDraft';

const baseMule: Mule = {
  id: 'mule-1',
  name: 'Alpha',
  level: 200,
  muleClass: 'Hero',
  selectedBosses: [],
  active: true,
  notes: 'main mule, owes legion levels',
};

const noteFreeMule: Mule = { ...baseMule, id: 'mule-2', notes: undefined };

function makeChange(value: string): React.ChangeEvent<HTMLTextAreaElement> {
  return { currentTarget: { value } } as React.ChangeEvent<HTMLTextAreaElement>;
}

describe('useMuleNotesDraft', () => {
  it('seeds draft from mule.notes', () => {
    const { result } = renderHook(() => useMuleNotesDraft(baseMule, () => {}));
    expect(result.current.draft).toBe('main mule, owes legion levels');
  });

  it('seeds draft as empty string when mule.notes is undefined', () => {
    const { result } = renderHook(() => useMuleNotesDraft(noteFreeMule, () => {}));
    expect(result.current.draft).toBe('');
  });

  it('sanitizes input on change (strips control chars except newline/tab/CR)', () => {
    const { result } = renderHook(() => useMuleNotesDraft(noteFreeMule, vi.fn()));
    act(() => {
      // \u0001 SOH and \u0007 BEL must strip; \n \t \r must survive.
      result.current.onChange(makeChange('a\u0001\nb\tc\u0007\rd'));
    });
    expect(result.current.draft).toBe('a\nb\tc\rd');
  });

  it('caps draft length at 500 on change', () => {
    const { result } = renderHook(() => useMuleNotesDraft(noteFreeMule, vi.fn()));
    act(() => {
      result.current.onChange(makeChange('x'.repeat(600)));
    });
    expect(result.current.draft.length).toBe(500);
  });

  it('onBlur commits via onUpdate when draft changed', () => {
    const onUpdate = vi.fn();
    const { result } = renderHook(() => useMuleNotesDraft(baseMule, onUpdate));
    act(() => {
      result.current.onChange(makeChange('updated note'));
    });
    act(() => {
      result.current.onBlur();
    });
    expect(onUpdate).toHaveBeenCalledWith('mule-1', { notes: 'updated note' });
  });

  it('onBlur is a no-op when draft equals source notes', () => {
    const onUpdate = vi.fn();
    const { result } = renderHook(() => useMuleNotesDraft(baseMule, onUpdate));
    act(() => {
      result.current.onBlur();
    });
    expect(onUpdate).not.toHaveBeenCalled();
  });

  it('onBlur with whitespace-only draft commits notes: undefined', () => {
    const onUpdate = vi.fn();
    const { result } = renderHook(() => useMuleNotesDraft(baseMule, onUpdate));
    act(() => {
      result.current.onChange(makeChange('   \n\t  '));
    });
    act(() => {
      result.current.onBlur();
    });
    expect(onUpdate).toHaveBeenCalledWith('mule-1', { notes: undefined });
  });

  it('onBlur from a notes-less mule with whitespace-only draft is a no-op', () => {
    const onUpdate = vi.fn();
    const { result } = renderHook(() => useMuleNotesDraft(noteFreeMule, onUpdate));
    act(() => {
      result.current.onChange(makeChange('   '));
    });
    act(() => {
      result.current.onBlur();
    });
    // Both source (undefined) and trimmed draft normalize to "no notes" — no commit.
    expect(onUpdate).not.toHaveBeenCalled();
  });

  it('flushes notes on Mule Switch (outgoing draft commits before resync)', () => {
    const onUpdate = vi.fn();
    const { result, rerender } = renderHook(
      ({ mule }: { mule: Mule }) => useMuleNotesDraft(mule, onUpdate),
      { initialProps: { mule: baseMule } },
    );
    act(() => {
      result.current.onChange(makeChange('edited but not blurred'));
    });
    const otherMule: Mule = { ...baseMule, id: 'mule-99', notes: 'beta notes' };
    rerender({ mule: otherMule });
    // Outgoing mule-1's unblurred edit must have flushed at switch time.
    expect(onUpdate).toHaveBeenCalledWith('mule-1', { notes: 'edited but not blurred' });
  });

  it('flushes notes on unmount (Drawer Close)', () => {
    const onUpdate = vi.fn();
    const { result, unmount } = renderHook(() => useMuleNotesDraft(baseMule, onUpdate));
    act(() => {
      result.current.onChange(makeChange('closed mid-edit'));
    });
    unmount();
    expect(onUpdate).toHaveBeenCalledWith('mule-1', { notes: 'closed mid-edit' });
  });

  // Mount suppression and plain Draft Source Resync are covered once in
  // useCommittedDraft.test.tsx; the switch/unmount cases above stay because
  // they exercise this adapter's commit wiring (trim + notes payload).
});
