import { describe, expect, it } from 'vitest';
import { formatCp } from '../cpFormat';

describe('formatCp', () => {
  // PRD reference cases (#332 / #328) — the promotion rows are the
  // regression-prone ones: a naive unit pick prints `1000M` / `1000K`.
  it.each([
    [0, '0'],
    [1, '1'],
    [999, '999'],
    [1_234, '1K'],
    [1_500, '2K'], // round half-up
    [192_425, '192K'],
    [999_500, '1M'], // promotion: 999.5K → 1M, not 1000K
    [245_800_000, '246M'],
    [410_042_525, '410M'],
    [999_999_999, '1B'], // promotion: 1000M → 1B
    [9_999_999_999, '10B'],
  ])('formats %i as %s', (value, expected) => {
    expect(formatCp(value)).toBe(expected);
  });

  it('rounds half-up at every unit boundary', () => {
    expect(formatCp(1_500)).toBe('2K'); // K
    expect(formatCp(1_500_000)).toBe('2M'); // M
    expect(formatCp(1_500_000_000)).toBe('2B'); // B
  });

  it('promotes only once (no 1000-unit output at any tier)', () => {
    expect(formatCp(999_499)).toBe('999K'); // just under the K→M promotion
    expect(formatCp(999_500)).toBe('1M'); // promotes
    expect(formatCp(999_499_999)).toBe('999M'); // just under the M→B promotion
    expect(formatCp(999_999_999)).toBe('1B'); // promotes
  });

  it('floors fractional input before formatting (mirrors persistence read-floor)', () => {
    expect(formatCp(999.9)).toBe('999');
    expect(formatCp(1_499.9)).toBe('1K');
  });

  it('clamps negatives to 0', () => {
    expect(formatCp(-5)).toBe('0');
  });
});
