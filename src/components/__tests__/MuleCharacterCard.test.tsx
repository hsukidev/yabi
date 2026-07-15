import { useCallback, useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import {
  render,
  screen,
  fireEvent,
  waitFor,
  act,
  mockMatchMedia,
  restoreMatchMedia,
} from '../../test/test-utils';
import { DndContext } from '@dnd-kit/core';
import { SortableContext, rectSortingStrategy } from '@dnd-kit/sortable';
import { MuleCharacterCard } from '../MuleCharacterCard';
import type { Mule } from '../../types';
import { bosses } from '../../data/bosses';
import type { SlateKey } from '../../data/muleBossSlate';
import { WorldIncome } from '../../modules/worldIncome';
import { rosterRowMetrics, type RosterRowMetrics } from '../rosterRowMetrics';
import { currentDailyStamp, currentWeeklyStamp, currentBmStamp } from '../../utils/cycle';

const LUCID = bosses.find((b) => b.family === 'lucid')!.id;
const HILLA = bosses.find((b) => b.family === 'hilla')!.id;
const BLACK_MAGE = bosses.find((b) => b.family === 'black-mage')!.id;
const HARD_LUCID = `${LUCID}:hard:weekly`;
const NORMAL_HILLA = `${HILLA}:normal:daily`;
const HARD_BLACK_MAGE_MONTHLY = `${BLACK_MAGE}:hard:monthly`;

function topWeeklyKeys(n: number): { slateKey: SlateKey; value: number }[] {
  const all: { slateKey: SlateKey; value: number }[] = [];
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
    name: id,
    level: 200,
    muleClass: 'Hero',
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
  const value = container.querySelector('[data-card-income-value]') as HTMLElement | null;
  if (!value) throw new Error('card income value not found');
  return value;
}

const baseMule: Mule = {
  id: 'test-mule-1',
  name: 'TestMule',
  level: 200,
  muleClass: 'Hero',
  selectedBosses: [],
  active: true,
};

interface RenderCardOptions {
  bulkMode?: boolean;
  selected?: boolean;
  onToggleSelect?: (id: string) => void;
  updateMule?: (id: string, patch: Partial<Mule>) => void;
  onDelete?: (id: string) => void;
  droppedKeys?: ReadonlyMap<SlateKey, number>;
  density?: 'comfy' | 'compact';
  /**
   * Full per-mule roster metrics. Defaults to the same WorldIncome →
   * rosterRowMetrics path Dashboard uses.
   */
  metrics?: RosterRowMetrics;
}

function renderCard(overrides: Partial<Mule> = {}, options?: RenderCardOptions) {
  const onClick = vi.fn();
  const onToggleSelect = options?.onToggleSelect ?? vi.fn();
  const updateMule = options?.updateMule ?? vi.fn();
  const onDelete = options?.onDelete ?? vi.fn();
  const mule = { ...baseMule, ...overrides };
  localStorage.setItem('density', options?.density ?? 'comfy');
  const metrics = options?.metrics ?? metricsFor(mule);
  return {
    ...render(
      <DndContext>
        <SortableContext items={[mule.id]} strategy={rectSortingStrategy}>
          <MuleCharacterCard
            mule={mule}
            onClick={onClick}
            updateMule={updateMule}
            onDelete={onDelete}
            bulkMode={options?.bulkMode ?? false}
            selected={options?.selected ?? false}
            onToggleSelect={onToggleSelect}
            droppedKeys={options?.droppedKeys}
            metrics={metrics}
          />
        </SortableContext>
      </DndContext>,
    ),
    onClick,
    onToggleSelect,
    updateMule,
    onDelete,
  };
}

// A stateful card whose `updateMule` merges the patch back into the rendered
// mule — proves a kebab write reflects immediately in the card's own Lv-pill
// Completion Checks and dim overlay (not just that the writer was called).
function StatefulCard({ initial }: { initial: Mule }) {
  const [mule, setMule] = useState(initial);
  const updateMule = useCallback((id: string, patch: Partial<Mule>) => {
    setMule((prev) => (prev.id === id ? { ...prev, ...patch } : prev));
  }, []);
  const metrics = metricsFor(mule);
  return (
    <DndContext>
      <SortableContext items={[mule.id]} strategy={rectSortingStrategy}>
        <MuleCharacterCard
          mule={mule}
          onClick={vi.fn()}
          updateMule={updateMule}
          onDelete={vi.fn()}
          metrics={metrics}
        />
      </SortableContext>
    </DndContext>
  );
}

describe('MuleCharacterCard', () => {
  it('renders the mule name', () => {
    renderCard();
    expect(screen.getByText('TestMule')).toBeTruthy();
  });

  it('renders "Unnamed Mule" when name is empty', () => {
    renderCard({ name: '' });
    expect(screen.getByText('Unnamed')).toBeTruthy();
  });

  it('renders level badge when level > 0', () => {
    renderCard();
    expect(screen.getByText('Lv.200')).toBeTruthy();
  });

  it('hides level badge when level is 0', () => {
    renderCard({ level: 0 });
    expect(screen.queryByText(/Lv\./)).toBeNull();
  });

  it('renders class badge when muleClass is set', () => {
    renderCard({ muleClass: 'Hero' });
    expect(screen.getByText('Hero')).toBeTruthy();
  });

  it('hides class badge when muleClass is empty', () => {
    renderCard({ muleClass: '' });
    expect(screen.queryByText('Hero')).toBeNull();
  });

  it('renders mule.avatarUrl when present', () => {
    renderCard({ avatarUrl: 'https://msavatar1.nexon.net/Character/test.png' });
    const img = screen.getByTestId('card-avatar') as HTMLImageElement;
    expect(img.src).toBe('https://msavatar1.nexon.net/Character/test.png');
  });

  it('falls back to the blank PNG when avatarUrl is absent', () => {
    renderCard({ avatarUrl: undefined });
    const img = screen.getByTestId('card-avatar') as HTMLImageElement;
    expect(img.src).toMatch(/blank-character/);
  });

  it('calls onClick when card is clicked', () => {
    const { onClick } = renderCard();
    fireEvent.click(screen.getByText('TestMule'));
    expect(onClick).toHaveBeenCalled();
  });

  it('renders income and Black Mage income text in comfy density', () => {
    renderCard();
    expect(screen.getByText('INCOME')).toBeTruthy();
    expect(screen.getByText('BM INCOME')).toBeTruthy();
    expect(screen.getAllByText('0')).toHaveLength(2);
  });

  it('renders INCOME label and meso value inline on a single row', () => {
    renderCard();
    const labelEl = screen.getByText('INCOME');
    const row = labelEl.parentElement!;
    expect(row.className).toContain('flex-row');
    expect(row.className).not.toContain('flex-col');
  });

  it('renders abbreviated income by default', () => {
    renderCard({ selectedBosses: [HARD_LUCID] });
    expect(screen.getByText('504M')).toBeTruthy();
  });

  it('does not render the full meso value inline', () => {
    renderCard({ selectedBosses: [HARD_LUCID] });
    expect(screen.getByText('504M')).toBeTruthy();
    expect(screen.queryByText('504,000,000')).toBeNull();
  });

  // Regression: the card used to call useIncome without `worldId`, so
  // `Income.of` fell back to Heroic pricing for every mule — Interactive
  // mules on the roster displayed Heroic crystal values.
  it('prices INCOME against the mule’s World Group (Interactive)', () => {
    renderCard({ selectedBosses: [HARD_LUCID], worldId: 'interactive-scania' });
    expect(screen.getByText('100.8M')).toBeTruthy();
    expect(screen.queryByText('504M')).toBeNull();
  });

  it('prices INCOME against the mule’s World Group (Heroic)', () => {
    renderCard({ selectedBosses: [HARD_LUCID], worldId: 'heroic-kronos' });
    expect(screen.getByText('504M')).toBeTruthy();
    expect(screen.queryByText('100.8M')).toBeNull();
  });

  it('renders under-cap active weekly income at its full contribution', () => {
    renderCard({ selectedBosses: [HARD_LUCID] });
    expect(screen.getByText('504M')).toBeTruthy();
  });

  it('renders post-cap Contributed Meso for an active partially dropped mule', () => {
    const top14 = topWeeklyKeys(14).map((key) => key.slateKey);
    const roster: Mule[] = [
      ...Array.from({ length: 12 }, (_, i) => makeMule(`m${i}`, { selectedBosses: top14 })),
      makeMule('m12', { selectedBosses: top14.slice(0, 10) }),
      makeMule('hilla', { selectedBosses: [NORMAL_HILLA] }),
    ];
    const hilla = roster[roster.length - 1];

    renderCard(hilla, { metrics: metricsFor(hilla, roster) });

    expect(screen.getByText('8M')).toBeTruthy();
    expect(screen.queryByText('28M')).toBeNull();
  });

  it('renders a fully dropped active mule as muted 0 and keeps the cap-drop info icon', () => {
    const top13 = topWeeklyKeys(13).map((key) => key.slateKey);
    const lowKey = topWeeklyKeys(14)[13].slateKey;
    const roster: Mule[] = [];
    for (let i = 0; i < 13; i++) roster.push(makeMule(`m${i}`, { selectedBosses: top13 }));
    roster.push(makeMule('m13', { selectedBosses: top13.slice(0, 11) }));
    roster.push(makeMule('fullyDropped', { selectedBosses: [lowKey] }));
    const fullyDropped = roster[roster.length - 1];
    const metrics = metricsFor(fullyDropped, roster);

    const { container } = renderCard(fullyDropped, {
      metrics,
      droppedKeys: metrics.droppedKeys,
    });
    const income = cardIncomeValue(container);

    expect(income.textContent).toBe('0');
    expect(income.style.color).toContain('dim');
    expect(screen.getByRole('button', { name: /show bosses dropped to cap/i })).toBeTruthy();
  });

  it('renders BM Income from selected Black Mage monthly value', () => {
    renderCard({ selectedBosses: [HARD_BLACK_MAGE_MONTHLY] });
    expect(screen.getByText('BM INCOME')).toBeTruthy();
    expect(screen.getByText('4.5B')).toBeTruthy();
  });

  it('keeps BM Income separate from Displayed Weekly Meso', () => {
    const { container } = renderCard({ selectedBosses: [HARD_BLACK_MAGE_MONTHLY] });
    const income = cardIncomeValue(container);

    expect(income.textContent).toBe('0');
    expect(income.style.color).toContain('dim');
    expect(screen.getByText('4.5B')).toBeTruthy();
  });

  it('hides BM Income in compact density', () => {
    renderCard({ selectedBosses: [HARD_BLACK_MAGE_MONTHLY] }, { density: 'compact' });
    expect(screen.getByText('INCOME')).toBeTruthy();
    expect(screen.queryByText('BM INCOME')).toBeNull();
    expect(screen.queryByText('4.5B')).toBeNull();
  });

  it('divides BM Income by the mule’s Black Mage Party Size', () => {
    renderCard({ selectedBosses: [HARD_BLACK_MAGE_MONTHLY], partySizes: { 'black-mage': 6 } });
    expect(screen.getByText('750M')).toBeTruthy();
    expect(screen.queryByText('4.5B')).toBeNull();
  });

  it('prices BM Income against the mule’s World Group', () => {
    renderCard({ selectedBosses: [HARD_BLACK_MAGE_MONTHLY], worldId: 'interactive-scania' });
    expect(screen.getByText('900M')).toBeTruthy();
    expect(screen.queryByText('4.5B')).toBeNull();
  });

  it('renders an active mule card without the inactive dim overlay', () => {
    const { container } = renderCard({ active: true });
    const cardWrapper = container.querySelector('[data-mule-card]') as HTMLElement;
    expect(cardWrapper.querySelector('[data-inactive-dim]')).toBeNull();
    fireEvent.mouseEnter(cardWrapper);
    expect(cardWrapper.querySelector('[data-inactive-dim]')).toBeNull();
  });

  it('dims an inactive mule card with the inactive dim overlay', () => {
    const { container } = renderCard({ active: false });
    const cardWrapper = container.querySelector('[data-mule-card]') as HTMLElement;
    expect(cardWrapper.querySelector('[data-inactive-dim]')).toBeTruthy();
  });

  it('keeps an inactive mule card dimmed on hover', () => {
    const { container } = renderCard({ active: false });
    const cardWrapper = container.querySelector('[data-mule-card]') as HTMLElement;
    const panel = cardWrapper.querySelector('.panel') as HTMLElement;
    expect(cardWrapper.querySelector('[data-inactive-dim]')).toBeTruthy();
    fireEvent.mouseEnter(panel);
    expect(cardWrapper.querySelector('[data-inactive-dim]')).toBeTruthy();
    fireEvent.mouseLeave(panel);
    expect(cardWrapper.querySelector('[data-inactive-dim]')).toBeTruthy();
  });

  it('renders inactive selected bosses as muted Potential Meso', () => {
    const { container } = renderCard({ active: false, selectedBosses: [HARD_LUCID] });
    const income = cardIncomeValue(container);

    expect(income.textContent).toBe('504M');
    expect(income.style.color).not.toContain('accent');
    expect(income.style.color).toContain('dim');
  });

  it('renders active mule income line in the accent color when bosses are selected', () => {
    renderCard({ active: true, selectedBosses: [HARD_LUCID] });
    const incomeSpans = screen.getAllByText('504M');
    for (const span of incomeSpans) {
      expect(span.style.color).toContain('accent');
    }
  });

  it('renders active monthly-only mule income line in dim (Card View bug fix — issue #265)', () => {
    // Black Mage Hard is monthly cadence and earns 0 meso this week per
    // **Monthly Income Regression**. Pre-fix Card painted accent because
    // its predicate was `selectedBosses.length > 0`; now it follows the
    // shared Displayed Weekly Meso muted flag.
    const HARD_BLACK_MAGE_MONTHLY = `${bosses.find((b) => b.family === 'black-mage')!.id}:hard:monthly`;
    renderCard({ active: true, selectedBosses: [HARD_BLACK_MAGE_MONTHLY] });
    const incomeSpans = screen.getAllByText('0');
    const colored = incomeSpans.find((s) => s.style.color.includes('dim'));
    expect(colored).toBeTruthy();
    // And no accent tint on any '0' candidate.
    for (const s of incomeSpans) {
      expect(s.style.color).not.toContain('accent');
    }
  });

  it('does not render Weekly, Daily, or Monthly crystal tallies in Card View', () => {
    const { container } = renderCard({
      selectedBosses: [HARD_LUCID, NORMAL_HILLA, HARD_BLACK_MAGE_MONTHLY],
    });
    expect(screen.queryByLabelText(/weekly count/i)).toBeNull();
    expect(screen.queryByLabelText(/daily count/i)).toBeNull();
    expect(screen.queryByLabelText(/monthly count/i)).toBeNull();
    expect(container.querySelector('img[src$="weekly-crystal.png"]')).toBeNull();
    expect(container.querySelector('img[src$="daily-crystal.png"]')).toBeNull();
    expect(container.querySelector('img[src$="monthly-crystal.png"]')).toBeNull();
  });

  describe('Mule Actions Menu (kebab)', () => {
    const getKebab = () => screen.getByRole('button', { name: /mule actions/i });
    const openMenu = async () => {
      fireEvent.click(getKebab());
      await waitFor(() => expect(screen.getByRole('menu')).toBeTruthy());
    };
    // Daily + weekly + monthly cadences present so every cadence row is eligible.
    const FULL_SLATE = [HARD_LUCID, NORMAL_HILLA, HARD_BLACK_MAGE_MONTHLY];

    it('renders an always-visible kebab with an accessible label, not a switch', () => {
      renderCard();
      expect(getKebab()).toBeTruthy();
      expect(getKebab().tagName).toBe('BUTTON');
      expect(screen.queryByRole('switch')).toBeNull();
    });

    it('renders the kebab at full opacity at rest (no hover reveal)', () => {
      renderCard();
      // The retired kebab faded in on hover; this one is unconditionally shown.
      expect(getKebab().style.opacity === '' || getKebab().style.opacity === '1').toBe(true);
    });

    it('renders the kebab on touch devices (no pointer gate)', () => {
      mockMatchMedia((q) => q.includes('pointer: coarse'));
      try {
        renderCard();
        expect(getKebab()).toBeTruthy();
      } finally {
        restoreMatchMedia();
      }
    });

    it('leads each active/cadence row with a color-key dot', async () => {
      renderCard({ selectedBosses: FULL_SLATE });
      await openMenu();
      // Set Active/Inactive + Daily + Weekly + BM + Delete = 5 items; the four
      // non-delete rows each carry an aria-hidden color-key dot.
      const items = screen.getAllByRole('menuitem');
      expect(items).toHaveLength(5);
      const withDot = items.filter((item) => item.querySelector('span[aria-hidden]'));
      expect(withDot).toHaveLength(4);
    });

    describe('row wording (action, inverse of current state)', () => {
      it('reads "Set Inactive" for an active mule and flips it inactive', async () => {
        const { updateMule } = renderCard({ active: true });
        await openMenu();
        expect(screen.queryByText('Set Active')).toBeNull();
        fireEvent.click(screen.getByText('Set Inactive'));
        expect(updateMule).toHaveBeenCalledTimes(1);
        expect(updateMule).toHaveBeenCalledWith('test-mule-1', { active: false });
      });

      it('reads "Set Active" for an inactive mule and flips it active', async () => {
        const { updateMule } = renderCard({ active: false });
        await openMenu();
        expect(screen.queryByText('Set Inactive')).toBeNull();
        fireEvent.click(screen.getByText('Set Active'));
        expect(updateMule).toHaveBeenCalledWith('test-mule-1', { active: true });
      });

      it('reads "Weekly Complete" when unmarked and sets the weekly mark', async () => {
        const { updateMule } = renderCard({ selectedBosses: [HARD_LUCID] });
        await openMenu();
        fireEvent.click(screen.getByText('Weekly Complete'));
        expect(updateMule).toHaveBeenCalledWith(
          'test-mule-1',
          expect.objectContaining({ weeklyClearMark: expect.any(Number) }),
        );
      });

      it('reads "Weekly Incomplete" when marked and clears the weekly mark', async () => {
        const { updateMule } = renderCard({
          selectedBosses: [HARD_LUCID],
          weeklyClearMark: currentWeeklyStamp(Date.now()),
        });
        await openMenu();
        fireEvent.click(screen.getByText('Weekly Incomplete'));
        expect(updateMule).toHaveBeenCalledWith('test-mule-1', { weeklyClearMark: undefined });
      });

      it('reads "Daily Complete" / sets the daily mark when a daily key exists', async () => {
        const { updateMule } = renderCard({ selectedBosses: [NORMAL_HILLA] });
        await openMenu();
        fireEvent.click(screen.getByText('Daily Complete'));
        expect(updateMule).toHaveBeenCalledWith(
          'test-mule-1',
          expect.objectContaining({ dailyClearMark: expect.any(String) }),
        );
      });

      it('reads "BM Complete" / sets the BM mark when a monthly key exists', async () => {
        const { updateMule } = renderCard({ selectedBosses: [HARD_BLACK_MAGE_MONTHLY] });
        await openMenu();
        fireEvent.click(screen.getByText('BM Complete'));
        expect(updateMule).toHaveBeenCalledWith(
          'test-mule-1',
          expect.objectContaining({ bmClearMark: expect.any(String) }),
        );
      });
    });

    describe('cadence-based row hiding (canonical Mark-eligibility)', () => {
      it('hides the Daily row when the slate has zero daily keys', async () => {
        renderCard({ selectedBosses: [HARD_LUCID] });
        await openMenu();
        expect(screen.queryByText('Daily Complete')).toBeNull();
        expect(screen.queryByText('Daily Incomplete')).toBeNull();
        // A weekly key makes the mule weekly-eligible.
        expect(screen.getByText('Weekly Complete')).toBeTruthy();
      });

      it('shows the Daily row when the slate has a daily key', async () => {
        renderCard({ selectedBosses: [NORMAL_HILLA] });
        await openMenu();
        expect(screen.getByText('Daily Complete')).toBeTruthy();
      });

      it('hides the BM row when the slate has zero monthly keys', async () => {
        renderCard({ selectedBosses: [HARD_LUCID] });
        await openMenu();
        expect(screen.queryByText('BM Complete')).toBeNull();
        expect(screen.queryByText('BM Incomplete')).toBeNull();
      });

      it('shows the BM row when the slate has a monthly key', async () => {
        renderCard({ selectedBosses: [HARD_BLACK_MAGE_MONTHLY] });
        await openMenu();
        expect(screen.getByText('BM Complete')).toBeTruthy();
      });

      it('shows the Weekly row when a daily key makes the mule weekly-eligible', async () => {
        // Weekly eligibility is ≥1 weekly-or-daily key — a daily-only slate
        // still qualifies.
        renderCard({ selectedBosses: [NORMAL_HILLA] });
        await openMenu();
        expect(screen.getByText('Weekly Complete')).toBeTruthy();
      });

      it('hides every cadence row on a boss-less mule (only Set Active/Inactive + Delete)', async () => {
        renderCard({ selectedBosses: [] });
        await openMenu();
        // Canonical change vs the retired menu, which showed Weekly
        // unconditionally: with no keys, the mule is eligible for nothing.
        expect(screen.queryByText('Weekly Complete')).toBeNull();
        expect(screen.queryByText('Daily Complete')).toBeNull();
        expect(screen.queryByText('BM Complete')).toBeNull();
        const items = screen.getAllByRole('menuitem');
        expect(items).toHaveLength(2); // Set Inactive + Delete
        expect(screen.getByText('Set Inactive')).toBeTruthy();
        expect(screen.getByText('Delete')).toBeTruthy();
      });
    });

    describe('Delete (instant, no confirmation)', () => {
      it('offers an unconditional Delete row that fires onDelete immediately', async () => {
        const { onDelete, onClick } = renderCard();
        await openMenu();
        expect(screen.queryByText('Delete?')).toBeNull();
        fireEvent.click(screen.getByText('Delete'));
        expect(onDelete).toHaveBeenCalledTimes(1);
        expect(onDelete).toHaveBeenCalledWith('test-mule-1');
        // Instant: no confirmation prompt ever rendered.
        expect(screen.queryByText('Delete?')).toBeNull();
        expect(onClick).not.toHaveBeenCalled();
      });
    });

    describe('activation swallowing (drawer / drag)', () => {
      // Render the card inside an ancestor carrying React (synthetic) handlers
      // — the same layer the card's own click-to-open and dnd-kit drag
      // listeners live on. React `stopPropagation` stops the synthetic bubble,
      // so a guarded event reaches neither the card body nor these spies.
      function renderGuarded(overrides: Partial<Mule> = {}) {
        const onAncestorPointerDown = vi.fn();
        const onAncestorClick = vi.fn();
        const onClick = vi.fn();
        const mule = { ...baseMule, ...overrides };
        render(
          <div onPointerDown={onAncestorPointerDown} onClick={onAncestorClick}>
            <DndContext>
              <SortableContext items={[mule.id]} strategy={rectSortingStrategy}>
                <MuleCharacterCard
                  mule={mule}
                  onClick={onClick}
                  updateMule={vi.fn()}
                  onDelete={vi.fn()}
                  onToggleSelect={vi.fn()}
                  metrics={metricsFor(mule)}
                />
              </SortableContext>
            </DndContext>
          </div>,
        );
        return { onAncestorPointerDown, onAncestorClick, onClick };
      }

      it('opening the kebab never opens the drawer', async () => {
        const { onClick } = renderCard();
        await openMenu();
        expect(onClick).not.toHaveBeenCalled();
      });

      it('selecting a menu item never opens the drawer', async () => {
        const { onClick } = renderCard({ selectedBosses: [HARD_LUCID] });
        await openMenu();
        fireEvent.click(screen.getByText('Weekly Complete'));
        expect(onClick).not.toHaveBeenCalled();
      });

      it('swallows pointerdown so a dnd-kit drag never starts from the kebab', () => {
        // dnd-kit's MouseSensor engages on a pointerdown reaching the card
        // wrapper's (synthetic) listeners; the guard must stop it first.
        const { onAncestorPointerDown, onClick } = renderGuarded();
        fireEvent.pointerDown(getKebab());
        expect(onAncestorPointerDown).not.toHaveBeenCalled();
        expect(onClick).not.toHaveBeenCalled();
      });

      it('swallows a click on the kebab so it never reaches the card body', () => {
        const { onAncestorClick, onClick } = renderGuarded();
        fireEvent.click(getKebab());
        expect(onAncestorClick).not.toHaveBeenCalled();
        expect(onClick).not.toHaveBeenCalled();
      });
    });

    it('is not rendered in bulk mode', () => {
      renderCard({}, { bulkMode: true });
      expect(screen.queryByRole('button', { name: /mule actions/i })).toBeNull();
    });

    it('stays operable on an inactive (dimmed) mule', async () => {
      renderCard({ active: false });
      await openMenu();
      expect(screen.getByText('Set Active')).toBeTruthy();
    });

    describe('stay-open on selection (closes only on dismiss / Delete)', () => {
      it('keeps the menu open and flips wording in place after a mark row selection', async () => {
        render(<StatefulCard initial={{ ...baseMule, selectedBosses: [HARD_LUCID] }} />);
        await openMenu();
        fireEvent.click(screen.getByText('Weekly Complete'));
        await waitFor(() => expect(screen.getByText('Weekly Incomplete')).toBeTruthy());
        expect(screen.getByRole('menu')).toBeTruthy();
      });

      it('keeps the menu open and flips wording in place after Set Inactive', async () => {
        render(<StatefulCard initial={{ ...baseMule, active: true }} />);
        await openMenu();
        fireEvent.click(screen.getByText('Set Inactive'));
        await waitFor(() => expect(screen.getByText('Set Active')).toBeTruthy());
        expect(screen.getByRole('menu')).toBeTruthy();
      });

      it('closes the menu on Delete (its anchor unmounts)', async () => {
        renderCard();
        await openMenu();
        fireEvent.click(screen.getByText('Delete'));
        await waitFor(() => expect(screen.queryByRole('menu')).toBeNull());
      });

      it('closes on Escape', async () => {
        renderCard();
        await openMenu();
        fireEvent.keyDown(screen.getByRole('menu'), { key: 'Escape' });
        await waitFor(() => expect(screen.queryByRole('menu')).toBeNull());
      });

      it('closes on outside press', async () => {
        renderCard();
        await openMenu();
        fireEvent.pointerDown(document.body);
        fireEvent.mouseDown(document.body);
        await waitFor(() => expect(screen.queryByRole('menu')).toBeNull());
      });

      it('closes on trigger re-click', async () => {
        renderCard();
        await openMenu();
        fireEvent.click(getKebab());
        await waitFor(() => expect(screen.queryByRole('menu')).toBeNull());
      });
    });

    describe('live reflection on the card (write-through updateMule)', () => {
      it('setting the weekly mark lights the Lv-pill Completion Check immediately', async () => {
        render(<StatefulCard initial={{ ...baseMule, selectedBosses: [HARD_LUCID] }} />);
        expect(screen.queryByRole('img', { name: 'Weekly complete' })).toBeNull();

        await openMenu();
        fireEvent.click(screen.getByText('Weekly Complete'));

        await waitFor(() =>
          expect(screen.getByRole('img', { name: 'Weekly complete' })).toBeTruthy(),
        );
      });

      it('flipping to inactive shows the dim overlay immediately', async () => {
        const { container } = render(<StatefulCard initial={{ ...baseMule, active: true }} />);
        const cardWrapper = container.querySelector('[data-mule-card]') as HTMLElement;
        expect(cardWrapper.querySelector('[data-inactive-dim]')).toBeNull();

        await openMenu();
        fireEvent.click(screen.getByText('Set Inactive'));

        await waitFor(() => expect(cardWrapper.querySelector('[data-inactive-dim]')).toBeTruthy());
      });
    });
  });

  describe('Completion Checks (Lv pill)', () => {
    const NOW = Date.UTC(2026, 6, 11, 12, 0, 0); // 2026-07-11 12:00 UTC

    it('renders no checks when the mule has no valid marks', () => {
      renderCard();
      expect(screen.queryByRole('img', { name: /complete/i })).toBeNull();
    });

    it('renders the Daily check when the daily mark is valid', () => {
      vi.useFakeTimers();
      vi.setSystemTime(NOW);
      try {
        renderCard({ selectedBosses: [NORMAL_HILLA], dailyClearMark: currentDailyStamp(NOW) });
        expect(screen.getByRole('img', { name: 'Daily complete' })).toBeTruthy();
      } finally {
        vi.useRealTimers();
      }
    });

    it('renders all three checks in daily → weekly → BM order when all marks are valid', () => {
      vi.useFakeTimers();
      vi.setSystemTime(NOW);
      try {
        renderCard({
          selectedBosses: [HARD_LUCID, NORMAL_HILLA, HARD_BLACK_MAGE_MONTHLY],
          dailyClearMark: currentDailyStamp(NOW),
          weeklyClearMark: currentWeeklyStamp(NOW),
          bmClearMark: currentBmStamp(NOW),
        });
        const checks = screen.getAllByRole('img', { name: /complete/i });
        expect(checks.map((c) => c.getAttribute('aria-label'))).toEqual([
          'Daily complete',
          'Weekly complete',
          'BM complete',
        ]);
      } finally {
        vi.useRealTimers();
      }
    });

    it('does not render a check for a stale (past-cycle) mark', () => {
      vi.useFakeTimers();
      vi.setSystemTime(NOW);
      try {
        // A daily stamp from yesterday is inert.
        renderCard({ dailyClearMark: '2026-07-10' });
        expect(screen.queryByRole('img', { name: 'Daily complete' })).toBeNull();
      } finally {
        vi.useRealTimers();
      }
    });

    it('expires a check live at the cycle boundary with no reload', () => {
      vi.useFakeTimers();
      vi.setSystemTime(NOW);
      try {
        renderCard({ selectedBosses: [NORMAL_HILLA], dailyClearMark: currentDailyStamp(NOW) });
        expect(screen.getByRole('img', { name: 'Daily complete' })).toBeTruthy();

        // Cross the next UTC midnight — the daily cycle boundary. The Cycle
        // Clock's timeout fires and re-derives validity without a remount.
        act(() => {
          vi.advanceTimersByTime(12 * 60 * 60 * 1000 + 1000);
        });

        expect(screen.queryByRole('img', { name: 'Daily complete' })).toBeNull();
      } finally {
        vi.useRealTimers();
      }
    });

    it('hides checks in bulk mode (no Lv pill)', () => {
      vi.useFakeTimers();
      vi.setSystemTime(NOW);
      try {
        renderCard(
          { selectedBosses: [NORMAL_HILLA], dailyClearMark: currentDailyStamp(NOW) },
          { bulkMode: true },
        );
        expect(screen.queryByRole('img', { name: 'Daily complete' })).toBeNull();
      } finally {
        vi.useRealTimers();
      }
    });
  });

  describe('Compact density: checks-only Lv pill', () => {
    const NOW = Date.UTC(2026, 6, 11, 12, 0, 0); // 2026-07-11 12:00 UTC

    it('hides the Lv.X text but keeps valid Completion Checks in compact', () => {
      vi.useFakeTimers();
      vi.setSystemTime(NOW);
      try {
        renderCard(
          { selectedBosses: [NORMAL_HILLA], dailyClearMark: currentDailyStamp(NOW) },
          { density: 'compact' },
        );
        expect(screen.queryByText(/Lv\./)).toBeNull();
        expect(screen.getByRole('img', { name: 'Daily complete' })).toBeTruthy();
      } finally {
        vi.useRealTimers();
      }
    });

    it('unmounts the pill entirely in compact when no mark is valid', () => {
      const { container } = renderCard({}, { density: 'compact' });
      expect(screen.queryByText(/Lv\./)).toBeNull();
      expect(container.querySelector('[data-card-level]')).toBeNull();
    });

    it('keeps the full Lv.X pill in comfy density', () => {
      const { container } = renderCard({}, { density: 'comfy' });
      expect(screen.getByText('Lv.200')).toBeTruthy();
      expect(container.querySelector('[data-card-level]')).toBeTruthy();
    });

    it('shows the checks-only pill in compact even when level is 0', () => {
      vi.useFakeTimers();
      vi.setSystemTime(NOW);
      try {
        const { container } = renderCard(
          { level: 0, selectedBosses: [NORMAL_HILLA], dailyClearMark: currentDailyStamp(NOW) },
          { density: 'compact' },
        );
        expect(screen.getByRole('img', { name: 'Daily complete' })).toBeTruthy();
        expect(container.querySelector('[data-card-level]')).toBeTruthy();
      } finally {
        vi.useRealTimers();
      }
    });
  });

  describe('press-and-hold affordance (touch)', () => {
    it('scales the panel to 1.04 on touchstart and reverts on touchend', () => {
      const { container } = renderCard();
      const panel = container.querySelector('[data-mule-card] .panel') as HTMLElement;
      expect(panel.style.transform || '').not.toMatch(/scale\(/);

      fireEvent.touchStart(panel);
      expect(panel.style.transform).toMatch(/scale\(1\.04\)/);

      fireEvent.touchEnd(panel);
      expect(panel.style.transform || '').not.toMatch(/scale\(/);
    });

    it('reverts scale on touchcancel', () => {
      const { container } = renderCard();
      const panel = container.querySelector('[data-mule-card] .panel') as HTMLElement;

      fireEvent.touchStart(panel);
      expect(panel.style.transform).toMatch(/scale\(1\.04\)/);

      fireEvent.touchCancel(panel);
      expect(panel.style.transform || '').not.toMatch(/scale\(/);
    });

    it('suppresses text selection on the panel during press-and-hold', () => {
      // jsdom silently drops -webkit-touch-callout (vendor-unknown to its
      // CSSStyleDeclaration); userSelect is enough to confirm the intent
      // that press gestures do not begin a text selection. The vendor
      // callout suppression is covered by the touch e2e suite.
      const { container } = renderCard();
      const panel = container.querySelector('[data-mule-card] .panel') as HTMLElement;
      expect(panel.style.userSelect).toBe('none');
    });

    it('includes transform in the 200ms ease-out transition so the scale-up animates', () => {
      const { container } = renderCard();
      const panel = container.querySelector('[data-mule-card] .panel') as HTMLElement;
      expect(panel.style.transition).toMatch(/transform\s+200ms\s+ease-out/);
    });
  });

  describe('bulk mode', () => {
    it('click toggles selection via onToggleSelect and does NOT call onClick (drawer)', () => {
      const { container, onClick, onToggleSelect } = renderCard({}, { bulkMode: true });
      const panel = container.querySelector('[data-mule-card] .panel') as HTMLElement;
      fireEvent.click(panel);
      expect(onToggleSelect).toHaveBeenCalledWith('test-mule-1');
      expect(onClick).not.toHaveBeenCalled();
    });

    it('Enter key toggles selection via onToggleSelect (not onClick)', () => {
      const { container, onClick, onToggleSelect } = renderCard({}, { bulkMode: true });
      const panel = container.querySelector('[data-mule-card] .panel') as HTMLElement;
      fireEvent.keyDown(panel, { key: 'Enter' });
      expect(onToggleSelect).toHaveBeenCalledWith('test-mule-1');
      expect(onClick).not.toHaveBeenCalled();
    });

    it('Space key toggles selection via onToggleSelect (not onClick)', () => {
      const { container, onClick, onToggleSelect } = renderCard({}, { bulkMode: true });
      const panel = container.querySelector('[data-mule-card] .panel') as HTMLElement;
      fireEvent.keyDown(panel, { key: ' ' });
      expect(onToggleSelect).toHaveBeenCalledWith('test-mule-1');
      expect(onClick).not.toHaveBeenCalled();
    });

    it('hides the level badge in bulk mode', () => {
      renderCard({ level: 200 }, { bulkMode: true });
      expect(screen.queryByText(/Lv\./)).toBeNull();
    });

    it('does not render the Roster Active Switch in bulk mode', () => {
      renderCard({}, { bulkMode: true });
      expect(screen.queryByRole('switch')).toBeNull();
    });

    it('sets aria-pressed=false on an unselected card in bulk mode', () => {
      const { container } = renderCard({}, { bulkMode: true, selected: false });
      const panel = container.querySelector('[data-mule-card] .panel') as HTMLElement;
      expect(panel.getAttribute('aria-pressed')).toBe('false');
    });

    it('sets aria-pressed=true on a selected card in bulk mode', () => {
      const { container } = renderCard({}, { bulkMode: true, selected: true });
      const panel = container.querySelector('[data-mule-card] .panel') as HTMLElement;
      expect(panel.getAttribute('aria-pressed')).toBe('true');
    });

    it('does not set aria-pressed when bulkMode is false', () => {
      const { container } = renderCard({}, { bulkMode: false });
      const panel = container.querySelector('[data-mule-card] .panel') as HTMLElement;
      expect(panel.getAttribute('aria-pressed')).toBeNull();
    });

    it('renders the Selection Indicator (with aria-hidden) only in bulk mode', () => {
      const { container, rerender } = renderCard({}, { bulkMode: true });
      const indicator = container.querySelector('[data-selection-indicator]') as HTMLElement;
      expect(indicator).toBeTruthy();
      expect(indicator.getAttribute('aria-hidden')).not.toBeNull();

      // Re-render without bulk mode — the indicator disappears
      rerender(
        <DndContext>
          <SortableContext items={[baseMule.id]} strategy={rectSortingStrategy}>
            <MuleCharacterCard
              mule={baseMule}
              onClick={vi.fn()}
              updateMule={vi.fn()}
              onDelete={vi.fn()}
              bulkMode={false}
              selected={false}
              onToggleSelect={vi.fn()}
              metrics={metricsFor(baseMule)}
            />
          </SortableContext>
        </DndContext>,
      );
      expect(container.querySelector('[data-selection-indicator]')).toBeNull();
    });

    it('renders a filled check icon inside the Selection Indicator when selected', () => {
      const { container } = renderCard({}, { bulkMode: true, selected: true });
      const indicator = container.querySelector('[data-selection-indicator]') as HTMLElement;
      expect(indicator.querySelector('svg')).toBeTruthy();
    });

    it('applies selected styling (destructive border) to the card panel when selected', () => {
      const { container } = renderCard({}, { bulkMode: true, selected: true });
      const panel = container.querySelector('[data-mule-card] .panel') as HTMLElement;
      const borderColor = panel.style.borderColor + panel.style.boxShadow;
      expect(borderColor.toLowerCase()).not.toContain('#e05040');
      expect(borderColor).toMatch(/destructive/);
    });
  });

  describe('Cap Drop Info Icon', () => {
    const ICON_NAME = /show bosses dropped to cap/i;

    it('does not render the icon when droppedKeys is undefined', () => {
      renderCard();
      expect(screen.queryByRole('button', { name: ICON_NAME })).toBeNull();
    });

    it('does not render the icon when droppedKeys is an empty map', () => {
      renderCard({}, { droppedKeys: new Map() });
      expect(screen.queryByRole('button', { name: ICON_NAME })).toBeNull();
    });

    it('renders the icon with the expected aria-label when droppedKeys has entries', () => {
      renderCard({}, { droppedKeys: new Map([[HARD_LUCID, 1]]) });
      const icon = screen.getByRole('button', { name: ICON_NAME });
      expect(icon).toBeTruthy();
      expect(icon.tagName).toBe('BUTTON');
    });

    it('the icon does not invoke the card onClick when clicked', () => {
      const { onClick } = renderCard({}, { droppedKeys: new Map([[HARD_LUCID, 1]]) });
      const icon = screen.getByRole('button', { name: ICON_NAME });
      fireEvent.click(icon);
      expect(onClick).not.toHaveBeenCalled();
    });

    it('shows weekly-line content in the tooltip when the icon is focused', async () => {
      renderCard({}, { droppedKeys: new Map([[HARD_LUCID, 1]]) });
      const icon = screen.getByRole('button', { name: ICON_NAME });
      fireEvent.focus(icon);
      expect(await screen.findByText('Hard Lucid dropped')).toBeTruthy();
    });

    it('shows daily-line content with count + "daily" suffix in the tooltip', async () => {
      renderCard({}, { droppedKeys: new Map([[NORMAL_HILLA, 3]]) });
      const icon = screen.getByRole('button', { name: ICON_NAME });
      fireEvent.focus(icon);
      expect(await screen.findByText('3× daily Normal Hilla dropped')).toBeTruthy();
    });

    it('stacks tooltip lines vertically in Boss Matrix display order', async () => {
      // Insert HILLA (display index 25) before LUCID (display index 12) — the
      // helper must re-order so Lucid renders first.
      const droppedKeys = new Map<SlateKey, number>([
        [NORMAL_HILLA, 2],
        [HARD_LUCID, 1],
      ]);
      renderCard({}, { droppedKeys });
      const icon = screen.getByRole('button', { name: ICON_NAME });
      fireEvent.focus(icon);
      const lucid = await screen.findByText('Hard Lucid dropped');
      const hilla = await screen.findByText('2× daily Normal Hilla dropped');
      // Both lines live in the same tooltip popup; their DOM order matches
      // the rendered visual order.
      const tooltipBody = lucid.parentElement!;
      expect(tooltipBody).toBe(hilla.parentElement);
      const order = Array.from(tooltipBody.children);
      expect(order.indexOf(lucid)).toBeLessThan(order.indexOf(hilla));
    });

    it('does not render the icon in bulk mode regardless of droppedKeys', () => {
      renderCard({}, { droppedKeys: new Map([[HARD_LUCID, 1]]), bulkMode: true });
      expect(screen.queryByRole('button', { name: ICON_NAME })).toBeNull();
    });

    it('does not render the legacy "−$X to cap" badge text', () => {
      renderCard({}, { droppedKeys: new Map([[HARD_LUCID, 1]]) });
      expect(screen.queryByText(/to cap/i)).toBeNull();
    });
  });

  describe('Notes Indicator', () => {
    const ICON_NAME = /show character notes/i;

    it('does not render the indicator when mule.notes is undefined', () => {
      renderCard({ notes: undefined });
      expect(screen.queryByRole('button', { name: ICON_NAME })).toBeNull();
    });

    it('does not render the indicator when mule.notes is whitespace-only', () => {
      renderCard({ notes: '   \n\t ' });
      expect(screen.queryByRole('button', { name: ICON_NAME })).toBeNull();
    });

    it('renders the indicator when mule.notes is non-empty after trim', () => {
      renderCard({ notes: 'main mule, owes legion levels' });
      expect(screen.getByRole('button', { name: ICON_NAME })).toBeTruthy();
    });

    it('does not render the indicator in bulk mode regardless of notes', () => {
      renderCard({ notes: 'main mule' }, { bulkMode: true });
      expect(screen.queryByRole('button', { name: ICON_NAME })).toBeNull();
    });

    it('does not invoke the card onClick when the indicator is clicked', () => {
      const { onClick } = renderCard({ notes: 'main mule' });
      fireEvent.click(screen.getByRole('button', { name: ICON_NAME }));
      expect(onClick).not.toHaveBeenCalled();
    });

    it('shows the notes content in the tooltip when the indicator is focused', async () => {
      renderCard({ notes: 'owes 8 legion levels' });
      const icon = screen.getByRole('button', { name: ICON_NAME });
      fireEvent.focus(icon);
      expect(await screen.findByText('owes 8 legion levels')).toBeTruthy();
    });
  });

  describe('Combat Power (CP)', () => {
    const CP_NAME = /combat power/i;
    const CP = 410_042_525;

    it('renders the CP eyebrow + abbreviated value in comfy density when set', () => {
      renderCard({ combatPower: CP });
      expect(screen.getByText('CP')).toBeTruthy();
      expect(screen.getByText('410M')).toBeTruthy();
      expect(screen.getByRole('button', { name: CP_NAME })).toBeTruthy();
    });

    it('renders the CP value in the accent color (independent of income)', () => {
      // No bosses selected → zero/muted income, yet CP stays accent.
      renderCard({ combatPower: CP });
      const value = screen.getByText('410M');
      expect(value.style.color).toContain('accent');
    });

    it('renders the CP value at the character-name size and weight 600', () => {
      renderCard({ combatPower: CP });
      const value = screen.getByText('410M');
      expect(value.style.fontSize).toContain('--mule-name-size');
      expect(value.style.fontWeight).toBe('600');
    });

    it('renders no CP element when combatPower is unset', () => {
      renderCard({ combatPower: undefined });
      expect(screen.queryByRole('button', { name: CP_NAME })).toBeNull();
      expect(screen.queryByText('CP')).toBeNull();
    });

    it('renders no CP element when combatPower is 0 (0 ≡ unset)', () => {
      renderCard({ combatPower: 0 });
      expect(screen.queryByRole('button', { name: CP_NAME })).toBeNull();
    });

    it('hides CP in compact density even when set', () => {
      renderCard({ combatPower: CP }, { density: 'compact' });
      expect(screen.queryByRole('button', { name: CP_NAME })).toBeNull();
      expect(screen.queryByText('410M')).toBeNull();
    });

    it('exposes the full grouped value via a Combat Power aria-label', () => {
      renderCard({ combatPower: CP });
      const trigger = screen.getByRole('button', { name: CP_NAME });
      expect(trigger.getAttribute('aria-label')).toBe('Combat Power 410,042,525');
    });

    it('shows the full grouped value in the tooltip on focus', async () => {
      renderCard({ combatPower: CP });
      const trigger = screen.getByRole('button', { name: CP_NAME });
      fireEvent.focus(trigger);
      expect(await screen.findByText('410,042,525')).toBeTruthy();
    });

    it('does not invoke the card onClick (drawer) when CP is clicked', () => {
      const { onClick } = renderCard({ combatPower: CP });
      fireEvent.click(screen.getByRole('button', { name: CP_NAME }));
      expect(onClick).not.toHaveBeenCalled();
    });

    it('swallows pointerdown so a dnd-kit drag never starts from the CP metric', () => {
      // Mirror the kebab/notes guard proof: an ancestor carrying synthetic
      // handlers must not see the guarded pointerdown/click.
      const onAncestorPointerDown = vi.fn();
      const onAncestorClick = vi.fn();
      const onClick = vi.fn();
      const mule = { ...baseMule, combatPower: CP };
      render(
        <div onPointerDown={onAncestorPointerDown} onClick={onAncestorClick}>
          <DndContext>
            <SortableContext items={[mule.id]} strategy={rectSortingStrategy}>
              <MuleCharacterCard
                mule={mule}
                onClick={onClick}
                updateMule={vi.fn()}
                onDelete={vi.fn()}
                onToggleSelect={vi.fn()}
                metrics={metricsFor(mule)}
              />
            </SortableContext>
          </DndContext>
        </div>,
      );
      const trigger = screen.getByRole('button', { name: CP_NAME });
      fireEvent.pointerDown(trigger);
      fireEvent.click(trigger);
      expect(onAncestorPointerDown).not.toHaveBeenCalled();
      expect(onAncestorClick).not.toHaveBeenCalled();
      expect(onClick).not.toHaveBeenCalled();
    });

    it('renders CP immediately before the Notes icon in the class-row right cluster', () => {
      renderCard({ combatPower: CP, notes: 'main mule' });
      const cpTrigger = screen.getByRole('button', { name: CP_NAME });
      const notesTrigger = screen.getByRole('button', { name: /show character notes/i });
      // Same cluster; CP precedes Notes in DOM order.
      const cluster = cpTrigger.parentElement!;
      expect(cluster).toBe(notesTrigger.parentElement);
      const order = Array.from(cluster.children);
      expect(order.indexOf(cpTrigger)).toBeLessThan(order.indexOf(notesTrigger));
    });
  });
});
