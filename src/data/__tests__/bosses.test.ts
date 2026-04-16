import { describe, expect, it } from 'vitest'
import { bosses, calculatePotentialIncome, getBossById } from '../bosses'

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

describe('getBossById', () => {
  it('returns boss by id using O(1) Map lookup', () => {
    const boss = getBossById('hard-lucid')
    expect(boss).toBeDefined()
    expect(boss!.name).toBe('Hard Lucid')
    expect(boss!.crystalValue).toBe(504000000)
  })

  it('returns undefined for unknown boss id', () => {
    expect(getBossById('nonexistent-boss')).toBeUndefined()
  })

  it('every boss in the bosses array is retrievable by id', () => {
    for (const boss of bosses) {
      expect(getBossById(boss.id)).toBe(boss)
    }
  })
})