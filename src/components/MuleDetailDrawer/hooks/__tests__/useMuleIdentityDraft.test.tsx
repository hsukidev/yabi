import { describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';

import { useMuleIdentityDraft } from '../useMuleIdentityDraft';
import type { Mule } from '../../../../types';

const baseMule: Mule = {
  id: 'mule-1',
  name: 'Alpha',
  level: 200,
  muleClass: 'Hero',
  selectedBosses: [],
  active: true,
};

function makeOnChange(value: string): React.ChangeEvent<HTMLInputElement> {
  return { currentTarget: { value } } as React.ChangeEvent<HTMLInputElement>;
}

describe('useMuleIdentityDraft', () => {
  it('seeds name and level drafts from the mule', () => {
    const onUpdate = vi.fn();
    const { result } = renderHook(() => useMuleIdentityDraft(baseMule, onUpdate));

    expect(result.current.name.draft).toBe('Alpha');
    expect(result.current.level.draft).toBe('200');
  });

  it('sanitizes name input on change (strips non-alphanumerics, caps at 12)', () => {
    const onUpdate = vi.fn();
    const { result } = renderHook(() => useMuleIdentityDraft(baseMule, vi.fn()));
    void onUpdate;

    act(() => {
      result.current.name.onChange(makeOnChange('Hero123!WorldTooLong'));
    });

    expect(result.current.name.draft).toBe('Hero123World');
  });

  it('name onBlur commits sanitized value via onUpdate when changed', () => {
    const onUpdate = vi.fn();
    const { result } = renderHook(() => useMuleIdentityDraft(baseMule, onUpdate));

    act(() => {
      result.current.name.onChange(makeOnChange('NewName'));
    });
    act(() => {
      result.current.name.onBlur();
    });

    expect(onUpdate).toHaveBeenCalledWith('mule-1', { name: 'NewName' });
  });

  it('name onBlur is a no-op when draft equals committed name', () => {
    const onUpdate = vi.fn();
    const { result } = renderHook(() => useMuleIdentityDraft(baseMule, onUpdate));
    act(() => {
      result.current.name.onBlur();
    });
    expect(onUpdate).not.toHaveBeenCalled();
  });

  it('strips non-digits from level input', () => {
    const { result } = renderHook(() => useMuleIdentityDraft(baseMule, vi.fn()));

    act(() => {
      result.current.level.onChange(makeOnChange('1a2'));
    });

    expect(result.current.level.draft).toBe('12');
  });

  it('caps level input at 3 digits', () => {
    const { result } = renderHook(() => useMuleIdentityDraft(baseMule, vi.fn()));

    act(() => {
      result.current.level.onChange(makeOnChange('12345'));
    });

    expect(result.current.level.draft).toBe('123');
  });

  it('level onBlur clamps >300 to 300', () => {
    const onUpdate = vi.fn();
    const { result } = renderHook(() => useMuleIdentityDraft(baseMule, onUpdate));

    act(() => {
      result.current.level.onChange(makeOnChange('500'));
    });
    act(() => {
      result.current.level.onBlur();
    });

    expect(result.current.level.draft).toBe('300');
    expect(onUpdate).toHaveBeenCalledWith('mule-1', { level: 300 });
  });

  it('level onBlur clamps 0 to 1 when a non-empty zero is entered', () => {
    const onUpdate = vi.fn();
    const { result } = renderHook(() => useMuleIdentityDraft(baseMule, onUpdate));

    act(() => {
      result.current.level.onChange(makeOnChange('0'));
    });
    act(() => {
      result.current.level.onBlur();
    });

    expect(result.current.level.draft).toBe('1');
    expect(onUpdate).toHaveBeenCalledWith('mule-1', { level: 1 });
  });

  it('level onBlur commits 0 when the field is emptied', () => {
    const onUpdate = vi.fn();
    const { result } = renderHook(() => useMuleIdentityDraft(baseMule, onUpdate));

    act(() => {
      result.current.level.onChange(makeOnChange(''));
    });
    act(() => {
      result.current.level.onBlur();
    });

    expect(onUpdate).toHaveBeenCalledWith('mule-1', { level: 0 });
  });

  it('level onBlur is a no-op when draft matches committed level', () => {
    const onUpdate = vi.fn();
    const { result } = renderHook(() => useMuleIdentityDraft(baseMule, onUpdate));
    act(() => {
      result.current.level.onBlur();
    });
    expect(onUpdate).not.toHaveBeenCalled();
  });

  it('flushes both name and level on Mule Switch', () => {
    const onUpdate = vi.fn();
    const { result, rerender } = renderHook(
      ({ mule }: { mule: Mule }) => useMuleIdentityDraft(mule, onUpdate),
      { initialProps: { mule: baseMule } },
    );

    // Edit both without blurring.
    act(() => {
      result.current.name.onChange(makeOnChange('Edited'));
    });
    act(() => {
      result.current.level.onChange(makeOnChange('150'));
    });

    const otherMule: Mule = { ...baseMule, id: 'mule-2', name: 'Beta', level: 100 };
    rerender({ mule: otherMule });

    // The hook should have flushed mule-1's drafts at switch time — one
    // patch per dirty field (each useCommittedDraft instance flushes its
    // own; updateMule merges functionally, so the outcome is identical).
    expect(onUpdate).toHaveBeenCalledWith('mule-1', { name: 'Edited' });
    expect(onUpdate).toHaveBeenCalledWith('mule-1', { level: 150 });
  });

  it('flushes both name and level on unmount (Drawer Close)', () => {
    const onUpdate = vi.fn();
    const { result, unmount } = renderHook(() => useMuleIdentityDraft(baseMule, onUpdate));

    act(() => {
      result.current.name.onChange(makeOnChange('Closed'));
    });
    act(() => {
      result.current.level.onChange(makeOnChange('77'));
    });

    unmount();

    expect(onUpdate).toHaveBeenCalledWith('mule-1', { name: 'Closed' });
    expect(onUpdate).toHaveBeenCalledWith('mule-1', { level: 77 });
  });

  // Mount suppression and plain Draft Source Resync are covered once in
  // useCommittedDraft.test.tsx; the switch/unmount cases above stay because
  // they exercise this adapter's two-instance commit wiring.

  it('an external write to one field does not blow away an unblurred edit on the other', () => {
    const onUpdate = vi.fn();
    const { result, rerender } = renderHook(
      ({ mule }: { mule: Mule }) => useMuleIdentityDraft(mule, onUpdate),
      { initialProps: { mule: baseMule } },
    );

    // Edit the level without blurring, then rebase the name externally
    // (same mule id — e.g. a Character Lookup writing the real name).
    act(() => {
      result.current.level.onChange(makeOnChange('150'));
    });
    const renamed: Mule = { ...baseMule, name: 'Renamed' };
    rerender({ mule: renamed });

    expect(result.current.name.draft).toBe('Renamed');
    expect(result.current.level.draft).toBe('150');
  });
});
