import { describe, expect, it } from 'vitest';
import { rosterRowMetrics } from '../rosterRowMetrics';
import type { Mule } from '../../types';
import type { MuleContribution } from '../../modules/worldIncome';
import type { SlateKey } from '../../data/muleBossSlate';
import { bosses } from '../../data/bosses';

const LUCID = bosses.find((b) => b.family === 'lucid')!.id;
const HILLA = bosses.find((b) => b.family === 'hilla')!.id;
const VELLUM = bosses.find((b) => b.family === 'vellum')!.id;
const BLACK_MAGE = bosses.find((b) => b.family === 'black-mage')!.id;
const HARD_LUCID_WEEKLY = `${LUCID}:hard:weekly`;
const NORMAL_HILLA_DAILY = `${HILLA}:normal:daily`;
const NORMAL_VELLUM_DAILY = `${VELLUM}:normal:daily`;
const HARD_BLACK_MAGE_MONTHLY = `${BLACK_MAGE}:hard:monthly`;

function weeklyKeys(count: number): SlateKey[] {
  return bosses
    .flatMap((boss) => {
      const weekly = boss.difficulty.find((difficulty) => difficulty.cadence === 'weekly');
      return weekly ? ([`${boss.id}:${weekly.tier}:weekly` as SlateKey] as const) : [];
    })
    .slice(0, count);
}

const baseMule = (overrides: Partial<Mule> = {}): Mule => ({
  id: 'm1',
  name: 'M1',
  level: 200,
  muleClass: 'Hero',
  selectedBosses: [],
  active: true,
  ...overrides,
});

const contribution = (overrides: Partial<MuleContribution> = {}): MuleContribution => ({
  potentialMeso: 0,
  contributedMeso: 0,
  droppedMeso: 0,
  droppedSlots: 0,
  droppedKeys: new Map<SlateKey, number>(),
  ...overrides,
});

describe('rosterRowMetrics', () => {
  it('counts weekly slate keys', () => {
    const mule = baseMule({
      selectedBosses: [HARD_LUCID_WEEKLY, NORMAL_HILLA_DAILY],
    });
    const m = rosterRowMetrics(mule, contribution(), 0);
    expect(m.weeklyCount).toBe(1);
  });

  it('counts daily cadence selections as weekly-basis crystals', () => {
    const mule = baseMule({
      selectedBosses: [HARD_LUCID_WEEKLY, NORMAL_HILLA_DAILY],
    });
    const m = rosterRowMetrics(mule, contribution(), 0);
    expect(m.dailyCount).toBe(7);
  });

  it('counts monthly cadence selections from the mule Boss Slate', () => {
    const mule = baseMule({
      selectedBosses: [HARD_LUCID_WEEKLY, NORMAL_HILLA_DAILY, HARD_BLACK_MAGE_MONTHLY],
    });
    const m = rosterRowMetrics(mule, contribution(), 0);
    expect(m.monthlyCount).toBe(1);
  });

  it('adds 7 daily crystals for each selected daily cadence boss', () => {
    const mule = baseMule({
      selectedBosses: [NORMAL_HILLA_DAILY, NORMAL_VELLUM_DAILY],
    });
    const m = rosterRowMetrics(mule, contribution(), 0);
    expect(m.dailyCount).toBe(14);
  });

  it('returns zero for empty selectedBosses', () => {
    const mule = baseMule({ selectedBosses: [] });
    const m = rosterRowMetrics(mule, contribution(), 0);
    expect(m.weeklyCount).toBe(0);
    expect(m.dailyCount).toBe(0);
    expect(m.monthlyCount).toBe(0);
    expect(m.postCapMeso).toBe(0);
    expect(m.sharePct).toBe(0);
    expect(m.droppedKeys.size).toBe(0);
  });

  it('handles full 14 weeklies', () => {
    const mule = baseMule({ selectedBosses: weeklyKeys(14) });
    const m = rosterRowMetrics(mule, contribution(), 0);
    expect(m.weeklyCount).toBe(14);
  });

  it('uses contribution.contributedMeso as postCapMeso', () => {
    const mule = baseMule();
    const c = contribution({ contributedMeso: 1_500_000_000 });
    const m = rosterRowMetrics(mule, c, 6_000_000_000);
    expect(m.postCapMeso).toBe(1_500_000_000);
  });

  it('computes sharePct as contributedMeso / worldTotal', () => {
    const mule = baseMule();
    const c = contribution({ contributedMeso: 1_000_000_000 });
    const m = rosterRowMetrics(mule, c, 4_000_000_000);
    expect(m.sharePct).toBeCloseTo(0.25, 5);
  });

  it('returns 0 sharePct when worldTotal is 0 (no NaN)', () => {
    const mule = baseMule();
    const c = contribution({ contributedMeso: 1_000_000_000 });
    const m = rosterRowMetrics(mule, c, 0);
    expect(m.sharePct).toBe(0);
    expect(Number.isNaN(m.sharePct)).toBe(false);
  });

  it('treats missing contribution as 0 (covers inactive mules absent from perMule)', () => {
    const mule = baseMule({ active: false, selectedBosses: [HARD_LUCID_WEEKLY] });
    const m = rosterRowMetrics(mule, undefined, 4_000_000_000);
    expect(m.postCapMeso).toBe(0);
    expect(m.sharePct).toBe(0);
    expect(m.droppedKeys.size).toBe(0);
    // Cadence counts still derive from selectedBosses, not from contribution.
    expect(m.weeklyCount).toBe(1);
  });

  it('passes through droppedKeys from the contribution', () => {
    const dk = new Map<SlateKey, number>([[HARD_LUCID_WEEKLY, 1]]);
    const mule = baseMule({ selectedBosses: [HARD_LUCID_WEEKLY] });
    const m = rosterRowMetrics(mule, contribution({ droppedKeys: dk }), 1);
    expect(m.droppedKeys).toBe(dk);
  });

  it('only-daily mule renders zero weeklies', () => {
    const mule = baseMule({ selectedBosses: [NORMAL_HILLA_DAILY, NORMAL_VELLUM_DAILY] });
    const m = rosterRowMetrics(mule, contribution(), 0);
    expect(m.weeklyCount).toBe(0);
    expect(m.dailyCount).toBe(14);
  });
});
