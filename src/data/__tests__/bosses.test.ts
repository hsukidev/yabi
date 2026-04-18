import { describe, expect, it } from 'vitest';
import {
  bosses,
  calculatePotentialIncome,
  getBossById,
  getLegacyBoss,
  ALL_BOSS_IDS,
} from '../bosses';
import type { Boss, BossTier, BossContentType } from '../../types';

const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

// All 80 legacy ids from the pre-1A flat dataset. Every one of these
// must round-trip through getLegacyBoss() to preserve existing mule selections.
const LEGACY_IDS: Array<readonly [string, BossTier, number]> = [
  ['extreme-black-mage', 'extreme', 18000000000],
  ['extreme-kaling', 'extreme', 6026000000],
  ['extreme-first-adversary', 'extreme', 5880000000],
  ['extreme-kalos-the-guardian', 'extreme', 5200000000],
  ['hard-black-mage', 'hard', 4500000000],
  ['extreme-chosen-seren', 'extreme', 4235000000],
  ['hard-baldrix', 'hard', 4200000000],
  ['hard-limbo', 'hard', 3745000000],
  ['hard-kaling', 'hard', 2990000000],
  ['hard-first-adversary', 'hard', 2940000000],
  ['normal-baldrix', 'normal', 2800000000],
  ['chaos-kalos-the-guardian', 'chaos', 2600000000],
  ['normal-limbo', 'normal', 2100000000],
  ['normal-kaling', 'normal', 1506500000],
  ['extreme-lotus', 'extreme', 1397500000],
  ['normal-first-adversary', 'normal', 1365000000],
  ['normal-kalos-the-guardian', 'normal', 1300000000],
  ['hard-chosen-seren', 'hard', 1096562500],
  ['easy-kaling', 'easy', 1031250000],
  ['easy-first-adversary', 'easy', 985000000],
  ['easy-kalos-the-guardian', 'easy', 937500000],
  ['normal-chosen-seren', 'normal', 889021875],
  ['hard-verus-hilla', 'hard', 762105000],
  ['hard-darknell', 'hard', 667920000],
  ['hard-will', 'hard', 621810000],
  ['chaos-guardian-angel-slime', 'chaos', 600578125],
  ['normal-verus-hilla', 'normal', 581880000],
  ['chaos-gloom', 'chaos', 563945000],
  ['hard-lucid', 'hard', 504000000],
  ['hard-lotus', 'hard', 444675000],
  ['hard-damien', 'hard', 421875000],
  ['normal-darknell', 'normal', 316875000],
  ['normal-gloom', 'normal', 297675000],
  ['normal-will', 'normal', 279075000],
  ['normal-lucid', 'normal', 253828125],
  ['easy-will', 'easy', 246744750],
  ['easy-lucid', 'easy', 237009375],
  ['normal-guardian-angel-slime', 'normal', 231673500],
  ['normal-damien', 'normal', 169000000],
  ['normal-lotus', 'normal', 162562500],
  ['akechi-mitsuhide', 'normal', 144000000],
  ['chaos-papulatus', 'chaos', 132250000],
  ['chaos-vellum', 'chaos', 105062500],
  ['hard-magnus', 'hard', 95062500],
  ['princess-no', 'normal', 81000000],
  ['chaos-zakum', 'chaos', 81000000],
  ['chaos-pierre', 'chaos', 81000000],
  ['chaos-von-bon', 'chaos', 81000000],
  ['chaos-crimson-queen', 'chaos', 81000000],
  ['normal-cygnus', 'normal', 72250000],
  ['chaos-pink-bean', 'chaos', 64000000],
  ['hard-hilla', 'hard', 56250000],
  ['easy-cygnus', 'easy', 45562500],
  ['hard-mori-ranmaru', 'hard', 13322500],
  ['normal-papulatus', 'normal', 13322500],
  ['normal-magnus', 'normal', 12960000],
  ['normal-arkarium', 'normal', 12602500],
  ['hard-von-leon', 'hard', 12250000],
  ['normal-von-leon', 'normal', 7290000],
  ['normal-pink-bean', 'normal', 7022500],
  ['chaos-horntail', 'chaos', 6760000],
  ['omni-cln', 'normal', 6250000],
  ['easy-arkarium', 'easy', 5760000],
  ['easy-von-leon', 'easy', 5290000],
  ['normal-horntail', 'normal', 5062500],
  ['normal-pierre', 'normal', 4840000],
  ['normal-von-bon', 'normal', 4840000],
  ['normal-crimson-queen', 'normal', 4840000],
  ['normal-vellum', 'normal', 4840000],
  ['easy-horntail', 'easy', 4410000],
  ['normal-mori-ranmaru', 'normal', 4202500],
  ['normal-hilla', 'normal', 4000000],
  ['easy-magnus', 'easy', 3610000],
  ['easy-papulatus', 'easy', 3422500],
  ['normal-zakum', 'normal', 3062500],
  ['easy-zakum', 'easy', 1000000],
];

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

describe('getLegacyBoss', () => {
  it('returns undefined for an unknown legacy id', () => {
    expect(getLegacyBoss('totally-fake-id')).toBeUndefined();
  });

  it.each(LEGACY_IDS)(
    'maps legacy id %s to { uuid, tier: %s, crystalValue: %d, contentType: "weekly" }',
    (legacyId, expectedTier, expectedCrystalValue) => {
      const result = getLegacyBoss(legacyId);
      expect(result, `legacy id ${legacyId} must resolve`).toBeDefined();
      expect(result!.uuid).toMatch(UUID_V4);
      expect(result!.tier).toBe(expectedTier);
      expect(result!.crystalValue).toBe(expectedCrystalValue);
      expect(result!.contentType).toBe('weekly');
    },
  );

  it('every resolved uuid points to a real Boss whose difficulty[] contains the resolved tier', () => {
    for (const [legacyId, , expectedCrystalValue] of LEGACY_IDS) {
      const { uuid, tier, crystalValue } = getLegacyBoss(legacyId)!;
      const boss = getBossById(uuid) as Boss;
      expect(boss).toBeDefined();
      const diff = boss.difficulty.find((d) => d.tier === tier);
      expect(diff, `${legacyId} → ${boss.family}:${tier}`).toBeDefined();
      expect(diff!.crystalValue).toBe(expectedCrystalValue);
      expect(diff!.crystalValue).toBe(crystalValue);
    }
  });

  it('covers every legacy id in the pre-1A dataset', () => {
    // The pre-1A flat dataset held 76 rows (issue #99 approximates as "80").
    expect(LEGACY_IDS).toHaveLength(76);
  });
});

describe('calculatePotentialIncome (legacy-id compatible)', () => {
  it('returns 0 for empty selection', () => {
    expect(calculatePotentialIncome([])).toBe(0);
  });

  it('returns crystal value for a single legacy id', () => {
    expect(calculatePotentialIncome(['hard-lucid'])).toBe(504000000);
  });

  it('sums crystal values for multiple legacy ids', () => {
    expect(calculatePotentialIncome(['hard-lucid', 'hard-will'])).toBe(
      504000000 + 621810000,
    );
  });

  it('ignores unknown legacy ids and sums the rest', () => {
    expect(calculatePotentialIncome(['hard-lucid', 'unknown-boss'])).toBe(504000000);
  });

  it('handles tier-less legacy ids (akechi-mitsuhide, princess-no, omni-cln)', () => {
    expect(calculatePotentialIncome(['akechi-mitsuhide'])).toBe(144000000);
    expect(calculatePotentialIncome(['princess-no'])).toBe(81000000);
    expect(calculatePotentialIncome(['omni-cln'])).toBe(6250000);
  });
});
