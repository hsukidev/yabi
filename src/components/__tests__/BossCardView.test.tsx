import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BossCardView } from '../BossCardView';
import { bosses, bossImageUrl } from '../../data/bosses';
import { MuleBossSlate, type SlateFamily } from '../../data/muleBossSlate';

/** Build the same `SlateFamily[]` projection the Boss Matrix consumes. */
function viewOf(keys: string[] = []): SlateFamily[] {
  return MuleBossSlate.from(keys).view();
}

const LUCID_BOSS = bosses.find((b) => b.family === 'lucid')!;
const HORNTAIL_BOSS = bosses.find((b) => b.family === 'horntail')!; // daily-only → Solo
const BLACK_MAGE_BOSS = bosses.find((b) => b.family === 'black-mage')!; // monthly → partyable

function renderCards(
  families: SlateFamily[] = viewOf(),
  partySizes: Record<string, number> = {},
  onChangePartySize = vi.fn(),
  activeCadence?: 'daily' | 'weekly',
) {
  return {
    ...render(
      <BossCardView
        families={families}
        partySizes={partySizes}
        onChangePartySize={onChangePartySize}
        activeCadence={activeCadence}
      />,
    ),
    onChangePartySize,
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
      render(<BossCardView families={[]} partySizes={{}} onChangePartySize={vi.fn()} />);
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
      render(<BossCardView families={families} partySizes={{}} onChangePartySize={vi.fn()} />);
      const names = screen.getAllByTestId('boss-card-name');
      expect(names).toHaveLength(1);
      expect(names[0].textContent).toBe('Lucid');
    });
  });
});
