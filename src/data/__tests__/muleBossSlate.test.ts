import { describe, expect, it } from 'vitest';
import {
  MuleBossSlate,
  type SlateKey,
  type SlateRow,
  type SlateFamily,
} from '../muleBossSlate';
import { bosses, getBossById } from '../bosses';
import type { BossCadence, BossTier } from '../../types';

/**
 * Boundary tests for the `MuleBossSlate` value class (issue #171, PRD #170).
 *
 * These tests exercise only the public contract — internal selection-key
 * helpers are module-private inside the Slate module and must not be
 * imported here. The one exception is the tiny `key(bossId, tier)` test
 * helper below, which reads boss data directly to fabricate **Slate Keys**.
 */

function idForFamily(family: string): string {
  const boss = bosses.find((b) => b.family === family);
  if (!boss) throw new Error(`No boss found for family ${family}`);
  return boss.id;
}

/** Fabricate a valid `<uuid>:<tier>:<cadence>` **Slate Key** from boss data. */
function key(bossId: string, tier: BossTier): SlateKey {
  const diff = getBossById(bossId)!.difficulty.find((d) => d.tier === tier)!;
  return `${bossId}:${tier}:${diff.cadence}`;
}

const LUCID = idForFamily('lucid');
const WILL = idForFamily('will');
const LOTUS = idForFamily('lotus');
const VELLUM = idForFamily('vellum');
const PAPULATUS = idForFamily('papulatus');
const HORNTAIL = idForFamily('horntail');
const BLACK_MAGE = idForFamily('black-mage');
const AKECHI = idForFamily('akechi-mitsuhide');

describe('MuleBossSlate.EMPTY', () => {
  it('is a reference-stable singleton', () => {
    expect(MuleBossSlate.EMPTY).toBe(MuleBossSlate.EMPTY);
  });

  it('has no keys', () => {
    expect(MuleBossSlate.EMPTY.keys).toEqual([]);
  });

  it('from([]) reuses the EMPTY singleton', () => {
    expect(MuleBossSlate.from([])).toBe(MuleBossSlate.EMPTY);
  });
});

describe('MuleBossSlate.from — normalization', () => {
  it('returns an empty slate for an empty input', () => {
    expect(MuleBossSlate.from([]).keys).toEqual([]);
  });

  it('preserves a well-formed single-key slate', () => {
    const k = key(LUCID, 'hard');
    expect(MuleBossSlate.from([k]).keys).toEqual([k]);
  });

  it('drops unresolvable keys silently (unknown bossId)', () => {
    expect(MuleBossSlate.from(['not-a-uuid:hard:weekly']).keys).toEqual([]);
  });

  it('drops keys with a tier not offered for the boss', () => {
    // Lucid does not offer chaos.
    expect(MuleBossSlate.from([`${LUCID}:chaos:weekly`]).keys).toEqual([]);
  });

  it('drops keys whose cadence disagrees with boss data', () => {
    // Chaos Vellum is weekly; marking it daily is stale.
    expect(MuleBossSlate.from([`${VELLUM}:chaos:daily`]).keys).toEqual([]);
  });

  it('drops malformed keys (no colons)', () => {
    expect(MuleBossSlate.from(['stale-id']).keys).toEqual([]);
  });

  it('rejects Legacy Slate Keys (<uuid>:<tier> without cadence)', () => {
    expect(MuleBossSlate.from([`${LUCID}:hard`]).keys).toEqual([]);
  });

  it('drops keys with an unknown tier segment', () => {
    expect(MuleBossSlate.from([`${LUCID}:mythic:weekly`]).keys).toEqual([]);
  });

  it('drops keys with an unknown cadence segment', () => {
    expect(MuleBossSlate.from([`${LUCID}:hard:monthly`]).keys).toEqual([]);
  });

  it('keeps the highest-Crystal-Value Slate Key per (bossId, cadence) bucket', () => {
    const keys = [key(LUCID, 'easy'), key(LUCID, 'normal'), key(LUCID, 'hard')];
    expect(MuleBossSlate.from(keys).keys).toEqual([key(LUCID, 'hard')]);
  });

  it('keeps daily and weekly winners side-by-side on the same boss', () => {
    // Normal Vellum is daily; Chaos Vellum is weekly — distinct buckets.
    const normalDaily = key(VELLUM, 'normal');
    const chaosWeekly = key(VELLUM, 'chaos');
    expect(MuleBossSlate.from([normalDaily, chaosWeekly]).keys).toEqual([
      normalDaily,
      chaosWeekly,
    ]);
  });

  it('keeps only the highest daily when two daily tiers of one boss conflict', () => {
    // Papulatus: easy + normal are both daily → normal wins (higher value).
    const easyDaily = key(PAPULATUS, 'easy');
    const normalDaily = key(PAPULATUS, 'normal');
    const chaosWeekly = key(PAPULATUS, 'chaos');
    expect(MuleBossSlate.from([easyDaily, normalDaily, chaosWeekly]).keys).toEqual([
      normalDaily,
      chaosWeekly,
    ]);
  });

  it('preserves original order among surviving keys', () => {
    const keys = [key(WILL, 'hard'), key(LUCID, 'normal'), key(LUCID, 'hard')];
    expect(MuleBossSlate.from(keys).keys).toEqual([
      key(WILL, 'hard'),
      key(LUCID, 'hard'),
    ]);
  });

  it('drops invalid + conflicting entries together', () => {
    const keys = [
      'fake-key',
      key(LUCID, 'easy'),
      key(LUCID, 'hard'),
      key(WILL, 'hard'),
    ];
    expect(MuleBossSlate.from(keys).keys).toEqual([
      key(LUCID, 'hard'),
      key(WILL, 'hard'),
    ]);
  });
});

describe('MuleBossSlate.toggle', () => {
  it('adds a key when not present', () => {
    expect(MuleBossSlate.EMPTY.toggle(key(LUCID, 'hard')).keys).toEqual([
      key(LUCID, 'hard'),
    ]);
  });

  it('deselects when toggling the same key twice', () => {
    const slate = MuleBossSlate.from([key(LUCID, 'hard')]);
    expect(slate.toggle(key(LUCID, 'hard')).keys).toEqual([]);
  });

  it('performs a Tier Swap on the same (bossId, cadence) bucket', () => {
    const slate = MuleBossSlate.from([key(LUCID, 'normal')]);
    expect(slate.toggle(key(LUCID, 'hard')).keys).toEqual([key(LUCID, 'hard')]);
  });

  it('preserves Slate Keys on other families during a Tier Swap', () => {
    const slate = MuleBossSlate.from([key(WILL, 'normal'), key(LUCID, 'hard')]);
    expect(slate.toggle(key(WILL, 'hard')).keys).toEqual([
      key(WILL, 'hard'),
      key(LUCID, 'hard'),
    ]);
  });

  it('adds a different-cadence key as a coexisting selection', () => {
    // Normal Vellum (daily) + Chaos Vellum (weekly) differ in cadence.
    const normalDaily = key(VELLUM, 'normal');
    const chaosWeekly = key(VELLUM, 'chaos');
    const slate = MuleBossSlate.from([normalDaily]);
    expect(slate.toggle(chaosWeekly).keys).toEqual([normalDaily, chaosWeekly]);
  });

  it('deselecting a daily Slate Key leaves the coexisting weekly intact', () => {
    const normalDaily = key(VELLUM, 'normal');
    const chaosWeekly = key(VELLUM, 'chaos');
    const slate = MuleBossSlate.from([normalDaily, chaosWeekly]);
    expect(slate.toggle(normalDaily).keys).toEqual([chaosWeekly]);
  });

  it('returns the same slate when toggling an unresolvable key', () => {
    const slate = MuleBossSlate.from([key(LUCID, 'hard')]);
    const next = slate.toggle('not-a-real-key');
    expect(next.keys).toEqual([key(LUCID, 'hard')]);
  });

  it('returns a new MuleBossSlate instance (immutability)', () => {
    const slate = MuleBossSlate.from([key(LUCID, 'hard')]);
    const next = slate.toggle(key(WILL, 'hard'));
    expect(next).not.toBe(slate);
    expect(slate.keys).toEqual([key(LUCID, 'hard')]);
  });
});

describe('MuleBossSlate.view', () => {
  it('returns families in the curated Matrix display order', () => {
    const view = MuleBossSlate.EMPTY.view();
    const families = view.map((f) => f.family);
    const expected = [
      'black-mage',
      'baldrix',
      'limbo',
      'kaling',
      'first-adversary',
      'kalos-the-guardian',
      'chosen-seren',
      'darknell',
      'verus-hilla',
      'gloom',
      'will',
      'lucid',
      'guardian-angel-slime',
      'damien',
      'lotus',
      'papulatus',
      'vellum',
      'crimson-queen',
      'von-bon',
      'pierre',
      'akechi-mitsuhide',
      'princess-no',
      'magnus',
      'cygnus',
      'pink-bean',
      'hilla',
      'zakum',
      'arkarium',
      'mori-ranmaru',
      'horntail',
      'von-leon',
      'omni-cln',
    ];
    expect(families).toEqual(expected);
  });

  it('marks a Slate Row selected when its key is in the slate', () => {
    const slate = MuleBossSlate.from([key(LUCID, 'hard')]);
    const view = slate.view();
    const lucidFamily = view.find((f) => f.family === 'lucid')!;
    const hardLucid = lucidFamily.rows.find((r) => r.tier === 'hard')!;
    const normalLucid = lucidFamily.rows.find((r) => r.tier === 'normal')!;
    expect(hardLucid.selected).toBe(true);
    expect(normalLucid.selected).toBe(false);
  });

  it('SlateRow carries bossId, tier, cadence, name, crystalValue, formattedValue, difficultyLabel', () => {
    const view = MuleBossSlate.EMPTY.view();
    const lucidFamily = view.find((f) => f.family === 'lucid')!;
    const hardLucid = lucidFamily.rows.find((r) => r.tier === 'hard')!;
    expect(hardLucid.bossId).toBe(LUCID);
    expect(hardLucid.tier).toBe('hard');
    expect(hardLucid.cadence satisfies BossCadence).toBe('weekly');
    expect(hardLucid.crystalValue).toBe(504000000);
    expect(hardLucid.formattedValue).toBe('504M');
    expect(hardLucid.difficultyLabel).toBe('Hard');
    expect(hardLucid.name).toContain('Hard');
    expect(hardLucid.name).toContain('Lucid');
    expect(hardLucid.key).toBe(key(LUCID, 'hard'));
  });

  it('tier-less families have a null difficultyLabel and a bare family name', () => {
    const view = MuleBossSlate.EMPTY.view();
    const akechi = view.find((f) => f.family === 'akechi-mitsuhide')!;
    expect(akechi.rows[0].difficultyLabel).toBeNull();
    expect(akechi.rows[0].name).toBe('Akechi Mitsuhide');
  });

  it('sorts rows within a family by crystalValue descending', () => {
    const view = MuleBossSlate.EMPTY.view();
    const lucidFamily = view.find((f) => f.family === 'lucid')!;
    for (let i = 1; i < lucidFamily.rows.length; i++) {
      expect(lucidFamily.rows[i - 1].crystalValue).toBeGreaterThanOrEqual(
        lucidFamily.rows[i].crystalValue,
      );
    }
  });

  it('filters by family slug (case-insensitive)', () => {
    const view = MuleBossSlate.EMPTY.view('LUCID');
    expect(view).toHaveLength(1);
    expect(view[0].family).toBe('lucid');
  });

  it('filters by display name (case-insensitive)', () => {
    const view = MuleBossSlate.EMPTY.view('black mage');
    expect(view).toHaveLength(1);
    expect(view[0].family).toBe('black-mage');
  });

  it('filters by boss/row name (case-insensitive)', () => {
    const view = MuleBossSlate.EMPTY.view('hard lucid');
    expect(view).toHaveLength(1);
    expect(view[0].family).toBe('lucid');
  });

  it('empty search returns every family', () => {
    expect(MuleBossSlate.EMPTY.view('')).toHaveLength(bosses.length);
    expect(MuleBossSlate.EMPTY.view()).toHaveLength(bosses.length);
  });

  it('respects abbreviated: false in opts', () => {
    const view = MuleBossSlate.EMPTY.view('', { abbreviated: false });
    const lucidFamily = view.find((f) => f.family === 'lucid')!;
    const hardLucid = lucidFamily.rows.find((r) => r.tier === 'hard')!;
    expect(hardLucid.formattedValue).toBe('504,000,000');
  });

  it('defaults abbreviated to true', () => {
    const view = MuleBossSlate.EMPTY.view();
    const lucidFamily = view.find((f) => f.family === 'lucid')!;
    const hardLucid = lucidFamily.rows.find((r) => r.tier === 'hard')!;
    expect(hardLucid.formattedValue).toBe('504M');
  });

  it('row.key round-trips back into the slate via toggle', () => {
    // Ensures the key strings emitted by view() are the same ones the slate
    // accepts in toggle() — prevents accidental shape drift between the
    // projection and the constructor.
    const view = MuleBossSlate.EMPTY.view();
    const bmFamily = view.find((f) => f.family === 'black-mage')!;
    const extremeBM = bmFamily.rows.find((r) => r.tier === 'extreme')!;
    expect(MuleBossSlate.EMPTY.toggle(extremeBM.key).keys).toEqual([extremeBM.key]);
  });
});

describe('MuleBossSlate.weeklyCount', () => {
  it('is 0 for EMPTY', () => {
    expect(MuleBossSlate.EMPTY.weeklyCount).toBe(0);
  });

  it('counts only cadence === weekly keys', () => {
    const slate = MuleBossSlate.from([
      key(LUCID, 'hard'), // weekly
      key(WILL, 'hard'), // weekly
      key(VELLUM, 'normal'), // daily
      key(HORNTAIL, 'chaos'), // daily
    ]);
    expect(slate.weeklyCount).toBe(2);
  });

  it('ignores malformed/unresolvable keys (they never enter the slate anyway)', () => {
    // `from` drops these, but this locks in the end-to-end behaviour.
    const slate = MuleBossSlate.from([
      key(LUCID, 'hard'),
      'not-a-real-key',
      `${LUCID}:mythic:weekly`,
    ]);
    expect(slate.weeklyCount).toBe(1);
  });

  it('can exceed 14 (no clamp at Weekly Crystal Cap)', () => {
    const weeklyKeys: string[] = [];
    for (const b of bosses) {
      for (const d of b.difficulty) {
        if (d.cadence === 'weekly') {
          weeklyKeys.push(`${b.id}:${d.tier}:weekly`);
          break; // One per family — respects the Selection Invariant.
        }
      }
      if (weeklyKeys.length === 16) break;
    }
    expect(weeklyKeys.length).toBe(16);
    expect(MuleBossSlate.from(weeklyKeys).weeklyCount).toBe(16);
  });
});

describe('MuleBossSlate.totalCrystalValue', () => {
  it('is 0 for EMPTY', () => {
    expect(MuleBossSlate.EMPTY.totalCrystalValue).toBe(0);
  });

  it('folds weekly keys × 1', () => {
    // Hard Lucid is weekly, crystalValue 504,000,000.
    const slate = MuleBossSlate.from([key(LUCID, 'hard')]);
    expect(slate.totalCrystalValue).toBe(504_000_000);
  });

  it('folds daily keys × 7', () => {
    // Normal Vellum is daily. Look up its actual crystalValue from bosses.ts.
    const diff = getBossById(VELLUM)!.difficulty.find(
      (d) => d.tier === 'normal',
    )!;
    expect(diff.cadence).toBe('daily');
    const slate = MuleBossSlate.from([key(VELLUM, 'normal')]);
    expect(slate.totalCrystalValue).toBe(diff.crystalValue * 7);
  });

  it('sums a mixed daily + weekly slate', () => {
    const weeklyDiff = getBossById(LUCID)!.difficulty.find(
      (d) => d.tier === 'hard',
    )!;
    const dailyDiff = getBossById(VELLUM)!.difficulty.find(
      (d) => d.tier === 'normal',
    )!;
    const slate = MuleBossSlate.from([
      key(LUCID, 'hard'),
      key(VELLUM, 'normal'),
    ]);
    expect(slate.totalCrystalValue).toBe(
      weeklyDiff.crystalValue + dailyDiff.crystalValue * 7,
    );
  });
});

describe('cross-family sanity', () => {
  it('Extreme Black Mage resolves as a weekly Slate Key', () => {
    const k = `${BLACK_MAGE}:extreme:weekly`;
    const slate = MuleBossSlate.from([k]);
    expect(slate.keys).toEqual([k]);
    expect(slate.weeklyCount).toBe(1);
  });

  it('Akechi (tier-less family) normal-weekly resolves', () => {
    const k = `${AKECHI}:normal:weekly`;
    const slate = MuleBossSlate.from([k]);
    expect(slate.keys).toEqual([k]);
  });

  it('Horntail chaos-daily resolves', () => {
    const k = `${HORNTAIL}:chaos:daily`;
    const slate = MuleBossSlate.from([k]);
    expect(slate.keys).toEqual([k]);
    expect(slate.weeklyCount).toBe(0);
  });

  it('LOTUS selection participates in Tier Swap correctly', () => {
    const slate = MuleBossSlate.from([key(LOTUS, 'normal')]);
    expect(slate.toggle(key(LOTUS, 'hard')).keys).toEqual([key(LOTUS, 'hard')]);
  });
});

describe('type exports', () => {
  it('SlateKey, SlateRow, and SlateFamily are reachable as types', () => {
    // These type-level assignments are the whole assertion — if the types
    // disappear or rename, this file fails to compile.
    const k: SlateKey = key(LUCID, 'hard');
    const slate = MuleBossSlate.from([k]);
    const families: SlateFamily[] = slate.view();
    const row: SlateRow | undefined = families
      .find((f) => f.family === 'lucid')!
      .rows.find((r) => r.tier === 'hard');
    expect(row?.selected).toBe(true);
  });
});
