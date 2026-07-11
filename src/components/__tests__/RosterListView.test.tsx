import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '../../test/test-utils';
import {
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  MouseSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { WorldIncome } from '../../modules/worldIncome';
import { rosterRowMetrics, type RosterRowMetrics } from '../rosterRowMetrics';
import { RosterListView } from '../RosterListView';
import type { Mule } from '../../types';
import { bosses } from '../../data/bosses';

const LUCID = bosses.find((b) => b.family === 'lucid')!.id;
const WILL = bosses.find((b) => b.family === 'will')!.id;
const HARD_LUCID_WEEKLY = `${LUCID}:hard:weekly`;
const HARD_WILL_WEEKLY = `${WILL}:hard:weekly`;

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
    id,
    name: id.toUpperCase(),
    level: 200,
    muleClass: 'Hero',
    selectedBosses: [],
    active: true,
    ...overrides,
  };
}

function Harness({ initial }: { initial: Mule[] }) {
  const [order, setOrder] = useState(initial);
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 0 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = order.findIndex((m) => m.id === active.id);
      const newIndex = order.findIndex((m) => m.id === over.id);
      const next = [...order];
      const [moved] = next.splice(oldIndex, 1);
      next.splice(newIndex, 0, moved);
      setOrder(next);
    }
  }
  const worldIncome = WorldIncome.of(order);
  const metricsByMule = new Map<string, RosterRowMetrics>(
    order.map((m) => [
      m.id,
      rosterRowMetrics(m, worldIncome.perMule.get(m.id), worldIncome.totalContributedMeso),
    ]),
  );
  return (
    <div>
      <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
        <SortableContext items={order.map((m) => m.id)} strategy={verticalListSortingStrategy}>
          <RosterListView
            mules={order}
            metricsByMule={metricsByMule}
            onCardClick={vi.fn()}
            onToggleActive={vi.fn()}
            onSetMark={vi.fn()}
            bulkMode={false}
            toDelete={new Set()}
            onToggleSelect={vi.fn()}
          />
        </SortableContext>
      </DndContext>
      <output data-testid="order">{order.map((m) => m.id).join(',')}</output>
      <output data-testid="total-weekly-income">{worldIncome.totalContributedMeso}</output>
    </div>
  );
}

describe('RosterListView — drag reorder', () => {
  it('renders one row per mule under the SortableContext', () => {
    const mules = [makeMule('a'), makeMule('b'), makeMule('c')];
    render(<Harness initial={mules} />);
    expect(screen.getByTestId('order').textContent).toBe('a,b,c');
    expect(screen.getByTestId('mule-row-a')).toBeTruthy();
    expect(screen.getByTestId('mule-row-b')).toBeTruthy();
    expect(screen.getByTestId('mule-row-c')).toBeTruthy();
  });

  it('rows expose a [data-mule-row] hook (the sortable handle anchor)', () => {
    const mules = [makeMule('a'), makeMule('b')];
    const { container } = render(<Harness initial={mules} />);
    const rows = container.querySelectorAll('[data-mule-row]');
    expect(rows.length).toBe(2);
    // Order in the DOM matches the order array.
    expect(rows[0].getAttribute('data-mule-row')).toBe('a');
    expect(rows[1].getAttribute('data-mule-row')).toBe('b');
  });
});

describe('RosterListView — Displayed Weekly Meso', () => {
  it('renders Contributed Meso for an active mule under the World Cap Cut', () => {
    const mules = [
      makeMule('active', {
        active: true,
        selectedBosses: [HARD_LUCID_WEEKLY],
        worldId: 'heroic-kronos',
      }),
    ];
    render(<Harness initial={mules} />);
    const row = screen.getByTestId('mule-row-active');
    const income = row.querySelector('[data-row-income-value]') as HTMLElement;

    expect(income.textContent).toBe('504M');
    expect(income.style.color).toContain('accent');
  });

  it('renders a fully dropped active mule as muted 0 and keeps the dropped-boss info icon', () => {
    const top13 = topWeeklyKeys(13).map((key) => key.slateKey);
    const lowKey = topWeeklyKeys(14)[13].slateKey;
    const mules: Mule[] = [];
    for (let i = 0; i < 13; i++) mules.push(makeMule(`m${i}`, { selectedBosses: top13 }));
    mules.push(makeMule('m13', { selectedBosses: top13.slice(0, 11) }));
    mules.push(makeMule('fullyDropped', { selectedBosses: [lowKey] }));

    render(<Harness initial={mules} />);
    const row = screen.getByTestId('mule-row-fullyDropped');
    const income = row.querySelector('[data-row-income-value]') as HTMLElement;

    expect(income.textContent).toBe('0');
    expect(income.style.color).toContain('dim');
    expect(screen.getByRole('button', { name: /show bosses dropped to cap/i })).toBeTruthy();
  });

  it('renders muted Potential Meso for inactive selected bosses without adding share or total income', () => {
    const mules = [
      makeMule('inactive', {
        active: false,
        selectedBosses: [HARD_LUCID_WEEKLY],
        worldId: 'heroic-kronos',
      }),
    ];
    const { container } = render(<Harness initial={mules} />);
    const row = screen.getByTestId('mule-row-inactive');
    const income = row.querySelector('[data-row-income-value]') as HTMLElement;
    const share = row.querySelector('[data-row-share]') as HTMLElement;

    expect(income.textContent).toBe('504M');
    expect(income.style.color).toContain('dim');
    expect(share.textContent).toMatch(/0\.0%\s*SHARE/);
    expect(screen.getByTestId('total-weekly-income').textContent).toBe('0');
    expect(container.querySelectorAll('[data-mule-row]').length).toBe(1);
  });

  it('keeps share based on Contributed Meso instead of inactive Displayed Weekly Meso', () => {
    const mules = [
      makeMule('active', {
        selectedBosses: [HARD_LUCID_WEEKLY],
        worldId: 'heroic-kronos',
      }),
      makeMule('inactive', {
        active: false,
        selectedBosses: [HARD_WILL_WEEKLY],
        worldId: 'heroic-kronos',
      }),
    ];
    render(<Harness initial={mules} />);
    const activeShare = screen
      .getByTestId('mule-row-active')
      .querySelector('[data-row-share]') as HTMLElement;
    const inactiveRow = screen.getByTestId('mule-row-inactive');
    const inactiveIncome = inactiveRow.querySelector('[data-row-income-value]') as HTMLElement;
    const inactiveShare = inactiveRow.querySelector('[data-row-share]') as HTMLElement;

    expect(activeShare.textContent).toMatch(/100\.0%\s*SHARE/);
    expect(inactiveIncome.textContent).toBe('621.81M');
    expect(inactiveShare.textContent).toMatch(/0\.0%\s*SHARE/);
    expect(screen.getByTestId('total-weekly-income').textContent).toBe('504000000');
  });
});
