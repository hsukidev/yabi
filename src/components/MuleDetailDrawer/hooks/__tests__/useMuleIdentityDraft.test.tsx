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

  // --- Combat Power ---------------------------------------------------

  it('seeds the combatPower draft from the mule (grouped) — empty when unset', () => {
    const { result: unset } = renderHook(() => useMuleIdentityDraft(baseMule, vi.fn()));
    expect(unset.current.combatPower.draft).toBe('');

    const withCp: Mule = { ...baseMule, combatPower: 410042525 };
    const { result: set } = renderHook(() => useMuleIdentityDraft(withCp, vi.fn()));
    expect(set.current.combatPower.draft).toBe('410,042,525');
  });

  it('groups combatPower input live and caps at 10 digits', () => {
    const { result } = renderHook(() => useMuleIdentityDraft(baseMule, vi.fn()));

    act(() => {
      result.current.combatPower.onChange(makeOnChange('410042525'));
    });
    expect(result.current.combatPower.draft).toBe('410,042,525');

    act(() => {
      result.current.combatPower.onChange(makeOnChange('12345678901234'));
    });
    expect(result.current.combatPower.draft).toBe('1,234,567,890');
  });

  it('restores the caret by digit index after regrouping', () => {
    const { result } = renderHook(() => useMuleIdentityDraft(baseMule, vi.fn()));
    const input = document.createElement('input');
    document.body.appendChild(input);
    // Browser post-edit raw value after inserting a digit mid-string, caret
    // sitting after the 4th digit ("4102|,042,525").
    input.value = '4102,042,525';
    input.setSelectionRange(4, 4);

    act(() => {
      result.current.combatPower.onChange({
        currentTarget: input,
      } as unknown as React.ChangeEvent<HTMLInputElement>);
    });

    expect(result.current.combatPower.draft).toBe('4,102,042,525');
    // 4 digits left of the edit → caret restored just after the 4th digit.
    expect(input.selectionStart).toBe(5);
    document.body.removeChild(input);
  });

  it('combatPower onBlur commits the numeric value when set', () => {
    const onUpdate = vi.fn();
    const { result } = renderHook(() => useMuleIdentityDraft(baseMule, onUpdate));

    act(() => {
      result.current.combatPower.onChange(makeOnChange('410042525'));
    });
    act(() => {
      result.current.combatPower.onBlur();
    });

    expect(onUpdate).toHaveBeenCalledWith('mule-1', { combatPower: 410042525 });
  });

  it('combatPower onBlur omits the field (undefined) when a set value is cleared', () => {
    const withCp: Mule = { ...baseMule, combatPower: 410042525 };
    const onUpdate = vi.fn();
    const { result } = renderHook(() => useMuleIdentityDraft(withCp, onUpdate));

    act(() => {
      result.current.combatPower.onChange(makeOnChange(''));
    });
    act(() => {
      result.current.combatPower.onBlur();
    });

    expect(onUpdate).toHaveBeenCalledWith('mule-1', { combatPower: undefined });
  });

  it('combatPower onBlur omits the field when the committed value is 0', () => {
    const withCp: Mule = { ...baseMule, combatPower: 410042525 };
    const onUpdate = vi.fn();
    const { result } = renderHook(() => useMuleIdentityDraft(withCp, onUpdate));

    act(() => {
      result.current.combatPower.onChange(makeOnChange('0'));
    });
    act(() => {
      result.current.combatPower.onBlur();
    });

    expect(onUpdate).toHaveBeenCalledWith('mule-1', { combatPower: undefined });
  });

  it('combatPower onBlur is a no-op when typing 0 into an unset field', () => {
    const onUpdate = vi.fn();
    const { result } = renderHook(() => useMuleIdentityDraft(baseMule, onUpdate));

    act(() => {
      result.current.combatPower.onChange(makeOnChange('0'));
    });
    expect(result.current.combatPower.draft).toBe('0');
    act(() => {
      result.current.combatPower.onBlur();
    });

    expect(onUpdate).not.toHaveBeenCalled();
  });

  it('combatPower onBlur is a no-op when the draft matches the committed value', () => {
    const withCp: Mule = { ...baseMule, combatPower: 410042525 };
    const onUpdate = vi.fn();
    const { result } = renderHook(() => useMuleIdentityDraft(withCp, onUpdate));
    act(() => {
      result.current.combatPower.onBlur();
    });
    expect(onUpdate).not.toHaveBeenCalled();
  });

  it('flushes combatPower on Mule Switch', () => {
    const onUpdate = vi.fn();
    const { result, rerender } = renderHook(
      ({ mule }: { mule: Mule }) => useMuleIdentityDraft(mule, onUpdate),
      { initialProps: { mule: baseMule } },
    );

    act(() => {
      result.current.combatPower.onChange(makeOnChange('12345'));
    });

    const otherMule: Mule = { ...baseMule, id: 'mule-2', name: 'Beta' };
    rerender({ mule: otherMule });

    expect(onUpdate).toHaveBeenCalledWith('mule-1', { combatPower: 12345 });
  });

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
