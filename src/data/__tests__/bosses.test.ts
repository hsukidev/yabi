import { describe, expect, it } from 'vitest'
import { calculatePotentialIncome } from '../bosses'

describe('calculatePotentialIncome', () => {
  it('returns 0 for empty selection', () => {
    expect(calculatePotentialIncome([])).toBe(0)
  })

  it('returns crystal value for single boss', () => {
    expect(calculatePotentialIncome(['hard-lucid'])).toBe(504000000)
  })

  it('sums crystal values for multiple bosses', () => {
    expect(calculatePotentialIncome(['hard-lucid', 'hard-will'])).toBe(
      504000000 + 621810000
    )
  })

  it('ignores unknown boss IDs and sums the rest', () => {
    expect(calculatePotentialIncome(['hard-lucid', 'unknown-boss'])).toBe(504000000)
  })
})