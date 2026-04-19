import { describe, expect, it, vi } from 'vitest'
import { render, screen, within } from '@/test/test-utils'
import { KpiCard } from '../KpiCard'
import type { Mule } from '../../types'

const mule: Mule = {
  id: 'm1',
  name: 'A',
  level: 200,
  muleClass: 'Hero',
  selectedBosses: [],
  active: true,
}

function activeStatValue(): string {
  const card = screen.getByTestId('income-card') as HTMLElement
  const label = within(card).getByText('ACTIVE')
  return label.parentElement!.querySelectorAll('div')[1]!.textContent ?? ''
}

describe('KpiCard', () => {
  it('uses a fixed padding independent of density', () => {
    render(<KpiCard mules={[mule]} onToggleFormat={vi.fn()} />)
    const card = screen.getByTestId('income-card') as HTMLElement
    expect(card.style.padding).toBe('24px')
  })

  it('counts mules with active: true regardless of boss selection', () => {
    const mules: Mule[] = [
      { ...mule, id: 'a', active: true, selectedBosses: [] },
      { ...mule, id: 'b', active: true, selectedBosses: [] },
    ]
    render(<KpiCard mules={mules} onToggleFormat={vi.fn()} />)
    expect(activeStatValue()).toBe('2')
  })

  it('does not count mules with active: false even if they have bosses selected', () => {
    const mules: Mule[] = [
      { ...mule, id: 'a', active: true, selectedBosses: [] },
      { ...mule, id: 'b', active: false, selectedBosses: ['x:hard:weekly'] },
    ]
    render(<KpiCard mules={mules} onToggleFormat={vi.fn()} />)
    expect(activeStatValue()).toBe('1')
  })
})
