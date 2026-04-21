import { describe, expect, it } from 'vitest';
import { formatMeso } from '../meso';

describe('formatMeso', () => {
  describe('abbreviated mode', () => {
    it('formats billions', () => {
      expect(formatMeso(18000000000, true)).toBe('18B');
    });

    it('formats millions with decimals', () => {
      expect(formatMeso(4410000, true)).toBe('4.41M');
    });

    it('formats whole millions', () => {
      expect(formatMeso(1000000, true)).toBe('1M');
    });

    it('formats thousands', () => {
      expect(formatMeso(500000, true)).toBe('500K');
    });

    it('removes trailing zeros from decimals', () => {
      expect(formatMeso(4840000, true)).toBe('4.84M');
    });
  });

  describe('full mode', () => {
    it('formats with locale separators', () => {
      expect(formatMeso(18000000000, false)).toBe('18,000,000,000');
    });

    it('formats smaller numbers with separators', () => {
      expect(formatMeso(4840000, false)).toBe('4,840,000');
    });
  });
});
