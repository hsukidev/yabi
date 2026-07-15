import { describe, expect, it } from 'vitest';
import { formatCp } from '../cpFormat';

describe('formatCp', () => {
  // Reference cases — one-decimal half-up, trailing .0 trimmed (supersedes the
  // whole-unit PRD cases from #332/#328; whole-unit rounding read 4.52B as 5B,
  // which overstated CP by up to half a unit). The promotion rows are the
  // regression-prone ones: a naive unit pick prints `1000M` / `1000K`.
  it.each([
    [0, '0'],
    [1, '1'],
    [999, '999'],
    [1_234, '1.2K'],
    [1_500, '1.5K'],
    [192_425, '192.4K'],
    [999_500, '999.5K'], // tenths keep it under the promotion boundary
    [999_950, '1M'], // promotion: 999.95K → 1000.0K → 1M
    [245_800_000, '245.8M'],
    [410_042_525, '410M'], // trailing .0 trimmed
    [999_999_999, '1B'], // promotion: 1000.0M → 1B
    [4_523_213_145, '4.5B'], // the motivating case — was 5B under whole-unit
    [9_999_999_999, '10B'],
  ])('formats %i as %s', (value, expected) => {
    expect(formatCp(value)).toBe(expected);
  });

  it('rounds half-up at the tenths digit of every unit', () => {
    expect(formatCp(1_450)).toBe('1.5K'); // K
    expect(formatCp(1_449)).toBe('1.4K');
    expect(formatCp(1_450_000)).toBe('1.5M'); // M
    expect(formatCp(4_550_000_000)).toBe('4.6B'); // B, exact tie
    expect(formatCp(4_549_999_999)).toBe('4.5B');
  });

  it('trims a trailing .0', () => {
    expect(formatCp(1_000)).toBe('1K');
    expect(formatCp(4_000_000_000)).toBe('4B');
    expect(formatCp(2_049_999)).toBe('2M'); // rounds to 2.0M, trims
  });

  it('promotes only once (no 1000-unit output at any tier)', () => {
    expect(formatCp(999_949)).toBe('999.9K'); // just under the K→M promotion
    expect(formatCp(999_950)).toBe('1M'); // promotes
    expect(formatCp(999_949_999)).toBe('999.9M'); // just under the M→B promotion
    expect(formatCp(999_950_000)).toBe('1B'); // promotes
  });

  it('floors fractional input before formatting (mirrors persistence read-floor)', () => {
    expect(formatCp(999.9)).toBe('999');
    expect(formatCp(1_499.9)).toBe('1.5K');
  });

  it('clamps negatives to 0', () => {
    expect(formatCp(-5)).toBe('0');
  });
});
