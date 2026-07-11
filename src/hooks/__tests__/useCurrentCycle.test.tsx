import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useCurrentCycle } from '../useCurrentCycle';
import { currentBmStamp, currentDailyStamp, currentWeeklyStamp } from '../../utils/cycle';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

// Fake timers drive both `Date.now()` and `setTimeout`, so the hook's
// timeout-to-next-boundary scheduling is fully deterministic. Each test parks
// the clock one minute before a boundary, mounts the hook, then advances past
// the boundary and asserts the hook re-rendered with an updated `now`.
describe('useCurrentCycle', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('re-renders across a plain UTC-midnight (daily) boundary', () => {
    // 2026-07-11 (Sat) 23:59 — a non-Thursday, non-month-start midnight ahead.
    vi.setSystemTime(new Date(Date.UTC(2026, 6, 11, 23, 59, 0)));
    const { result } = renderHook(() => useCurrentCycle());

    expect(currentDailyStamp(result.current)).toBe('2026-07-11');

    act(() => {
      vi.advanceTimersByTime(60 * 1000); // cross into 2026-07-12 00:00 UTC
    });

    expect(currentDailyStamp(result.current)).toBe('2026-07-12');
  });

  it('re-renders across the Thursday 00:00 UTC weekly Reset Anchor', () => {
    // 2026-07-15 (Wed) 23:59 → next boundary is the 2026-07-16 Reset Anchor.
    vi.setSystemTime(new Date(Date.UTC(2026, 6, 15, 23, 59, 0)));
    const { result } = renderHook(() => useCurrentCycle());

    expect(currentWeeklyStamp(result.current)).toBe(Date.UTC(2026, 6, 9));

    act(() => {
      vi.advanceTimersByTime(60 * 1000); // cross into Thursday 2026-07-16 00:00
    });

    expect(currentWeeklyStamp(result.current)).toBe(Date.UTC(2026, 6, 16));
  });

  it('re-renders across the 1st-of-month 00:00 UTC (BM) boundary', () => {
    // 2026-07-31 23:59 → next boundary is the 2026-08-01 month boundary.
    vi.setSystemTime(new Date(Date.UTC(2026, 6, 31, 23, 59, 0)));
    const { result } = renderHook(() => useCurrentCycle());

    expect(currentBmStamp(result.current)).toBe('2026-07');

    act(() => {
      vi.advanceTimersByTime(60 * 1000); // cross into 2026-08-01 00:00 UTC
    });

    expect(currentBmStamp(result.current)).toBe('2026-08');
  });

  it('re-arms — fires again at each successive UTC midnight without reload', () => {
    vi.setSystemTime(new Date(Date.UTC(2026, 6, 11, 23, 59, 0)));
    const { result } = renderHook(() => useCurrentCycle());

    act(() => {
      vi.advanceTimersByTime(60 * 1000); // → 2026-07-12
    });
    expect(currentDailyStamp(result.current)).toBe('2026-07-12');

    act(() => {
      vi.advanceTimersByTime(MS_PER_DAY); // → 2026-07-13
    });
    expect(currentDailyStamp(result.current)).toBe('2026-07-13');
  });

  it('cleans up its timeout on unmount', () => {
    const clearSpy = vi.spyOn(globalThis, 'clearTimeout');
    vi.setSystemTime(new Date(Date.UTC(2026, 6, 11, 12, 0, 0)));
    const { unmount } = renderHook(() => useCurrentCycle());
    unmount();
    expect(clearSpy).toHaveBeenCalled();
  });
});
