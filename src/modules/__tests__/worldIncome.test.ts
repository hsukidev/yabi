import { describe, expect, it } from 'vitest';
import { WorldIncome, WORLD_WEEKLY_CRYSTAL_CAP } from '../worldIncome';
import { bosses } from '../../data/bosses';
import type { Mule } from '../../types';

/**
 * Tests for the `WorldIncome` aggregator (issue #235, PRD #234).
 *
 * The aggregator pools every active mule's **Crystal Slots** in the selected
 * world, sorts descending by **Slot Value**, takes the top
 * `WORLD_WEEKLY_CRYSTAL_CAP`, and attributes survivors back to their owning
 * mules. These tests assert the public output shape — `totalContributedMeso`,
 * `weeklySlotsContributed`, `dailySlotsContributed`, `slotsTotalContributed`,
 * `perMule` — under controlled fixtures.
 */

const LUCID = bosses.find((b) => b.family === 'lucid')!;
const WILL = bosses.find((b) => b.family === 'will')!;
const HILLA = bosses.find((b) => b.family === 'hilla')!;
const VELLUM = bosses.find((b) => b.family === 'vellum')!;
const BLACK_MAGE = bosses.find((b) => b.family === 'black-mage')!;

const HARD_LUCID = `${LUCID.id}:hard:weekly`; // 504M weekly
const HARD_LUCID_VALUE = 504_000_000;
const HARD_WILL = `${WILL.id}:hard:weekly`; // 621.81M weekly
const HARD_WILL_VALUE = 621_810_000;
const NORMAL_HILLA = `${HILLA.id}:normal:daily`; // 4M daily, 7 slots @ 4M
const NORMAL_HILLA_VALUE = 4_000_000;
const NORMAL_VELLUM = `${VELLUM.id}:normal:daily`;
const BM_EXTREME = `${BLACK_MAGE.id}:extreme:monthly`;

/** Top-N distinct weekly keys ranked by Heroic crystalValue descending. */
function topWeeklyKeys(n: number): { slateKey: string; value: number }[] {
  const all: { slateKey: string; value: number }[] = [];
  for (const b of bosses) {
    const weeklies = b.difficulty.filter((d) => d.cadence === 'weekly');
    if (weeklies.length === 0) continue;
    const top = weeklies.reduce((a, c) => (c.crystalValue.Heroic > a.crystalValue.Heroic ? c : a));
    all.push({ slateKey: `${b.id}:${top.tier}:weekly`, value: top.crystalValue.Heroic });
  }
  all.sort((a, b) => b.value - a.value);
  if (all.length < n) throw new Error(`Only ${all.length} weekly families available, need ${n}`);
  return all.slice(0, n);
}

function makeMule(
  id: string,
  selectedBosses: string[],
  opts: { active?: boolean; partySizes?: Record<string, number> } = {},
): Mule {
  return {
    id,
    name: id,
    level: 200,
    muleClass: 'Hero',
    selectedBosses,
    active: opts.active ?? true,
    partySizes: opts.partySizes,
  };
}

describe('WORLD_WEEKLY_CRYSTAL_CAP', () => {
  it('is 180', () => {
    expect(WORLD_WEEKLY_CRYSTAL_CAP).toBe(180);
  });
});

describe('WorldIncome.of — basic shape', () => {
  it('returns all zeros for an empty roster', () => {
    const w = WorldIncome.of([]);
    expect(w.totalContributedMeso).toBe(0);
    expect(w.weeklySlotsContributed).toBe(0);
    expect(w.dailySlotsContributed).toBe(0);
    expect(w.slotsTotalContributed).toBe(0);
    expect(w.perMule.size).toBe(0);
  });

  it('returns all zeros when every mule is inactive', () => {
    const w = WorldIncome.of([
      makeMule('a', [HARD_LUCID], { active: false }),
      makeMule('b', [HARD_WILL], { active: false }),
    ]);
    expect(w.totalContributedMeso).toBe(0);
    expect(w.slotsTotalContributed).toBe(0);
    // Inactive mules are not in the pool, so they have no contribution record.
    expect(w.perMule.has('a')).toBe(false);
    expect(w.perMule.has('b')).toBe(false);
  });
});

describe('WorldIncome.of — under-cap (no drops)', () => {
  it('totals equal the sum of slot Values for a small under-cap fixture', () => {
    const w = WorldIncome.of([
      makeMule('a', [HARD_LUCID]),
      makeMule('b', [HARD_WILL, NORMAL_HILLA]),
    ]);
    // Slot pool: 1 + 1 + 7 = 9 slots, all surviving.
    expect(w.weeklySlotsContributed).toBe(2);
    expect(w.dailySlotsContributed).toBe(7);
    expect(w.slotsTotalContributed).toBe(9);
    expect(w.totalContributedMeso).toBe(
      HARD_LUCID_VALUE + HARD_WILL_VALUE + NORMAL_HILLA_VALUE * 7,
    );
  });

  it('per-mule contributedMeso equals potentialMeso when no drops happen', () => {
    const w = WorldIncome.of([
      makeMule('a', [HARD_LUCID]),
      makeMule('b', [HARD_WILL, NORMAL_HILLA]),
    ]);
    const a = w.perMule.get('a')!;
    expect(a.potentialMeso).toBe(HARD_LUCID_VALUE);
    expect(a.contributedMeso).toBe(HARD_LUCID_VALUE);
    expect(a.droppedMeso).toBe(0);
    expect(a.droppedSlots).toBe(0);
    const b = w.perMule.get('b')!;
    expect(b.potentialMeso).toBe(HARD_WILL_VALUE + NORMAL_HILLA_VALUE * 7);
    expect(b.contributedMeso).toBe(HARD_WILL_VALUE + NORMAL_HILLA_VALUE * 7);
    expect(b.droppedMeso).toBe(0);
    expect(b.droppedSlots).toBe(0);
  });
});

describe('WorldIncome.of — Active-Flag Filter', () => {
  it('skips active===false mules entirely (no slots, no perMule entry)', () => {
    const w = WorldIncome.of([
      makeMule('a', [HARD_LUCID], { active: true }),
      makeMule('b', [HARD_WILL], { active: false }),
    ]);
    expect(w.weeklySlotsContributed).toBe(1);
    expect(w.totalContributedMeso).toBe(HARD_LUCID_VALUE);
    expect(w.perMule.has('a')).toBe(true);
    expect(w.perMule.has('b')).toBe(false);
  });

  it('treats active===undefined as included (matches Income.of semantics)', () => {
    const m: Mule = {
      id: 'a',
      name: 'a',
      level: 200,
      muleClass: 'Hero',
      selectedBosses: [HARD_LUCID],
      active: undefined as unknown as boolean,
    };
    const w = WorldIncome.of([m]);
    expect(w.totalContributedMeso).toBe(HARD_LUCID_VALUE);
    expect(w.slotsTotalContributed).toBe(1);
  });
});

describe('WorldIncome.of — Monthly exclusion', () => {
  it('Monthly Cadence keys contribute zero slots and zero meso', () => {
    const w = WorldIncome.of([makeMule('a', [BM_EXTREME])]);
    expect(w.totalContributedMeso).toBe(0);
    expect(w.weeklySlotsContributed).toBe(0);
    expect(w.dailySlotsContributed).toBe(0);
    expect(w.slotsTotalContributed).toBe(0);
    const a = w.perMule.get('a')!;
    expect(a.potentialMeso).toBe(0);
    expect(a.contributedMeso).toBe(0);
    expect(a.droppedSlots).toBe(0);
  });

  it('mixes monthly with weekly/daily without affecting the pool', () => {
    const w = WorldIncome.of([makeMule('a', [HARD_LUCID, NORMAL_HILLA, BM_EXTREME])]);
    // 1 weekly + 7 daily = 8 slots; monthly contributes nothing.
    expect(w.slotsTotalContributed).toBe(8);
    expect(w.totalContributedMeso).toBe(HARD_LUCID_VALUE + NORMAL_HILLA_VALUE * 7);
  });
});

describe('WorldIncome.of — mixed cadences and party sizes', () => {
  it('weekly Slot Values divide by family Party Size; daily ignores it', () => {
    const w = WorldIncome.of([
      makeMule('a', [HARD_LUCID, NORMAL_HILLA], {
        partySizes: { lucid: 2, hilla: 3 },
      }),
    ]);
    // Weekly Lucid halved; daily Hilla untouched.
    expect(w.totalContributedMeso).toBe(HARD_LUCID_VALUE / 2 + NORMAL_HILLA_VALUE * 7);
  });

  it('uses Interactive crystal values when the mule is on an Interactive world', () => {
    const heroic = WorldIncome.of([makeMule('a', [HARD_LUCID])]);
    const interactive = WorldIncome.of([
      { ...makeMule('a', [HARD_LUCID]), worldId: 'interactive-scania' },
    ]);
    // Hard Lucid Interactive = 100.8M (Heroic 504M × 0.2).
    expect(heroic.totalContributedMeso).toBe(504_000_000);
    expect(interactive.totalContributedMeso).toBe(100_800_000);
  });
});

describe('WorldIncome.of — exactly-at-cap (no drops)', () => {
  it('keeps every slot when pool size equals the cap', () => {
    // Build 13 mules each carrying 13 distinct weekly keys + 1 mule with 11
    // = 13*13 + 11 = 180 slots exactly.
    const top13 = topWeeklyKeys(13).map((k) => k.slateKey);
    const top11 = top13.slice(0, 11);
    const mules: Mule[] = [];
    for (let i = 0; i < 13; i++) mules.push(makeMule(`m${i}`, top13));
    mules.push(makeMule('mlast', top11));
    const w = WorldIncome.of(mules);
    expect(w.slotsTotalContributed).toBe(WORLD_WEEKLY_CRYSTAL_CAP);
    // Sum check: every slot survived.
    const expected = mules.reduce((sum, m) => {
      // Each slate key contributes 1 weekly slot at top13 values.
      const total = m.selectedBosses.reduce((s, k) => {
        const found = topWeeklyKeys(13).find((t) => t.slateKey === k)!;
        return s + found.value;
      }, 0);
      return sum + total;
    }, 0);
    expect(w.totalContributedMeso).toBe(expected);
    // No drops anywhere.
    for (const c of w.perMule.values()) {
      expect(c.droppedMeso).toBe(0);
      expect(c.droppedSlots).toBe(0);
    }
  });
});

describe('WorldIncome.of — over-cap drops', () => {
  it('drops the single lowest-value slot when pool is cap+1', () => {
    // Pool: 12 mules × 14 weeklies = 168, + 1 mule × 13 = 181. Cap = 180,
    // so exactly 1 slot drops.
    const top14 = topWeeklyKeys(14).map((k) => k.slateKey);
    const mules: Mule[] = [];
    for (let i = 0; i < 12; i++) mules.push(makeMule(`m${i}`, top14));
    mules.push(makeMule('m12', top14.slice(0, 13)));
    const w = WorldIncome.of(mules);
    expect(w.slotsTotalContributed).toBe(WORLD_WEEKLY_CRYSTAL_CAP);
    let totalDroppedSlots = 0;
    for (const c of w.perMule.values()) totalDroppedSlots += c.droppedSlots;
    expect(totalDroppedSlots).toBe(1);
  });

  it('drops multiple slots when pool exceeds cap by several', () => {
    // 13 mules × 14 weekly = 182 slots. Cap = 180. 2 dropped.
    const top14 = topWeeklyKeys(14).map((k) => k.slateKey);
    const mules: Mule[] = [];
    for (let i = 0; i < 13; i++) mules.push(makeMule(`m${i}`, top14));
    const w = WorldIncome.of(mules);
    expect(w.slotsTotalContributed).toBe(WORLD_WEEKLY_CRYSTAL_CAP);
    let totalDroppedSlots = 0;
    for (const c of w.perMule.values()) totalDroppedSlots += c.droppedSlots;
    expect(totalDroppedSlots).toBe(2);
  });

  it('drops the lowest-Slot-Value slots first (highest survive)', () => {
    // 13 mules × top 14 weeklies = 182 slots. Cap = 180, so the lowest 2
    // copies of the rank-14 slot drop.
    const top14 = topWeeklyKeys(14);
    const top14Keys = top14.map((k) => k.slateKey);
    const mules: Mule[] = [];
    for (let i = 0; i < 13; i++) mules.push(makeMule(`m${i}`, top14Keys));
    const w = WorldIncome.of(mules);
    const allValues = top14.flatMap((k) => Array(13).fill(k.value));
    allValues.sort((a, b) => b - a);
    const expectedTotal = allValues.slice(0, 180).reduce((s, v) => s + v, 0);
    expect(w.totalContributedMeso).toBe(expectedTotal);
    // Sanity: rank-14 is strictly below rank-1, so the drops did come from
    // the bottom of the pool, not the top.
    expect(top14[13].value).toBeLessThan(top14[0].value);
  });
});

describe('WorldIncome.of — daily partial drop', () => {
  it('drops daily slots at slot-level granularity (e.g. 5 of 7 daily-Hilla cut)', () => {
    // Layout the pool so daily Hilla 4M sits at the bottom and exactly 5 of
    // its 7 slots fall outside the top-180 cut.
    //
    //   Pool: 178 weekly slots (all >>4M) + 7 daily Hilla (4M) = 185
    //   Cap = 180, so 5 of the lowest-value (daily Hilla) slots drop.
    const top14 = topWeeklyKeys(14).map((k) => k.slateKey);
    const mules: Mule[] = [];
    // 12 mules × 14 = 168
    for (let i = 0; i < 12; i++) mules.push(makeMule(`m${i}`, top14));
    // 1 mule with 10 of top14 = 178 weekly slots total
    mules.push(makeMule('m12', top14.slice(0, 10)));
    // Daily Hilla mule
    mules.push(makeMule('hilla', [NORMAL_HILLA]));
    const w = WorldIncome.of(mules);
    expect(w.slotsTotalContributed).toBe(WORLD_WEEKLY_CRYSTAL_CAP);
    expect(w.weeklySlotsContributed).toBe(178);
    expect(w.dailySlotsContributed).toBe(2);
    const hilla = w.perMule.get('hilla')!;
    expect(hilla.potentialMeso).toBe(NORMAL_HILLA_VALUE * 7);
    expect(hilla.contributedMeso).toBe(NORMAL_HILLA_VALUE * 2);
    expect(hilla.droppedMeso).toBe(NORMAL_HILLA_VALUE * 5);
    expect(hilla.droppedSlots).toBe(5);
  });
});

describe('WorldIncome.of — Cap Tiebreak determinism', () => {
  it('drops the slot whose owning mule has the higher roster index first', () => {
    // Build a fixture where the cut boundary lands on equal-value slots
    // owned by two different mules. Verify the lower-indexed mule's slots
    // survive entirely.
    //
    // Pool: 179 high-value weekly slots + 2 mules each carrying one copy of
    // the same low-value weekly = 181 slots, cap 180, 1 drop. The drop must
    // come from the higher-indexed mule.
    const top13 = topWeeklyKeys(13).map((k) => k.slateKey); // all > lowKey
    const lowKey = topWeeklyKeys(14)[13].slateKey;
    const mules: Mule[] = [];
    // 13 mules × 13 = 169 high-value weekly slots, + 10 from a 14th mule = 179.
    for (let i = 0; i < 13; i++) mules.push(makeMule(`m${i}`, top13));
    mules.push(makeMule('m13', top13.slice(0, 10)));
    // Two contestant mules tied on the low key. Pool = 179 + 2 = 181.
    mules.push(makeMule('contestantLow', [lowKey]));
    mules.push(makeMule('contestantHigh', [lowKey]));
    const w = WorldIncome.of(mules);
    expect(w.slotsTotalContributed).toBe(WORLD_WEEKLY_CRYSTAL_CAP);
    const low = w.perMule.get('contestantLow')!;
    const high = w.perMule.get('contestantHigh')!;
    // contestantLow has the lower roster index → slot survives.
    expect(low.droppedSlots).toBe(0);
    expect(high.droppedSlots).toBe(1);
  });

  it('drops the slot whose selectedBosses[] index is later first (within a single mule)', () => {
    // `MuleBossSlate.from` dedupes by `(bossId, cadence)`, so a single mule
    // can't carry two copies of the same key. Use two distinct weekly keys
    // tied on Crystal Value (Princess-no normal and Zakum chaos are both
    // 81M weekly per the slate test).
    const TIED_VALUE = 81_000_000;
    const PRINCESS_NO = bosses.find((b) => b.family === 'princess-no')!;
    const ZAKUM = bosses.find((b) => b.family === 'zakum')!;
    const earlyKey = `${PRINCESS_NO.id}:normal:weekly`;
    const lateKey = `${ZAKUM.id}:chaos:weekly`;
    expect(PRINCESS_NO.difficulty.find((d) => d.tier === 'normal')!.crystalValue.Heroic).toBe(
      TIED_VALUE,
    );
    expect(ZAKUM.difficulty.find((d) => d.tier === 'chaos')!.crystalValue.Heroic).toBe(TIED_VALUE);
    // Pool: 179 high-value weeklies + this mule's 2 tied slots = 181, cap 180.
    // `selectedBosses` order is [earlyKey, lateKey] → lateKey drops.
    const top13 = topWeeklyKeys(13).map((k) => k.slateKey);
    const mules: Mule[] = [];
    for (let i = 0; i < 13; i++) mules.push(makeMule(`m${i}`, top13)); // 169 slots
    mules.push(makeMule('m13', top13.slice(0, 10))); // +10 = 179
    mules.push(makeMule('tiedMule', [earlyKey, lateKey])); // +2 = 181
    const w = WorldIncome.of(mules);
    expect(w.slotsTotalContributed).toBe(WORLD_WEEKLY_CRYSTAL_CAP);
    const tied = w.perMule.get('tiedMule')!;
    expect(tied.droppedSlots).toBe(1);
    // The earlier-inserted key's value survives (`contributedMeso === earlyKey value`).
    expect(tied.contributedMeso).toBe(TIED_VALUE);
    expect(tied.droppedMeso).toBe(TIED_VALUE);
  });
});

describe('WorldIncome.of — full drop (entire mule cut)', () => {
  it('attributes droppedMeso === potentialMeso and contributedMeso === 0 when every slot is cut', () => {
    // 13 mules × top 13 weeklies = 169 high-value slots, + 1 mule with 11 of
    // those = 180 total at the top. A 15th mule carries only the rank-14 key
    // (strictly lower Slot Value than every key in the top-180), so its
    // single slot drops in its entirety.
    const top13 = topWeeklyKeys(13).map((k) => k.slateKey);
    const lowKey = topWeeklyKeys(14)[13].slateKey;
    const lowValue = topWeeklyKeys(14)[13].value;
    const mules: Mule[] = [];
    for (let i = 0; i < 13; i++) mules.push(makeMule(`m${i}`, top13)); // 169
    mules.push(makeMule('m13', top13.slice(0, 11))); // +11 = 180 at top
    mules.push(makeMule('fullyDropped', [lowKey])); // +1 below the cut
    const w = WorldIncome.of(mules);
    expect(w.slotsTotalContributed).toBe(WORLD_WEEKLY_CRYSTAL_CAP);
    const dropped = w.perMule.get('fullyDropped')!;
    expect(dropped.potentialMeso).toBe(lowValue);
    expect(dropped.contributedMeso).toBe(0);
    expect(dropped.droppedMeso).toBe(lowValue);
    expect(dropped.droppedSlots).toBe(1);
  });
});

describe('WorldIncome.of — per-cadence post-cut attribution', () => {
  it('splits contributedMeso and survived slots into weekly and daily buckets', () => {
    const w = WorldIncome.of([makeMule('a', [HARD_LUCID, NORMAL_HILLA])]);
    const a = w.perMule.get('a')!;
    // 1 weekly slot (504M) + 7 daily slots (4M each), all under cap.
    expect(a.weeklyContributedMeso).toBe(HARD_LUCID_VALUE);
    expect(a.dailyContributedMeso).toBe(NORMAL_HILLA_VALUE * 7);
    expect(a.weeklySurvivedSlots).toBe(1);
    expect(a.dailySurvivedSlots).toBe(7);
    // The split partitions contributedMeso exactly (monthly contributes none).
    expect(a.weeklyContributedMeso + a.dailyContributedMeso).toBe(a.contributedMeso);
    expect(a.weeklySurvivedSlots + a.dailySurvivedSlots).toBe(a.contributedMeso === 0 ? 0 : 8);
  });

  it('attributes only surviving daily slots after a partial daily drop (post-cut)', () => {
    // Same 185-slot fixture as the daily-partial-drop test: 5 of 7 daily Hilla
    // slots drop, 2 survive.
    const top14 = topWeeklyKeys(14).map((k) => k.slateKey);
    const mules: Mule[] = [];
    for (let i = 0; i < 12; i++) mules.push(makeMule(`m${i}`, top14)); // 168 weekly
    mules.push(makeMule('m12', top14.slice(0, 10))); // +10 = 178 weekly
    mules.push(makeMule('hilla', [NORMAL_HILLA])); // +7 daily = 185
    const w = WorldIncome.of(mules);
    const hilla = w.perMule.get('hilla')!;
    expect(hilla.dailySurvivedSlots).toBe(2);
    expect(hilla.dailyContributedMeso).toBe(NORMAL_HILLA_VALUE * 2);
    expect(hilla.weeklyContributedMeso).toBe(0);
    expect(hilla.weeklySurvivedSlots).toBe(0);
    // Weekly-only mules attribute all of their contribution to the weekly bucket.
    const m0 = w.perMule.get('m0')!;
    expect(m0.dailyContributedMeso).toBe(0);
    expect(m0.weeklyContributedMeso).toBe(m0.contributedMeso);
  });

  it('sums per-cadence contributions back to the aggregate cadence totals', () => {
    const top14 = topWeeklyKeys(14).map((k) => k.slateKey);
    const mules: Mule[] = [];
    for (let i = 0; i < 13; i++) mules.push(makeMule(`m${i}`, top14)); // 182 weekly
    mules.push(makeMule('hilla', [NORMAL_HILLA, NORMAL_VELLUM])); // +14 daily
    const w = WorldIncome.of(mules);
    let weeklyMeso = 0;
    let dailyMeso = 0;
    let weeklySlots = 0;
    let dailySlots = 0;
    for (const c of w.perMule.values()) {
      weeklyMeso += c.weeklyContributedMeso;
      dailyMeso += c.dailyContributedMeso;
      weeklySlots += c.weeklySurvivedSlots;
      dailySlots += c.dailySurvivedSlots;
    }
    expect(weeklyMeso + dailyMeso).toBe(w.totalContributedMeso);
    expect(weeklySlots).toBe(w.weeklySlotsContributed);
    expect(dailySlots).toBe(w.dailySlotsContributed);
  });
});

describe('WorldIncome.of — per-mule contribution invariant', () => {
  it('potentialMeso − contributedMeso === droppedMeso for every contributing mule', () => {
    // Over-cap fixture spanning multiple mules and cadences.
    const top14 = topWeeklyKeys(14).map((k) => k.slateKey);
    const mules: Mule[] = [];
    for (let i = 0; i < 13; i++) mules.push(makeMule(`m${i}`, top14)); // 182 slots
    mules.push(makeMule('hilla', [NORMAL_HILLA, NORMAL_VELLUM])); // +14 daily slots
    const w = WorldIncome.of(mules);
    for (const c of w.perMule.values()) {
      expect(c.contributedMeso).toBeLessThanOrEqual(c.potentialMeso);
      expect(c.droppedMeso).toBe(c.potentialMeso - c.contributedMeso);
      expect(c.droppedMeso).toBeGreaterThanOrEqual(0);
    }
    // Sum invariant: sum of contributions equals total.
    let summed = 0;
    for (const c of w.perMule.values()) summed += c.contributedMeso;
    expect(summed).toBe(w.totalContributedMeso);
    // slotsTotalContributed == cap when pool > cap.
    expect(w.slotsTotalContributed).toBe(WORLD_WEEKLY_CRYSTAL_CAP);
  });
});

describe('WorldIncome.of — droppedKeys per-mule attribution', () => {
  it('exposes an empty droppedKeys map for under-cap mules', () => {
    const w = WorldIncome.of([
      makeMule('a', [HARD_LUCID]),
      makeMule('b', [HARD_WILL, NORMAL_HILLA]),
    ]);
    const a = w.perMule.get('a')!;
    const b = w.perMule.get('b')!;
    expect(a.droppedKeys.size).toBe(0);
    expect(b.droppedKeys.size).toBe(0);
  });

  it('shares the same empty droppedKeys reference across under-cap mules (memo identity)', () => {
    const w = WorldIncome.of([makeMule('a', [HARD_LUCID]), makeMule('b', [HARD_WILL])]);
    const a = w.perMule.get('a')!;
    const b = w.perMule.get('b')!;
    // Reference equality keeps `MuleCardInner`'s memo from invalidating just
    // because a sibling card forced a re-render of the aggregator.
    expect(a.droppedKeys).toBe(b.droppedKeys);
  });

  it('records exactly one weekly key with count 1 when a single weekly slot drops', () => {
    // 12 mules × top14 (168) + 1 mule with top13 only (13) = 181 slots, cap
    // 180. The single dropped slot is rank-14 (lowest value), owned by every
    // mule m0..m11 — Cap Tiebreak picks the highest roster index (m11), so
    // m11.droppedKeys carries `{ rank14 → 1 }`.
    const top14 = topWeeklyKeys(14).map((k) => k.slateKey);
    const dropKey = top14[13];
    const mules: Mule[] = [];
    for (let i = 0; i < 12; i++) mules.push(makeMule(`m${i}`, top14)); // 168
    mules.push(makeMule('m12', top14.slice(0, 13))); // +13 = 181, cap 180
    const w = WorldIncome.of(mules);
    let totalDroppedSlots = 0;
    for (const c of w.perMule.values()) totalDroppedSlots += c.droppedSlots;
    expect(totalDroppedSlots).toBe(1);
    const m11 = w.perMule.get('m11')!;
    expect(m11.droppedKeys.get(dropKey)).toBe(1);
    expect(m11.droppedKeys.size).toBe(1);
    // m12 has no rank-14 slot, so no drop attributed to it.
    expect(w.perMule.get('m12')!.droppedKeys.size).toBe(0);
  });

  it('accumulates daily slots into a single map entry with the right count', () => {
    // 5 of 7 daily-Hilla slots drop (mirrors the existing "daily partial drop"
    // fixture). The map should record `{ NORMAL_HILLA: 5 }`.
    const top14 = topWeeklyKeys(14).map((k) => k.slateKey);
    const mules: Mule[] = [];
    for (let i = 0; i < 12; i++) mules.push(makeMule(`m${i}`, top14)); // 168
    mules.push(makeMule('m12', top14.slice(0, 10))); // +10 = 178 weekly
    mules.push(makeMule('hilla', [NORMAL_HILLA])); // +7 daily Hilla = 185
    const w = WorldIncome.of(mules);
    const hilla = w.perMule.get('hilla')!;
    expect(hilla.droppedKeys.get(NORMAL_HILLA)).toBe(5);
    expect(hilla.droppedKeys.size).toBe(1);
  });

  it('attributes drops to each owning mule independently', () => {
    // Two mules each fully dropped on different weekly keys.
    const top13 = topWeeklyKeys(13).map((k) => k.slateKey);
    const lowKey = topWeeklyKeys(14)[13].slateKey;
    const mules: Mule[] = [];
    for (let i = 0; i < 13; i++) mules.push(makeMule(`m${i}`, top13)); // 169
    mules.push(makeMule('m13', top13.slice(0, 11))); // +11 = 180 at top
    mules.push(makeMule('droppedA', [lowKey])); // +1 below cut
    mules.push(makeMule('droppedB', [lowKey])); // +1 below cut
    const w = WorldIncome.of(mules);
    const a = w.perMule.get('droppedA')!;
    const b = w.perMule.get('droppedB')!;
    expect(a.droppedKeys.get(lowKey)).toBe(1);
    expect(b.droppedKeys.get(lowKey)).toBe(1);
    expect(a.droppedKeys.size).toBe(1);
    expect(b.droppedKeys.size).toBe(1);
    // Healthy mules carry no drops.
    for (let i = 0; i < 13; i++) {
      expect(w.perMule.get(`m${i}`)!.droppedKeys.size).toBe(0);
    }
  });

  it('sum of counts in every droppedKeys equals the global droppedSlots invariant', () => {
    const top14 = topWeeklyKeys(14).map((k) => k.slateKey);
    const mules: Mule[] = [];
    for (let i = 0; i < 13; i++) mules.push(makeMule(`m${i}`, top14)); // 182
    mules.push(makeMule('hilla', [NORMAL_HILLA, NORMAL_VELLUM])); // +14 daily
    const w = WorldIncome.of(mules);
    let totalDroppedSlots = 0;
    let summedKeyCounts = 0;
    for (const c of w.perMule.values()) {
      totalDroppedSlots += c.droppedSlots;
      for (const count of c.droppedKeys.values()) summedKeyCounts += count;
    }
    expect(summedKeyCounts).toBe(totalDroppedSlots);
  });
});
