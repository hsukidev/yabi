import { describe, expect, it } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { IncomeProvider } from '../IncomeProvider'
import { useFormatPreference, useMuleIncome, useTotalIncome } from '../income-hooks'
import { bosses } from '../../data/bosses'

const LUCID = bosses.find((b) => b.family === 'lucid')!.id
const WILL = bosses.find((b) => b.family === 'will')!.id
const HARD_LUCID = `${LUCID}:hard:weekly`
const HARD_WILL = `${WILL}:hard:weekly`

function MuleIncomeDisplay({ mule, index }: { mule: { selectedBosses: string[] }; index: number }) {
  const income = useMuleIncome(mule)
  return <div data-testid={`mule-income-${index}`}>{income.formatted}</div>
}

function AllDisplays({ mules }: { mules: { selectedBosses: string[] }[] }) {
  const { abbreviated, toggle } = useFormatPreference()
  const total = useTotalIncome(mules)

  return (
    <div>
      <span data-testid="abbreviated">{String(abbreviated)}</span>
      <button data-testid="toggle" onClick={toggle}>Toggle</button>
      <div data-testid="total">{total.formatted}</div>
      {mules.map((m, i) => (
        <MuleIncomeDisplay key={i} mule={m} index={i} />
      ))}
    </div>
  )
}

const mules = [
  { selectedBosses: [HARD_LUCID] },
  { selectedBosses: [HARD_WILL] },
]

describe('Income toggle integration', () => {
  it('updates all displays when format preference is toggled', () => {
    render(
      <IncomeProvider>
        <AllDisplays mules={mules} />
      </IncomeProvider>,
    )

    expect(screen.getByTestId('abbreviated').textContent).toBe('true')
    expect(screen.getByTestId('total').textContent).toBe('1.13B')
    expect(screen.getByTestId('mule-income-0').textContent).toBe('504M')
    expect(screen.getByTestId('mule-income-1').textContent).toBe('621.81M')

    fireEvent.click(screen.getByTestId('toggle'))

    expect(screen.getByTestId('abbreviated').textContent).toBe('false')
    expect(screen.getByTestId('total').textContent).toBe('1,125,810,000')
    expect(screen.getByTestId('mule-income-0').textContent).toBe('504,000,000')
    expect(screen.getByTestId('mule-income-1').textContent).toBe('621,810,000')
  })

  it('toggles back to abbreviated when clicked twice', () => {
    render(
      <IncomeProvider>
        <AllDisplays mules={mules} />
      </IncomeProvider>,
    )

    fireEvent.click(screen.getByTestId('toggle'))
    expect(screen.getByTestId('abbreviated').textContent).toBe('false')

    fireEvent.click(screen.getByTestId('toggle'))
    expect(screen.getByTestId('abbreviated').textContent).toBe('true')
    expect(screen.getByTestId('total').textContent).toBe('1.13B')
    expect(screen.getByTestId('mule-income-0').textContent).toBe('504M')
    expect(screen.getByTestId('mule-income-1').textContent).toBe('621.81M')
  })
})
