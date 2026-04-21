import { describe, expect, it } from 'vitest';
import { formatCountdown, nextWeeklyResetUtc } from '../resetCountdown';

// Reset Anchor = Thursday 00:00 UTC. Thursday is ISO weekday 4.
// JS Date.UTC weekday indices: 0=Sun, 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat.

const MS_PER_DAY = 24 * 60 * 60 * 1000;

describe('nextWeeklyResetUtc', () => {
  it('returns the following Thursday 00:00 UTC for a Monday mid-day', () => {
    // 2026-04-13 is a Monday. 12:00 UTC.
    const now = Date.UTC(2026, 3, 13, 12, 0, 0, 0);
    const expected = Date.UTC(2026, 3, 16, 0, 0, 0, 0); // Thursday 2026-04-16 00:00 UTC
    expect(nextWeeklyResetUtc(now)).toBe(expected);
  });

  it('returns next-day Thursday 00:00 UTC for Wednesday 23:59 UTC', () => {
    // 2026-04-15 is a Wednesday. 23:59 UTC.
    const now = Date.UTC(2026, 3, 15, 23, 59, 0, 0);
    const expected = Date.UTC(2026, 3, 16, 0, 0, 0, 0);
    expect(nextWeeklyResetUtc(now)).toBe(expected);
  });

  it('returns 7 days later when called exactly at Thursday 00:00:00.000 UTC', () => {
    // 2026-04-16 is a Thursday. 00:00:00.000 UTC.
    const now = Date.UTC(2026, 3, 16, 0, 0, 0, 0);
    const expected = now + 7 * MS_PER_DAY;
    expect(nextWeeklyResetUtc(now)).toBe(expected);
  });

  it('returns 7 days later when called at Thursday 00:00:00.001 UTC', () => {
    const thursday = Date.UTC(2026, 3, 16, 0, 0, 0, 0);
    const now = thursday + 1;
    const expected = thursday + 7 * MS_PER_DAY;
    expect(nextWeeklyResetUtc(now)).toBe(expected);
  });

  it('returns the following Thursday 00:00 UTC for a Saturday mid-day', () => {
    // 2026-04-18 is a Saturday. 12:00 UTC.
    const now = Date.UTC(2026, 3, 18, 12, 0, 0, 0);
    // Next Thursday is 2026-04-23.
    const expected = Date.UTC(2026, 3, 23, 0, 0, 0, 0);
    expect(nextWeeklyResetUtc(now)).toBe(expected);
    // Sanity: diff is 4 days 12 hours.
    expect(expected - now).toBe(4 * MS_PER_DAY + 12 * 60 * 60 * 1000);
  });
});

describe("formatCountdown 'live'", () => {
  it("formats 2d 14h as '2D 14:00:00'", () => {
    const ms = 2 * 86_400_000 + 14 * 3_600_000;
    expect(formatCountdown(ms, 'live')).toBe('2D 14:00:00');
  });

  it("zero-pads hours for 4h 12m 37s as '0D 04:12:37'", () => {
    const ms = 4 * 3_600_000 + 12 * 60_000 + 37 * 1000;
    expect(formatCountdown(ms, 'live')).toBe('0D 04:12:37');
  });

  it("formats 59s as '0D 00:00:59'", () => {
    expect(formatCountdown(59 * 1000, 'live')).toBe('0D 00:00:59');
  });

  it("formats 0ms as '0D 00:00:00'", () => {
    expect(formatCountdown(0, 'live')).toBe('0D 00:00:00');
  });
});

describe("formatCountdown 'smart'", () => {
  it("formats 2d 14h as '2D 14H'", () => {
    const ms = 2 * 86_400_000 + 14 * 3_600_000;
    expect(formatCountdown(ms, 'smart')).toBe('2D 14H');
  });

  it("formats 23h 59m as '23H 59M'", () => {
    const ms = 23 * 3_600_000 + 59 * 60_000;
    expect(formatCountdown(ms, 'smart')).toBe('23H 59M');
  });

  it("formats 59m 59s as '59M'", () => {
    const ms = 59 * 60_000 + 59 * 1000;
    expect(formatCountdown(ms, 'smart')).toBe('59M');
  });

  it("formats 30s as '<1M'", () => {
    expect(formatCountdown(30 * 1000, 'smart')).toBe('<1M');
  });

  it("formats 0ms as '<1M'", () => {
    expect(formatCountdown(0, 'smart')).toBe('<1M');
  });
});
