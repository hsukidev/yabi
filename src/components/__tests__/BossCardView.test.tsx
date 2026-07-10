import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useMemo, useState } from 'react';
import { render, screen, fireEvent } from '@testing-library/react';

// Mock the toast module so the integration block can assert the shared
// Weekly Crystal Cap toast fires when a card Difficulty Row routes through the
// real `useSlateActions.toggleKey`. Mirrors useSlateActions.test.tsx.
const toastMock = vi.hoisted(() => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));
vi.mock('../../lib/toast', () => toastMock);

import { BossCardView } from '../BossCardView';
import { useSlateActions } from '../MuleDetailDrawer/hooks/useSlateActions';
import { bosses, bossImageUrl } from '../../data/bosses';
import { MuleBossSlate, type SlateFamily } from '../../data/muleBossSlate';

/** Build the same `SlateFamily[]` projection the Boss Matrix consumes. */
function viewOf(keys: string[] = []): SlateFamily[] {
  return MuleBossSlate.from(keys).view();
}

const LUCID_BOSS = bosses.find((b) => b.family === 'lucid')!;
const LUCID = LUCID_BOSS.id;
// Lucid tiers are all weekly.
const HARD_LUCID = `${LUCID}:hard:weekly`;
const NORMAL_LUCID = `${LUCID}:normal:weekly`;

const HORNTAIL_BOSS = bosses.find((b) => b.family === 'horntail')!; // daily-only → Solo
const BLACK_MAGE_BOSS = bosses.find((b) => b.family === 'black-mage')!; // monthly → partyable
const BLACK_MAGE = BLACK_MAGE_BOSS.id;
const HARD_BM = `${BLACK_MAGE}:hard:monthly`;
const EXTREME_BM = `${BLACK_MAGE}:extreme:monthly`;

// Vellum is the canonical mixed-cadence fixture: daily Normal + weekly Chaos.
const VELLUM_BOSS = bosses.find((b) => b.family === 'vellum')!;
const VELLUM = VELLUM_BOSS.id;
const NORMAL_VELLUM_DAILY = `${VELLUM}:normal:daily`;
const CHAOS_VELLUM_WEEKLY = `${VELLUM}:chaos:weekly`;

function renderCards(
  families: SlateFamily[] = viewOf(),
  partySizes: Record<string, number> = {},
  onChangePartySize = vi.fn(),
  activeCadence?: 'daily' | 'weekly',
  onToggleKey = vi.fn(),
) {
  return {
    ...render(
      <BossCardView
        families={families}
        onToggleKey={onToggleKey}
        partySizes={partySizes}
        onChangePartySize={onChangePartySize}
        activeCadence={activeCadence}
      />,
    ),
    onChangePartySize,
    onToggleKey,
  };
}

describe('BossCardView', () => {
  describe('structure', () => {
    it('renders one Boss Card per family for all 34 families', () => {
      renderCards();
      // One name node per card is the cleanest per-card counter.
      const cards = screen.getAllByTestId('boss-card-name');
      expect(cards).toHaveLength(bosses.length);
      expect(bosses.length).toBe(34);
    });

    it('renders the cards in the order the projection provides', () => {
      renderCards();
      const names = screen.getAllByTestId('boss-card-name').map((n) => n.textContent);
      const firstFamily = viewOf()[0];
      const firstBoss = bosses.find((b) => b.family === firstFamily.family)!;
      expect(names[0]).toBe(firstBoss.name);
    });

    it('renders nothing but an empty grid when families is empty', () => {
      render(
        <BossCardView
          families={[]}
          onToggleKey={vi.fn()}
          partySizes={{}}
          onChangePartySize={vi.fn()}
        />,
      );
      expect(screen.queryAllByTestId('boss-card-name')).toHaveLength(0);
      expect(screen.getByTestId('boss-card-view')).toBeTruthy();
    });
  });

  describe('responsive grid', () => {
    it('is 1-across by default and 2-across from ~440px of drawer width', () => {
      renderCards();
      const grid = screen.getByTestId('boss-card-view');
      expect(grid.className).toContain('grid-cols-1');
      expect(grid.className).toContain('@min-[440px]/drawer:grid-cols-2');
    });
  });

  describe('card header', () => {
    it('renders the sprite at natural 66x67 from /bosses/<slug>.png', () => {
      renderCards();
      const sprite = screen.getByTestId(`boss-card-sprite-${LUCID_BOSS.id}`) as HTMLImageElement;
      expect(sprite.getAttribute('src')).toBe(bossImageUrl(LUCID_BOSS.name));
      expect(sprite.getAttribute('width')).toBe('66');
      expect(sprite.getAttribute('height')).toBe('67');
    });

    it('does not override image-rendering (no upscaling hint on the sprite)', () => {
      renderCards();
      const sprite = screen.getByTestId(`boss-card-sprite-${LUCID_BOSS.id}`) as HTMLImageElement;
      expect(sprite.style.imageRendering).toBe('');
    });

    it('renders the family display name', () => {
      renderCards();
      const names = screen.getAllByTestId('boss-card-name').map((n) => n.textContent);
      expect(names).toContain('Lucid');
      expect(names).toContain('Black Mage');
    });

    it('all 34 families resolve a sprite src', () => {
      renderCards();
      const sprites = screen.getAllByTestId(/^boss-card-sprite-/) as HTMLImageElement[];
      expect(sprites).toHaveLength(bosses.length);
      for (const s of sprites) {
        expect(s.getAttribute('src')).toMatch(/^\/bosses\/[a-z0-9-]+\.png$/);
      }
    });
  });

  describe('party stepper / Solo fallback', () => {
    it('renders a PartyStepper for a weekly family (Lucid)', () => {
      renderCards();
      expect(screen.getByTestId(`party-stepper-${LUCID_BOSS.family}`)).toBeTruthy();
    });

    it('renders a PartyStepper for a monthly-only family (Black Mage)', () => {
      renderCards();
      expect(screen.getByTestId(`party-stepper-${BLACK_MAGE_BOSS.family}`)).toBeTruthy();
    });

    it('renders the Solo fallback (no stepper) for a daily-only family (Horntail)', () => {
      renderCards();
      expect(screen.queryByTestId(`party-stepper-${HORNTAIL_BOSS.family}`)).toBeNull();
      const card = screen.getByTestId(`boss-card-${HORNTAIL_BOSS.id}`);
      expect(card.textContent).toContain('Solo');
    });

    it('shows the provided party size', () => {
      renderCards(viewOf(), { [LUCID_BOSS.family]: 4 });
      expect(screen.getByTestId(`party-stepper-${LUCID_BOSS.family}`).textContent).toContain('4');
    });

    it('defaults to party size 1 when absent', () => {
      renderCards();
      expect(screen.getByTestId(`party-stepper-${LUCID_BOSS.family}`).textContent).toContain('1');
    });

    it('clicking + delegates to onChangePartySize with value + 1', () => {
      const { onChangePartySize } = renderCards(viewOf(), { [LUCID_BOSS.family]: 2 });
      fireEvent.click(screen.getByTestId(`party-inc-${LUCID_BOSS.family}`));
      expect(onChangePartySize).toHaveBeenCalledWith(LUCID_BOSS.family, 3);
    });

    it('falls back to Solo for a mixed family under the daily cadence filter', () => {
      // Papulatus is weekly Chaos + daily Easy/Normal — under daily its only
      // partyable (weekly) tier is filtered out, so it shows Solo, matching the
      // Boss Matrix.
      const PAPULATUS = bosses.find((b) => b.family === 'papulatus')!;
      renderCards(viewOf(), {}, vi.fn(), 'daily');
      expect(screen.queryByTestId(`party-stepper-${PAPULATUS.family}`)).toBeNull();
      expect(screen.getByTestId(`boss-card-${PAPULATUS.id}`).textContent).toContain('Solo');
    });
  });

  describe('memo barrier (drawer keystroke perf)', () => {
    // The card grid must sit behind a memo barrier exactly like BossMatrix so a
    // keystroke in a drawer input (which re-renders MuleDetailDrawer) does not
    // re-render the grid, provided its props keep referential identity. See
    // CLAUDE.md (MuleDetailDrawer keystroke perf invariants).
    it('is wrapped in React.memo', () => {
      expect((BossCardView as unknown as { $$typeof: symbol }).$$typeof).toBe(
        Symbol.for('react.memo'),
      );
    });
  });

  describe('shared projection (search + cadence filter)', () => {
    it('renders only the families the projection yields (search)', () => {
      const families = MuleBossSlate.from([]).view('lucid');
      render(
        <BossCardView
          families={families}
          onToggleKey={vi.fn()}
          partySizes={{}}
          onChangePartySize={vi.fn()}
        />,
      );
      const names = screen.getAllByTestId('boss-card-name');
      expect(names).toHaveLength(1);
      expect(names[0].textContent).toBe('Lucid');
    });
  });

  describe('Difficulty Rows — structure', () => {
    it('renders one row per (tier, cadence) the family offers', () => {
      renderCards();
      const rows = screen.getByTestId(`boss-card-rows-${LUCID}`).querySelectorAll('button');
      // Lucid offers three weekly tiers (hard / normal / easy).
      expect(rows).toHaveLength(LUCID_BOSS.difficulty.length);
    });

    it('rows are <button>s carrying aria-pressed (standard tab order, no custom keys)', () => {
      renderCards();
      const row = screen.getByTestId(`boss-card-row-${LUCID}-hard`);
      expect(row.tagName).toBe('BUTTON');
      expect(row.getAttribute('type')).toBe('button');
      expect(row.getAttribute('aria-pressed')).toBe('false');
      // No tabindex override — rows keep their natural tab order.
      expect(row.getAttribute('tabindex')).toBeNull();
    });

    it('shows the tier label + a tier-colored pip on the left', () => {
      renderCards();
      const row = screen.getByTestId(`boss-card-row-${LUCID}-hard`);
      expect(row.textContent).toContain('Hard');
      expect(row.querySelector('[data-difficulty-pip="hard"]')).toBeTruthy();
    });

    it('shows the lowercase cadence label on the right edge', () => {
      renderCards();
      expect(screen.getByTestId(`boss-card-row-${LUCID}-hard`).textContent).toContain('weekly');
      expect(screen.getByTestId(`boss-card-row-${VELLUM}-normal`).textContent).toContain('daily');
      expect(screen.getByTestId(`boss-card-row-${BLACK_MAGE}-hard`).textContent).toContain(
        'monthly',
      );
    });
  });

  describe('Difficulty Rows — selection', () => {
    it('clicking a row calls onToggleKey with the row key', () => {
      const { onToggleKey } = renderCards();
      fireEvent.click(screen.getByTestId(`boss-card-row-${LUCID}-hard`));
      expect(onToggleKey).toHaveBeenCalledWith(HARD_LUCID);
    });

    it('a selected row carries aria-pressed=true and data-state="on"', () => {
      renderCards(viewOf([HARD_LUCID]));
      const row = screen.getByTestId(`boss-card-row-${LUCID}-hard`);
      expect(row.getAttribute('aria-pressed')).toBe('true');
      expect(row.getAttribute('data-state')).toBe('on');
    });

    it('rows are never disabled (cap enforcement is a toast, not a disable)', () => {
      renderCards(viewOf([HARD_LUCID]));
      for (const tier of ['hard', 'normal', 'easy'] as const) {
        const row = screen.getByTestId(`boss-card-row-${LUCID}-${tier}`) as HTMLButtonElement;
        expect(row.disabled).toBe(false);
        expect(row.getAttribute('aria-disabled')).toBeNull();
      }
    });

    it('card body (sprite + name) is inert — clicking it never toggles', () => {
      const { onToggleKey } = renderCards();
      fireEvent.click(screen.getByTestId(`boss-card-sprite-${LUCID}`));
      fireEvent.click(screen.getAllByTestId('boss-card-name')[0]);
      fireEvent.click(screen.getByTestId(`boss-card-${LUCID}`));
      expect(onToggleKey).not.toHaveBeenCalled();
    });
  });

  describe('Tier Swap — dim styling', () => {
    it('dims unselected same-cadence sibling rows to 0.4 but keeps them clickable', () => {
      const { onToggleKey } = renderCards(viewOf([HARD_LUCID]));
      const normal = screen.getByTestId(`boss-card-row-${LUCID}-normal`) as HTMLElement;
      expect(normal.getAttribute('data-dim')).toBe('true');
      expect(normal.style.opacity).toBe('0.4');
      // Still clickable — a tap swaps atomically (handled upstream by toggleKey).
      fireEvent.click(normal);
      expect(onToggleKey).toHaveBeenCalledWith(NORMAL_LUCID);
    });

    it('does not dim the selected row itself', () => {
      renderCards(viewOf([HARD_LUCID]));
      const selected = screen.getByTestId(`boss-card-row-${LUCID}-hard`);
      expect(selected.getAttribute('data-dim')).not.toBe('true');
    });

    it('does not dim any rows when nothing on the card is selected', () => {
      renderCards();
      expect(screen.getByTestId(`boss-card-row-${LUCID}-hard`).getAttribute('data-dim')).not.toBe(
        'true',
      );
    });

    it('does not dim opposite-cadence rows on a mixed boss (daily vs weekly)', () => {
      // Chaos Vellum is weekly; its daily Normal row must stay fully lit.
      renderCards(viewOf([CHAOS_VELLUM_WEEKLY]));
      expect(
        screen.getByTestId(`boss-card-row-${VELLUM}-normal`).getAttribute('data-dim'),
      ).not.toBe('true');
    });
  });

  describe('selected-card styling', () => {
    it('marks a card holding ≥1 Slate Key with data-selected + accent border', () => {
      renderCards(viewOf([HARD_LUCID]));
      const card = screen.getByTestId(`boss-card-${LUCID}`);
      expect(card.getAttribute('data-selected')).toBe('true');
      expect(card.className).toContain('border-[var(--accent)]');
    });

    it('leaves an unheld card unmarked', () => {
      renderCards(viewOf([HARD_LUCID]));
      const card = screen.getByTestId(`boss-card-${BLACK_MAGE}`);
      expect(card.getAttribute('data-selected')).not.toBe('true');
      expect(card.className).toContain('border-(--border)');
    });
  });

  describe('shared Boss Slate (cross-mode sync + multi-cadence)', () => {
    // The card view is a pure projection of the same MuleBossSlate the matrix
    // renders, so any selection made in either Slate Display Mode shows here.
    it('reflects a Tier Swap resolved at the slate layer (one row on)', () => {
      const swapped = MuleBossSlate.from([NORMAL_LUCID]).toggle(HARD_LUCID).keys as string[];
      renderCards(MuleBossSlate.from(swapped).view());
      expect(screen.getByTestId(`boss-card-row-${LUCID}-hard`).getAttribute('data-state')).toBe(
        'on',
      );
      expect(
        screen.getByTestId(`boss-card-row-${LUCID}-normal`).getAttribute('data-state'),
      ).not.toBe('on');
    });

    it('Black Mage two monthly rows behave as a radio (Extreme selected → Hard off)', () => {
      // Selecting Extreme while Hard is held tier-swaps within the single
      // (black-mage, monthly) bucket — the Monthly Radio Mutex.
      const swapped = MuleBossSlate.from([HARD_BM]).toggle(EXTREME_BM).keys as string[];
      renderCards(MuleBossSlate.from(swapped).view());
      expect(
        screen.getByTestId(`boss-card-row-${BLACK_MAGE}-extreme`).getAttribute('data-state'),
      ).toBe('on');
      expect(
        screen.getByTestId(`boss-card-row-${BLACK_MAGE}-hard`).getAttribute('data-state'),
      ).not.toBe('on');
      // The unselected monthly sibling dims (communicating the radio).
      expect(screen.getByTestId(`boss-card-row-${BLACK_MAGE}-hard`).getAttribute('data-dim')).toBe(
        'true',
      );
    });

    it('multi-select across cadences on one card: daily + weekly both render on', () => {
      renderCards(viewOf([NORMAL_VELLUM_DAILY, CHAOS_VELLUM_WEEKLY]));
      expect(screen.getByTestId(`boss-card-row-${VELLUM}-normal`).getAttribute('data-state')).toBe(
        'on',
      );
      expect(screen.getByTestId(`boss-card-row-${VELLUM}-chaos`).getAttribute('data-state')).toBe(
        'on',
      );
    });
  });

  // End-to-end proof that clicking a Difficulty Row goes through the SAME
  // shared `useSlateActions.toggleKey` the Boss Matrix uses, so every guard
  // rail (cap toast, Tier Swap, Radio Mutex) comes along without the card view
  // owning any of that logic.
  describe('guard rails via the shared toggle action (integration)', () => {
    /** Pick `count` distinct-family weekly keys in `bosses[]` order. */
    function pickDistinctWeeklyKeys(count: number): string[] {
      const picks: string[] = [];
      for (const b of bosses) {
        const diff = b.difficulty.find((d) => d.cadence === 'weekly');
        if (!diff) continue;
        picks.push(`${b.id}:${diff.tier}:weekly`);
        if (picks.length === count) break;
      }
      if (picks.length < count) throw new Error(`Only found ${picks.length} weekly families`);
      return picks;
    }

    /**
     * Minimal drawer stand-in: owns the slate as state and wires
     * `BossCardView.onToggleKey` to the real `useSlateActions.toggleKey`, so a
     * DOM click on a Difficulty Row exercises the true selection path.
     */
    function SlateHarness({ initialKeys }: { initialKeys: string[] }) {
      const [keys, setKeys] = useState<string[]>(initialKeys);
      const slate = useMemo(() => MuleBossSlate.from(keys), [keys]);
      const { toggleKey } = useSlateActions({
        muleId: 'm1',
        partySizes: {},
        slate,
        userPresets: [],
        onUpdate: (_id, patch) => {
          if (patch.selectedBosses) setKeys(patch.selectedBosses as string[]);
        },
      });
      return (
        <BossCardView
          families={slate.view()}
          onToggleKey={toggleKey}
          partySizes={{}}
          onChangePartySize={vi.fn()}
        />
      );
    }

    beforeEach(() => {
      toastMock.toast.error.mockClear();
      toastMock.toast.success.mockClear();
    });

    it('15th weekly add fires the "Weekly cap reached" toast and leaves the slate unchanged', () => {
      const fourteen = pickDistinctWeeklyKeys(14);
      const fifteenthKey = pickDistinctWeeklyKeys(15)[14];
      const [fifteenthId, fifteenthTier] = fifteenthKey.split(':');
      render(<SlateHarness initialKeys={fourteen} />);

      const row = screen.getByTestId(`boss-card-row-${fifteenthId}-${fifteenthTier}`);
      expect(row.getAttribute('data-state')).toBe('off');
      fireEvent.click(row);

      expect(toastMock.toast.error).toHaveBeenCalledWith('Weekly cap reached', {
        description: 'Remove a boss first',
      });
      // Slate unchanged — the 15th row is still not selected.
      expect(
        screen
          .getByTestId(`boss-card-row-${fifteenthId}-${fifteenthTier}`)
          .getAttribute('data-state'),
      ).toBe('off');
    });

    it('a Tier Swap on a card selects the new tier and clears the sibling (no toast)', () => {
      render(<SlateHarness initialKeys={[NORMAL_LUCID]} />);
      fireEvent.click(screen.getByTestId(`boss-card-row-${LUCID}-hard`));
      expect(screen.getByTestId(`boss-card-row-${LUCID}-hard`).getAttribute('data-state')).toBe(
        'on',
      );
      expect(screen.getByTestId(`boss-card-row-${LUCID}-normal`).getAttribute('data-state')).toBe(
        'off',
      );
      expect(toastMock.toast.error).not.toHaveBeenCalled();
    });

    it('Black Mage monthly rows act as a radio when toggled from the card', () => {
      render(<SlateHarness initialKeys={[HARD_BM]} />);
      fireEvent.click(screen.getByTestId(`boss-card-row-${BLACK_MAGE}-extreme`));
      expect(
        screen.getByTestId(`boss-card-row-${BLACK_MAGE}-extreme`).getAttribute('data-state'),
      ).toBe('on');
      expect(
        screen.getByTestId(`boss-card-row-${BLACK_MAGE}-hard`).getAttribute('data-state'),
      ).toBe('off');
    });
  });
});
