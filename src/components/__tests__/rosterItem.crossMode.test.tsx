import { describe, expect, it } from 'vitest';
import { render } from '../../test/test-utils';
import { DndContext } from '@dnd-kit/core';
import {
  SortableContext,
  rectSortingStrategy,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { MuleCharacterCard } from '../MuleCharacterCard';
import { MuleListRow } from '../MuleListRow';
import { bosses } from '../../data/bosses';
import type { Mule } from '../../types';
import { WorldIncome } from '../../modules/worldIncome';
import { rosterRowMetrics, type RosterRowMetrics } from '../rosterRowMetrics';

const LUCID = bosses.find((b) => b.family === 'lucid')!.id;
const HILLA = bosses.find((b) => b.family === 'hilla')!.id;
const BLACK_MAGE = bosses.find((b) => b.family === 'black-mage')!.id;
const HARD_LUCID_WEEKLY = `${LUCID}:hard:weekly`;
const NORMAL_HILLA_DAILY = `${HILLA}:normal:daily`;
const HARD_BLACK_MAGE_MONTHLY = `${BLACK_MAGE}:hard:monthly`;

const baseMule: Mule = {
  id: 'cross-mode-mule',
  name: 'CrossModeMule',
  level: 250,
  muleClass: 'Hero',
  selectedBosses: [],
  active: true,
};

const emptyMetrics: RosterRowMetrics = {
  weeklyCount: 0,
  dailyCount: 0,
  monthlyCount: 0,
  postCapMeso: 0,
  displayedWeeklyMeso: { meso: 0, source: 'contributed', muted: true },
  sharePct: 0,
  droppedKeys: new Map(),
};

function topWeeklyKeys(n: number): { slateKey: string; value: number }[] {
  const all: { slateKey: string; value: number }[] = [];
  for (const boss of bosses) {
    const weeklies = boss.difficulty.filter((difficulty) => difficulty.cadence === 'weekly');
    if (weeklies.length === 0) continue;
    const top = weeklies.reduce((best, current) =>
      current.crystalValue.Heroic > best.crystalValue.Heroic ? current : best,
    );
    all.push({ slateKey: `${boss.id}:${top.tier}:weekly`, value: top.crystalValue.Heroic });
  }
  all.sort((a, b) => b.value - a.value);
  if (all.length < n) throw new Error(`Only found ${all.length} weekly keys`);
  return all.slice(0, n);
}

function makeMule(id: string, overrides: Partial<Mule> = {}): Mule {
  return {
    ...baseMule,
    id,
    name: id,
    selectedBosses: [],
    active: true,
    ...overrides,
  };
}

function metricsFor(mule: Mule, roster: Mule[] = [mule]): RosterRowMetrics {
  const worldIncome = WorldIncome.of(roster);
  return rosterRowMetrics(mule, worldIncome.perMule.get(mule.id), worldIncome.totalContributedMeso);
}

function cardIncomeValue(container: HTMLElement): HTMLElement {
  const valueSpan = container.querySelector('[data-card-income-value]') as HTMLElement | null;
  if (!valueSpan) throw new Error('card income value span not found');
  return valueSpan;
}

function rowIncomeValue(container: HTMLElement): HTMLElement {
  const valueSpan = container.querySelector('[data-row-income-value]') as HTMLElement | null;
  if (!valueSpan) throw new Error('row income value span not found');
  return valueSpan;
}

function renderCard(mule: Mule, metrics: RosterRowMetrics) {
  return render(
    <DndContext>
      <SortableContext items={[mule.id]} strategy={rectSortingStrategy}>
        <MuleCharacterCard
          mule={mule}
          onClick={() => {}}
          updateMule={() => {}}
          onDelete={() => {}}
          metrics={metrics}
        />
      </SortableContext>
    </DndContext>,
  );
}

function renderRow(mule: Mule, metrics: RosterRowMetrics) {
  return render(
    <DndContext>
      <SortableContext items={[mule.id]} strategy={verticalListSortingStrategy}>
        <MuleListRow mule={mule} metrics={metrics} onClick={() => {}} />
      </SortableContext>
    </DndContext>,
  );
}

function bothReadouts(mule: Mule, metrics: RosterRowMetrics) {
  const card = renderCard(mule, metrics);
  const cardValue = cardIncomeValue(card.container);
  const cardText = cardValue.textContent ?? '';
  const cardColor = cardValue.style.color;
  card.unmount();
  const row = renderRow(mule, metrics);
  const rowValue = rowIncomeValue(row.container);
  const rowText = rowValue.textContent ?? '';
  const rowColor = rowValue.style.color;
  row.unmount();
  return { cardText, rowText, cardColor, rowColor };
}

function bothColors(mule: Mule, metrics: RosterRowMetrics) {
  const { cardColor, rowColor } = bothReadouts(mule, metrics);
  return { cardColor, rowColor };
}

describe('Roster item — cross-mode income color invariant', () => {
  it('contributing mule (active + weekly boss) renders accent in both modes', () => {
    const mule: Mule = {
      ...baseMule,
      active: true,
      selectedBosses: [HARD_LUCID_WEEKLY],
      worldId: 'heroic-kronos',
    };
    const metrics: RosterRowMetrics = {
      ...emptyMetrics,
      weeklyCount: 1,
      postCapMeso: 504_000_000,
      displayedWeeklyMeso: { meso: 504_000_000, source: 'contributed', muted: false },
    };
    const { cardColor, rowColor } = bothColors(mule, metrics);
    expect(cardColor).toContain('accent');
    expect(rowColor).toContain('accent');
    expect(cardColor).toBe(rowColor);
  });

  it('inactive mule renders dim in both modes', () => {
    const mule: Mule = {
      ...baseMule,
      active: false,
      selectedBosses: [HARD_LUCID_WEEKLY],
      worldId: 'heroic-kronos',
    };
    const metrics: RosterRowMetrics = {
      ...emptyMetrics,
      weeklyCount: 1,
      postCapMeso: 0,
      displayedWeeklyMeso: { meso: 504_000_000, source: 'potential', muted: true },
    };
    const { cardColor, rowColor } = bothColors(mule, metrics);
    expect(cardColor).toContain('dim');
    expect(rowColor).toContain('dim');
    expect(cardColor).toBe(rowColor);
  });

  it('active monthly-only mule renders dim in both modes (regression-preventer)', () => {
    // Black Mage Hard is monthly cadence — earns 0 meso this week per
    // **Monthly Income Regression**. Pre-fix Card View painted accent because
    // its predicate was `selectedBosses.length > 0`; both modes now follow
    // the shared Displayed Weekly Meso muted flag.
    const mule: Mule = {
      ...baseMule,
      active: true,
      selectedBosses: [HARD_BLACK_MAGE_MONTHLY],
      worldId: 'heroic-kronos',
    };
    const metrics: RosterRowMetrics = {
      ...emptyMetrics,
      monthlyCount: 1,
    };
    const { cardColor, rowColor } = bothColors(mule, metrics);
    expect(cardColor).toContain('dim');
    expect(rowColor).toContain('dim');
    expect(cardColor).toBe(rowColor);
  });

  it('active zero-bosses mule renders dim in both modes', () => {
    const mule: Mule = {
      ...baseMule,
      active: true,
      selectedBosses: [],
      worldId: 'heroic-kronos',
    };
    const { cardColor, rowColor } = bothColors(mule, emptyMetrics);
    expect(cardColor).toContain('dim');
    expect(rowColor).toContain('dim');
    expect(cardColor).toBe(rowColor);
  });
});

describe('Roster item — cross-mode Displayed Weekly Meso invariant', () => {
  it('active partially dropped mule renders the same contributed value and accent color', () => {
    const top14 = topWeeklyKeys(14).map((key) => key.slateKey);
    const roster: Mule[] = [
      ...Array.from({ length: 12 }, (_, i) => makeMule(`m${i}`, { selectedBosses: top14 })),
      makeMule('m12', { selectedBosses: top14.slice(0, 10) }),
      makeMule('hilla', { selectedBosses: [NORMAL_HILLA_DAILY] }),
    ];
    const mule = roster[roster.length - 1];
    const metrics = metricsFor(mule, roster);
    const { cardText, rowText, cardColor, rowColor } = bothReadouts(mule, metrics);

    expect(cardText).toBe('8M');
    expect(rowText).toBe('8M');
    expect(cardColor).toContain('accent');
    expect(rowColor).toContain('accent');
    expect(cardColor).toBe(rowColor);
  });

  it('fully dropped active mule renders the same muted 0', () => {
    const top13 = topWeeklyKeys(13).map((key) => key.slateKey);
    const lowKey = topWeeklyKeys(14)[13].slateKey;
    const roster: Mule[] = [];
    for (let i = 0; i < 13; i++) roster.push(makeMule(`m${i}`, { selectedBosses: top13 }));
    roster.push(makeMule('m13', { selectedBosses: top13.slice(0, 11) }));
    roster.push(makeMule('fullyDropped', { selectedBosses: [lowKey] }));
    const mule = roster[roster.length - 1];
    const metrics = metricsFor(mule, roster);
    const { cardText, rowText, cardColor, rowColor } = bothReadouts(mule, metrics);

    expect(cardText).toBe('0');
    expect(rowText).toBe('0');
    expect(cardColor).toContain('dim');
    expect(rowColor).toContain('dim');
    expect(cardColor).toBe(rowColor);
  });

  it('inactive mule renders the same muted Potential Meso', () => {
    const mule: Mule = {
      ...baseMule,
      active: false,
      selectedBosses: [HARD_LUCID_WEEKLY],
      worldId: 'heroic-kronos',
    };
    const metrics = metricsFor(mule);
    const { cardText, rowText, cardColor, rowColor } = bothReadouts(mule, metrics);

    expect(cardText).toBe('504M');
    expect(rowText).toBe('504M');
    expect(cardColor).toContain('dim');
    expect(rowColor).toContain('dim');
    expect(cardColor).toBe(rowColor);
  });
});
