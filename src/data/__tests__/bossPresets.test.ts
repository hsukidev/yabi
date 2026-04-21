import { describe, expect, it } from 'vitest';
import {
  PRESET_FAMILIES,
  conform,
  isPresetActive,
  normalizeEntry,
  presetEntryFamily,
  presetEntryKey,
  type PresetFamily,
} from '../bossPresets';
import type { Boss, BossDifficulty } from '../../types';
import { bosses, getBossByFamily } from '../bosses';

/**
 * Test-local key-shape helpers. The selection-key grammar itself is
 * module-private inside `muleBossSlate.ts`; these helpers just duplicate its
 * string shape so tests can assert against bare `<uuid>:<tier>:<cadence>`
 * strings. Validation flows through `MuleBossSlate.from` wherever preset
 * output actually enters app state.
 */
function buildKey(
  bossId: string,
  tier: BossDifficulty['tier'],
  cadence: BossDifficulty['cadence'],
): string {
  return `${bossId}:${tier}:${cadence}`;
}

function pickHardest(boss: Boss): BossDifficulty {
  return boss.difficulty.reduce((best, d) => (d.crystalValue > best.crystalValue ? d : best));
}

const CRA_FAMILIES = [
  'cygnus',
  'pink-bean',
  'vellum',
  'crimson-queen',
  'von-bon',
  'pierre',
  'papulatus',
  'hilla',
  'magnus',
  'zakum',
  'princess-no',
] as const;

const CTENE_OVERLAP = ['vellum', 'crimson-queen', 'papulatus', 'magnus', 'princess-no'] as const;

/** Hardest-tier selection key for a family slug. */
function hardestKey(family: string): string {
  const boss = getBossByFamily(family)!;
  const diff = pickHardest(boss);
  return buildKey(boss.id, diff.tier, diff.cadence);
}

/** Resolved **Default Tier** key for a preset entry. */
function entryKey(entry: PresetFamily): string {
  return presetEntryKey(entry)!;
}

describe('PRESET_FAMILIES membership', () => {
  it('contains exactly the 11 CRA families in spec order', () => {
    expect(PRESET_FAMILIES.CRA).toEqual(CRA_FAMILIES);
  });

  it('every CRA family resolves to a known boss', () => {
    for (const f of PRESET_FAMILIES.CRA) {
      expect(bosses.find((b) => b.family === f)).toBeDefined();
    }
  });

  it('every CTENE family resolves to a known boss', () => {
    for (const entry of PRESET_FAMILIES.CTENE) {
      const family = presetEntryFamily(entry);
      expect(bosses.find((b) => b.family === family)).toBeDefined();
    }
  });

  it('every LOMIEN family resolves to a known boss', () => {
    for (const entry of PRESET_FAMILIES.LOMIEN) {
      const family = presetEntryFamily(entry);
      expect(bosses.find((b) => b.family === family)).toBeDefined();
    }
  });

  it('CRA ∩ CTENE shares Vellum, Crimson Queen, Papulatus, Magnus, Princess No', () => {
    const craSet: ReadonlySet<string> = new Set(PRESET_FAMILIES.CRA);
    const overlap = PRESET_FAMILIES.CTENE.map(presetEntryFamily).filter((f) => craSet.has(f));
    expect(new Set(overlap)).toEqual(new Set(CTENE_OVERLAP));
  });
});

describe('normalizeEntry', () => {
  it('resolves a bare family to Default Tier = Hardest Tier', () => {
    const entry = normalizeEntry('vellum')!;
    const vellum = getBossByFamily('vellum')!;
    expect(entry).toEqual({ family: 'vellum', tiers: [pickHardest(vellum).tier] });
  });

  it('desugars legacy { family, tier } to a single-element tiers list', () => {
    const entry = normalizeEntry({ family: 'lotus', tier: 'hard' })!;
    expect(entry).toEqual({ family: 'lotus', tiers: ['hard'] });
  });

  it('passes { family, tiers } through with tiers[0] as Default Tier', () => {
    const entry = normalizeEntry({ family: 'damien', tiers: ['normal', 'hard'] })!;
    expect(entry.family).toBe('damien');
    expect(entry.tiers).toEqual(['normal', 'hard']);
    expect(entry.tiers[0]).toBe('normal');
  });

  it('returns null for an unknown family', () => {
    expect(normalizeEntry('not-a-real-family')).toBeNull();
  });
});

describe('LOMIEN multi-tier entries', () => {
  it('Lotus and Damien accept both normal and hard', () => {
    const lotusEntry = PRESET_FAMILIES.LOMIEN.find(
      (e) => typeof e === 'object' && e.family === 'lotus',
    );
    const damienEntry = PRESET_FAMILIES.LOMIEN.find(
      (e) => typeof e === 'object' && e.family === 'damien',
    );
    expect(lotusEntry).toBeDefined();
    expect(damienEntry).toBeDefined();
    expect(normalizeEntry(lotusEntry!)!.tiers).toEqual(['normal', 'hard']);
    expect(normalizeEntry(damienEntry!)!.tiers).toEqual(['normal', 'hard']);
  });

  it('non-Lotus-non-Damien LOMIEN entries remain single-tier at Hardest Tier', () => {
    for (const spec of PRESET_FAMILIES.LOMIEN) {
      const family = presetEntryFamily(spec);
      if (family === 'lotus' || family === 'damien') continue;
      const entry = normalizeEntry(spec)!;
      expect(entry.tiers).toHaveLength(1);
      const boss = getBossByFamily(family)!;
      expect(entry.tiers[0]).toBe(pickHardest(boss).tier);
    }
  });

  it('LOMIEN default tier for Lotus and Damien is normal', () => {
    const lotus = getBossByFamily('lotus')!;
    const damien = getBossByFamily('damien')!;
    expect(entryKey({ family: 'lotus', tiers: ['normal', 'hard'] })).toBe(
      buildKey(lotus.id, 'normal', 'weekly'),
    );
    expect(entryKey({ family: 'damien', tiers: ['normal', 'hard'] })).toBe(
      buildKey(damien.id, 'normal', 'weekly'),
    );
  });
});

describe('isPresetActive — Same-Cadence Equality', () => {
  it('returns false for an empty selection', () => {
    expect(isPresetActive('CRA', [])).toBe(false);
    expect(isPresetActive('LOMIEN', [])).toBe(false);
    expect(isPresetActive('CTENE', [])).toBe(false);
  });

  it('returns true for CRA when every CRA entry is satisfied at Hardest Tier', () => {
    const keys = PRESET_FAMILIES.CRA.map(hardestKey);
    expect(isPresetActive('CRA', keys)).toBe(true);
  });

  it('returns true for CTENE when all 14 resolved keys are present', () => {
    const keys = PRESET_FAMILIES.CTENE.map(entryKey);
    expect(isPresetActive('CTENE', keys)).toBe(true);
  });

  it('subset no longer matches: missing one CRA family returns false', () => {
    const keys = PRESET_FAMILIES.CRA.map(hardestKey).filter((k) => k !== hardestKey('magnus'));
    expect(isPresetActive('CRA', keys)).toBe(false);
  });

  it('non-preset weekly breaks the match (CRA + extra weekly Arkarium)', () => {
    const arkarium = getBossByFamily('arkarium')!;
    const arkariumWeekly = buildKey(arkarium.id, pickHardest(arkarium).tier, 'weekly');
    const keys = [...PRESET_FAMILIES.CRA.map(hardestKey), arkariumWeekly];
    expect(isPresetActive('CRA', keys)).toBe(false);
  });

  it('daily-only selections never trigger a canonical match', () => {
    const vellum = getBossByFamily('vellum')!;
    const vellumDaily = buildKey(vellum.id, 'normal', 'daily');
    expect(isPresetActive('CRA', [vellumDaily])).toBe(false);
  });

  it('daily keys do not affect the match for an otherwise exact weekly selection', () => {
    const horntail = getBossByFamily('horntail')!;
    const horntailDaily = buildKey(horntail.id, 'chaos', 'daily');
    const keys = [...PRESET_FAMILIES.CRA.map(hardestKey), horntailDaily];
    expect(isPresetActive('CRA', keys)).toBe(true);
  });

  it('LOMIEN accepts Normal Damien (Default Tier)', () => {
    const keys = PRESET_FAMILIES.LOMIEN.map(entryKey);
    expect(isPresetActive('LOMIEN', keys)).toBe(true);
  });

  it('LOMIEN accepts Hard Damien + Hard Lotus as multi-tier swap', () => {
    const damien = getBossByFamily('damien')!;
    const lotus = getBossByFamily('lotus')!;
    const baseKeys = PRESET_FAMILIES.LOMIEN.map(entryKey);
    const swapped = baseKeys
      .filter((k) => !k.startsWith(`${damien.id}:`) && !k.startsWith(`${lotus.id}:`))
      .concat([buildKey(damien.id, 'hard', 'weekly'), buildKey(lotus.id, 'hard', 'weekly')]);
    expect(isPresetActive('LOMIEN', swapped)).toBe(true);
  });

  it('LOMIEN rejects Extreme Lotus (outside Accepted Tiers)', () => {
    const lotus = getBossByFamily('lotus')!;
    const baseKeys = PRESET_FAMILIES.LOMIEN.map(entryKey);
    const extremeSwap = baseKeys
      .filter((k) => !k.startsWith(`${lotus.id}:`))
      .concat([buildKey(lotus.id, 'extreme', 'weekly')]);
    expect(isPresetActive('LOMIEN', extremeSwap)).toBe(false);
  });

  it('returns false when a family has only a lower-tier key than the single-tier entry', () => {
    const vellum = getBossByFamily('vellum')!;
    const keys = PRESET_FAMILIES.CRA.map(hardestKey)
      .filter((k) => !k.startsWith(`${vellum.id}:`))
      .concat([buildKey(vellum.id, 'normal', 'weekly')]);
    expect(isPresetActive('CRA', keys)).toBe(false);
  });

  it('only accepts canonical preset keys (CUSTOM has no entries list)', () => {
    // `PRESET_FAMILIES` is typed over `CanonicalPresetKey` — CRA/LOMIEN/CTENE
    // only — so `CUSTOM` is unreachable by `isPresetActive` at both the
    // type and value level. Asserting the keys list guards that invariant.
    expect(Object.keys(PRESET_FAMILIES).sort()).toEqual(['CRA', 'CTENE', 'LOMIEN']);
  });
});

describe('conform', () => {
  it('fills every preset entry at Default Tier from empty', () => {
    const result = conform([], 'CRA');
    const expected = PRESET_FAMILIES.CRA.map(hardestKey);
    expect(new Set(result)).toEqual(new Set(expected));
    expect(result).toHaveLength(CRA_FAMILIES.length);
  });

  it('is idempotent on an Active Preset selection', () => {
    const once = conform([], 'CRA');
    const twice = conform(once, 'CRA');
    expect(new Set(twice)).toEqual(new Set(once));
  });

  it('wipes weekly keys on non-preset families', () => {
    const arkarium = getBossByFamily('arkarium')!;
    const arkariumWeekly = buildKey(arkarium.id, pickHardest(arkarium).tier, 'weekly');
    const result = conform([...PRESET_FAMILIES.CRA.map(hardestKey), arkariumWeekly], 'CRA');
    expect(result).not.toContain(arkariumWeekly);
    for (const f of CRA_FAMILIES) {
      expect(result).toContain(hardestKey(f));
    }
  });

  it('preserves a weekly key whose tier is in Accepted Tiers (Hard Damien on LOMIEN)', () => {
    const damien = getBossByFamily('damien')!;
    const hardDamien = buildKey(damien.id, 'hard', 'weekly');
    const result = conform([hardDamien], 'LOMIEN');
    expect(result).toContain(hardDamien);
    expect(isPresetActive('LOMIEN', result)).toBe(true);
  });

  it('replaces a non-accepted-tier weekly key with the Default Tier key', () => {
    const damien = getBossByFamily('damien')!;
    // Damien has normal, hard; 'easy' isn't offered. Use extreme Lotus as the
    // non-accepted-tier example instead — LOMIEN Lotus accepts [normal, hard].
    const lotus = getBossByFamily('lotus')!;
    const extremeLotus = buildKey(lotus.id, 'extreme', 'weekly');
    const result = conform([extremeLotus], 'LOMIEN');
    expect(result).not.toContain(extremeLotus);
    expect(result).toContain(buildKey(lotus.id, 'normal', 'weekly'));
    // And Damien Default Tier was filled in.
    expect(result).toContain(buildKey(damien.id, 'normal', 'weekly'));
  });

  it('preserves daily keys (different cadence is orthogonal to preset)', () => {
    const horntail = getBossByFamily('horntail')!;
    const horntailDaily = buildKey(horntail.id, 'chaos', 'daily');
    const vellum = getBossByFamily('vellum')!;
    const vellumDaily = buildKey(vellum.id, 'normal', 'daily');
    const result = conform([horntailDaily, vellumDaily], 'CRA');
    expect(result).toContain(horntailDaily);
    expect(result).toContain(vellumDaily);
  });

  it('CRA → LOMIEN swap: preserves CRA-∩-LOMIEN overlap + adds LOMIEN-unique families', () => {
    const withCra = conform([], 'CRA');
    const withLomien = conform(withCra, 'LOMIEN');
    for (const f of CRA_FAMILIES) {
      expect(withLomien).toContain(hardestKey(f));
    }
    const akechi = getBossByFamily('akechi-mitsuhide')!;
    const damien = getBossByFamily('damien')!;
    const lotus = getBossByFamily('lotus')!;
    expect(withLomien).toContain(buildKey(akechi.id, pickHardest(akechi).tier, 'weekly'));
    expect(withLomien).toContain(buildKey(damien.id, 'normal', 'weekly'));
    expect(withLomien).toContain(buildKey(lotus.id, 'normal', 'weekly'));
    expect(isPresetActive('LOMIEN', withLomien)).toBe(true);
  });

  it('CRA → CTENE swap: wipes CRA-only families, keeps overlap at Hardest Tier', () => {
    const withCra = conform([], 'CRA');
    const withCtene = conform(withCra, 'CTENE');
    const cteneFamilies = new Set(PRESET_FAMILIES.CTENE.map(presetEntryFamily));
    for (const f of CRA_FAMILIES) {
      if (cteneFamilies.has(f)) {
        expect(withCtene).toContain(hardestKey(f));
      } else {
        expect(withCtene).not.toContain(hardestKey(f));
      }
    }
    expect(isPresetActive('CTENE', withCtene)).toBe(true);
  });

  it('CTENE selects Hard Lotus (not Extreme)', () => {
    const result = conform([], 'CTENE');
    const lotus = getBossByFamily('lotus')!;
    expect(result).toContain(buildKey(lotus.id, 'hard', 'weekly'));
    expect(result).not.toContain(buildKey(lotus.id, 'extreme', 'weekly'));
  });
});
