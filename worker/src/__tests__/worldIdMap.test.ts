import { describe, expect, it } from 'vitest';
import {
  HEROIC_WORLD_IDS,
  isHeroicWorldId,
  toUpstreamKey,
  fromUpstreamKey,
  type HeroicWorldId,
} from '../worldIdMap';

/**
 * Round-trip tests for the World ID map. The numeric `worldID` values are
 * reverse-engineered empirically and a typo here would silently misroute
 * lookups to the wrong world — the round-trip catches any mapping that
 * isn't bijective, and the per-id checks guard against accidentally
 * collapsing two worlds onto the same numeric id.
 */

describe('worldIdMap', () => {
  it('exposes the three Heroic worlds in scope for slice 2', () => {
    expect(new Set(HEROIC_WORLD_IDS)).toEqual(
      new Set<HeroicWorldId>(['heroic-kronos', 'heroic-hyperion', 'heroic-solis']),
    );
  });

  it('maps every Heroic WorldId to a `{ rebootIndex: 1, worldID }` tuple', () => {
    for (const id of HEROIC_WORLD_IDS) {
      const key = toUpstreamKey(id);
      expect(key.rebootIndex).toBe(1);
      expect(typeof key.worldID).toBe('number');
      expect(Number.isInteger(key.worldID)).toBe(true);
    }
  });

  it('round-trips every Heroic WorldId via toUpstreamKey → fromUpstreamKey', () => {
    for (const id of HEROIC_WORLD_IDS) {
      const key = toUpstreamKey(id);
      const reverse = fromUpstreamKey(key.rebootIndex, key.worldID);
      expect(reverse).toBe(id);
    }
  });

  it('assigns a unique numeric worldID to each Heroic WorldId', () => {
    const numericIds = HEROIC_WORLD_IDS.map((id) => toUpstreamKey(id).worldID);
    expect(new Set(numericIds).size).toBe(numericIds.length);
  });

  it('returns null from fromUpstreamKey for an unknown numeric worldID', () => {
    expect(fromUpstreamKey(1, 9999)).toBeNull();
  });

  it('returns null from fromUpstreamKey for an Interactive rebootIndex', () => {
    // Heroic worlds always live at rebootIndex 1; an Interactive (rebootIndex
    // 0) tuple — even with a numeric id that happens to overlap a Heroic
    // world — must not resolve to a Heroic WorldId.
    const kronos = toUpstreamKey('heroic-kronos');
    expect(fromUpstreamKey(0, kronos.worldID)).toBeNull();
  });

  it('narrows isHeroicWorldId to the three Heroic worlds in scope', () => {
    expect(isHeroicWorldId('heroic-kronos')).toBe(true);
    expect(isHeroicWorldId('heroic-hyperion')).toBe(true);
    expect(isHeroicWorldId('heroic-solis')).toBe(true);
  });

  it('rejects out-of-scope WorldIds (Challenger / Interactive) and garbage', () => {
    expect(isHeroicWorldId('heroic-challenger')).toBe(false);
    expect(isHeroicWorldId('interactive-scania')).toBe(false);
    expect(isHeroicWorldId('interactive-bera')).toBe(false);
    expect(isHeroicWorldId('interactive-luna')).toBe(false);
    expect(isHeroicWorldId('interactive-challenger')).toBe(false);
    expect(isHeroicWorldId('')).toBe(false);
    expect(isHeroicWorldId(null)).toBe(false);
    expect(isHeroicWorldId(undefined)).toBe(false);
    expect(isHeroicWorldId(45)).toBe(false);
  });
});
