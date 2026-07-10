import { describe, it, expect, beforeEach } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useSlateDisplayMode } from '../useSlateDisplayMode';

const STORAGE_KEY = 'slate-display-mode';

describe('useSlateDisplayMode', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('defaults to cards when nothing is stored', () => {
    const { result } = renderHook(() => useSlateDisplayMode());
    expect(result.current.mode).toBe('cards');
  });

  it('hydrates the stored mode on mount', () => {
    localStorage.setItem(STORAGE_KEY, 'matrix');
    const { result } = renderHook(() => useSlateDisplayMode());
    expect(result.current.mode).toBe('matrix');
  });

  it('ignores an invalid stored value and falls back to cards', () => {
    localStorage.setItem(STORAGE_KEY, 'bogus');
    const { result } = renderHook(() => useSlateDisplayMode());
    expect(result.current.mode).toBe('cards');
  });

  it('setMode sets the mode explicitly', () => {
    const { result } = renderHook(() => useSlateDisplayMode());
    act(() => result.current.setMode('matrix'));
    expect(result.current.mode).toBe('matrix');
  });

  it('setMode with the current mode is a no-op (stays put)', () => {
    const { result } = renderHook(() => useSlateDisplayMode());
    act(() => result.current.setMode('cards'));
    expect(result.current.mode).toBe('cards');
  });

  it('persists the mode to localStorage on change', () => {
    const { result } = renderHook(() => useSlateDisplayMode());
    act(() => result.current.setMode('matrix'));
    expect(localStorage.getItem(STORAGE_KEY)).toBe('matrix');
  });

  it('a fresh hook (simulating reload) reads back the persisted mode', () => {
    const first = renderHook(() => useSlateDisplayMode());
    act(() => first.result.current.setMode('matrix'));
    // A brand-new hook instance mimics a page reload reading persisted state.
    const second = renderHook(() => useSlateDisplayMode());
    expect(second.result.current.mode).toBe('matrix');
  });

  it('setMode keeps a stable identity across renders', () => {
    const { result, rerender } = renderHook(() => useSlateDisplayMode());
    const firstSet = result.current.setMode;
    rerender();
    expect(result.current.setMode).toBe(firstSet);
  });
});
