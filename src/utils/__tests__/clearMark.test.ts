import { describe, expect, it } from 'vitest';
import type { Mule } from '../../types';
import { clearMarkUpdate, isMarkEligible, isMarkValid } from '../clearMark';
import { currentBmStamp, currentDailyStamp, currentWeeklyStamp } from '../cycle';

const NOW = Date.UTC(2026, 6, 11, 12, 0, 0); // 2026-07-11 12:00 UTC

function makeMule(overrides: Partial<Mule> = {}): Mule {
  return {
    id: 'm',
    name: 'm',
    level: 200,
    muleClass: 'Hero',
    selectedBosses: [],
    active: true,
    ...overrides,
  };
}

describe('clearMarkUpdate', () => {
  it('sets the daily field to the current daily Cycle Stamp', () => {
    expect(clearMarkUpdate('daily', true, NOW)).toEqual({ dailyClearMark: currentDailyStamp(NOW) });
  });

  it('sets the weekly field to the current weekly Reset Anchor stamp', () => {
    expect(clearMarkUpdate('weekly', true, NOW)).toEqual({
      weeklyClearMark: currentWeeklyStamp(NOW),
    });
  });

  it('sets the BM field to the current UTC month stamp', () => {
    expect(clearMarkUpdate('bm', true, NOW)).toEqual({ bmClearMark: currentBmStamp(NOW) });
  });

  it('clears each field back to undefined when marked is false', () => {
    expect(clearMarkUpdate('daily', false, NOW)).toEqual({ dailyClearMark: undefined });
    expect(clearMarkUpdate('weekly', false, NOW)).toEqual({ weeklyClearMark: undefined });
    expect(clearMarkUpdate('bm', false, NOW)).toEqual({ bmClearMark: undefined });
  });
});

describe('isMarkEligible', () => {
  it('daily needs at least one daily key', () => {
    expect(isMarkEligible({ dailyCount: 1, weeklyCount: 0, monthlyCount: 0 }, 'daily')).toBe(true);
    expect(isMarkEligible({ dailyCount: 0, weeklyCount: 9, monthlyCount: 9 }, 'daily')).toBe(false);
  });

  it('weekly needs at least one weekly-or-daily key', () => {
    expect(isMarkEligible({ dailyCount: 0, weeklyCount: 1, monthlyCount: 0 }, 'weekly')).toBe(true);
    // A daily-only slate still makes the weekly mark eligible (mirrors Mark
    // Invalidation: a weekly mark survives while any daily key remains).
    expect(isMarkEligible({ dailyCount: 1, weeklyCount: 0, monthlyCount: 0 }, 'weekly')).toBe(true);
    expect(isMarkEligible({ dailyCount: 0, weeklyCount: 0, monthlyCount: 5 }, 'weekly')).toBe(
      false,
    );
  });

  it('bm needs at least one Monthly Cadence key', () => {
    expect(isMarkEligible({ dailyCount: 0, weeklyCount: 0, monthlyCount: 1 }, 'bm')).toBe(true);
    expect(isMarkEligible({ dailyCount: 9, weeklyCount: 9, monthlyCount: 0 }, 'bm')).toBe(false);
  });
});

describe('isMarkValid', () => {
  it('is true only when the mule carries the current cycle stamp', () => {
    const marked = makeMule({
      dailyClearMark: currentDailyStamp(NOW),
      weeklyClearMark: currentWeeklyStamp(NOW),
      bmClearMark: currentBmStamp(NOW),
    });
    expect(isMarkValid(marked, 'daily', NOW)).toBe(true);
    expect(isMarkValid(marked, 'weekly', NOW)).toBe(true);
    expect(isMarkValid(marked, 'bm', NOW)).toBe(true);
  });

  it('is false for an unmarked mule', () => {
    const bare = makeMule();
    expect(isMarkValid(bare, 'daily', NOW)).toBe(false);
    expect(isMarkValid(bare, 'weekly', NOW)).toBe(false);
    expect(isMarkValid(bare, 'bm', NOW)).toBe(false);
  });

  it('is false for a stale (previous-cycle) stamp', () => {
    const stale = makeMule({
      dailyClearMark: '2026-07-10',
      bmClearMark: '2026-06',
      weeklyClearMark: currentWeeklyStamp(NOW) - 7 * 24 * 60 * 60 * 1000,
    });
    expect(isMarkValid(stale, 'daily', NOW)).toBe(false);
    expect(isMarkValid(stale, 'weekly', NOW)).toBe(false);
    expect(isMarkValid(stale, 'bm', NOW)).toBe(false);
  });

  it('round-trips a set patch back into a valid mark', () => {
    const patch = clearMarkUpdate('daily', true, NOW);
    const mule = makeMule(patch);
    expect(isMarkValid(mule, 'daily', NOW)).toBe(true);
  });
});
