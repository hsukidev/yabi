import { describe, expect, it } from 'vitest'
import { computeMuleIncome, computeTotalIncome, getMuleIncome, getTotalIncome } from '../income'
import type { IncomeDisplay, IncomeResult } from '../income'

describe('computeMuleIncome', () => {
  it('returns correct raw and formatted for a mule with selected bosses (abbreviated)', () => {
    const result = computeMuleIncome(['hard-lucid', 'hard-will'], true)
    expect(result.raw).toBe(504000000 + 621810000)
    expect(result.formatted).toBe('1.13B')
  })

  it('returns correct raw and formatted for a mule with selected bosses (full)', () => {
    const result = computeMuleIncome(['hard-lucid', 'hard-will'], false)
    expect(result.raw).toBe(504000000 + 621810000)
    expect(result.formatted).toBe('1,125,810,000')
  })

  it('returns raw: 0 and formatted: "0" for empty selection (abbreviated)', () => {
    const result = computeMuleIncome([], true)
    expect(result.raw).toBe(0)
    expect(result.formatted).toBe('0')
  })

  it('returns raw: 0 and formatted: "0" for empty selection (full)', () => {
    const result = computeMuleIncome([], false)
    expect(result.raw).toBe(0)
    expect(result.formatted).toBe('0')
  })

  it('formats with B/M/K suffix when abbreviated is true', () => {
    const result = computeMuleIncome(['hard-lucid'], true)
    expect(result.raw).toBe(504000000)
    expect(result.formatted).toBe('504M')
  })

  it('formats with commas when abbreviated is false', () => {
    const result = computeMuleIncome(['hard-lucid'], false)
    expect(result.raw).toBe(504000000)
    expect(result.formatted).toBe('504,000,000')
  })

  it('returns IncomeDisplay type with raw and formatted', () => {
    const result: IncomeDisplay = computeMuleIncome(['hard-lucid'], true)
    expect(typeof result.raw).toBe('number')
    expect(typeof result.formatted).toBe('string')
  })

  it('handles unknown boss ids gracefully', () => {
    const result = computeMuleIncome(['unknown-boss'], true)
    expect(result.raw).toBe(0)
    expect(result.formatted).toBe('0')
  })
})

describe('computeTotalIncome', () => {
  it('sums across multiple mules correctly (abbreviated)', () => {
    const mules = [
      { selectedBosses: ['hard-lucid'] },
      { selectedBosses: ['hard-will'] },
    ]
    const result = computeTotalIncome(mules, true)
    expect(result.raw).toBe(504000000 + 621810000)
    expect(result.formatted).toBe('1.13B')
  })

  it('sums across multiple mules correctly (full)', () => {
    const mules = [
      { selectedBosses: ['hard-lucid'] },
      { selectedBosses: ['hard-will'] },
    ]
    const result = computeTotalIncome(mules, false)
    expect(result.raw).toBe(504000000 + 621810000)
    expect(result.formatted).toBe('1,125,810,000')
  })

  it('handles empty mule array (abbreviated)', () => {
    const result = computeTotalIncome([], true)
    expect(result.raw).toBe(0)
    expect(result.formatted).toBe('0')
  })

  it('handles empty mule array (full)', () => {
    const result = computeTotalIncome([], false)
    expect(result.raw).toBe(0)
    expect(result.formatted).toBe('0')
  })

  it('formats with B/M/K suffix when abbreviated is true', () => {
    const mules = [{ selectedBosses: ['hard-lucid'] }]
    const result = computeTotalIncome(mules, true)
    expect(result.formatted).toBe('504M')
  })

  it('formats with commas when abbreviated is false', () => {
    const mules = [{ selectedBosses: ['hard-lucid'] }]
    const result = computeTotalIncome(mules, false)
    expect(result.formatted).toBe('504,000,000')
  })

  it('handles mules with empty selectedBosses', () => {
    const mules = [
      { selectedBosses: ['hard-lucid'] },
      { selectedBosses: [] },
    ]
    const result = computeTotalIncome(mules, true)
    expect(result.raw).toBe(504000000)
    expect(result.formatted).toBe('504M')
  })
})

describe('backward compatibility: getMuleIncome / getTotalIncome', () => {
  it('getMuleIncome still works', () => {
    const result: IncomeResult = getMuleIncome(['hard-lucid'], true)
    expect(result.raw).toBe(504000000)
    expect(result.formatted).toBe('504M')
  })

  it('getTotalIncome still works', () => {
    const result: IncomeResult = getTotalIncome([{ selectedBosses: ['hard-lucid'] }], true)
    expect(result.raw).toBe(504000000)
    expect(result.formatted).toBe('504M')
  })
})