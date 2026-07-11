import { describe, expect, it } from 'vitest';
import { WorldIncome } from '../worldIncome';
import { markedProgress } from '../markedIncome';
import { expectedBlackMageIncomeForRoster } from '../monthlyIncome';
import { MuleBossSlate } from '../../data/muleBossSlate';
import { resolveWorldGroup } from '../../data/worlds';
import { currentBmStamp, currentDailyStamp, currentWeeklyStamp } from '../../utils/cycle';
import { bosses } from '../../data/bosses';
import type { Mule } from '../../types';

/**
 * Tests for `markedProgress` — the **Cleared Meso** aggregates driving the KPI
 * income **Progress Readouts** and crystal-tile numerators (issue #305).
 */

const LUCID = bosses.find((b) => b.family === 'lucid')!;
const WILL = bosses.find((b) => b.family === 'will')!;
const HILLA = bosses.find((b) => b.family === 'hilla')!;
const BLACK_MAGE = bosses.find((b) => b.family === 'black-mage')!;

const HARD_LUCID = `${LUCID.id}:hard:weekly`;
const HARD_LUCID_VALUE = 504_000_000;
const HARD_WILL = `${WILL.id}:hard:weekly`;
const NORMAL_HILLA = `${HILLA.id}:normal:daily`;
const NORMAL_HILLA_VALUE = 4_000_000;
const BM_EXTREME = `${BLACK_MAGE.id}:extreme:monthly`;

function topWeeklyKeys(n: number): string[] {
  const all: { slateKey: string; value: number }[] = [];
  for (const b of bosses) {
    const weeklies = b.difficulty.filter((d) => d.cadence === 'weekly');
    if (weeklies.length === 0) continue;
    const top = weeklies.reduce((a, c) => (c.crystalValue.Heroic > a.crystalValue.Heroic ? c : a));
    all.push({ slateKey: `${b.id}:${top.tier}:weekly`, value: top.crystalValue.Heroic });
  }
  all.sort((a, b) => b.value - a.value);
  return all.slice(0, n).map((k) => k.slateKey);
}

function makeMule(id: string, selectedBosses: string[], overrides: Partial<Mule> = {}): Mule {
  return {
    id,
    name: id,
    level: 200,
    muleClass: 'Hero',
    selectedBosses,
    active: true,
    ...overrides,
  };
}

/** Stamp every kind of Clear Mark valid for `now`. */
function markAll(mule: Mule, now: number): Mule {
  return {
    ...mule,
    dailyClearMark: currentDailyStamp(now),
    weeklyClearMark: currentWeeklyStamp(now),
    bmClearMark: currentBmStamp(now),
  };
}

function monthlyKeyTotal(mules: Mule[]): number {
  return mules.reduce((t, m) => {
    if (m.active === false) return t;
    return t + MuleBossSlate.from(m.selectedBosses, resolveWorldGroup(m.worldId)).monthlyCount;
  }, 0);
}

describe('markedProgress — numerator equals denominator when everything is marked', () => {
  it('clearedWeeklyMeso === totalContributedMeso and clearedBmMeso === expected BM income', () => {
    const now = Date.now();
    const mules = [
      markAll(makeMule('a', [HARD_LUCID, NORMAL_HILLA, BM_EXTREME]), now),
      markAll(makeMule('b', [HARD_WILL, BM_EXTREME]), now),
    ];
    const w = WorldIncome.of(mules);
    const p = markedProgress(mules, w, now);

    expect(p.clearedWeeklyMeso).toBe(w.totalContributedMeso);
    expect(p.clearedBmMeso).toBe(expectedBlackMageIncomeForRoster(mules));
    // Tile numerators equal today's displayed tile totals.
    expect(p.weeklyTileCleared).toBe(w.weeklySlotsContributed);
    expect(p.dailyTileCleared).toBe(w.dailySlotsContributed);
    expect(p.monthlyTileCleared).toBe(monthlyKeyTotal(mules));
  });

  it('holds under an over-cap roster (numerator tracks the post-cut pool)', () => {
    const now = Date.now();
    // 13 mules × 14 weekly = 182 slots; cap 180, so 2 drop.
    const top14 = topWeeklyKeys(14);
    const mules = Array.from({ length: 13 }, (_, i) => markAll(makeMule(`m${i}`, top14), now));
    const w = WorldIncome.of(mules);
    const p = markedProgress(mules, w, now);

    expect(p.clearedWeeklyMeso).toBe(w.totalContributedMeso);
    expect(p.weeklyTileCleared).toBe(w.weeklySlotsContributed);
    expect(p.weeklyTileCleared).toBe(180);
  });
});

describe('markedProgress — inactive mules contribute nothing', () => {
  it('an inactive mule with every mark set changes no numerator', () => {
    const now = Date.now();
    const active = markAll(makeMule('a', [HARD_LUCID]), now);
    const inactive = markAll(makeMule('b', [HARD_WILL, BM_EXTREME], { active: false }), now);
    const mules = [active, inactive];
    const w = WorldIncome.of(mules);
    const p = markedProgress(mules, w, now);

    expect(p.clearedWeeklyMeso).toBe(HARD_LUCID_VALUE);
    expect(p.weeklyTileCleared).toBe(1);
    expect(p.clearedBmMeso).toBe(0);
    expect(p.monthlyTileCleared).toBe(0);
  });
});

describe('markedProgress — post-Cap-Cut attribution', () => {
  it("a capped mule's cleared meso matches its contributed, not potential, meso", () => {
    const now = Date.now();
    // Daily-partial-drop fixture: 178 weekly slots + 7 daily Hilla = 185; cap
    // 180, so 5 of the 7 daily Hilla slots drop and 2 survive.
    const top14 = topWeeklyKeys(14);
    const mules: Mule[] = [];
    for (let i = 0; i < 12; i++) mules.push(makeMule(`m${i}`, top14)); // 168 weekly
    mules.push(makeMule('m12', top14.slice(0, 10))); // +10 = 178 weekly
    // Only the Hilla mule is marked — isolates its post-cut daily attribution.
    mules.push({ ...makeMule('hilla', [NORMAL_HILLA]), dailyClearMark: currentDailyStamp(now) });

    const w = WorldIncome.of(mules);
    const hilla = w.perMule.get('hilla')!;
    // Sanity: potential is 7×4M, contributed is only 2×4M after the cut.
    expect(hilla.potentialMeso).toBe(NORMAL_HILLA_VALUE * 7);
    expect(hilla.contributedMeso).toBe(NORMAL_HILLA_VALUE * 2);

    const p = markedProgress(mules, w, now);
    // Cleared meso equals the post-cut contribution, NOT the raw ×7 slate value.
    expect(p.clearedWeeklyMeso).toBe(NORMAL_HILLA_VALUE * 2);
    expect(p.dailyTileCleared).toBe(2);
    expect(p.weeklyTileCleared).toBe(0);
  });
});

describe('markedProgress — mark validity', () => {
  it('stale or malformed marks contribute nothing', () => {
    const now = Date.now();
    const mule = {
      ...makeMule('a', [HARD_LUCID, NORMAL_HILLA, BM_EXTREME]),
      weeklyClearMark: currentWeeklyStamp(now) - 1, // one ms stale
      dailyClearMark: 'not-a-day',
      bmClearMark: '1999-01',
    };
    const w = WorldIncome.of([mule]);
    const p = markedProgress([mule], w, now);
    expect(p.clearedWeeklyMeso).toBe(0);
    expect(p.clearedBmMeso).toBe(0);
    expect(p.dailyTileCleared).toBe(0);
    expect(p.weeklyTileCleared).toBe(0);
    expect(p.monthlyTileCleared).toBe(0);
  });

  it('splits weekly-only and daily-only marks by cadence', () => {
    const now = Date.now();
    const weeklyOnly = {
      ...makeMule('a', [HARD_LUCID, NORMAL_HILLA]),
      weeklyClearMark: currentWeeklyStamp(now),
    };
    const pWeekly = markedProgress([weeklyOnly], WorldIncome.of([weeklyOnly]), now);
    expect(pWeekly.clearedWeeklyMeso).toBe(HARD_LUCID_VALUE);
    expect(pWeekly.weeklyTileCleared).toBe(1);
    expect(pWeekly.dailyTileCleared).toBe(0);

    const dailyOnly = {
      ...makeMule('a', [HARD_LUCID, NORMAL_HILLA]),
      dailyClearMark: currentDailyStamp(now),
    };
    const pDaily = markedProgress([dailyOnly], WorldIncome.of([dailyOnly]), now);
    // Daily attribution is the ×7 per-day expansion, uncapped here.
    expect(pDaily.clearedWeeklyMeso).toBe(NORMAL_HILLA_VALUE * 7);
    expect(pDaily.dailyTileCleared).toBe(7);
    expect(pDaily.weeklyTileCleared).toBe(0);
  });

  it('a valid BM mark counts monthlyCrystalValue and the monthly key', () => {
    const now = Date.now();
    const mule = { ...makeMule('a', [BM_EXTREME]), bmClearMark: currentBmStamp(now) };
    const w = WorldIncome.of([mule]);
    const p = markedProgress([mule], w, now);
    expect(p.clearedBmMeso).toBe(expectedBlackMageIncomeForRoster([mule]));
    expect(p.monthlyTileCleared).toBe(1);
    // BM marks never bleed into the weekly numerator.
    expect(p.clearedWeeklyMeso).toBe(0);
  });

  it('drops the numerator when the cycle advances past the stamp (live expiry)', () => {
    const now = Date.now();
    const mule = markAll(makeMule('a', [HARD_LUCID, BM_EXTREME]), now);
    const w = WorldIncome.of([mule]);
    // Same marks, evaluated a week + a month later — every stamp is now stale.
    const later = now + 40 * 24 * 60 * 60 * 1000;
    const p = markedProgress([mule], w, later);
    expect(p.clearedWeeklyMeso).toBe(0);
    expect(p.clearedBmMeso).toBe(0);
    expect(p.weeklyTileCleared).toBe(0);
    expect(p.monthlyTileCleared).toBe(0);
  });
});
