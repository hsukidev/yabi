import { afterEach, describe, expect, it, vi } from 'vitest'
import { computeMuleIncome, computeTotalIncome, sumSelectedKeys } from '../income'
import * as bossesModule from '../../data/bosses'
import { bosses } from '../../data/bosses'
import { makeKey } from '../../data/bossSelection'
import type { Boss } from '../../types'

const LUCID = bosses.find((b) => b.family === 'lucid')!.id
const WILL = bosses.find((b) => b.family === 'will')!.id
const HARD_LUCID = makeKey(LUCID, 'hard')
const HARD_WILL = makeKey(WILL, 'hard')

describe('computeMuleIncome', () => {
  it('returns correct raw and formatted for a mule with selected bosses (abbreviated)', () => {
    const result = computeMuleIncome([HARD_LUCID, HARD_WILL], true)
    expect(result.raw).toBe(504000000 + 621810000)
    expect(result.formatted).toBe('1.13B')
  })

  it('returns correct raw and formatted for a mule with selected bosses (full)', () => {
    const result = computeMuleIncome([HARD_LUCID, HARD_WILL], false)
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
    const result = computeMuleIncome([HARD_LUCID], true)
    expect(result.raw).toBe(504000000)
    expect(result.formatted).toBe('504M')
  })

  it('formats with commas when abbreviated is false', () => {
    const result = computeMuleIncome([HARD_LUCID], false)
    expect(result.raw).toBe(504000000)
    expect(result.formatted).toBe('504,000,000')
  })

  it('handles unknown keys gracefully', () => {
    const result = computeMuleIncome(['unknown-key'], true)
    expect(result.raw).toBe(0)
    expect(result.formatted).toBe('0')
  })

  it('handles legacy-format keys gracefully (0 meso, no throw)', () => {
    // A legacy id like "hard-lucid" has no colon; decoder ignores it.
    const result = computeMuleIncome(['hard-lucid'], true)
    expect(result.raw).toBe(0)
  })
})

describe('computeTotalIncome', () => {
  it('sums across multiple mules correctly (abbreviated)', () => {
    const mules = [
      { selectedBosses: [HARD_LUCID] },
      { selectedBosses: [HARD_WILL] },
    ]
    const result = computeTotalIncome(mules, true)
    expect(result.raw).toBe(504000000 + 621810000)
    expect(result.formatted).toBe('1.13B')
  })

  it('sums across multiple mules correctly (full)', () => {
    const mules = [
      { selectedBosses: [HARD_LUCID] },
      { selectedBosses: [HARD_WILL] },
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
    const mules = [{ selectedBosses: [HARD_LUCID] }]
    const result = computeTotalIncome(mules, true)
    expect(result.formatted).toBe('504M')
  })

  it('formats with commas when abbreviated is false', () => {
    const mules = [{ selectedBosses: [HARD_LUCID] }]
    const result = computeTotalIncome(mules, false)
    expect(result.formatted).toBe('504,000,000')
  })

  it('handles mules with empty selectedBosses', () => {
    const mules = [
      { selectedBosses: [HARD_LUCID] },
      { selectedBosses: [] },
    ]
    const result = computeTotalIncome(mules, true)
    expect(result.raw).toBe(504000000)
    expect(result.formatted).toBe('504M')
  })
})

describe('sumSelectedKeys contentType filter', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('includes only tiers with contentType === "weekly"; daily/monthly contribute 0', () => {
    // Fixture: a single fake family with a weekly "hard" tier and a monthly
    // "extreme" tier. Both tiers are selected — only the weekly tier should
    // sum into the total.
    const fakeBoss: Boss = {
      id: 'fixture-mixed-contenttype',
      name: 'Fixture Mixed',
      family: 'fixture-mixed',
      difficulty: [
        { tier: 'hard', crystalValue: 1_000_000, contentType: 'weekly' },
        { tier: 'extreme', crystalValue: 9_999_999, contentType: 'monthly' },
      ],
    }

    vi.spyOn(bossesModule, 'getBossById').mockImplementation((id) =>
      id === fakeBoss.id ? fakeBoss : undefined,
    )

    const weeklyKey = makeKey(fakeBoss.id, 'hard')
    const monthlyKey = makeKey(fakeBoss.id, 'extreme')

    expect(sumSelectedKeys([weeklyKey, monthlyKey])).toBe(1_000_000)
  })

  it('drops daily tiers from the sum', () => {
    const fakeBoss: Boss = {
      id: 'fixture-daily',
      name: 'Fixture Daily',
      family: 'fixture-daily',
      difficulty: [
        { tier: 'normal', crystalValue: 42, contentType: 'daily' },
        { tier: 'hard', crystalValue: 100, contentType: 'weekly' },
      ],
    }

    vi.spyOn(bossesModule, 'getBossById').mockImplementation((id) =>
      id === fakeBoss.id ? fakeBoss : undefined,
    )

    const dailyKey = makeKey(fakeBoss.id, 'normal')
    const weeklyKey = makeKey(fakeBoss.id, 'hard')

    expect(sumSelectedKeys([dailyKey, weeklyKey])).toBe(100)
  })
})
