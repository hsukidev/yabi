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
import type { RosterRowMetrics } from '../rosterRowMetrics';

const LUCID = bosses.find((b) => b.family === 'lucid')!.id;
const BLACK_MAGE = bosses.find((b) => b.family === 'black-mage')!.id;
const HARD_LUCID_WEEKLY = `${LUCID}:hard:weekly`;
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
  sharePct: 0,
  droppedKeys: new Map(),
};

function cardIncomeColor(container: HTMLElement): string {
  // The card income row contains: INCOME label (direct span child) + a sibling
  // div whose only span is the value. Walk up from INCOME to the row, then
  // pick the span nested inside the wrapper div via `:scope > div > span`.
  const labels = Array.from(container.querySelectorAll('span'));
  const incomeLabel = labels.find((s) => s.textContent === 'INCOME');
  if (!incomeLabel) throw new Error('card INCOME label not found');
  const row = incomeLabel.parentElement!;
  const valueSpan = row.querySelector(':scope > div > span') as HTMLElement | null;
  if (!valueSpan) throw new Error('card income value span not found');
  return valueSpan.style.color;
}

function rowIncomeColor(container: HTMLElement): string {
  // The row income line is wrapped in MetricTooltip whose trigger carries
  // `aria-label="Potential meso ..."`; the value span is its child span.
  const trigger = container.querySelector('[aria-label^="Potential meso"]') as HTMLElement | null;
  if (!trigger) throw new Error('row Potential meso trigger not found');
  const valueSpan = trigger.querySelector('span') as HTMLElement | null;
  if (!valueSpan) throw new Error('row income value span not found');
  return valueSpan.style.color;
}

function renderCard(mule: Mule, metrics: RosterRowMetrics, postCapIncomeMeso: number) {
  return render(
    <DndContext>
      <SortableContext items={[mule.id]} strategy={rectSortingStrategy}>
        <MuleCharacterCard
          mule={mule}
          onClick={() => {}}
          onDelete={() => {}}
          metrics={{ weeklyCount: metrics.weeklyCount, dailyCount: metrics.dailyCount }}
          postCapIncomeMeso={postCapIncomeMeso}
        />
      </SortableContext>
    </DndContext>,
  );
}

function renderRow(mule: Mule, metrics: RosterRowMetrics, postCapIncomeMeso: number) {
  return render(
    <DndContext>
      <SortableContext items={[mule.id]} strategy={verticalListSortingStrategy}>
        <MuleListRow
          mule={mule}
          metrics={metrics}
          postCapIncomeMeso={postCapIncomeMeso}
          onClick={() => {}}
        />
      </SortableContext>
    </DndContext>,
  );
}

function bothColors(mule: Mule, metrics: RosterRowMetrics, postCapIncomeMeso: number) {
  const card = renderCard(mule, metrics, postCapIncomeMeso);
  const cardColor = cardIncomeColor(card.container);
  card.unmount();
  const row = renderRow(mule, metrics, postCapIncomeMeso);
  const rowColor = rowIncomeColor(row.container);
  row.unmount();
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
    };
    const { cardColor, rowColor } = bothColors(mule, metrics, 504_000_000);
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
    };
    const { cardColor, rowColor } = bothColors(mule, metrics, 0);
    expect(cardColor).toContain('dim');
    expect(rowColor).toContain('dim');
    expect(cardColor).toBe(rowColor);
  });

  it('active monthly-only mule renders dim in both modes (regression-preventer)', () => {
    // Black Mage Hard is monthly cadence — earns 0 meso this week per
    // **Monthly Income Regression**. Pre-fix Card View painted accent because
    // its predicate was `selectedBosses.length > 0`; List View correctly
    // dimmed it. The shared `isContributingMule` predicate fixes this.
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
    const { cardColor, rowColor } = bothColors(mule, metrics, 0);
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
    const { cardColor, rowColor } = bothColors(mule, emptyMetrics, 0);
    expect(cardColor).toContain('dim');
    expect(rowColor).toContain('dim');
    expect(cardColor).toBe(rowColor);
  });
});
