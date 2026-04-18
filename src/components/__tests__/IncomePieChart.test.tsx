import { describe, expect, it, vi } from 'vitest'
import { render, screen, fireEvent } from '@/test/test-utils'
import { IncomePieChart, describeArc } from '../IncomePieChart'
import type { Mule } from '../../types'
import { bosses } from '../../data/bosses'
import { makeKey } from '../../data/bossSelection'

const HILLA = bosses.find((b) => b.family === 'hilla')!.id
const NORMAL_HILLA = makeKey(HILLA, 'normal')

const muleWithBosses: Mule = {
  id: 'mule-1',
  name: 'TestMule',
  level: 200,
  muleClass: 'Hero',
  selectedBosses: [NORMAL_HILLA],
}

const muleNoBosses: Mule = {
  id: 'mule-2',
  name: 'EmptyMule',
  level: 150,
  muleClass: 'Paladin',
  selectedBosses: [],
}

describe('IncomePieChart', () => {
  it('shows empty state when no mules have bosses selected', () => {
    render(<IncomePieChart mules={[muleNoBosses]} />)
    expect(screen.getByText('No crystals tallied yet')).toBeTruthy()
  })

  it('shows empty state when mules array is empty', () => {
    render(<IncomePieChart mules={[]} />)
    expect(screen.getByText('No crystals tallied yet')).toBeTruthy()
  })

  it('does not show empty state message when mules have bosses', () => {
    render(<IncomePieChart mules={[muleWithBosses]} />)
    expect(screen.queryByText('No crystals tallied yet')).toBeNull()
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
})