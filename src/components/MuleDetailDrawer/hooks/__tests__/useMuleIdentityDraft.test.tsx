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
    expect(result.current.level.displayNumber).toBe(200);
  });

  it('seeds empty drafts when mule is null', () => {
    const onUpdate = vi.fn();
    const { result } = renderHook(() => useMuleIdentityDraft(null, onUpdate));
    expect(result.current.name.draft).toBe('');
    expect(result.current.level.draft).toBe('');
    expect(result.current.level.displayNumber).toBe(0);
  });

  it('sanitizes name input on change (strips non-letters, caps at 12)', () => {
    const onUpdate = vi.fn();
    const { result } = renderHook(() => useMuleIdentityDraft(baseMule, vi.fn()));
    void onUpdate;

    act(() => {
      result.current.name.onChange(makeOnChange('Hero123!WorldTooLong'));
    });

    expect(result.current.name.draft).toBe('HeroWorldToo');
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
      ({ mule }: { mule: Mule | null }) => useMuleIdentityDraft(mule, onUpdate),
      { initialProps: { mule: baseMule as Mule | null } },
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

    // The hook should have flushed mule-1's drafts at switch time.
    expect(onUpdate).toHaveBeenCalledWith('mule-1', { name: 'Edited', level: 150 });
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

    expect(onUpdate).toHaveBeenCalledWith('mule-1', { name: 'Closed', level: 77 });
  });

  it('does NOT flush on initial mount', () => {
    const onUpdate = vi.fn();
    renderHook(() => useMuleIdentityDraft(baseMule, onUpdate));
    expect(onUpdate).not.toHaveBeenCalled();
  });

  it('resyncs drafts when mule prop changes externally', () => {
    const onUpdate = vi.fn();
    const { result, rerender } = renderHook(
      ({ mule }: { mule: Mule }) => useMuleIdentityDraft(mule, onUpdate),
      { initialProps: { mule: baseMule } },
    );

    const edited: Mule = { ...baseMule, id: 'mule-2', name: 'Beta', level: 77 };
    rerender({ mule: edited });

    expect(result.current.name.draft).toBe('Beta');
    expect(result.current.level.draft).toBe('77');
  });

  it('displayNumber reflects live draft for the hero tag', () => {
    const { result } = renderHook(() => useMuleIdentityDraft(baseMule, vi.fn()));
    act(() => {
      result.current.level.onChange(makeOnChange('250'));
    });
    expect(result.current.level.displayNumber).toBe(250);
  });

  it('displayNumber is 0 when draft is empty', () => {
    const { result } = renderHook(() => useMuleIdentityDraft(baseMule, vi.fn()));
    act(() => {
      result.current.level.onChange(makeOnChange(''));
    });
    expect(result.current.level.displayNumber).toBe(0);
  });
});
