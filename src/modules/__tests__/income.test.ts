import { describe, expect, it } from 'vitest'
import { getMuleIncome, getTotalIncome } from '../income'
import type { IncomeResult } from '../income'

describe('getMuleIncome', () => {
  it('returns correct raw and formatted for a mule with selected bosses', () => {
    const result = getMuleIncome(['hard-lucid', 'hard-will'], true)
    expect(result.raw).toBe(504000000 + 621810000)
    expect(result.formatted).toBe('1.13B')
  })

  it('returns raw: 0 and formatted: "0" for empty selection', () => {
    const result = getMuleIncome([], true)
    expect(result.raw).toBe(0)
    expect(result.formatted).toBe('0')
  })

  it('formats with B/M/K suffix when abbreviated is true', () => {
    const result = getMuleIncome(['hard-lucid'], true)
    expect(result.raw).toBe(504000000)
    expect(result.formatted).toBe('504M')
  })

  it('formats with commas when abbreviated is false', () => {
    const result = getMuleIncome(['hard-lucid'], false)
    expect(result.raw).toBe(504000000)
    expect(result.formatted).toBe('504,000,000')
  })

  it('returns IncomeResult type with raw and formatted', () => {
    const result: IncomeResult = getMuleIncome(['hard-lucid'], true)
    expect(typeof result.raw).toBe('number')
    expect(typeof result.formatted).toBe('string')
  })

  it('handles unknown boss ids gracefully', () => {
    const result = getMuleIncome(['unknown-boss'], true)
    expect(result.raw).toBe(0)
    expect(result.formatted).toBe('0')
  })

  it('defaults abbreviated to true', () => {
    const withExplicit = getMuleIncome(['hard-lucid'], true)
    const withDefault = getMuleIncome(['hard-lucid'])
    expect(withDefault).toEqual(withExplicit)
  })
})

describe('getTotalIncome', () => {
  it('sums across multiple mules correctly', () => {
    const mules = [
      { selectedBosses: ['hard-lucid'] },
      { selectedBosses: ['hard-will'] },
    ]
    const result = getTotalIncome(mules, true)
    expect(result.raw).toBe(504000000 + 621810000)
    expect(result.formatted).toBe('1.13B')
  })

  it('handles empty mule array', () => {
    const result = getTotalIncome([], true)
    expect(result.raw).toBe(0)
    expect(result.formatted).toBe('0')
  })

  it('formats with B/M/K suffix when abbreviated is true', () => {
    const mules = [{ selectedBosses: ['hard-lucid'] }]
    const result = getTotalIncome(mules, true)
    expect(result.formatted).toBe('504M')
  })

  it('formats with commas when abbreviated is false', () => {
    const mules = [{ selectedBosses: ['hard-lucid'] }]
    const result = getTotalIncome(mules, false)
    expect(result.formatted).toBe('504,000,000')
  })

  it('handles mules with empty selectedBosses', () => {
    const mules = [
      { selectedBosses: ['hard-lucid'] },
      { selectedBosses: [] },
    ]
    const result = getTotalIncome(mules, true)
    expect(result.raw).toBe(504000000)
    expect(result.formatted).toBe('504M')
  })

  it('defaults abbreviated to true', () => {
    const mules = [{ selectedBosses: ['hard-lucid'] }]
    const withExplicit = getTotalIncome(mules, true)
    const withDefault = getTotalIncome(mules)
    expect(withDefault).toEqual(withExplicit)
  })
})