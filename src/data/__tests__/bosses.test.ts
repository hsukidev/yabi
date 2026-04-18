import { describe, expect, it } from 'vitest';
import { bosses, getBossById, ALL_BOSS_IDS } from '../bosses';
import type { BossTier, BossContentType } from '../../types';

const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

describe('bosses data (Matrix schema)', () => {
  it('exposes exactly one Boss per family', () => {
    const families = new Set(bosses.map((b) => b.family));
    expect(families.size).toBe(bosses.length);
    // Guard against drift: the pre-1A dataset had 32 distinct families
    // (issue #99 approximates as ~26).
    expect(bosses.length).toBe(32);
  });

  it('every Boss has a stable UUIDv4 id', () => {
    for (const boss of bosses) {
      expect(boss.id, `${boss.family} must have a UUID id`).toMatch(UUID_V4);
    }
  });

  it('Boss ids are unique', () => {
    const ids = new Set(bosses.map((b) => b.id));
    expect(ids.size).toBe(bosses.length);
  });

  it('display name has no difficulty prefix', () => {
    const blackMage = bosses.find((b) => b.family === 'black-mage')!;
    expect(blackMage.name).toBe('Black Mage');

    const lotus = bosses.find((b) => b.family === 'lotus')!;
    expect(lotus.name).toBe('Lotus');

    const kalos = bosses.find((b) => b.family === 'kalos-the-guardian')!;
    expect(kalos.name).toBe('Kalos the Guardian');
  });

  it('every difficulty entry is seeded with contentType "weekly"', () => {
    for (const boss of bosses) {
      for (const d of boss.difficulty) {
        const expected: BossContentType = 'weekly';
        expect(d.contentType).toBe(expected);
      }
    }
  });

  it('every difficulty entry has a valid BossTier', () => {
    const validTiers: BossTier[] = ['easy', 'normal', 'hard', 'chaos', 'extreme'];
    for (const boss of bosses) {
      for (const d of boss.difficulty) {
        expect(validTiers).toContain(d.tier);
      }
    }
  });

  it('tier-less bosses collapse to a single { tier: "normal", ... } entry', () => {
    for (const family of ['akechi-mitsuhide', 'omni-cln', 'princess-no']) {
      const boss = bosses.find((b) => b.family === family)!;
      expect(boss, `family ${family} should exist`).toBeDefined();
      expect(boss.difficulty).toHaveLength(1);
      expect(boss.difficulty[0].tier).toBe('normal');
      expect(boss.difficulty[0].contentType).toBe('weekly');
    }
  });

  it('names of tier-less bosses stay intact', () => {
    expect(bosses.find((b) => b.family === 'akechi-mitsuhide')!.name).toBe('Akechi Mitsuhide');
    expect(bosses.find((b) => b.family === 'omni-cln')!.name).toBe('OMNI-CLN');
    expect(bosses.find((b) => b.family === 'princess-no')!.name).toBe('Princess No');
  });

  it('ALL_BOSS_IDS contains every Boss id (family-level)', () => {
    for (const boss of bosses) {
      expect(ALL_BOSS_IDS.has(boss.id)).toBe(true);
    }
    expect(ALL_BOSS_IDS.size).toBe(bosses.length);
  });
});

describe('getBossById', () => {
  it('returns boss by its UUID id', () => {
    const lucid = bosses.find((b) => b.family === 'lucid')!;
    expect(getBossById(lucid.id)).toBe(lucid);
  });

  it('returns undefined for unknown id', () => {
    expect(getBossById('nonexistent-boss')).toBeUndefined();
  });

  it('every Boss is retrievable by its id', () => {
    for (const boss of bosses) {
      expect(getBossById(boss.id)).toBe(boss);
    }
  });
});
