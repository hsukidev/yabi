import { describe, expect, it } from 'vitest';
import {
  currentBmStamp,
  currentDailyStamp,
  currentWeeklyStamp,
  isBmMarkValid,
  isDailyMarkValid,
  isWeeklyMarkValid,
  nextMonthlyResetUtc,
  nextUtcMidnight,
} from '../cycle';

// Anchor dates (all UTC):
//   2026-07-09 is a Thursday (a Reset Anchor).
//   2026-07-11 is a Saturday, sitting in the weekly cycle that opened 07-09.
const MS_PER_DAY = 24 * 60 * 60 * 1000;

describe('nextUtcMidnight', () => {
  it('returns the following UTC midnight for a mid-day instant', () => {
    const now = Date.UTC(2026, 6, 11, 15, 30, 0);
    expect(nextUtcMidnight(now)).toBe(Date.UTC(2026, 6, 12));
  });

  it('returns the next day when called exactly at UTC midnight (strictly future)', () => {
    const midnight = Date.UTC(2026, 6, 11);
    expect(nextUtcMidnight(midnight)).toBe(Date.UTC(2026, 6, 12));
  });

  it('rolls into the next month across a month-end midnight', () => {
    const now = Date.UTC(2026, 6, 31, 12, 0, 0); // 2026-07-31 12:00
    expect(nextUtcMidnight(now)).toBe(Date.UTC(2026, 7, 1));
  });
});

describe('nextMonthlyResetUtc', () => {
  it('returns the 1st of next month at 00:00 UTC', () => {
    const now = Date.UTC(2026, 6, 11, 15, 30, 0);
    expect(nextMonthlyResetUtc(now)).toBe(Date.UTC(2026, 7, 1));
  });

  it('returns the following month when called exactly at a month boundary', () => {
    const boundary = Date.UTC(2026, 7, 1); // Aug 1 00:00
    expect(nextMonthlyResetUtc(boundary)).toBe(Date.UTC(2026, 8, 1));
  });

  it('rolls the year over from December to January', () => {
    const now = Date.UTC(2026, 11, 15, 0, 0, 0); // Dec 15
    expect(nextMonthlyResetUtc(now)).toBe(Date.UTC(2027, 0, 1));
  });
});

describe('currentDailyStamp', () => {
  it('formats the UTC day as YYYY-MM-DD with zero-padding', () => {
    expect(currentDailyStamp(Date.UTC(2026, 6, 11, 15, 30, 0))).toBe('2026-07-11');
    expect(currentDailyStamp(Date.UTC(2026, 0, 5, 0, 0, 0))).toBe('2026-01-05');
  });
});

describe('currentBmStamp', () => {
  it('formats the UTC month as YYYY-MM with zero-padding', () => {
    expect(currentBmStamp(Date.UTC(2026, 6, 11, 15, 30, 0))).toBe('2026-07');
    expect(currentBmStamp(Date.UTC(2026, 0, 31, 0, 0, 0))).toBe('2026-01');
  });
});

describe('currentWeeklyStamp', () => {
  it('returns the most recent past Reset Anchor (this-cycle Thursday 00:00 UTC)', () => {
    // Saturday 2026-07-11 → the anchor that opened the cycle is 2026-07-09.
    expect(currentWeeklyStamp(Date.UTC(2026, 6, 11, 15, 30, 0))).toBe(Date.UTC(2026, 6, 9));
  });

  it('returns the just-passed anchor when called exactly at a Reset Anchor', () => {
    const thursday = Date.UTC(2026, 6, 9); // 2026-07-09 00:00 UTC
    expect(currentWeeklyStamp(thursday)).toBe(thursday);
  });

  it('flips to the new anchor one ms after a Reset Anchor', () => {
    const thursday = Date.UTC(2026, 6, 9);
    expect(currentWeeklyStamp(thursday - 1)).toBe(thursday - 7 * MS_PER_DAY);
    expect(currentWeeklyStamp(thursday + 1)).toBe(thursday);
  });
});

describe('isDailyMarkValid', () => {
  const now = Date.UTC(2026, 6, 11, 15, 30, 0);
  it('is valid when the stamp equals the current UTC day', () => {
    expect(isDailyMarkValid('2026-07-11', now)).toBe(true);
  });
  it('is invalid for a stale stamp', () => {
    expect(isDailyMarkValid('2026-07-10', now)).toBe(false);
  });
  it('is invalid for an absent (undefined) stamp', () => {
    expect(isDailyMarkValid(undefined, now)).toBe(false);
  });
});

describe('isWeeklyMarkValid', () => {
  const now = Date.UTC(2026, 6, 11, 15, 30, 0);
  it('is valid when the stamp equals the current Reset Anchor', () => {
    expect(isWeeklyMarkValid(Date.UTC(2026, 6, 9), now)).toBe(true);
  });
  it('is invalid for a previous-week anchor', () => {
    expect(isWeeklyMarkValid(Date.UTC(2026, 6, 2), now)).toBe(false);
  });
  it('is invalid for an absent stamp', () => {
    expect(isWeeklyMarkValid(undefined, now)).toBe(false);
  });
});

describe('isBmMarkValid', () => {
  const now = Date.UTC(2026, 6, 11, 15, 30, 0);
  it('is valid when the stamp equals the current UTC month', () => {
    expect(isBmMarkValid('2026-07', now)).toBe(true);
  });
  it('is invalid for a previous month', () => {
    expect(isBmMarkValid('2026-06', now)).toBe(false);
  });
  it('is invalid for an absent stamp', () => {
    expect(isBmMarkValid(undefined, now)).toBe(false);
  });
});

describe('cycle-boundary expiry (a fresh mark goes stale across its boundary)', () => {
  it('daily mark valid before UTC midnight, invalid after', () => {
    const before = Date.UTC(2026, 6, 11, 23, 59, 0);
    const after = Date.UTC(2026, 6, 12, 0, 0, 0);
    const stamp = currentDailyStamp(before); // "2026-07-11"
    expect(isDailyMarkValid(stamp, before)).toBe(true);
    expect(isDailyMarkValid(stamp, after)).toBe(false);
  });

  it('weekly mark valid before the Reset Anchor, invalid after', () => {
    // Cycle opened 2026-07-09; next anchor is 2026-07-16.
    const before = Date.UTC(2026, 6, 15, 23, 59, 0); // Wed 23:59
    const after = Date.UTC(2026, 6, 16, 0, 0, 0); // Thu 00:00
    const stamp = currentWeeklyStamp(before); // anchor 2026-07-09
    expect(isWeeklyMarkValid(stamp, before)).toBe(true);
    expect(isWeeklyMarkValid(stamp, after)).toBe(false);
  });

  it('BM mark valid before the month boundary, invalid after', () => {
    const before = Date.UTC(2026, 6, 31, 23, 59, 0); // 2026-07-31 23:59
    const after = Date.UTC(2026, 7, 1, 0, 0, 0); // 2026-08-01 00:00
    const stamp = currentBmStamp(before); // "2026-07"
    expect(isBmMarkValid(stamp, before)).toBe(true);
    expect(isBmMarkValid(stamp, after)).toBe(false);
  });
});
