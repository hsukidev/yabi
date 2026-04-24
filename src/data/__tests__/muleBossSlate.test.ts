import { describe, expect, it } from 'vitest';
import { MuleBossSlate, type SlateKey, type SlateRow, type SlateFamily } from '../muleBossSlate';
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
    expect(MuleBossSlate.from([`${LUCID}:hard:biweekly`]).keys).toEqual([]);
  });

  it('drops a valid-cadence key whose cadence disagrees with boss data', () => {
    // Lucid Hard is weekly in boss data; asserting monthly makes the key
    // stale even though `monthly` is a recognized cadence segment.
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
    expect(MuleBossSlate.from([normalDaily, chaosWeekly]).keys).toEqual([normalDaily, chaosWeekly]);
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
    expect(MuleBossSlate.from(keys).keys).toEqual([key(WILL, 'hard'), key(LUCID, 'hard')]);
  });

  it('drops invalid + conflicting entries together', () => {
    const keys = ['fake-key', key(LUCID, 'easy'), key(LUCID, 'hard'), key(WILL, 'hard')];
    expect(MuleBossSlate.from(keys).keys).toEqual([key(LUCID, 'hard'), key(WILL, 'hard')]);
  });
});

describe('MuleBossSlate.toggle', () => {
  it('adds a key when not present', () => {
    expect(MuleBossSlate.EMPTY.toggle(key(LUCID, 'hard')).keys).toEqual([key(LUCID, 'hard')]);
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
    expect(slate.toggle(key(WILL, 'hard')).keys).toEqual([key(WILL, 'hard'), key(LUCID, 'hard')]);
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
    expect(akechi.rows[0].name).toBe('Akechi');
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
    expect(MuleBossSlate.EMPTY.totalCrystalValue()).toBe(0);
  });

  it('folds weekly keys × 1', () => {
    // Hard Lucid is weekly, crystalValue 504,000,000.
    const slate = MuleBossSlate.from([key(LUCID, 'hard')]);
    expect(slate.totalCrystalValue()).toBe(504_000_000);
  });

  it('folds daily keys × 7', () => {
    // Normal Vellum is daily. Look up its actual crystalValue from bosses.ts.
    const diff = getBossById(VELLUM)!.difficulty.find((d) => d.tier === 'normal')!;
    expect(diff.cadence).toBe('daily');
    const slate = MuleBossSlate.from([key(VELLUM, 'normal')]);
    expect(slate.totalCrystalValue()).toBe(diff.crystalValue.Heroic * 7);
  });

  it('sums a mixed daily + weekly slate', () => {
    const weeklyDiff = getBossById(LUCID)!.difficulty.find((d) => d.tier === 'hard')!;
    const dailyDiff = getBossById(VELLUM)!.difficulty.find((d) => d.tier === 'normal')!;
    const slate = MuleBossSlate.from([key(LUCID, 'hard'), key(VELLUM, 'normal')]);
    expect(slate.totalCrystalValue()).toBe(
      weeklyDiff.crystalValue.Heroic + dailyDiff.crystalValue.Heroic * 7,
    );
  });

  it('divides a Weekly Cadence key by the family Party Size (Computed Value)', () => {
    // Hard Lucid: weekly, crystalValue 504M. Lucid family = 'lucid'. Party 2 → 252M.
    const slate = MuleBossSlate.from([key(LUCID, 'hard')]);
    expect(slate.totalCrystalValue({ lucid: 2 })).toBe(252_000_000);
  });

  it('ignores Party Size on Daily Cadence keys (crystalValue × 7, no division)', () => {
    // Normal Vellum is daily. Even with party=3 on its family, the daily total
    // stays at crystalValue × 7 — daily cells are not divided by party.
    const diff = getBossById(VELLUM)!.difficulty.find((d) => d.tier === 'normal')!;
    expect(diff.cadence).toBe('daily');
    const slate = MuleBossSlate.from([key(VELLUM, 'normal')]);
    const vellumFamily = getBossById(VELLUM)!.family;
    expect(slate.totalCrystalValue({ [vellumFamily]: 3 })).toBe(diff.crystalValue.Heroic * 7);
  });

  /**
   * Pick `count` Weekly Cadence selections across distinct families, each
   * returned with its **Computed Value** (party=1). Used by the Top-14
   * Weekly Cut tests below.
   */
  function pickWeeklies(count: number): { slateKey: SlateKey; value: number }[] {
    const picks: { slateKey: SlateKey; value: number }[] = [];
    for (const b of bosses) {
      const diff = b.difficulty.find((d) => d.cadence === 'weekly');
      if (!diff) continue;
      picks.push({ slateKey: key(b.id, diff.tier), value: diff.crystalValue.Heroic });
      if (picks.length === count) break;
    }
    if (picks.length < count) {
      throw new Error(`Only found ${picks.length} weekly-capable families`);
    }
    return picks;
  }

  it('applies the Top-14 Weekly Cut — 15th weekly is the lowest and drops out', () => {
    const picks = pickWeeklies(15);
    const sortedDesc = [...picks].map((p) => p.value).sort((a, b) => b - a);
    const top14Sum = sortedDesc.slice(0, 14).reduce((s, v) => s + v, 0);
    const slate = MuleBossSlate.from(picks.map((p) => p.slateKey));
    expect(slate.weeklyCount).toBe(15);
    expect(slate.totalCrystalValue()).toBe(top14Sum);
  });

  it('handles Computed Value ties at the boundary — includes only one copy of a tied value', () => {
    // Princess-no (normal), Zakum (chaos), and Pierre (chaos) all weekly @
    // crystalValue 81,000,000. That's three bosses tied at the same Computed
    // Value under party=1. With 13 higher-valued weeklies ahead of them we
    // have 16 total; the top 14 must include all 13 highs plus exactly ONE
    // of the tied triplet, not two or three.
    const TIED_VALUE = 81_000_000;
    const highs = pickWeeklies(20)
      .filter((p) => p.value > TIED_VALUE)
      .slice(0, 13);
    expect(highs).toHaveLength(13);
    const princessNo = key(idForFamily('princess-no'), 'normal');
    const zakum = key(idForFamily('zakum'), 'chaos');
    const pierre = key(idForFamily('pierre'), 'chaos');
    const slate = MuleBossSlate.from([...highs.map((p) => p.slateKey), princessNo, zakum, pierre]);
    expect(slate.weeklyCount).toBe(16);
    const highSum = highs.reduce((s, p) => s + p.value, 0);
    expect(slate.totalCrystalValue()).toBe(highSum + TIED_VALUE);
  });

  it('defaults to Heroic world group when no worldGroup is supplied', () => {
    // Hard Lucid Heroic = 504M. Omitting the second argument to `from` must
    // behave exactly like passing 'Heroic' — the pre-World-Pricing default.
    const slate = MuleBossSlate.from([key(LUCID, 'hard')]);
    expect(slate.totalCrystalValue()).toBe(504_000_000);
  });

  it('uses Interactive crystal values when the slate is built with worldGroup: "Interactive"', () => {
    // Hard Lucid Interactive = 100.8M (Heroic 504M × 0.2).
    const slate = MuleBossSlate.from([key(LUCID, 'hard')], 'Interactive');
    expect(slate.totalCrystalValue()).toBe(100_800_000);
  });

  it('uses Heroic crystal values when the slate is built with worldGroup: "Heroic"', () => {
    // Explicit 'Heroic' matches the default behaviour.
    const slate = MuleBossSlate.from([key(LUCID, 'hard')], 'Heroic');
    expect(slate.totalCrystalValue()).toBe(504_000_000);
  });

  it('Extreme Kaling Interactive crystal value follows the 5x ratio (1.2052B, not 1.20525B)', () => {
    // Heroic 6_026_000_000; Interactive 1_205_200_000 = Heroic / 5.
    const KALING = idForFamily('kaling');
    const slate = MuleBossSlate.from([key(KALING, 'extreme')], 'Interactive');
    expect(slate.totalCrystalValue()).toBe(1_205_200_000);
  });
});

describe('cross-family sanity', () => {
  it('Extreme Black Mage resolves as a monthly Slate Key', () => {
    const k = `${BLACK_MAGE}:extreme:monthly`;
    const slate = MuleBossSlate.from([k]);
    expect(slate.keys).toEqual([k]);
    expect(slate.monthlyCount).toBe(1);
    expect(slate.weeklyCount).toBe(0);
  });

  it('drops a stale Extreme Black Mage weekly key (cadence disagrees post-flip)', () => {
    // Users who persisted BM Extreme as weekly before the cadence flip
    // should silently lose the key on next load (no migration by design).
    expect(MuleBossSlate.from([`${BLACK_MAGE}:extreme:weekly`]).keys).toEqual([]);
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

describe('MuleBossSlate.monthlyCount & Monthly Radio Mutex', () => {
  const BM_HARD = `${BLACK_MAGE}:hard:monthly`;
  const BM_EXTREME = `${BLACK_MAGE}:extreme:monthly`;

  it('is 0 for EMPTY', () => {
    expect(MuleBossSlate.EMPTY.monthlyCount).toBe(0);
  });

  it('counts a Black Mage monthly Slate Key', () => {
    expect(MuleBossSlate.from([BM_HARD]).monthlyCount).toBe(1);
    expect(MuleBossSlate.from([BM_EXTREME]).monthlyCount).toBe(1);
  });

  it('treats monthly as a distinct cadence from weekly and daily', () => {
    const slate = MuleBossSlate.from([BM_EXTREME, key(LUCID, 'hard'), key(VELLUM, 'normal')]);
    expect(slate.monthlyCount).toBe(1);
    expect(slate.weeklyCount).toBe(1);
    expect(slate.dailyCount).toBe(7);
  });

  it('from() keeps only the highest-value monthly key per (bossId, cadence) bucket', () => {
    // Stale persistence with both BM monthlies resolves to Extreme (higher value).
    const slate = MuleBossSlate.from([BM_HARD, BM_EXTREME]);
    expect(slate.keys).toEqual([BM_EXTREME]);
    expect(slate.monthlyCount).toBe(1);
  });

  it('selecting BM Extreme while BM Hard is selected tier-swaps to Extreme', () => {
    const slate = MuleBossSlate.from([BM_HARD]);
    const next = slate.toggle(BM_EXTREME);
    expect(next.keys).toEqual([BM_EXTREME]);
    expect(next.monthlyCount).toBe(1);
  });

  it('selecting BM Hard while BM Extreme is selected tier-swaps to Hard', () => {
    const slate = MuleBossSlate.from([BM_EXTREME]);
    const next = slate.toggle(BM_HARD);
    expect(next.keys).toEqual([BM_HARD]);
    expect(next.monthlyCount).toBe(1);
  });

  it('toggling the same monthly key twice deselects (not stuck by mutex)', () => {
    const slate = MuleBossSlate.from([BM_EXTREME]);
    expect(slate.toggle(BM_EXTREME).keys).toEqual([]);
    expect(slate.toggle(BM_EXTREME).monthlyCount).toBe(0);
  });

  it('monthly selection coexists with weekly/daily selections on other bosses', () => {
    const slate = MuleBossSlate.from([key(LUCID, 'hard'), key(VELLUM, 'normal')]);
    const next = slate.toggle(BM_EXTREME);
    expect(next.keys).toContain(BM_EXTREME);
    expect(next.keys).toContain(key(LUCID, 'hard'));
    expect(next.keys).toContain(key(VELLUM, 'normal'));
  });

  it('monthly keys contribute 0 to totalCrystalValue (deferred to monthly readout)', () => {
    const monthlyOnly = MuleBossSlate.from([BM_EXTREME]);
    expect(monthlyOnly.totalCrystalValue()).toBe(0);

    const mixed = MuleBossSlate.from([key(LUCID, 'hard'), BM_EXTREME]);
    // Lucid hard's 504M alone, no contribution from the 18B monthly Extreme.
    expect(mixed.totalCrystalValue()).toBe(504_000_000);
  });

  it('view() marks BM monthly rows as cadence: "monthly"', () => {
    const slate = MuleBossSlate.from([BM_EXTREME]);
    const view = slate.view();
    const bmFamily = view.find((f) => f.family === 'black-mage')!;
    for (const row of bmFamily.rows) {
      expect(row.cadence).toBe('monthly');
    }
    const extremeRow = bmFamily.rows.find((r) => r.tier === 'extreme')!;
    expect(extremeRow.selected).toBe(true);
    expect(extremeRow.key).toBe(BM_EXTREME);
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
