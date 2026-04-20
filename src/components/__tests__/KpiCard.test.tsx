import { describe, expect, it, vi } from 'vitest'
import { render, screen, within, fireEvent } from '@/test/test-utils'
import { KpiCard } from '../KpiCard'
import type { Mule } from '../../types'
import { bosses } from '../../data/bosses'

const HARD_LUCID = `${bosses.find((b) => b.family === 'lucid')!.id}:hard:weekly`

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

  it('does not toggle format when total income is zero', () => {
    const onToggleFormat = vi.fn()
    render(<KpiCard mules={[{ ...mule, selectedBosses: [] }]} onToggleFormat={onToggleFormat} />)
    fireEvent.click(screen.getByRole('button', { name: /toggle abbreviated meso format/i }))
    expect(onToggleFormat).not.toHaveBeenCalled()
  })

  it('resets format to abbreviated when total income transitions to zero', () => {
    const onToggleFormat = vi.fn()
    const nonzero: Mule[] = [{ ...mule, selectedBosses: [HARD_LUCID] }]
    const zero: Mule[] = [{ ...mule, selectedBosses: [] }]
    const { rerender } = render(
      <KpiCard mules={nonzero} onToggleFormat={onToggleFormat} />,
      { defaultAbbreviated: false },
    )
    expect(onToggleFormat).not.toHaveBeenCalled()
    rerender(<KpiCard mules={zero} onToggleFormat={onToggleFormat} />)
    expect(onToggleFormat).toHaveBeenCalledTimes(1)
  })

  it('does not reset format when total income stays zero from mount', () => {
    const onToggleFormat = vi.fn()
    render(<KpiCard mules={[{ ...mule, selectedBosses: [] }]} onToggleFormat={onToggleFormat} />)
    // Provider already starts abbreviated; no reset needed.
    expect(onToggleFormat).not.toHaveBeenCalled()
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
