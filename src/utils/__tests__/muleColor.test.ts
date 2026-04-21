import { describe, expect, it } from 'vitest';
import { MULE_PALETTE, colorForMuleId, colorIndexForMuleId } from '../muleColor';

describe('muleColor', () => {
  it('returns a palette slot in bounds for any id', () => {
    const ids = ['a', 'b', 'c', 'long-uuid-like-string', ''];
    for (const id of ids) {
      const idx = colorIndexForMuleId(id);
      expect(idx).toBeGreaterThanOrEqual(0);
      expect(idx).toBeLessThan(MULE_PALETTE.length);
    }
  });

  it('is deterministic — same id → same index across calls', () => {
    expect(colorIndexForMuleId('mule-1')).toBe(colorIndexForMuleId('mule-1'));
    expect(colorForMuleId('mule-1')).toBe(colorForMuleId('mule-1'));
  });

  it("is pure in the id: other ids never change an id's slot", () => {
    const before = colorIndexForMuleId('target');
    // Touch many other ids; the hash must not accumulate state.
    for (let i = 0; i < 50; i++) colorIndexForMuleId(`noise-${i}`);
    expect(colorIndexForMuleId('target')).toBe(before);
  });

  it('colorForMuleId returns the palette token at the computed index', () => {
    const id = 'mule-xyz';
    expect(colorForMuleId(id)).toBe(MULE_PALETTE[colorIndexForMuleId(id)]);
  });
});
