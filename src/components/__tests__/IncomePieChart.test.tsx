import { describe, expect, it, vi } from 'vitest'
import { render, screen, fireEvent } from '@/test/test-utils'
import {
  IncomePieChart,
  describeArc,
  formatCompact,
  formatCenterPercent,
} from '../IncomePieChart'
import type { Mule } from '../../types'
import { bosses } from '../../data/bosses'
import { MULE_PALETTE } from '../../utils/muleColor'

const HILLA = bosses.find((b) => b.family === 'hilla')!.id
// Normal Hilla is a daily tier (slice 2, per the PRD daily classification).
const NORMAL_HILLA = `${HILLA}:normal:daily`
const BLACK_MAGE = bosses.find((b) => b.family === 'black-mage')!.id
const HARD_BLACK_MAGE = `${BLACK_MAGE}:hard:weekly`

const muleWithBosses: Mule = {
  id: 'mule-1',
  name: 'TestMule',
  level: 200,
  muleClass: 'Hero',
  selectedBosses: [NORMAL_HILLA],
  active: true,
}

const muleNoBosses: Mule = {
  id: 'mule-2',
  name: 'EmptyMule',
  level: 150,
  muleClass: 'Paladin',
  selectedBosses: [],
  active: true,
}

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
    ...overrides,
  }
}

/**
 * Read the ChartContainer's inlined `<style>` block and return a map from
 * mule id → CSS color token. The ChartContainer emits `--color-<id>: <token>`
 * for every entry in `chartConfig`, which our IncomePieChart keys by mule id.
 * That makes the style text a clean, test-stable view of the name↔color
 * pairing the legend and tooltip both derive from.
 */
function readMuleColors(container: HTMLElement): Record<string, string> {
  const styleEl = container.querySelector('style')
  const css = styleEl?.textContent ?? ''
  const map: Record<string, string> = {}
  // Match `--color-<id>: <value>;` — ids come from mule uuids / test ids.
  const re = /--color-([^:\s]+):\s*([^;]+);/g
  let m: RegExpExecArray | null
  while ((m = re.exec(css)) !== null) {
    map[m[1]] = m[2].trim()
  }
  return map
}

describe('IncomePieChart', () => {
  it('shows empty state when no mules have bosses selected', () => {
    render(<IncomePieChart mules={[muleNoBosses]} />)
    expect(screen.getByText('No bosses tallied yet')).toBeTruthy()
  })

  it('shows empty state when mules array is empty', () => {
    render(<IncomePieChart mules={[]} />)
    expect(screen.getByText('No bosses tallied yet')).toBeTruthy()
  })

  it('does not show empty state message when mules have bosses', () => {
    render(<IncomePieChart mules={[muleWithBosses]} />)
    expect(screen.queryByText('No bosses tallied yet')).toBeNull()
  })

  describe('describeArc', () => {
    it('renders a full-circle donut without a degenerate zero-length arc', () => {
      const path = describeArc(150, 150, 60, 100, 90, 450)

      // M <sx> <sy> A <rx> <ry> <rot> <large> <sweep> <ex> <ey> ...
      const outerCmd = path.match(
        /M\s*([\d.-]+)\s+([\d.-]+)\s+A\s+[\d.-]+\s+[\d.-]+\s+\d+\s+\d+\s+\d+\s+([\d.-]+)\s+([\d.-]+)/,
      )
      expect(outerCmd).not.toBeNull()
      const [, sx, sy, ex, ey] = outerCmd!
      const sameStartEnd =
        Math.abs(parseFloat(sx) - parseFloat(ex)) < 0.01 &&
        Math.abs(parseFloat(sy) - parseFloat(ey)) < 0.01
      expect(sameStartEnd).toBe(false)
    })
  })

  describe('formatCompact (center total)', () => {
    it('formats billions with two decimal places', () => {
      expect(formatCompact(47_070_000_000)).toBe('47.07B')
    })

    it('formats millions with two decimal places', () => {
      expect(formatCompact(504_000_000)).toBe('504.00M')
    })

    it('formats thousands with two decimal places', () => {
      expect(formatCompact(12_345)).toBe('12.35K')
    })
  })

  describe('center percentage display', () => {
    it('renders 100.0% by default when no slice is hovered', () => {
      render(<IncomePieChart mules={[muleWithBosses]} />)
      expect(screen.getByText('100.0%')).toBeTruthy()
    })

    it('renders 100.0% with multiple mules when none are hovered', () => {
      const mules = [
        makeMule('A', { selectedBosses: [HARD_BLACK_MAGE] }),
        makeMule('B', { selectedBosses: [NORMAL_HILLA] }),
      ]
      render(<IncomePieChart mules={mules} />)
      expect(screen.getByText('100.0%')).toBeTruthy()
    })
  })

  describe('formatCenterPercent (center percent label)', () => {
    it('returns 100.0% when no slice is hovered', () => {
      expect(formatCenterPercent(undefined, [10, 30, 60])).toBe('100.0%')
    })

    it('returns the hovered slice share to one decimal', () => {
      // 30 / (10 + 30 + 60) = 30%
      expect(formatCenterPercent(1, [10, 30, 60])).toBe('30.0%')
    })

    it('rounds to one decimal place', () => {
      // 1 / 3 ≈ 33.333…
      expect(formatCenterPercent(0, [1, 1, 1])).toBe('33.3%')
    })

    it('returns 100.0% for a single-slice pie even when hovered', () => {
      expect(formatCenterPercent(0, [42])).toBe('100.0%')
    })

    it('returns 100.0% when total is 0 (all zero values)', () => {
      // Avoids NaN from a divide-by-zero on an empty/zero pie.
      expect(formatCenterPercent(0, [0, 0])).toBe('100.0%')
    })

    it('returns 100.0% when activeIndex is out of range', () => {
      expect(formatCenterPercent(5, [10, 20])).toBe('100.0%')
      expect(formatCenterPercent(-1, [10, 20])).toBe('100.0%')
    })

    it('returns 100.0% when values is empty', () => {
      expect(formatCenterPercent(0, [])).toBe('100.0%')
    })

    it('hovered shares of all slices sum to ~100%', () => {
      const values = [123, 456, 789, 1011]
      const sum = values
        .map((_, i) => parseFloat(formatCenterPercent(i, values)))
        .reduce((a, b) => a + b, 0)
      expect(sum).toBeCloseTo(100, 0)
    })
  })

  it('fires onSliceClick when a pie slice is clicked', () => {
    const onSliceClick = vi.fn()
    const { container } = render(
      <IncomePieChart mules={[muleWithBosses]} onSliceClick={onSliceClick} />
    )
    const paths = container.querySelectorAll('.recharts-pie-sector')
    if (paths.length > 0) {
      fireEvent.click(paths[0])
      expect(onSliceClick).toHaveBeenCalledWith('mule-1')
    }
  })

  describe('per-mule stable slice colors', () => {
    it('keeps each mule\'s slice color unchanged when the roster is reordered', () => {
      const mules = [makeMule('A'), makeMule('B'), makeMule('C')]

      const first = render(<IncomePieChart mules={mules} />)
      const before = readMuleColors(first.container)
      first.unmount()

      const reordered = [mules[2], mules[0], mules[1]] // C, A, B
      const second = render(<IncomePieChart mules={reordered} />)
      const after = readMuleColors(second.container)

      expect(after.A).toBe(before.A)
      expect(after.B).toBe(before.B)
      expect(after.C).toBe(before.C)
    })

    it('does not change existing slice colors when a new mule is prepended', () => {
      const existing = [makeMule('A'), makeMule('B'), makeMule('C')]

      const first = render(<IncomePieChart mules={existing} />)
      const before = readMuleColors(first.container)
      first.unmount()

      const withNew = [makeMule('NEW'), ...existing]
      const second = render(<IncomePieChart mules={withNew} />)
      const after = readMuleColors(second.container)

      expect(after.A).toBe(before.A)
      expect(after.B).toBe(before.B)
      expect(after.C).toBe(before.C)
      // And the new mule has a defined color as well.
      expect(after.NEW).toBeDefined()
    })

    it('does not change existing slice colors when an unrelated mule is removed', () => {
      const mules = [makeMule('A'), makeMule('B'), makeMule('C')]

      const first = render(<IncomePieChart mules={mules} />)
      const before = readMuleColors(first.container)
      first.unmount()

      // Drop B from the middle.
      const shrunken = [mules[0], mules[2]]
      const second = render(<IncomePieChart mules={shrunken} />)
      const after = readMuleColors(second.container)

      expect(after.A).toBe(before.A)
      expect(after.C).toBe(before.C)
    })

    it('keeps name↔color pairing intact so legend/tooltip stay correct after reorder', () => {
      const mules = [makeMule('alpha'), makeMule('bravo'), makeMule('charlie')]

      const first = render(<IncomePieChart mules={mules} />)
      const before = readMuleColors(first.container)
      first.unmount()

      // Rotate: [bravo, charlie, alpha]
      const rotated = [mules[1], mules[2], mules[0]]
      const second = render(<IncomePieChart mules={rotated} />)
      const after = readMuleColors(second.container)

      // The legend derives entries from chartConfig keyed by mule id, so a
      // stable per-id color automatically keeps each name paired with the
      // same color after any reorder.
      for (const id of ['alpha', 'bravo', 'charlie']) {
        expect(after[id]).toBe(before[id])
      }
    })

    it('with more mules than palette slots, color mapping is stable across reorders', () => {
      const N = MULE_PALETTE.length + 3
      const mules = Array.from({ length: N }, (_, i) => makeMule(`mule-${i}`))

      const first = render(<IncomePieChart mules={mules} />)
      const before = readMuleColors(first.container)
      first.unmount()

      // Every mule has a defined color.
      for (let i = 0; i < N; i++) {
        expect(before[`mule-${i}`]).toBeDefined()
      }
      // Collisions exist (pigeonhole), and two colliding mules share a color.
      const values = Object.values(before)
      const unique = new Set(values)
      expect(unique.size).toBeLessThan(values.length)

      // Reorder — reverse the whole roster, which moves every mule past
      // whichever sibling it may be color-sharing with.
      const reversed = [...mules].reverse()
      const second = render(<IncomePieChart mules={reversed} />)
      const after = readMuleColors(second.container)

      // Each mule keeps its color.
      for (let i = 0; i < N; i++) {
        expect(after[`mule-${i}`]).toBe(before[`mule-${i}`])
      }

      // And any two mules that shared a color before still share one after,
      // and any two that differed still differ.
      for (let i = 0; i < N; i++) {
        for (let j = i + 1; j < N; j++) {
          const sharedBefore = before[`mule-${i}`] === before[`mule-${j}`]
          const sharedAfter = after[`mule-${i}`] === after[`mule-${j}`]
          expect(sharedAfter).toBe(sharedBefore)
        }
      }
    })
  })
})
