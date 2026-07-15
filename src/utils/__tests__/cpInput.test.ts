import { describe, expect, it } from 'vitest';
import {
  CP_MAX_DIGITS,
  caretForDigitIndex,
  cpDigits,
  digitsBefore,
  groupCp,
  groupCpWithCaret,
  parseCpValue,
} from '../cpInput';

describe('cpDigits', () => {
  it('strips non-digits', () => {
    expect(cpDigits('4a1,0.0-4 2')).toBe('410042');
  });

  it('caps at 10 digits', () => {
    expect(cpDigits('123456789012345')).toBe('1234567890');
    expect(cpDigits('123456789012345')).toHaveLength(CP_MAX_DIGITS);
  });

  it('returns empty for a digit-less string', () => {
    expect(cpDigits('abc,.- ')).toBe('');
  });
});

describe('groupCp', () => {
  it('groups with en-US commas', () => {
    expect(groupCp('410042525')).toBe('410,042,525');
    expect(groupCp('1000')).toBe('1,000');
    expect(groupCp('999')).toBe('999');
  });

  it('is paste-safe (strips then groups)', () => {
    expect(groupCp('410,042,525')).toBe('410,042,525');
    expect(groupCp('$410042525 CP')).toBe('410,042,525');
  });

  it('truncates to 10 digits before grouping', () => {
    expect(groupCp('99999999999999')).toBe('9,999,999,999');
  });

  it('empty input → empty string', () => {
    expect(groupCp('')).toBe('');
    expect(groupCp('---')).toBe('');
  });

  it('preserves leading zeros (numeric collapse happens on commit)', () => {
    expect(groupCp('0410')).toBe('0,410');
  });
});

describe('parseCpValue', () => {
  it('parses grouped and raw forms to the same number', () => {
    expect(parseCpValue('410,042,525')).toBe(410042525);
    expect(parseCpValue('410042525')).toBe(410042525);
  });

  it('empty / digit-less → 0', () => {
    expect(parseCpValue('')).toBe(0);
    expect(parseCpValue('abc')).toBe(0);
    expect(parseCpValue('0')).toBe(0);
  });

  it('respects the 10-digit cap', () => {
    expect(parseCpValue('99999999999999')).toBe(9999999999);
  });
});

describe('digitsBefore', () => {
  it('counts only digit chars left of the caret', () => {
    // "410,042,525" — caret after "410," (index 4) → 3 digits.
    expect(digitsBefore('410,042,525', 4)).toBe(3);
    // caret after "410,0" (index 5) → 4 digits.
    expect(digitsBefore('410,042,525', 5)).toBe(4);
  });

  it('clamps a caret past the end', () => {
    expect(digitsBefore('410,042,525', 999)).toBe(9);
  });

  it('is 0 at the start', () => {
    expect(digitsBefore('410,042,525', 0)).toBe(0);
  });
});

describe('caretForDigitIndex', () => {
  it('places the caret just after the Nth digit', () => {
    // 3 digits into "410,042,525" → index 3 (before the first comma).
    expect(caretForDigitIndex('410,042,525', 3)).toBe(3);
    // 4 digits → skip the comma → index 5.
    expect(caretForDigitIndex('410,042,525', 4)).toBe(5);
  });

  it('0 → start of string', () => {
    expect(caretForDigitIndex('410,042,525', 0)).toBe(0);
  });

  it('count ≥ digit count → end of string', () => {
    expect(caretForDigitIndex('410,042,525', 99)).toBe('410,042,525'.length);
  });
});

describe('groupCpWithCaret', () => {
  it('regroups and restores the caret by digit index', () => {
    // Typing "5" into "41,042,525" at position after "41" (raw "415,042,525"
    // is not what the browser produces; simulate the browser post-edit raw).
    // Browser value after inserting a digit: "4102,042,525" with caret at 4.
    const { value, caret } = groupCpWithCaret('4102,042,525', 4);
    expect(value).toBe('4,102,042,525');
    // 4 digits left of the edit → caret sits just after the 4th digit.
    expect(caretForDigitIndex(value, 4)).toBe(caret);
    expect(caret).toBe(5); // "4,102" — after "4,102"? 4 digits = "4102" → index 5
  });

  it('caret at end stays at end after regroup', () => {
    const { value, caret } = groupCpWithCaret('410042525', 9);
    expect(value).toBe('410,042,525');
    expect(caret).toBe(value.length);
  });

  it('caps digits-left at the 10-digit truncation bound', () => {
    const raw = '123456789012'; // 12 digits, caret at very end
    const { value, caret } = groupCpWithCaret(raw, raw.length);
    expect(value).toBe('1,234,567,890'); // 10 digits grouped
    expect(caret).toBe(value.length);
  });

  it('empty raw → empty value, caret at 0', () => {
    expect(groupCpWithCaret('', 0)).toEqual({ value: '', caret: 0 });
  });
});
