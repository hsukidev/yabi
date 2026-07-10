import { describe, it, expect, beforeEach } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useSlateDisplayMode } from '../useSlateDisplayMode';

const STORAGE_KEY = 'slate-display-mode';

describe('useSlateDisplayMode', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('defaults to matrix when nothing is stored', () => {
    const { result } = renderHook(() => useSlateDisplayMode());
    expect(result.current.mode).toBe('matrix');
  });

  it('hydrates the stored mode on mount', () => {
    localStorage.setItem(STORAGE_KEY, 'cards');
    const { result } = renderHook(() => useSlateDisplayMode());
    expect(result.current.mode).toBe('cards');
  });

  it('ignores an invalid stored value and falls back to matrix', () => {
    localStorage.setItem(STORAGE_KEY, 'bogus');
    const { result } = renderHook(() => useSlateDisplayMode());
    expect(result.current.mode).toBe('matrix');
  });

  it('toggleMode flips matrix -> cards -> matrix', () => {
    const { result } = renderHook(() => useSlateDisplayMode());
    act(() => result.current.toggleMode());
    expect(result.current.mode).toBe('cards');
    act(() => result.current.toggleMode());
    expect(result.current.mode).toBe('matrix');
  });

  it('setMode sets the mode explicitly', () => {
    const { result } = renderHook(() => useSlateDisplayMode());
    act(() => result.current.setMode('cards'));
    expect(result.current.mode).toBe('cards');
  });

  it('persists the mode to localStorage on change', () => {
    const { result } = renderHook(() => useSlateDisplayMode());
    act(() => result.current.setMode('cards'));
    expect(localStorage.getItem(STORAGE_KEY)).toBe('cards');
  });

  it('a fresh hook (simulating reload) reads back the persisted mode', () => {
    const first = renderHook(() => useSlateDisplayMode());
    act(() => first.result.current.setMode('cards'));
    // A brand-new hook instance mimics a page reload reading persisted state.
    const second = renderHook(() => useSlateDisplayMode());
    expect(second.result.current.mode).toBe('cards');
  });

  it('setMode and toggleMode keep stable identities across renders', () => {
    const { result, rerender } = renderHook(() => useSlateDisplayMode());
    const firstSet = result.current.setMode;
    const firstToggle = result.current.toggleMode;
    rerender();
    expect(result.current.setMode).toBe(firstSet);
    expect(result.current.toggleMode).toBe(firstToggle);
  });
});
