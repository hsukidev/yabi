import { describe, expect, it, afterEach } from 'vitest';
import {
  render,
  screen,
  within,
  fireEvent,
  mockMatchMedia,
  restoreMatchMedia,
} from '@/test/test-utils';
import { KpiCard } from '../KpiCard';
import { WORLD_WEEKLY_CRYSTAL_CAP } from '../../modules/worldIncome';
import { formatMeso } from '../../utils/meso';
import type { Mule } from '../../types';
import { bosses } from '../../data/bosses';

function mockNarrowViewport(maxPx: number) {
  mockMatchMedia((query) => {
    const m = /max-width:\s*([\d.]+)px/.exec(query);
    const queryMaxPx = m ? Number(m[1]) : Infinity;
    return maxPx <= queryMaxPx;
  });
}

const HARD_LUCID = `${bosses.find((b) => b.family === 'lucid')!.id}:hard:weekly`;
const BLACK_MAGE_EXTREME = `${bosses.find((b) => b.family === 'black-mage')!.id}:extreme:monthly`;

function topWeeklyKeys(n: number): { slateKey: string; value: number }[] {
  const all: { slateKey: string; value: number }[] = [];
  for (const b of bosses) {
    const weeklies = b.difficulty.filter((d) => d.cadence === 'weekly');
    if (weeklies.length === 0) continue;
    const top = weeklies.reduce((a, c) => (c.crystalValue.Heroic > a.crystalValue.Heroic ? c : a));
    all.push({ slateKey: `${b.id}:${top.tier}:weekly`, value: top.crystalValue.Heroic });
  }
  all.sort((a, b) => b.value - a.value);
  return all.slice(0, n);
}

// Read the value div paired with a stat-row label. Works for both KpiStat
// and CrystalKpiStat — `getByText(label)` resolves to the eyebrow node
// even when CrystalKpiStat tucks an icon next to the text.
function tileValue(label: string): string {
  const card = screen.getByTestId('income-card') as HTMLElement;
  const labelEl = within(card).getByText(label);
  const section = labelEl.parentElement!;
  const button = within(section).queryByRole('button');
  if (button) return button.textContent ?? '';
  return section.querySelectorAll('div')[1]!.textContent ?? '';
}

const mule: Mule = {
  id: 'm1',
  name: 'A',
  level: 200,
  muleClass: 'Hero',
  selectedBosses: [],
  active: true,
};

function activeStatValue(): string {
  return tileValue('ACTIVE');
}

function bignumText(): string {
  return screen.getByRole('button', { name: /toggle abbreviated meso format/i }).textContent ?? '';
}

function expectedBlackMageIncomeButton(): HTMLElement {
  return screen.getByRole('button', { name: /toggle expected black mage income meso format/i });
}

describe('KpiCard', () => {
  it('uses a fixed padding independent of density', () => {
    render(<KpiCard mules={[mule]} />);
    const card = screen.getByTestId('income-card') as HTMLElement;
    expect(card.style.padding).toBe('24px');
  });

  it('counts mules with active: true regardless of boss selection', () => {
    const mules: Mule[] = [
      { ...mule, id: 'a', active: true, selectedBosses: [] },
      { ...mule, id: 'b', active: true, selectedBosses: [] },
    ];
    render(<KpiCard mules={mules} />);
    expect(activeStatValue()).toBe('2');
  });

  it('renders Expected Black Mage Income as compact meso next to weekly income', () => {
    render(<KpiCard mules={[{ ...mule, selectedBosses: [BLACK_MAGE_EXTREME] }]} />);
    const card = screen.getByTestId('income-card');
    expect(within(card).getByText('EXPECTED WEEKLY INCOME')).toBeTruthy();
    expect(within(card).getByText('EXPECTED BLACK MAGE INCOME')).toBeTruthy();
    expect(tileValue('EXPECTED BLACK MAGE INCOME')).toBe('18B');
  });

  it('excludes inactive mules from Expected Black Mage Income', () => {
    render(
      <KpiCard
        mules={[
          { ...mule, id: 'active', selectedBosses: [BLACK_MAGE_EXTREME] },
          { ...mule, id: 'inactive', active: false, selectedBosses: [BLACK_MAGE_EXTREME] },
        ]}
      />,
    );
    expect(tileValue('EXPECTED BLACK MAGE INCOME')).toBe('18B');
  });

  it('divides each Expected Black Mage Income value by that mule’s Black Mage Party Size', () => {
    render(
      <KpiCard
        mules={[
          {
            ...mule,
            selectedBosses: [BLACK_MAGE_EXTREME],
            partySizes: { 'black-mage': 6 },
          },
        ]}
      />,
    );
    expect(tileValue('EXPECTED BLACK MAGE INCOME')).toBe('3B');
  });

  it('prices each Expected Black Mage Income value against that mule’s World Group', () => {
    render(
      <KpiCard
        mules={[
          {
            ...mule,
            selectedBosses: [BLACK_MAGE_EXTREME],
            worldId: 'interactive-scania',
          },
        ]}
      />,
    );
    expect(tileValue('EXPECTED BLACK MAGE INCOME')).toBe('3.6B');
  });

  it('lets Expected Black Mage Income toggle to full meso format when it fits', () => {
    Object.defineProperty(HTMLElement.prototype, 'clientWidth', {
      configurable: true,
      value: 1000,
    });
    try {
      render(<KpiCard mules={[{ ...mule, selectedBosses: [BLACK_MAGE_EXTREME] }]} />);
      expect(tileValue('EXPECTED BLACK MAGE INCOME')).toBe('18B');
      fireEvent.click(expectedBlackMageIncomeButton());
      expect(tileValue('EXPECTED BLACK MAGE INCOME')).toBe(formatMeso(18_000_000_000, false));
    } finally {
      delete (HTMLElement.prototype as { clientWidth?: number }).clientWidth;
    }
  });

  it('does not toggle format from Expected Black Mage Income when its raw value is zero', () => {
    Object.defineProperty(HTMLElement.prototype, 'clientWidth', {
      configurable: true,
      value: 1000,
    });
    try {
      render(<KpiCard mules={[{ ...mule, selectedBosses: [HARD_LUCID] }]} />);
      expect(bignumText()).toBe('504M');
      expect(tileValue('EXPECTED BLACK MAGE INCOME')).toBe('0');
      fireEvent.click(expectedBlackMageIncomeButton());
      expect(bignumText()).toBe('504M');
      expect(tileValue('EXPECTED BLACK MAGE INCOME')).toBe('0');
    } finally {
      delete (HTMLElement.prototype as { clientWidth?: number }).clientWidth;
    }
  });

  it('does not add Expected Black Mage Income to weekly KPI readouts', () => {
    render(<KpiCard mules={[{ ...mule, selectedBosses: [HARD_LUCID, BLACK_MAGE_EXTREME] }]} />);

    expect(bignumText()).toBe('504M');
    expect(tileValue('WEEKLY')).toBe('1');
    expect(tileValue('DAILY')).toBe('0');
    expect(tileValue('MONTHLY')).toBe('1');
    expect(
      screen
        .getByRole('progressbar', { name: /weekly crystal cap/i })
        .getAttribute('aria-valuenow'),
    ).toBe('1');
  });

  it('does not toggle format when total income is zero', () => {
    const nonzeroMule: Mule = { ...mule, selectedBosses: [HARD_LUCID] };
    const { rerender } = render(<KpiCard mules={[nonzeroMule]} />);
    // Abbreviated by default → "504M"
    expect(bignumText()).toBe('504M');
    rerender(<KpiCard mules={[{ ...mule, selectedBosses: [] }]} />);
    // formatMeso(0, true) renders as "0"; format preference unchanged.
    expect(bignumText()).toBe('0');
    fireEvent.click(screen.getByRole('button', { name: /toggle abbreviated meso format/i }));
    // Still "0" — the onClick guard stops the toggle when raw===0.
    expect(bignumText()).toBe('0');
  });

  it('shows 0 when total income is zero from mount', () => {
    render(<KpiCard mules={[{ ...mule, selectedBosses: [] }]} />);
    expect(bignumText()).toBe('0');
  });

  it('preserves abbreviated format when total income transitions to zero then back', () => {
    const nonzero: Mule[] = [{ ...mule, selectedBosses: [HARD_LUCID] }];
    const zero: Mule[] = [{ ...mule, selectedBosses: [] }];
    const { rerender } = render(<KpiCard mules={nonzero} />);
    expect(bignumText()).toBe('504M');
    rerender(<KpiCard mules={zero} />);
    expect(bignumText()).toBe('0');
    // Format preference stays abbreviated — back to non-zero renders abbreviated.
    rerender(<KpiCard mules={nonzero} />);
    expect(bignumText()).toBe('504M');
  });

  it('does not count mules with active: false even if they have bosses selected', () => {
    const mules: Mule[] = [
      { ...mule, id: 'a', active: true, selectedBosses: [] },
      { ...mule, id: 'b', active: false, selectedBosses: ['x:hard:weekly', BLACK_MAGE_EXTREME] },
    ];
    render(<KpiCard mules={mules} />);
    expect(activeStatValue()).toBe('1');
    expect(tileValue('MONTHLY')).toBe('0');
  });

  describe('hybrid layout', () => {
    it('renders the Reset Countdown inside the income card (top-left)', () => {
      render(<KpiCard mules={[mule]} />);
      const card = screen.getByTestId('income-card');
      const eyebrowRow = within(card).getByTestId('kpi-eyebrow-row');
      expect(within(card).getByText(/RESET IN/i)).toBeTruthy();
      expect(eyebrowRow.style.justifyContent).toBe('flex-start');
    });

    it('renders the WEEKLY CAP rail at the bottom with a progressbar role', () => {
      render(<KpiCard mules={[mule]} />);
      const card = screen.getByTestId('income-card');
      expect(within(card).getByRole('progressbar')).toBeTruthy();
      expect(within(card).getByText('WEEKLY CAP')).toBeTruthy();
    });

    describe('narrow viewport (<600px)', () => {
      afterEach(() => {
        restoreMatchMedia();
      });

      it('uses a 2x2 grid for the stat row', () => {
        mockNarrowViewport(400);
        render(<KpiCard mules={[mule]} />);
        const card = screen.getByTestId('income-card');
        const statRow = within(card).getByTestId('kpi-stat-row');
        expect(statRow.style.display).toBe('grid');
      });

      it('stacks the expected income sections below 600px', () => {
        mockNarrowViewport(599);
        render(<KpiCard mules={[mule]} />);
        const card = screen.getByTestId('income-card');
        const incomeGrid = within(card).getByTestId('kpi-income-grid');
        const statRow = within(card).getByTestId('kpi-stat-row');
        expect(within(card).getByText(/expected weekly income/i)).toBeTruthy();
        expect(within(card).getByText(/expected black mage income/i)).toBeTruthy();
        expect(within(card).getByText(/reset in/i)).toBeTruthy();
        expect(incomeGrid.style.gridTemplateColumns).toBe('1fr');
        expect(statRow.style.display).toBe('flex');
      });

      it('keeps the expected income sections side by side at 600px', () => {
        mockNarrowViewport(600);
        render(<KpiCard mules={[mule]} />);
        const card = screen.getByTestId('income-card');
        const incomeGrid = within(card).getByTestId('kpi-income-grid');
        expect(incomeGrid.style.gridTemplateColumns).toBe('minmax(0, 1fr) minmax(0, 1fr)');
      });

      it('keeps the desktop flex layout when matchMedia is unavailable', () => {
        render(<KpiCard mules={[mule]} />);
        const card = screen.getByTestId('income-card');
        const statRow = within(card).getByTestId('kpi-stat-row');
        expect(statRow.style.display).toBe('flex');
      });
    });
  });

  describe('cap-aware readouts (issue #235)', () => {
    it('bignum reads post-cap totalContributedMeso (lower than uncapped sum on over-cap rosters)', () => {
      // Build a roster that overflows the World Cap. 13 mules × 14 weeklies
      // = 182 slots; cap = 180; 2 lowest-value weekly slots drop.
      const top14 = topWeeklyKeys(14).map((k) => k.slateKey);
      const mules: Mule[] = Array.from({ length: 13 }, (_, i) => ({
        ...mule,
        id: `m${i}`,
        selectedBosses: top14,
      }));
      render(<KpiCard mules={mules} />);
      // Uncapped sum: 13 × Σ(top14 values).
      const top14Values = topWeeklyKeys(14).map((k) => k.value);
      const uncapped = top14Values.reduce((s, v) => s + v, 0) * 13;
      // Capped sum: top 180 values out of 13 × 14 = 182.
      const allValues = top14Values.flatMap((v) => Array(13).fill(v));
      allValues.sort((a, b) => b - a);
      const capped = allValues.slice(0, WORLD_WEEKLY_CRYSTAL_CAP).reduce((s, v) => s + v, 0);
      expect(capped).toBeLessThan(uncapped);
      // Bignum renders the post-cap total. jsdom returns clientWidth=0 so the
      // overflow probe forces the abbreviated path; assert the abbreviated
      // string matches the capped (not uncapped) meso.
      expect(bignumText()).toBe(formatMeso(capped, true));
      expect(bignumText()).not.toBe(formatMeso(uncapped, true));
    });

    it('WEEKLY tile shows weeklySlotsContributed (clamped) under an over-cap fixture', () => {
      const top14 = topWeeklyKeys(14).map((k) => k.slateKey);
      const mules: Mule[] = Array.from({ length: 13 }, (_, i) => ({
        ...mule,
        id: `m${i}`,
        selectedBosses: top14,
      }));
      render(<KpiCard mules={mules} />);
      // Pool is 182 weekly slots; clamps to 180 weekly slots contributed.
      expect(tileValue('WEEKLY')).toBe(String(WORLD_WEEKLY_CRYSTAL_CAP));
      expect(tileValue('DAILY')).toBe('0');
      expect(tileValue('MONTHLY')).toBe('0');
    });

    it('DAILY tile shows the post-cap daily slot count (partial daily drop preserves slot granularity)', () => {
      // 178 weekly + 7 daily = 185 slots; cap = 180. Daily 4M slots are at the
      // bottom of the pool, so 5 of 7 daily slots drop and 2 daily survive.
      const HILLA = bosses.find((b) => b.family === 'hilla')!;
      const NORMAL_HILLA = `${HILLA.id}:normal:daily`;
      const top14 = topWeeklyKeys(14).map((k) => k.slateKey);
      const mules: Mule[] = [];
      for (let i = 0; i < 12; i++) {
        mules.push({ ...mule, id: `m${i}`, selectedBosses: top14 });
      }
      mules.push({ ...mule, id: 'm12', selectedBosses: top14.slice(0, 10) });
      mules.push({ ...mule, id: 'mhilla', selectedBosses: [NORMAL_HILLA] });
      render(<KpiCard mules={mules} />);
      expect(tileValue('WEEKLY')).toBe('178');
      expect(tileValue('DAILY')).toBe('2');
      expect(tileValue('MONTHLY')).toBe('0');
    });

    it('WEEKLY/DAILY tiles equal selection counts when the roster is under-cap (no behavior change)', () => {
      // 1 mule, 1 weekly Lucid + 0 daily. Tiles read 1/0.
      const m: Mule = { ...mule, selectedBosses: [HARD_LUCID] };
      render(<KpiCard mules={[m]} />);
      expect(tileValue('WEEKLY')).toBe('1');
      expect(tileValue('DAILY')).toBe('0');
      expect(tileValue('MONTHLY')).toBe('0');
    });
  });
});
