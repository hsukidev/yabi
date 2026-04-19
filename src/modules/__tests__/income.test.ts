import { afterEach, describe, expect, it, vi } from 'vitest'
import { computeMuleIncome, computeTotalIncome, sumSelectedKeys } from '../income'
import * as bossesModule from '../../data/bosses'
import { bosses } from '../../data/bosses'
import { makeKey } from '../../data/bossSelection'
import type { Boss } from '../../types'

const LUCID = bosses.find((b) => b.family === 'lucid')!.id
const WILL = bosses.find((b) => b.family === 'will')!.id
const HARD_LUCID = makeKey(LUCID, 'hard', 'weekly')
const HARD_WILL = makeKey(WILL, 'hard', 'weekly')

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

  it('excludes mules with active: false from the total', () => {
    const mules = [
      { selectedBosses: [HARD_LUCID], active: true },
      { selectedBosses: [HARD_WILL], active: false },
    ]
    const result = computeTotalIncome(mules, false)
    expect(result.raw).toBe(504000000)
    expect(result.formatted).toBe('504,000,000')
  })

  it('includes mules whose active field is missing/undefined (tolerates fixtures)', () => {
    const mules = [
      { selectedBosses: [HARD_LUCID] },
      { selectedBosses: [HARD_WILL], active: undefined },
    ]
    const result = computeTotalIncome(mules, false)
    expect(result.raw).toBe(504000000 + 621810000)
  })
})

describe('sumSelectedKeys cadence multiplier', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  function mockBosses(...bosses: Boss[]) {
    const byId = new Map(bosses.map((b) => [b.id, b]))
    vi.spyOn(bossesModule, 'getBossById').mockImplementation((id) => byId.get(id))
  }

  it('multiplies daily tiers by 7 and weekly tiers by 1', () => {
    const weeklyBoss: Boss = {
      id: 'fixture-weekly',
      name: 'Fixture Weekly',
      family: 'fixture-weekly',
      difficulty: [{ tier: 'hard', crystalValue: 1_000_000, cadence: 'weekly' }],
    }
    const dailyBoss: Boss = {
      id: 'fixture-daily',
      name: 'Fixture Daily',
      family: 'fixture-daily',
      difficulty: [{ tier: 'normal', crystalValue: 100, cadence: 'daily' }],
    }
    mockBosses(weeklyBoss, dailyBoss)

    const keys = [
      makeKey(weeklyBoss.id, 'hard', 'weekly'),
      makeKey(dailyBoss.id, 'normal', 'daily'),
    ]
    // weekly × 1 + daily × 7
    expect(sumSelectedKeys(keys)).toBe(1_000_000 + 100 * 7)
  })

  it('mixed-cadence boss sums each tier by its own cadence', () => {
    const mixedBoss: Boss = {
      id: 'fixture-mixed',
      name: 'Fixture Mixed',
      family: 'fixture-mixed',
      difficulty: [
        { tier: 'normal', crystalValue: 10, cadence: 'daily' },
        { tier: 'chaos', crystalValue: 1000, cadence: 'weekly' },
      ],
    }
    mockBosses(mixedBoss)

    const keys = [
      makeKey(mixedBoss.id, 'normal', 'daily'),
      makeKey(mixedBoss.id, 'chaos', 'weekly'),
    ]
    expect(sumSelectedKeys(keys)).toBe(10 * 7 + 1000)
  })

  it('applies ×7 to the PRD daily fixtures (Normal Vellum, Chaos Horntail)', () => {
    const vellum = bosses.find((b) => b.family === 'vellum')!
    const horntail = bosses.find((b) => b.family === 'horntail')!
    const normalVellum = makeKey(vellum.id, 'normal', 'daily')
    const chaosHorntail = makeKey(horntail.id, 'chaos', 'daily')
    expect(sumSelectedKeys([normalVellum])).toBe(4_840_000 * 7)
    expect(sumSelectedKeys([chaosHorntail])).toBe(6_760_000 * 7)
    expect(sumSelectedKeys([normalVellum, chaosHorntail])).toBe(
      4_840_000 * 7 + 6_760_000 * 7,
    )
  })
})
