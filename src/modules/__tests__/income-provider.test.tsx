import { describe, expect, it, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { renderHook } from '@testing-library/react'
import {
  IncomeProvider,
} from '../IncomeProvider'
import {
  useFormatPreference,
  useMuleIncome,
  useTotalIncome,
} from '../income-hooks'
import { bosses } from '../../data/bosses'
import { makeKey } from '../../data/bossSelection'

const LUCID = bosses.find((b) => b.family === 'lucid')!.id
const WILL = bosses.find((b) => b.family === 'will')!.id
const HARD_LUCID = makeKey(LUCID, 'hard')
const HARD_WILL = makeKey(WILL, 'hard')

function FormatPreferenceConsumer() {
  const { abbreviated, toggle } = useFormatPreference()
  return (
    <div>
      <span data-testid="abbreviated">{String(abbreviated)}</span>
      <button data-testid="toggle" onClick={toggle}>Toggle</button>
    </div>
  )
}

describe('IncomeProvider', () => {
  it('provides default abbreviated=true', () => {
    render(
      <IncomeProvider>
        <FormatPreferenceConsumer />
      </IncomeProvider>
    )
    expect(screen.getByTestId('abbreviated').textContent).toBe('true')
  })

  it('toggles abbreviated from true to false', () => {
    render(
      <IncomeProvider>
        <FormatPreferenceConsumer />
      </IncomeProvider>
    )
    fireEvent.click(screen.getByTestId('toggle'))
    expect(screen.getByTestId('abbreviated').textContent).toBe('false')
  })

  it('toggles abbreviated from false to true', () => {
    render(
      <IncomeProvider defaultAbbreviated={false}>
        <FormatPreferenceConsumer />
      </IncomeProvider>
    )
    fireEvent.click(screen.getByTestId('toggle'))
    expect(screen.getByTestId('abbreviated').textContent).toBe('true')
  })
})

describe('useFormatPreference', () => {
  it('throws if used outside IncomeProvider', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    expect(() => renderHook(() => useFormatPreference())).toThrow()
    spy.mockRestore()
  })
})

describe('useMuleIncome', () => {
  it('returns formatted income using abbreviated from context', () => {
    const mule = { selectedBosses: [HARD_LUCID] }
    const { result } = renderHook(() => useMuleIncome(mule), {
      wrapper: IncomeProvider,
    })
    expect(result.current.raw).toBe(504000000)
    expect(result.current.formatted).toBe('504M')
  })

  it('returns full format when abbreviated is false in context', () => {
    const mule = { selectedBosses: [HARD_LUCID] }
    const { result } = renderHook(() => useMuleIncome(mule), {
      wrapper: ({ children }) => <IncomeProvider defaultAbbreviated={false}>{children}</IncomeProvider>,
    })
    expect(result.current.formatted).toBe('504,000,000')
  })

  it('returns zero income for empty selectedBosses', () => {
    const mule = { selectedBosses: [] as string[] }
    const { result } = renderHook(() => useMuleIncome(mule), {
      wrapper: IncomeProvider,
    })
    expect(result.current.raw).toBe(0)
    expect(result.current.formatted).toBe('0')
  })
})

describe('useTotalIncome', () => {
  it('returns formatted total income using abbreviated from context', () => {
    const mules = [
      { selectedBosses: [HARD_LUCID] },
      { selectedBosses: [HARD_WILL] },
    ]
    const { result } = renderHook(() => useTotalIncome(mules), {
      wrapper: IncomeProvider,
    })
    expect(result.current.raw).toBe(504000000 + 621810000)
    expect(result.current.formatted).toBe('1.13B')
  })

  it('returns full format when abbreviated is false in context', () => {
    const mules = [{ selectedBosses: [HARD_LUCID] }]
    const { result } = renderHook(() => useTotalIncome(mules), {
      wrapper: ({ children }) => <IncomeProvider defaultAbbreviated={false}>{children}</IncomeProvider>,
    })
    expect(result.current.formatted).toBe('504,000,000')
  })

  it('returns zero for empty mules array', () => {
    const { result } = renderHook(() => useTotalIncome([]), {
      wrapper: IncomeProvider,
    })
    expect(result.current.raw).toBe(0)
    expect(result.current.formatted).toBe('0')
  })
})
