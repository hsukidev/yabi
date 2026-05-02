import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@/test/test-utils';
import { IncomePieChart } from '../IncomePieChart';
import { describeArc, formatCompact, formatCenterPercent } from '../IncomePieChart.utils';
import type { Mule } from '../../types';
import { bosses } from '../../data/bosses';
import { MULE_PALETTE } from '../../utils/muleColor';
import { formatMeso } from '../../utils/meso';
import { WORLD_WEEKLY_CRYSTAL_CAP } from '../../modules/worldIncome';

const HILLA = bosses.find((b) => b.family === 'hilla')!.id;
// Normal Hilla is a daily tier (slice 2, per the PRD daily classification).
const NORMAL_HILLA = `${HILLA}:normal:daily`;
const BLACK_MAGE = bosses.find((b) => b.family === 'black-mage')!.id;

/**
 * Highest-Heroic-`crystalValue` weekly slate keys, ordered desc. Mirrors the
 * `KpiCard` over-cap test fixture so the cap-cut math is consistent across
 * cap-aware component tests.
 */
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
// Black Mage Hard is monthly cadence; monthly selections don't contribute to
// totalCrystalValue (weekly-basis), so a mule holding only this key renders
// as an empty slice in the pie — mind that when asserting visibility.
const HARD_BLACK_MAGE = `${BLACK_MAGE}:hard:monthly`;

const muleWithBosses: Mule = {
  id: 'mule-1',
  name: 'TestMule',
  level: 200,
  muleClass: 'Hero',
  selectedBosses: [NORMAL_HILLA],
  active: true,
};

const muleNoBosses: Mule = {
  id: 'mule-2',
  name: 'EmptyMule',
  level: 150,
  muleClass: 'Paladin',
  selectedBosses: [],
  active: true,
};

/**
 * Build a mule whose id is meaningful and who has at least one boss so it
 * shows up in the pie.
 */
function makeMule(id: string, overrides: Partial<Mule> = {}): Mule {
  return {
    id,
    name: id,
    level: 200,
    muleClass: 'Hero',
    selectedBosses: [NORMAL_HILLA],
    active: true,
    ...overrides,
  };
}

/**
 * Read the ChartContainer's inlined `<style>` block and return a map from
 * mule id → CSS color token. The ChartContainer emits `--color-<id>: <token>`
 * for every entry in `chartConfig`, which our IncomePieChart keys by mule id.
 * That makes the style text a clean, test-stable view of the name↔color
 * pairing the legend and tooltip both derive from.
 */
function readMuleColors(container: HTMLElement): Record<string, string> {
  const styleEl = container.querySelector('style');
  const css = styleEl?.textContent ?? '';
  const map: Record<string, string> = {};
  // Match `--color-<id>: <value>;` — ids come from mule uuids / test ids.
  const re = /--color-([^:\s]+):\s*([^;]+);/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(css)) !== null) {
    map[m[1]] = m[2].trim();
  }
  return map;
}

describe('IncomePieChart', () => {
  it('shows empty state when no mules have bosses selected', () => {
    render(<IncomePieChart mules={[muleNoBosses]} />);
    expect(screen.getByText('No bosses tallied yet')).toBeTruthy();
  });

  it('shows empty state when mules array is empty', () => {
    render(<IncomePieChart mules={[]} />);
    expect(screen.getByText('No bosses tallied yet')).toBeTruthy();
  });

  it('does not show empty state message when mules have bosses', () => {
    render(<IncomePieChart mules={[muleWithBosses]} />);
    expect(screen.queryByText('No bosses tallied yet')).toBeNull();
  });

  describe('describeArc', () => {
    it('renders a full-circle donut without a degenerate zero-length arc', () => {
      const path = describeArc(150, 150, 60, 100, 90, 450);

      // M <sx> <sy> A <rx> <ry> <rot> <large> <sweep> <ex> <ey> ...
      const outerCmd = path.match(
        /M\s*([\d.-]+)\s+([\d.-]+)\s+A\s+[\d.-]+\s+[\d.-]+\s+\d+\s+\d+\s+\d+\s+([\d.-]+)\s+([\d.-]+)/,
      );
      expect(outerCmd).not.toBeNull();
      const [, sx, sy, ex, ey] = outerCmd!;
      const sameStartEnd =
        Math.abs(parseFloat(sx) - parseFloat(ex)) < 0.01 &&
        Math.abs(parseFloat(sy) - parseFloat(ey)) < 0.01;
      expect(sameStartEnd).toBe(false);
    });
  });

  describe('formatCompact (center total)', () => {
    it('formats billions with two decimal places', () => {
      expect(formatCompact(47_070_000_000)).toBe('47.07B');
    });

    it('formats millions with two decimal places', () => {
      expect(formatCompact(504_000_000)).toBe('504.00M');
    });

    it('formats thousands with two decimal places', () => {
      expect(formatCompact(12_345)).toBe('12.35K');
    });
  });

  describe('center percentage display', () => {
    it('renders 100.0% by default when no slice is hovered', () => {
      render(<IncomePieChart mules={[muleWithBosses]} />);
      expect(screen.getByText('100.0%')).toBeTruthy();
    });

    it('renders 100.0% with multiple mules when none are hovered', () => {
      const mules = [
        makeMule('A', { selectedBosses: [HARD_BLACK_MAGE] }),
        makeMule('B', { selectedBosses: [NORMAL_HILLA] }),
      ];
      render(<IncomePieChart mules={mules} />);
      expect(screen.getByText('100.0%')).toBeTruthy();
    });
  });

  describe('formatCenterPercent (center percent label)', () => {
    it('returns 100.0% when no slice is hovered', () => {
      expect(formatCenterPercent(undefined, [10, 30, 60])).toBe('100.0%');
    });

    it('returns the hovered slice share to one decimal', () => {
      // 30 / (10 + 30 + 60) = 30%
      expect(formatCenterPercent(1, [10, 30, 60])).toBe('30.0%');
    });

    it('rounds to one decimal place', () => {
      // 1 / 3 ≈ 33.333…
      expect(formatCenterPercent(0, [1, 1, 1])).toBe('33.3%');
    });

    it('returns 100.0% for a single-slice pie even when hovered', () => {
      expect(formatCenterPercent(0, [42])).toBe('100.0%');
    });

    it('returns 100.0% when total is 0 (all zero values)', () => {
      // Avoids NaN from a divide-by-zero on an empty/zero pie.
      expect(formatCenterPercent(0, [0, 0])).toBe('100.0%');
    });

    it('returns 100.0% when activeIndex is out of range', () => {
      expect(formatCenterPercent(5, [10, 20])).toBe('100.0%');
      expect(formatCenterPercent(-1, [10, 20])).toBe('100.0%');
    });

    it('returns 100.0% when values is empty', () => {
      expect(formatCenterPercent(0, [])).toBe('100.0%');
    });

    it('hovered shares of all slices sum to ~100%', () => {
      const values = [123, 456, 789, 1011];
      const sum = values
        .map((_, i) => parseFloat(formatCenterPercent(i, values)))
        .reduce((a, b) => a + b, 0);
      expect(sum).toBeCloseTo(100, 0);
    });
  });

  it('fires onSliceClick when a pie slice is clicked', () => {
    const onSliceClick = vi.fn();
    const { container } = render(
      <IncomePieChart mules={[muleWithBosses]} onSliceClick={onSliceClick} />,
    );
    const paths = container.querySelectorAll('.recharts-pie-sector');
    if (paths.length > 0) {
      fireEvent.click(paths[0]);
      expect(onSliceClick).toHaveBeenCalledWith('mule-1');
    }
  });

  describe('cap-aware slice basis (issue #237)', () => {
    // Build an over-cap roster for cap-aware tests. The hilla mule's 7 daily
    // 4M slots sit below every weekly slot in the pool, so the World Cap Cut
    // attributes are deterministic.
    function buildOverCapRoster(hillaSelected = [NORMAL_HILLA]): Mule[] {
      const top14 = topWeeklyKeys(14).map((k) => k.slateKey);
      const out: Mule[] = [];
      for (let i = 0; i < 13; i++) {
        out.push({
          id: `m${i}`,
          name: `M${i}`,
          level: 200,
          muleClass: 'Hero',
          selectedBosses: top14,
          active: true,
        });
      }
      out.push({
        id: 'mhilla',
        name: 'HillaMule',
        level: 200,
        muleClass: 'Hero',
        selectedBosses: hillaSelected,
        active: true,
      });
      return out;
    }

    it('filters out a fully-dropped mule (renders no slice for it)', () => {
      // 13 mules × 14 top weeklies = 182 weekly slots, plus a hilla mule with
      // 7 daily 4M slots = 189 total. Top 180 are all weekly slots; every
      // hilla daily slot drops, so the hilla mule's contributedMeso === 0.
      const mules = buildOverCapRoster();
      const { container } = render(<IncomePieChart mules={mules} />);
      const colors = readMuleColors(container);
      expect(colors.mhilla).toBeUndefined();
      // The fully-dropped mule renders no slice; the 13 over-cap mules do.
      expect(Object.keys(colors)).toHaveLength(13);
    });

    it("sizes a partially-dropped mule's slice on contributedMeso, not uncapped potential", () => {
      // 12 mules × 14 weeklies (168) + 1 mule × 10 weeklies (10) = 178 weekly
      // slots, plus 7 hilla daily 4M slots = 185 total. Top 180 keep all 178
      // weeklies + 2 of 7 hilla. Hilla mule: potential 28M, contributed 8M.
      const top14 = topWeeklyKeys(14).map((k) => k.slateKey);
      const mules: Mule[] = [];
      for (let i = 0; i < 12; i++) {
        mules.push({
          id: `m${i}`,
          name: `M${i}`,
          level: 200,
          muleClass: 'Hero',
          selectedBosses: top14,
          active: true,
        });
      }
      mules.push({
        id: 'm12',
        name: 'M12',
        level: 200,
        muleClass: 'Hero',
        selectedBosses: top14.slice(0, 10),
        active: true,
      });
      mules.push({
        id: 'mhilla',
        name: 'HillaMule',
        level: 200,
        muleClass: 'Hero',
        selectedBosses: [NORMAL_HILLA],
        active: true,
      });

      const { container } = render(<IncomePieChart mules={mules} />, {
        defaultAbbreviated: false,
      });

      // Hilla mule is the last visible slice (input order). Hover it to
      // surface its formatted value in the center label.
      const sectors = container.querySelectorAll('.recharts-pie-sector');
      expect(sectors.length).toBe(14);
      fireEvent.mouseEnter(sectors[sectors.length - 1]);

      // Center shows the hilla mule's post-cap value (2 × 4M = 8M), not its
      // uncapped potential (7 × 4M = 28M).
      expect(screen.getByText('HillaMule')).toBeTruthy();
      expect(screen.getByText(formatMeso(8_000_000, false))).toBeTruthy();
      expect(screen.queryByText(formatMeso(28_000_000, false))).toBeNull();
    });

    it("center 'Total' reconciles with the post-cap world total (matches the KPI bignum basis)", () => {
      // Same over-cap fixture as the fully-dropped test. Total contributed =
      // sum of the top 180 weekly slot values from the 13×14 pool. Compute
      // it from the same source the aggregator does so the assertion tracks
      // the cap-cut, not a literal.
      const top14Values = topWeeklyKeys(14).map((k) => k.value);
      const allWeeklyValues = top14Values.flatMap((v) => Array(13).fill(v));
      allWeeklyValues.sort((a, b) => b - a);
      const expectedPostCap = allWeeklyValues
        .slice(0, WORLD_WEEKLY_CRYSTAL_CAP)
        .reduce((s, v) => s + v, 0);

      const mules = buildOverCapRoster();
      render(<IncomePieChart mules={mules} />, { defaultAbbreviated: false });

      // No slice hovered → center shows the "Total" sum of all visible slice
      // values, which equals the post-cap world total after Slice 3.
      expect(screen.getByText('Total')).toBeTruthy();
      expect(screen.getByText(formatMeso(expectedPostCap, false))).toBeTruthy();
    });

    it('under-cap rosters see no behavior change (slice value equals potential)', () => {
      // Single mule, 1 weekly Lucid → 1 slot, well under cap. Slice value
      // equals the mule's full potential (504M Heroic) — same as before.
      const HARD_LUCID = `${bosses.find((b) => b.family === 'lucid')!.id}:hard:weekly`;
      const m: Mule = {
        id: 'solo',
        name: 'Solo',
        level: 200,
        muleClass: 'Hero',
        selectedBosses: [HARD_LUCID],
        active: true,
      };
      render(<IncomePieChart mules={[m]} />, { defaultAbbreviated: false });
      expect(screen.getByText(formatMeso(504_000_000, false))).toBeTruthy();
    });
  });

  describe('balanced slice colors', () => {
    it('assigns distinct colors to each mule when the roster fits in the palette', () => {
      const mules = Array.from({ length: MULE_PALETTE.length }, (_, i) => makeMule(`mule-${i}`));
      const { container } = render(<IncomePieChart mules={mules} />);
      const colors = Object.values(readMuleColors(container));
      expect(new Set(colors).size).toBe(MULE_PALETTE.length);
    });

    it('keeps color counts balanced within 1 when mules exceed the palette', () => {
      const N = MULE_PALETTE.length * 3 + 2;
      const mules = Array.from({ length: N }, (_, i) => makeMule(`mule-${i}`));
      const { container } = render(<IncomePieChart mules={mules} />);

      const counts = new Map<string, number>();
      for (const c of Object.values(readMuleColors(container))) {
        counts.set(c, (counts.get(c) ?? 0) + 1);
      }
      const values = [...counts.values()];
      expect(Math.max(...values) - Math.min(...values)).toBeLessThanOrEqual(1);
    });

    it('cycles the palette by visible position, skipping filtered-out mules', () => {
      // muleNoBosses is filtered out; the three visible mules should land on
      // palette slots 0, 1, 2 regardless of their position in the input.
      const visibleA = makeMule('A');
      const visibleB = makeMule('B');
      const visibleC = makeMule('C');
      const { container } = render(
        <IncomePieChart mules={[visibleA, muleNoBosses, visibleB, visibleC]} />,
      );
      const colors = readMuleColors(container);
      expect(colors.A).toBe(MULE_PALETTE[0]);
      expect(colors.B).toBe(MULE_PALETTE[1]);
      expect(colors.C).toBe(MULE_PALETTE[2]);
    });
  });
});
