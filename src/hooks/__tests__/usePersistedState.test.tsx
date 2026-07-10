import { describe, expect, it } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { usePersistedState } from '../usePersistedState';
import type { DebouncedStore } from '../../persistence/debouncedStore';

/**
 * `usePersistedState(store)` owns the React side of the persistence
 * lifecycle: `useState(store.load)`, the save-on-change effect, and the
 * flush triple (`pagehide`, `beforeunload`, unmount). `useMules` /
 * `useUserPresets` delegate all of it here.
 */

function makeFakeStore<T>(loaded: T): DebouncedStore<T> & {
  saves: T[];
  flushes: number;
} {
  const saves: T[] = [];
  const box = { flushes: 0 };
  return {
    saves,
    get flushes() {
      return box.flushes;
    },
    load: () => loaded,
    save: (value: T) => {
      saves.push(value);
    },
    flush: () => {
      box.flushes += 1;
    },
  };
}

describe('usePersistedState', () => {
  it('initializes state from store.load', () => {
    const store = makeFakeStore(['a']);
    const { result } = renderHook(() => usePersistedState(store));
    expect(result.current[0]).toEqual(['a']);
  });

  it('saves through the store on every state change (including mount)', () => {
    const store = makeFakeStore<string[]>([]);
    const { result } = renderHook(() => usePersistedState(store));
    act(() => {
      result.current[1](['a']);
    });
    expect(store.saves.at(-1)).toEqual(['a']);
  });

  it('supports functional updates', () => {
    const store = makeFakeStore<string[]>(['a']);
    const { result } = renderHook(() => usePersistedState(store));
    act(() => {
      result.current[1]((prev) => [...prev, 'b']);
    });
    expect(result.current[0]).toEqual(['a', 'b']);
  });

  it('flushes on pagehide', () => {
    const store = makeFakeStore<string[]>([]);
    renderHook(() => usePersistedState(store));
    act(() => {
      window.dispatchEvent(new Event('pagehide'));
    });
    expect(store.flushes).toBeGreaterThan(0);
  });

  it('flushes on beforeunload', () => {
    const store = makeFakeStore<string[]>([]);
    renderHook(() => usePersistedState(store));
    act(() => {
      window.dispatchEvent(new Event('beforeunload'));
    });
    expect(store.flushes).toBeGreaterThan(0);
  });

  it('flushes on unmount and detaches the window listeners', () => {
    const store = makeFakeStore<string[]>([]);
    const { unmount } = renderHook(() => usePersistedState(store));
    unmount();
    const afterUnmount = store.flushes;
    expect(afterUnmount).toBeGreaterThan(0);
    window.dispatchEvent(new Event('pagehide'));
    expect(store.flushes).toBe(afterUnmount);
  });

  it('returns a referentially stable setter', () => {
    const store = makeFakeStore<string[]>([]);
    const { result, rerender } = renderHook(() => usePersistedState(store));
    const firstSetter = result.current[1];
    act(() => {
      result.current[1](['a']);
    });
    rerender();
    expect(result.current[1]).toBe(firstSetter);
  });
});
