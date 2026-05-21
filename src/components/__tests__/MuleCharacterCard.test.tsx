import { describe, expect, it, vi, afterEach } from 'vitest';
import {
  render,
  screen,
  fireEvent,
  waitFor,
  mockMatchMedia,
  restoreMatchMedia,
} from '../../test/test-utils';
import { DndContext } from '@dnd-kit/core';
import { SortableContext, rectSortingStrategy } from '@dnd-kit/sortable';
import { MuleCharacterCard } from '../MuleCharacterCard';
import type { Mule } from '../../types';
import { bosses } from '../../data/bosses';
import type { SlateKey } from '../../data/muleBossSlate';
import { rosterRowMetrics } from '../rosterRowMetrics';
import type { ContributingMuleMetrics } from '../RosterItem/contributingMule';

const LUCID = bosses.find((b) => b.family === 'lucid')!.id;
const HILLA = bosses.find((b) => b.family === 'hilla')!.id;
const BLACK_MAGE = bosses.find((b) => b.family === 'black-mage')!.id;
const HARD_LUCID = `${LUCID}:hard:weekly`;
const NORMAL_HILLA = `${HILLA}:normal:daily`;
const HARD_BLACK_MAGE_MONTHLY = `${BLACK_MAGE}:hard:monthly`;

const baseMule: Mule = {
  id: 'test-mule-1',
  name: 'TestMule',
  level: 200,
  muleClass: 'Hero',
  selectedBosses: [],
  active: true,
};

interface RenderCardOptions {
  defaultAbbreviated?: boolean;
  onDelete?: (id: string) => void;
  bulkMode?: boolean;
  selected?: boolean;
  onToggleSelect?: (id: string) => void;
  droppedKeys?: ReadonlyMap<SlateKey, number>;
  /**
   * Per-mule cadence counts. Defaults to counts derived from
   * `mule.selectedBosses` (via the canonical `rosterRowMetrics`) so existing
   * tests that assert accent color on a weekly-boss-selected mule continue
   * to pass unchanged.
   */
  metrics?: ContributingMuleMetrics;
}

function renderCard(overrides: Partial<Mule> = {}, options?: RenderCardOptions) {
  const onClick = vi.fn();
  const onDelete = options?.onDelete ?? vi.fn();
  const onToggleSelect = options?.onToggleSelect ?? vi.fn();
  const mule = { ...baseMule, ...overrides };
  const metrics = options?.metrics ?? rosterRowMetrics(mule, undefined, 0);
  return {
    ...render(
      <DndContext>
        <SortableContext items={[mule.id]} strategy={rectSortingStrategy}>
          <MuleCharacterCard
            mule={mule}
            onClick={onClick}
            onDelete={onDelete}
            bulkMode={options?.bulkMode ?? false}
            selected={options?.selected ?? false}
            onToggleSelect={onToggleSelect}
            droppedKeys={options?.droppedKeys}
            metrics={metrics}
          />
        </SortableContext>
      </DndContext>,
      options,
    ),
    onClick,
    onDelete,
    onToggleSelect,
  };
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

  it('renders weekly and Black Mage income text', () => {
    renderCard();
    expect(screen.getByText('WEEKLY INCOME')).toBeTruthy();
    expect(screen.getByText('BM INCOME')).toBeTruthy();
    expect(screen.getAllByText('0')).toHaveLength(2);
  });

  it('renders WEEKLY INCOME label and meso value inline on a single row', () => {
    renderCard();
    const labelEl = screen.getByText('WEEKLY INCOME');
    const row = labelEl.parentElement!;
    expect(row.className).toContain('flex-row');
    expect(row.className).not.toContain('flex-col');
  });

  it('renders abbreviated income by default', () => {
    renderCard({ selectedBosses: [HARD_LUCID] });
    expect(screen.getByText('504M')).toBeTruthy();
  });

  it('renders full income when abbreviated is false', () => {
    renderCard({ selectedBosses: [HARD_LUCID] }, { defaultAbbreviated: false });
    expect(screen.getByText('504,000,000')).toBeTruthy();
  });

  // Regression: the card used to call useIncome without `worldId`, so
  // `Income.of` fell back to Heroic pricing for every mule — Interactive
  // mules on the roster displayed Heroic crystal values.
  it('prices WEEKLY INCOME against the mule’s World Group (Interactive)', () => {
    renderCard({ selectedBosses: [HARD_LUCID], worldId: 'interactive-scania' });
    expect(screen.getByText('100.8M')).toBeTruthy();
    expect(screen.queryByText('504M')).toBeNull();
  });

  it('prices WEEKLY INCOME against the mule’s World Group (Heroic)', () => {
    renderCard({ selectedBosses: [HARD_LUCID], worldId: 'heroic-kronos' });
    expect(screen.getByText('504M')).toBeTruthy();
    expect(screen.queryByText('100.8M')).toBeNull();
  });

  it('renders Card weekly income as potential meso', () => {
    renderCard({ selectedBosses: [HARD_LUCID] });
    expect(screen.getByText('504M')).toBeTruthy();
  });

  it('renders BM Income from selected Black Mage monthly value', () => {
    renderCard({ selectedBosses: [HARD_BLACK_MAGE_MONTHLY] });
    expect(screen.getByText('BM INCOME')).toBeTruthy();
    expect(screen.getByText('4.5B')).toBeTruthy();
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

  it('keeps an active mule card at opacity 1 when not dragging', () => {
    const { container } = renderCard({ active: true });
    const cardWrapper = container.querySelector('[data-mule-card]') as HTMLElement;
    // Opacity stays at 1 regardless of hover; only drop during active drag.
    expect(cardWrapper.style.opacity).toBe('1');
    fireEvent.mouseEnter(cardWrapper);
    expect(cardWrapper.style.opacity).toBe('1');
    fireEvent.mouseLeave(cardWrapper);
    expect(cardWrapper.style.opacity).toBe('1');
  });

  it('renders an inactive mule card at 0.55 opacity', () => {
    const { container } = renderCard({ active: false });
    const cardWrapper = container.querySelector('[data-mule-card]') as HTMLElement;
    expect(cardWrapper.style.opacity).toBe('0.55');
  });

  it('keeps an inactive mule card at 0.55 opacity on hover', () => {
    const { container } = renderCard({ active: false });
    const cardWrapper = container.querySelector('[data-mule-card]') as HTMLElement;
    const panel = cardWrapper.querySelector('.panel') as HTMLElement;
    expect(cardWrapper.style.opacity).toBe('0.55');
    fireEvent.mouseEnter(panel);
    expect(cardWrapper.style.opacity).toBe('0.55');
    fireEvent.mouseLeave(panel);
    expect(cardWrapper.style.opacity).toBe('0.55');
  });

  it('renders inactive mule income line in the dim color even when bosses are selected', () => {
    renderCard({ active: false, selectedBosses: [HARD_LUCID] });
    const incomeSpans = screen.getAllByText('504M');
    for (const span of incomeSpans) {
      expect(span.style.color).not.toContain('accent');
      expect(span.style.color).toContain('dim');
    }
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
    // its predicate was `selectedBosses.length > 0`; now it shares the
    // canonical `isContributingMule(mule, metrics)` predicate with Row.
    const HARD_BLACK_MAGE_MONTHLY = `${bosses.find((b) => b.family === 'black-mage')!.id}:hard:monthly`;
    renderCard(
      { active: true, selectedBosses: [HARD_BLACK_MAGE_MONTHLY] },
      { metrics: { weeklyCount: 0, dailyCount: 0 } },
    );
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

  describe('trash icon and delete popover', () => {
    it('shows trash icon on card hover', () => {
      const { container } = renderCard();
      const trashButton = screen.getByRole('button', { name: /delete/i });
      expect(trashButton.style.opacity).toBe('0');

      const cardWrapper = container.querySelector('[data-mule-card]') as HTMLElement;
      const panel = cardWrapper.querySelector('.panel') as HTMLElement;
      fireEvent.mouseEnter(panel);
      expect(trashButton.style.opacity).toBe('1');
    });

    it('hides trash icon when card is not hovered', () => {
      const { container } = renderCard();
      const trashButton = screen.getByRole('button', { name: /delete/i });
      const cardWrapper = container.querySelector('[data-mule-card]') as HTMLElement;
      const panel = cardWrapper.querySelector('.panel') as HTMLElement;

      fireEvent.mouseEnter(panel);
      expect(trashButton.style.opacity).toBe('1');

      fireEvent.mouseLeave(panel);
      expect(trashButton.style.opacity).toBe('0');
    });

    it('opens popover with Delete? and Yes/Cancel when trash icon is clicked', async () => {
      const { container } = renderCard();
      const cardWrapper = container.querySelector('[data-mule-card]') as HTMLElement;
      fireEvent.mouseEnter(cardWrapper);

      const trashButton = screen.getByRole('button', { name: /delete/i });
      fireEvent.click(trashButton);

      await waitFor(() => {
        expect(screen.getByText('Delete?')).toBeTruthy();
        expect(screen.getByRole('button', { name: 'Yes' })).toBeTruthy();
        expect(screen.getByRole('button', { name: 'Cancel' })).toBeTruthy();
      });
    });

    it('calls onDelete and closes popover when Yes is clicked', async () => {
      const onDelete = vi.fn();
      const { container } = renderCard({}, { onDelete });
      const cardWrapper = container.querySelector('[data-mule-card]') as HTMLElement;
      fireEvent.mouseEnter(cardWrapper);

      fireEvent.click(screen.getByRole('button', { name: /delete/i }));

      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Yes' })).toBeTruthy();
      });

      fireEvent.click(screen.getByRole('button', { name: 'Yes' }));
      expect(onDelete).toHaveBeenCalledWith('test-mule-1');
    });

    it('closes popover without deleting when Cancel is clicked', async () => {
      const onDelete = vi.fn();
      const { container } = renderCard({}, { onDelete });
      const cardWrapper = container.querySelector('[data-mule-card]') as HTMLElement;
      fireEvent.mouseEnter(cardWrapper);

      fireEvent.click(screen.getByRole('button', { name: /delete/i }));

      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Cancel' })).toBeTruthy();
      });

      fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
      expect(onDelete).not.toHaveBeenCalled();

      await waitFor(() => {
        expect(screen.queryByText('Delete?')).toBeNull();
      });
    });

    it('does not trigger card onClick when trash icon is clicked', async () => {
      const { container, onClick } = renderCard();
      const cardWrapper = container.querySelector('[data-mule-card]') as HTMLElement;
      fireEvent.mouseEnter(cardWrapper);

      const trashButton = screen.getByRole('button', { name: /delete/i });
      fireEvent.click(trashButton);

      expect(onClick).not.toHaveBeenCalled();
    });

    describe('on touch devices', () => {
      const mockCoarsePointer = () => mockMatchMedia((q) => q.includes('pointer: coarse'));

      afterEach(restoreMatchMedia);

      it('does not render the quick-delete trigger when (pointer: coarse) matches', () => {
        mockCoarsePointer();
        renderCard();
        expect(screen.queryByRole('button', { name: /delete/i })).toBeNull();
      });
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

    it('does not render the hover-trash popover trigger in bulk mode', () => {
      renderCard({}, { bulkMode: true });
      expect(screen.queryByRole('button', { name: /delete mule/i })).toBeNull();
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
              onDelete={vi.fn()}
              bulkMode={false}
              selected={false}
              onToggleSelect={vi.fn()}
              metrics={{ weeklyCount: 0, dailyCount: 0 }}
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
});
