import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@/test/test-utils';
import { BossMatrix } from '../BossMatrix';
import { bosses } from '../../data/bosses';
import { MuleBossSlate, type SlateFamily } from '../../data/muleBossSlate';
import type { BossTier } from '../../types';
import { formatMeso } from '../../utils/meso';

// Column order in the Matrix — extreme → easy, hardest first. Mirrors the
// private constant inside BossMatrix/muleBossSlate.
const TIER_COLUMNS: BossTier[] = ['extreme', 'chaos', 'hard', 'normal', 'easy'];

/** Build the `SlateFamily[]` projection `BossMatrix` now consumes. */
function viewOf(keys: string[] = []): SlateFamily[] {
  return MuleBossSlate.from(keys).view();
}

const LUCID_BOSS = bosses.find((b) => b.family === 'lucid')!;
const LUCID = LUCID_BOSS.id;
// Lucid tiers are all weekly pre- and post-slice-2.
const HARD_LUCID = `${LUCID}:hard:weekly`;
const NORMAL_LUCID = `${LUCID}:normal:weekly`;
const LUCID_HARD_VALUE = LUCID_BOSS.difficulty.find((d) => d.tier === 'hard')!.crystalValue;

const BLACK_MAGE_BOSS = bosses.find((b) => b.family === 'black-mage')!;
const BLACK_MAGE = BLACK_MAGE_BOSS.id;
const BLACK_MAGE_EXTREME_VALUE = BLACK_MAGE_BOSS.difficulty.find(
  (d) => d.tier === 'extreme',
)!.crystalValue;
const AKECHI = bosses.find((b) => b.family === 'akechi-mitsuhide')!.id;

// Mixed-cadence bosses (slice 2).
const VELLUM_BOSS = bosses.find((b) => b.family === 'vellum')!;
const VELLUM = VELLUM_BOSS.id;
const VELLUM_NORMAL_VALUE = VELLUM_BOSS.difficulty.find((d) => d.tier === 'normal')!.crystalValue;
const VELLUM_CHAOS_VALUE = VELLUM_BOSS.difficulty.find((d) => d.tier === 'chaos')!.crystalValue;
const NORMAL_VELLUM_DAILY = `${VELLUM}:normal:daily`;
const CHAOS_VELLUM_WEEKLY = `${VELLUM}:chaos:weekly`;

const PAPULATUS_BOSS = bosses.find((b) => b.family === 'papulatus')!;
const PAPULATUS = PAPULATUS_BOSS.id;
const CHAOS_PAPULATUS_WEEKLY = `${PAPULATUS}:chaos:weekly`;

// Daily-only boss (Horntail).
const HORNTAIL_BOSS = bosses.find((b) => b.family === 'horntail')!;
const HORNTAIL = HORNTAIL_BOSS.id;
const CHAOS_HORNTAIL_DAILY = `${HORNTAIL}:chaos:daily`;

const DAILY_ONLY_FAMILIES = ['horntail', 'von-leon', 'arkarium', 'mori-ranmaru', 'omni-cln'];
const BOSSES_WITH_PARTYABLE_TIER_COUNT = bosses.filter((b) =>
  b.difficulty.some((d) => d.cadence === 'weekly' || d.cadence === 'monthly'),
).length;

function renderMatrix(
  slateKeys: string[] = [],
  onToggleKey = vi.fn(),
  partySizes: Record<string, number> = {},
  onChangePartySize = vi.fn(),
) {
  return {
    ...render(
      <BossMatrix
        families={viewOf(slateKeys)}
        onToggleKey={onToggleKey}
        partySizes={partySizes}
        onChangePartySize={onChangePartySize}
      />,
    ),
    onToggleKey,
    onChangePartySize,
  };
}

describe('BossMatrix', () => {
  describe('structure', () => {
    it('renders one row per family', () => {
      renderMatrix();
      const rows = screen.getAllByRole('row');
      // One header row + one row per family (bosses.length families).
      expect(rows).toHaveLength(bosses.length + 1);
    });

    it('renders a header row with a Bosses label and 5 tier columns', () => {
      renderMatrix();
      expect(screen.getByText('Bosses')).toBeTruthy();
      for (const tier of TIER_COLUMNS) {
        const header = screen.getByRole('columnheader', {
          name: new RegExp(tier, 'i'),
        });
        expect(header).toBeTruthy();
      }
    });

    it('orders tier columns left-to-right as Extreme, Chaos, Hard, Normal, Easy', () => {
      renderMatrix();
      const tierHeaders = screen
        .getAllByRole('columnheader')
        .filter((h) => h.getAttribute('aria-label'))
        .map((h) => h.getAttribute('aria-label'));
      expect(tierHeaders).toEqual(['Extreme', 'Chaos', 'Hard', 'Normal', 'Easy']);
    });

    it('renders one DiffPip color strip per tier column in the header', () => {
      renderMatrix();
      for (const tier of TIER_COLUMNS) {
        const pip = document.querySelector(`[data-difficulty-pip="${tier}"]`);
        expect(pip).toBeTruthy();
      }
    });

    it('renders each family row with its display name in the leftmost cell', () => {
      renderMatrix();
      const names = screen.getAllByRole('rowheader').map((r) => r.textContent ?? '');
      expect(names.some((n) => n.includes('Black Mage'))).toBe(true);
      expect(names.some((n) => n.includes('Lucid'))).toBe(true);
      expect(names.some((n) => n.includes('Akechi Mitsuhide'))).toBe(true);
    });

    it('sorts family rows by top-tier crystalValue descending (Black Mage first)', () => {
      renderMatrix();
      const rowHeaders = screen.getAllByRole('rowheader');
      expect(rowHeaders[0].textContent).toContain('Black Mage');
    });
  });

  describe('empty cells', () => {
    it('renders a dashed — for a tier the family does not offer', () => {
      renderMatrix();
      // Black Mage has no easy / normal / chaos tiers.
      const cell = screen.getByTestId(`matrix-cell-${BLACK_MAGE}-easy`);
      expect(cell.textContent).toBe('—');
    });

    it('empty cells are non-interactive (no click handler fires)', () => {
      const onToggleKey = vi.fn();
      renderMatrix([], onToggleKey);
      const cell = screen.getByTestId(`matrix-cell-${BLACK_MAGE}-easy`);
      fireEvent.click(cell);
      expect(onToggleKey).not.toHaveBeenCalled();
    });

    it('empty cells do not dim their whole box (borders stay at full strength)', () => {
      renderMatrix();
      const cell = screen.getByTestId(`matrix-cell-${BLACK_MAGE}-easy`) as HTMLElement;
      expect(cell.style.opacity).not.toBe('0.3');
    });
  });

  describe('populated cells', () => {
    it('renders formatMeso(crystalValue, true) as the cell value', () => {
      renderMatrix();
      const cell = screen.getByTestId(`matrix-cell-${BLACK_MAGE}-extreme`);
      // 18,000,000,000 → "18B"
      expect(cell.textContent).toContain('18B');
    });

    it('clicking a populated cell calls onToggleKey with <uuid>:<tier>', () => {
      const onToggleKey = vi.fn();
      renderMatrix([], onToggleKey);
      const cell = screen.getByTestId(`matrix-cell-${LUCID}-hard`);
      fireEvent.click(cell);
      expect(onToggleKey).toHaveBeenCalledWith(HARD_LUCID);
    });

    it('tier-less families (Akechi) render a single populated cell at normal', () => {
      const onToggleKey = vi.fn();
      renderMatrix([], onToggleKey);
      const normalCell = screen.getByTestId(`matrix-cell-${AKECHI}-normal`);
      fireEvent.click(normalCell);
      expect(onToggleKey).toHaveBeenCalledWith(`${AKECHI}:normal:weekly`);
    });
  });

  describe('selected styling', () => {
    it('marks the selected cell with data-state="on"', () => {
      renderMatrix([HARD_LUCID]);
      const cell = screen.getByTestId(`matrix-cell-${LUCID}-hard`);
      expect(cell.getAttribute('data-state')).toBe('on');
    });

    it('does not mark other families as selected', () => {
      renderMatrix([HARD_LUCID]);
      const cell = screen.getByTestId(`matrix-cell-${BLACK_MAGE}-extreme`);
      expect(cell.getAttribute('data-state')).not.toBe('on');
    });

    it('selected cells do not add an inset ring (keeps grid borders uniform)', () => {
      renderMatrix([HARD_LUCID]);
      const selected = screen.getByTestId(`matrix-cell-${LUCID}-hard`);
      expect(selected.className).not.toMatch(/\bring-\S+/);
    });
  });

  describe('dim sibling styling', () => {
    it('marks other populated tier cells in the same family with data-dim="true"', () => {
      renderMatrix([HARD_LUCID]);
      const normalCell = screen.getByTestId(`matrix-cell-${LUCID}-normal`);
      const easyCell = screen.getByTestId(`matrix-cell-${LUCID}-easy`);
      expect(normalCell.getAttribute('data-dim')).toBe('true');
      expect(easyCell.getAttribute('data-dim')).toBe('true');
    });

    it('does not dim cells in other families', () => {
      renderMatrix([HARD_LUCID]);
      const blackMageHard = screen.getByTestId(`matrix-cell-${BLACK_MAGE}-hard`);
      expect(blackMageHard.getAttribute('data-dim')).not.toBe('true');
    });

    it('does not dim the selected cell itself', () => {
      renderMatrix([HARD_LUCID]);
      const selected = screen.getByTestId(`matrix-cell-${LUCID}-hard`);
      expect(selected.getAttribute('data-dim')).not.toBe('true');
    });

    it('does not dim any cells when nothing is selected', () => {
      renderMatrix([]);
      const cell = screen.getByTestId(`matrix-cell-${LUCID}-hard`);
      expect(cell.getAttribute('data-dim')).not.toBe('true');
    });

    it('dim sibling cells do not dim their whole box (borders stay at full strength)', () => {
      renderMatrix([HARD_LUCID]);
      const sibling = screen.getByTestId(`matrix-cell-${LUCID}-normal`) as HTMLElement;
      expect(sibling.style.opacity).toBe('');
    });
  });

  describe('interaction regression', () => {
    it('clicking a sibling tier sends the new key (swap is handled upstream)', () => {
      const onToggleKey = vi.fn();
      renderMatrix([NORMAL_LUCID], onToggleKey);
      const hardCell = screen.getByTestId(`matrix-cell-${LUCID}-hard`);
      fireEvent.click(hardCell);
      expect(onToggleKey).toHaveBeenCalledWith(HARD_LUCID);
    });

    it('clicking the currently-selected cell again sends the same key (clear handled upstream)', () => {
      const onToggleKey = vi.fn();
      renderMatrix([HARD_LUCID], onToggleKey);
      const hardCell = screen.getByTestId(`matrix-cell-${LUCID}-hard`);
      fireEvent.click(hardCell);
      expect(onToggleKey).toHaveBeenCalledWith(HARD_LUCID);
    });
  });

  describe('family cell layout', () => {
    it('renders boss name before the party stepper in DOM order (stacked)', () => {
      renderMatrix();
      const rowHeader = screen
        .getAllByRole('rowheader')
        .find((r) => r.textContent?.includes('Lucid'))!;
      const nameEl = rowHeader.querySelector('[data-testid="family-name"]')!;
      const stepper = rowHeader.querySelector(`[data-testid^="party-stepper-"]`)!;
      expect(nameEl).toBeTruthy();
      expect(stepper).toBeTruthy();
      // compareDocumentPosition: FOLLOWING means stepper is after nameEl
      expect(
        nameEl.compareDocumentPosition(stepper) & Node.DOCUMENT_POSITION_FOLLOWING,
      ).toBeTruthy();
    });
  });

  describe('party stepper', () => {
    it('renders a Party label per family row that has at least one weekly or monthly tier', () => {
      renderMatrix();
      const labels = screen.getAllByText('Party');
      expect(labels.length).toBe(BOSSES_WITH_PARTYABLE_TIER_COUNT);
    });

    it('renders a party stepper per family showing "1" when partySizes is absent', () => {
      renderMatrix();
      const stepper = screen.getByTestId(`party-stepper-${LUCID_BOSS.family}`);
      expect(stepper.textContent).toContain('1');
    });

    it('uses the provided partySizes value when present', () => {
      renderMatrix([], vi.fn(), { [LUCID_BOSS.family]: 3 });
      const stepper = screen.getByTestId(`party-stepper-${LUCID_BOSS.family}`);
      expect(stepper.textContent).toContain('3');
    });

    it('clicking + calls onChangePartySize with value + 1', () => {
      const onChangePartySize = vi.fn();
      renderMatrix([], vi.fn(), { [LUCID_BOSS.family]: 2 }, onChangePartySize);
      const incBtn = screen.getByTestId(`party-inc-${LUCID_BOSS.family}`);
      fireEvent.click(incBtn);
      expect(onChangePartySize).toHaveBeenCalledWith(LUCID_BOSS.family, 3);
    });

    it('clicking − calls onChangePartySize with value − 1', () => {
      const onChangePartySize = vi.fn();
      renderMatrix([], vi.fn(), { [LUCID_BOSS.family]: 3 }, onChangePartySize);
      const decBtn = screen.getByTestId(`party-dec-${LUCID_BOSS.family}`);
      fireEvent.click(decBtn);
      expect(onChangePartySize).toHaveBeenCalledWith(LUCID_BOSS.family, 2);
    });

    it('does not call onChangePartySize below 1 (clamped to 1 min)', () => {
      const onChangePartySize = vi.fn();
      renderMatrix([], vi.fn(), { [LUCID_BOSS.family]: 1 }, onChangePartySize);
      const decBtn = screen.getByTestId(`party-dec-${LUCID_BOSS.family}`);
      fireEvent.click(decBtn);
      expect(onChangePartySize).not.toHaveBeenCalled();
    });

    it('does not call onChangePartySize above 6 (clamped to 6 max)', () => {
      const onChangePartySize = vi.fn();
      renderMatrix([], vi.fn(), { [LUCID_BOSS.family]: 6 }, onChangePartySize);
      const incBtn = screen.getByTestId(`party-inc-${LUCID_BOSS.family}`);
      fireEvent.click(incBtn);
      expect(onChangePartySize).not.toHaveBeenCalled();
    });

    it('clicking the + button does NOT toggle the cell (event propagation stopped)', () => {
      const onToggleKey = vi.fn();
      const onChangePartySize = vi.fn();
      renderMatrix([], onToggleKey, { [LUCID_BOSS.family]: 2 }, onChangePartySize);
      const incBtn = screen.getByTestId(`party-inc-${LUCID_BOSS.family}`);
      fireEvent.click(incBtn);
      expect(onChangePartySize).toHaveBeenCalledTimes(1);
      expect(onToggleKey).not.toHaveBeenCalled();
    });

    it('clicking the − button does NOT toggle the cell (event propagation stopped)', () => {
      const onToggleKey = vi.fn();
      const onChangePartySize = vi.fn();
      renderMatrix([], onToggleKey, { [LUCID_BOSS.family]: 3 }, onChangePartySize);
      const decBtn = screen.getByTestId(`party-dec-${LUCID_BOSS.family}`);
      fireEvent.click(decBtn);
      expect(onChangePartySize).toHaveBeenCalledTimes(1);
      expect(onToggleKey).not.toHaveBeenCalled();
    });
  });

  describe('party-size division', () => {
    it('shows the full crystalValue in cells when partySize is 1 (default)', () => {
      renderMatrix();
      const cell = screen.getByTestId(`matrix-cell-${BLACK_MAGE}-extreme`);
      expect(cell.textContent).toContain(formatMeso(BLACK_MAGE_EXTREME_VALUE, true));
    });

    it('divides the displayed meso value by the family party size', () => {
      renderMatrix([], vi.fn(), { [LUCID_BOSS.family]: 2 });
      const cell = screen.getByTestId(`matrix-cell-${LUCID}-hard`);
      expect(cell.textContent).toContain(formatMeso(LUCID_HARD_VALUE / 2, true));
    });

    it('cells do not contain any "÷N" hint', () => {
      renderMatrix([], vi.fn(), { [LUCID_BOSS.family]: 2 });
      const cell = screen.getByTestId(`matrix-cell-${LUCID}-hard`);
      expect(cell.textContent).not.toContain('÷');
    });

    it('party size for one family does not affect another family', () => {
      renderMatrix([], vi.fn(), { [LUCID_BOSS.family]: 4 });
      const cell = screen.getByTestId(`matrix-cell-${BLACK_MAGE}-extreme`);
      expect(cell.textContent).toContain(formatMeso(BLACK_MAGE_EXTREME_VALUE, true));
    });

    // Slice 2: daily tier cells render at full crystalValue — only weekly
    // tiers divide by party size.
    it('does not divide daily tier cells by the party size', () => {
      // Vellum Normal is daily; displayed value stays at full crystalValue
      // regardless of party size.
      renderMatrix([], vi.fn(), { [VELLUM_BOSS.family]: 4 });
      const cell = screen.getByTestId(`matrix-cell-${VELLUM}-normal`);
      expect(cell.textContent).toContain(formatMeso(VELLUM_NORMAL_VALUE, true));
    });

    it('still divides weekly tier cells on a mixed boss by the party size', () => {
      // Vellum Chaos is weekly; divides by party size.
      renderMatrix([], vi.fn(), { [VELLUM_BOSS.family]: 2 });
      const cell = screen.getByTestId(`matrix-cell-${VELLUM}-chaos`);
      expect(cell.textContent).toContain(formatMeso(VELLUM_CHAOS_VALUE / 2, true));
    });
  });

  // Slice 2: dimming now respects cadence — opposite-cadence tiers stay active.
  describe('per-cadence dim (slice 2)', () => {
    it('selecting a weekly tier on a mixed boss does NOT dim its daily tiers', () => {
      // Chaos Papulatus (weekly) selected. Papulatus easy/normal are daily.
      renderMatrix([CHAOS_PAPULATUS_WEEKLY]);
      const easyDaily = screen.getByTestId(`matrix-cell-${PAPULATUS}-easy`);
      const normalDaily = screen.getByTestId(`matrix-cell-${PAPULATUS}-normal`);
      expect(easyDaily.getAttribute('data-dim')).not.toBe('true');
      expect(normalDaily.getAttribute('data-dim')).not.toBe('true');
    });

    it('selecting a daily tier on a mixed boss does NOT dim its weekly tiers', () => {
      // Normal Vellum (daily) selected. Chaos Vellum is weekly — stay active.
      renderMatrix([NORMAL_VELLUM_DAILY]);
      const chaosWeekly = screen.getByTestId(`matrix-cell-${VELLUM}-chaos`);
      expect(chaosWeekly.getAttribute('data-dim')).not.toBe('true');
    });

    it('selecting a weekly tier DOES dim other weekly tiers on the same boss', () => {
      // Hard Magnus is weekly; Magnus has no other weekly tiers, so use
      // Kalos (chaos weekly) — normal/easy weekly should dim.
      const KALOS_BOSS = bosses.find((b) => b.family === 'kalos-the-guardian')!;
      const chaosKalos = `${KALOS_BOSS.id}:chaos:weekly`;
      renderMatrix([chaosKalos]);
      const normalCell = screen.getByTestId(`matrix-cell-${KALOS_BOSS.id}-normal`);
      expect(normalCell.getAttribute('data-dim')).toBe('true');
    });

    it('selecting a daily tier DOES dim other daily tiers on the same boss', () => {
      // Horntail easy/normal/chaos are all daily. Selecting chaos dims others.
      renderMatrix([CHAOS_HORNTAIL_DAILY]);
      const normalCell = screen.getByTestId(`matrix-cell-${HORNTAIL}-normal`);
      const easyCell = screen.getByTestId(`matrix-cell-${HORNTAIL}-easy`);
      expect(normalCell.getAttribute('data-dim')).toBe('true');
      expect(easyCell.getAttribute('data-dim')).toBe('true');
    });

    it('renders both daily and weekly selections on a mixed boss as on', () => {
      renderMatrix([NORMAL_VELLUM_DAILY, CHAOS_VELLUM_WEEKLY]);
      const normalCell = screen.getByTestId(`matrix-cell-${VELLUM}-normal`);
      const chaosCell = screen.getByTestId(`matrix-cell-${VELLUM}-chaos`);
      expect(normalCell.getAttribute('data-state')).toBe('on');
      expect(chaosCell.getAttribute('data-state')).toBe('on');
    });
  });

  // Slice 2: daily-only bosses omit the party stepper.
  describe('party stepper visibility (slice 2)', () => {
    it('renders the party stepper on a mixed-cadence boss row', () => {
      renderMatrix();
      const stepper = screen.queryByTestId(`party-stepper-${VELLUM_BOSS.family}`);
      expect(stepper).not.toBeNull();
    });

    it('omits the party stepper on a daily-only boss row', () => {
      renderMatrix();
      const stepper = screen.queryByTestId(`party-stepper-${HORNTAIL_BOSS.family}`);
      expect(stepper).toBeNull();
    });
  });

  describe('cadence-aware party stepper visibility', () => {
    it.each(DAILY_ONLY_FAMILIES)('omits the party stepper for daily-only family %s', (family) => {
      renderMatrix();
      expect(screen.queryByTestId(`party-stepper-${family}`)).toBeNull();
    });

    it('keeps the party stepper on mixed-cadence bosses (Vellum)', () => {
      renderMatrix();
      expect(screen.getByTestId(`party-stepper-${VELLUM_BOSS.family}`)).toBeTruthy();
    });

    it('keeps the party stepper on weekly-only bosses (Baldrix)', () => {
      const BALDRIX = bosses.find((b) => b.family === 'baldrix')!;
      renderMatrix();
      expect(screen.getByTestId(`party-stepper-${BALDRIX.family}`)).toBeTruthy();
    });

    it('renders the party stepper on monthly-only bosses (Black Mage)', () => {
      renderMatrix();
      expect(screen.getByTestId(`party-stepper-${BLACK_MAGE_BOSS.family}`)).toBeTruthy();
    });

    it('daily-only rows still render with the same tier column layout as other rows', () => {
      renderMatrix();
      const horntailRow = screen
        .getByTestId(`matrix-cell-${HORNTAIL}-easy`)
        .closest('[role="row"]') as HTMLElement;
      const lucidRow = screen
        .getByTestId(`matrix-cell-${LUCID}-easy`)
        .closest('[role="row"]') as HTMLElement;
      expect(horntailRow.style.gridTemplateColumns).toBe(lucidRow.style.gridTemplateColumns);
    });
  });

  describe('cadence-aware cell displays', () => {
    it('weekly cells on a mixed boss (Chaos Vellum) divide by party size', () => {
      renderMatrix([], vi.fn(), { [VELLUM_BOSS.family]: 3 });
      const chaosCell = screen.getByTestId(`matrix-cell-${VELLUM}-chaos`);
      expect(chaosCell.textContent).toContain(formatMeso(VELLUM_CHAOS_VALUE / 3, true));
    });

    it('daily cells on a mixed boss (Normal Vellum) ignore party size', () => {
      renderMatrix([], vi.fn(), { [VELLUM_BOSS.family]: 3 });
      const normalCell = screen.getByTestId(`matrix-cell-${VELLUM}-normal`);
      expect(normalCell.textContent).toContain(formatMeso(VELLUM_NORMAL_VALUE, true));
    });

    it('changing party size from 1 to 3 updates only the weekly-tier cell display', () => {
      const { rerender } = renderMatrix([], vi.fn(), {
        [VELLUM_BOSS.family]: 1,
      });
      const chaosAt1 = screen.getByTestId(`matrix-cell-${VELLUM}-chaos`).textContent;
      const normalAt1 = screen.getByTestId(`matrix-cell-${VELLUM}-normal`).textContent;

      rerender(
        <BossMatrix
          families={viewOf([])}
          onToggleKey={vi.fn()}
          partySizes={{ [VELLUM_BOSS.family]: 3 }}
          onChangePartySize={vi.fn()}
        />,
      );

      const chaosAt3 = screen.getByTestId(`matrix-cell-${VELLUM}-chaos`).textContent;
      const normalAt3 = screen.getByTestId(`matrix-cell-${VELLUM}-normal`).textContent;

      expect(chaosAt3).not.toBe(chaosAt1);
      expect(chaosAt3).toContain(formatMeso(VELLUM_CHAOS_VALUE / 3, true));
      expect(normalAt3).toBe(normalAt1);
      expect(normalAt3).toContain(formatMeso(VELLUM_NORMAL_VALUE, true));
    });

    it.each(['easy', 'normal', 'chaos'] as const)(
      'daily-only boss cells (Horntail %s) ignore party size even if a size is set',
      (tier) => {
        renderMatrix([], vi.fn(), { [HORNTAIL_BOSS.family]: 4 });
        const cell = screen.getByTestId(`matrix-cell-${HORNTAIL}-${tier}`);
        const diff = HORNTAIL_BOSS.difficulty.find((d) => d.tier === tier)!;
        expect(cell.textContent).toContain(formatMeso(diff.crystalValue, true));
      },
    );
  });

  describe('sticky tier header', () => {
    it('the header row is sticky at top-0 so tier pips pin while scrolling', () => {
      renderMatrix();
      const headerRow = screen.getAllByRole('row')[0];
      expect(headerRow.className).toContain('sticky');
      expect(headerRow.className).toContain('top-0');
    });
  });

  describe('daily x7 hint', () => {
    it('daily cells show an "x 7" hint next to the meso value', () => {
      renderMatrix();
      const cell = screen.getByTestId(`matrix-cell-${VELLUM}-normal`);
      expect(cell.textContent).toMatch(/x\s*7/);
    });

    it('weekly cells do NOT show the "x 7" hint', () => {
      renderMatrix();
      const cell = screen.getByTestId(`matrix-cell-${VELLUM}-chaos`);
      expect(cell.textContent).not.toMatch(/x\s*7/);
    });

    it('empty (no-tier) cells do NOT show the "x 7" hint', () => {
      renderMatrix();
      const cell = screen.getByTestId(`matrix-cell-${BLACK_MAGE}-easy`);
      expect(cell.textContent).not.toMatch(/x\s*7/);
    });
  });

  describe('bosses prop', () => {
    it('defaults to rendering every family when no bosses prop is passed', () => {
      renderMatrix();
      // One header row + one row per family in the default list.
      const rows = screen.getAllByRole('row');
      expect(rows).toHaveLength(bosses.length + 1);
    });

    it('renders only the header row when families={[]} is passed', () => {
      render(
        <BossMatrix
          families={[]}
          onToggleKey={vi.fn()}
          partySizes={{}}
          onChangePartySize={vi.fn()}
        />,
      );
      const rows = screen.getAllByRole('row');
      expect(rows).toHaveLength(1);
      expect(screen.queryAllByRole('rowheader')).toHaveLength(0);
    });

    it('renders exactly the families given, in the order provided', () => {
      const subsetFamilies = new Set([
        LUCID_BOSS.family,
        BLACK_MAGE_BOSS.family,
        VELLUM_BOSS.family,
      ]);
      // Preserve display order via the slate's view, then hand-order the
      // subset to assert `families`-prop order is honoured by the render.
      const all = viewOf([]).filter((f) => subsetFamilies.has(f.family));
      const byFamily = new Map(all.map((f) => [f.family, f]));
      const subset = [
        byFamily.get(LUCID_BOSS.family)!,
        byFamily.get(BLACK_MAGE_BOSS.family)!,
        byFamily.get(VELLUM_BOSS.family)!,
      ];
      render(
        <BossMatrix
          families={subset}
          onToggleKey={vi.fn()}
          partySizes={{}}
          onChangePartySize={vi.fn()}
        />,
      );
      const rowHeaders = screen.getAllByRole('rowheader');
      expect(rowHeaders).toHaveLength(subset.length);
      expect(rowHeaders[0].textContent).toContain('Lucid');
      expect(rowHeaders[1].textContent).toContain('Black Mage');
      expect(rowHeaders[2].textContent).toContain('Vellum');
    });
  });

  describe('fused top', () => {
    it('defaults to the rounded-[10px] wrapper when fusedTop is not passed', () => {
      const { container } = renderMatrix();
      const wrapper = container.querySelector('[role="table"]') as HTMLElement;
      expect(wrapper.className).toContain('rounded-[10px]');
      expect(wrapper.className).not.toContain('rounded-t-none');
    });

    it('squares top corners and drops top border when fusedTop={true}', () => {
      const { container } = render(
        <BossMatrix
          families={viewOf([])}
          onToggleKey={vi.fn()}
          partySizes={{}}
          onChangePartySize={vi.fn()}
          fusedTop
        />,
      );
      const wrapper = container.querySelector('[role="table"]') as HTMLElement;
      expect(wrapper.className).toContain('rounded-t-none');
      expect(wrapper.className).toContain('rounded-b-[10px]');
      expect(wrapper.className).toContain('border-t-0');
      // Default rounded-[10px] is not present when fused.
      expect(wrapper.className).not.toMatch(/\brounded-\[10px\]/);
    });

    it('keeps rounded-[10px] when fusedTop={false}', () => {
      const { container } = render(
        <BossMatrix
          families={viewOf([])}
          onToggleKey={vi.fn()}
          partySizes={{}}
          onChangePartySize={vi.fn()}
          fusedTop={false}
        />,
      );
      const wrapper = container.querySelector('[role="table"]') as HTMLElement;
      expect(wrapper.className).toContain('rounded-[10px]');
      expect(wrapper.className).not.toContain('rounded-t-none');
    });
  });

  describe('slate view contract (slice 3)', () => {
    it('renders `selected: true` Slate Rows with data-state="on"', () => {
      renderMatrix([HARD_LUCID]);
      const cell = screen.getByTestId(`matrix-cell-${LUCID}-hard`);
      expect(cell.getAttribute('data-state')).toBe('on');
    });

    it('Tier Swap: selecting a sibling-tier key on the same (bossId, weekly) bucket keeps exactly one row selected', () => {
      // Simulate a Tier Swap at the slate layer — normal and hard Lucid are
      // same-cadence on the same family; the slate must retain only one.
      const swapped = MuleBossSlate.from([NORMAL_LUCID]).toggle(HARD_LUCID).keys;
      render(
        <BossMatrix
          families={MuleBossSlate.from(swapped as string[]).view()}
          onToggleKey={vi.fn()}
          partySizes={{}}
          onChangePartySize={vi.fn()}
        />,
      );
      expect(screen.getByTestId(`matrix-cell-${LUCID}-hard`).getAttribute('data-state')).toBe('on');
      expect(screen.getByTestId(`matrix-cell-${LUCID}-normal`).getAttribute('data-state')).not.toBe(
        'on',
      );
    });

    it('cross-cadence coexistence: daily + weekly selections on a mixed boss both render as on', () => {
      // Normal Vellum is daily; Chaos Vellum is weekly — both keys coexist in
      // a single slate and both Slate Rows carry `selected: true`.
      renderMatrix([NORMAL_VELLUM_DAILY, CHAOS_VELLUM_WEEKLY]);
      expect(screen.getByTestId(`matrix-cell-${VELLUM}-normal`).getAttribute('data-state')).toBe(
        'on',
      );
      expect(screen.getByTestId(`matrix-cell-${VELLUM}-chaos`).getAttribute('data-state')).toBe(
        'on',
      );
    });

    it('search filter (slate.view(search)) hides non-matching families', () => {
      const families = MuleBossSlate.from([HARD_LUCID]).view('lucid');
      render(
        <BossMatrix
          families={families}
          onToggleKey={vi.fn()}
          partySizes={{}}
          onChangePartySize={vi.fn()}
        />,
      );
      const rowHeaders = screen.getAllByRole('rowheader');
      expect(rowHeaders).toHaveLength(1);
      expect(rowHeaders[0].textContent).toContain('Lucid');
    });

    it('selected state carries through the search filter', () => {
      // Filter down to Lucid with Hard Lucid selected; the surviving row keeps
      // its `selected: true` flag baked in by `slate.view`.
      const families = MuleBossSlate.from([HARD_LUCID]).view('lucid');
      render(
        <BossMatrix
          families={families}
          onToggleKey={vi.fn()}
          partySizes={{}}
          onChangePartySize={vi.fn()}
        />,
      );
      expect(screen.getByTestId(`matrix-cell-${LUCID}-hard`).getAttribute('data-state')).toBe('on');
    });
  });
});
