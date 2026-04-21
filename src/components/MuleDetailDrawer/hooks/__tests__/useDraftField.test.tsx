import { describe, expect, it, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';

import { useDraftField } from '../useDraftField';

describe('useDraftField', () => {
  it('initializes draft to source', () => {
    const commit = vi.fn();
    const { result } = renderHook(() => useDraftField('initial', commit));
    expect(result.current.draft).toBe('initial');
    expect(commit).not.toHaveBeenCalled();
  });

  it('setDraft updates draft without calling commit', () => {
    const commit = vi.fn();
    const { result } = renderHook(() => useDraftField<string>('initial', commit));

    act(() => {
      result.current.setDraft('edited');
    });

    expect(result.current.draft).toBe('edited');
    expect(commit).not.toHaveBeenCalled();
  });

  it('onBlur calls commit(draft) when draft !== source', () => {
    const commit = vi.fn();
    const { result } = renderHook(() => useDraftField<string>('initial', commit));

    act(() => {
      result.current.setDraft('edited');
    });
    act(() => {
      result.current.onBlur();
    });

    expect(commit).toHaveBeenCalledWith('edited');
    expect(commit).toHaveBeenCalledTimes(1);
  });

  it('onBlur does not call commit when draft === source (equality short-circuit)', () => {
    const commit = vi.fn();
    const { result } = renderHook(() => useDraftField('initial', commit));

    act(() => {
      result.current.onBlur();
    });

    expect(commit).not.toHaveBeenCalled();
  });

  it('external source change resyncs draft when not equal', () => {
    const commit = vi.fn();
    const { result, rerender } = renderHook(
      ({ source }: { source: string }) => useDraftField(source, commit),
      { initialProps: { source: 'a' } },
    );

    expect(result.current.draft).toBe('a');

    rerender({ source: 'b' });

    expect(result.current.draft).toBe('b');
  });

  it('external source resync does NOT call commit', () => {
    const commit = vi.fn();
    const { rerender } = renderHook(
      ({ source }: { source: string }) => useDraftField(source, commit),
      { initialProps: { source: 'a' } },
    );

    rerender({ source: 'b' });

    expect(commit).not.toHaveBeenCalled();
  });

  it('parse adapter converts string draft to numeric commit', () => {
    const commit = vi.fn();
    const { result } = renderHook(() =>
      useDraftField<number>(42, commit, {
        parse: (raw) => Number(raw) || 0,
      }),
    );

    act(() => {
      // setDraft receives the parsed form in this contract; onChange handles string input.
      result.current.onChange({
        currentTarget: { value: '100' },
      } as React.ChangeEvent<HTMLInputElement>);
    });
    act(() => {
      result.current.onBlur();
    });

    expect(commit).toHaveBeenCalledWith(100);
  });

  it('onChange updates draft with raw input value when no parse adapter', () => {
    const commit = vi.fn();
    const { result } = renderHook(() => useDraftField('', commit));

    act(() => {
      result.current.onChange({
        currentTarget: { value: 'hello' },
      } as React.ChangeEvent<HTMLInputElement>);
    });

    expect(result.current.draft).toBe('hello');
    expect(commit).not.toHaveBeenCalled();
  });

  it('custom equals prevents commit when drafts are equal by the custom predicate', () => {
    const commit = vi.fn();
    const { result } = renderHook(() =>
      useDraftField<string>('A', commit, {
        equals: (a, b) => a.toLowerCase() === b.toLowerCase(),
      }),
    );

    act(() => {
      result.current.setDraft('a');
    });
    act(() => {
      result.current.onBlur();
    });

    expect(commit).not.toHaveBeenCalled();
  });

  it('does NOT resync draft when external source equals draft by equals predicate', () => {
    const commit = vi.fn();
    const { result, rerender } = renderHook(
      ({ source }: { source: string }) =>
        useDraftField(source, commit, {
          equals: (a, b) => a.toLowerCase() === b.toLowerCase(),
        }),
      { initialProps: { source: 'a' } },
    );

    act(() => {
      result.current.setDraft('a');
    });

    rerender({ source: 'A' });

    // Since 'a' and 'A' are equal by our predicate, draft should stay 'a'.
    expect(result.current.draft).toBe('a');
  });
});
