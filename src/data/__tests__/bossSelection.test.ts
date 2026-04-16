import { describe, expect, it } from 'vitest'
import { toggleBoss, getFamilies } from '../bossSelection'

describe('toggleBoss', () => {
  it('selects a boss in an empty family', () => {
    expect(toggleBoss([], 'hard-lucid')).toEqual(['hard-lucid'])
  })

  it('auto-replaces when selecting a different boss in the same family', () => {
    expect(toggleBoss(['normal-lucid'], 'hard-lucid')).toEqual(['hard-lucid'])
  })

  it('deselects when toggling the already-selected boss', () => {
    expect(toggleBoss(['hard-lucid'], 'hard-lucid')).toEqual([])
  })

  it('adds a boss from a different family without conflict', () => {
    expect(toggleBoss(['hard-lucid'], 'hard-will')).toEqual(['hard-lucid', 'hard-will'])
  })

  it('replaces in same family while preserving other families and array order', () => {
    expect(toggleBoss(['normal-will', 'hard-lucid'], 'hard-will')).toEqual(['hard-will', 'hard-lucid'])
  })

  it('returns unchanged array for unknown bossId', () => {
    const selected = ['hard-lucid']
    expect(toggleBoss(selected, 'unknown-boss')).toEqual(['hard-lucid'])
  })

  it('handles replace with multiple concurrent selections', () => {
    expect(
      toggleBoss(['hard-lucid', 'normal-will', 'hard-lotus'], 'easy-will'),
    ).toEqual(['hard-lucid', 'easy-will', 'hard-lotus'])
  })
})

describe('getFamilies', () => {
  it('returns all families with correct selected flags', () => {
    const families = getFamilies(['hard-lucid'], '')
    const lucidFamily = families.find((f) => f.family === 'lucid')!
    expect(lucidFamily).toBeDefined()

    const hardLucid = lucidFamily.bosses.find((b) => b.id === 'hard-lucid')!
    const normalLucid = lucidFamily.bosses.find((b) => b.id === 'normal-lucid')!
    const easyLucid = lucidFamily.bosses.find((b) => b.id === 'easy-lucid')!
    expect(hardLucid.selected).toBe(true)
    expect(normalLucid.selected).toBe(false)
    expect(easyLucid.selected).toBe(false)
  })

  it('returns families sorted by highest crystal value first', () => {
    const families = getFamilies([], '')
    expect(families[0].family).toBe('black-mage')
    for (let i = 1; i < families.length; i++) {
      expect(families[i - 1].bosses[0].crystalValue).toBeGreaterThanOrEqual(
        families[i].bosses[0].crystalValue,
      )
    }
  })

  it('strips difficulty prefix for displayName', () => {
    const families = getFamilies([], '')
    const lucidFamily = families.find((f) => f.family === 'lucid')!
    expect(lucidFamily.displayName).toBe('Lucid')

    const kalosFamily = families.find((f) => f.family === 'kalos-the-guardian')!
    expect(kalosFamily.displayName).toBe('Kalos the Guardian')
  })

  it('keeps name intact for bosses without difficulty prefix', () => {
    const families = getFamilies([], '')
    const akechiFamily = families.find((f) => f.family === 'akechi-mitsuhide')!
    expect(akechiFamily.displayName).toBe('Akechi Mitsuhide')
  })

  it('populates crystalValue on each boss', () => {
    const families = getFamilies([], '')
    const lucidFamily = families.find((f) => f.family === 'lucid')!
    const hardLucid = lucidFamily.bosses.find((b) => b.id === 'hard-lucid')!
    expect(hardLucid.crystalValue).toBe(504000000)
  })

  it('populates formattedValue on each boss', () => {
    const families = getFamilies([], '')
    const lucidFamily = families.find((f) => f.family === 'lucid')!
    const hardLucid = lucidFamily.bosses.find((b) => b.id === 'hard-lucid')!
    expect(hardLucid.formattedValue).toBe('504M')
  })

  it('filters by family name with search', () => {
    const families = getFamilies([], 'lucid')
    expect(families.length).toBe(1)
    expect(families[0].family).toBe('lucid')
  })

  it('filters by boss name with search', () => {
    const families = getFamilies([], 'Extreme Black')
    expect(families.length).toBe(1)
    expect(families[0].family).toBe('black-mage')
  })

  it('search is case-insensitive', () => {
    const families = getFamilies([], 'LUCID')
    expect(families.length).toBe(1)
    expect(families[0].family).toBe('lucid')
  })

  it('empty search returns all families', () => {
    const all = getFamilies([], '')
    const withEmptySearch = getFamilies([], '')
    expect(withEmptySearch.length).toBe(all.length)
  })

  it('bosses within a family are sorted by crystal value descending', () => {
    const families = getFamilies([], '')
    const lucidFamily = families.find((f) => f.family === 'lucid')!
    for (let i = 1; i < lucidFamily.bosses.length; i++) {
      expect(lucidFamily.bosses[i - 1].crystalValue).toBeGreaterThanOrEqual(
        lucidFamily.bosses[i].crystalValue,
      )
    }
  })

  describe('abbreviated option', () => {
    it('returns abbreviated formatting when abbreviated: true', () => {
      const families = getFamilies([], '', { abbreviated: true })
      const lucidFamily = families.find((f) => f.family === 'lucid')!
      const hardLucid = lucidFamily.bosses.find((b) => b.id === 'hard-lucid')!
      expect(hardLucid.formattedValue).toBe('504M')
    })

    it('returns full number formatting when abbreviated: false', () => {
      const families = getFamilies([], '', { abbreviated: false })
      const lucidFamily = families.find((f) => f.family === 'lucid')!
      const hardLucid = lucidFamily.bosses.find((b) => b.id === 'hard-lucid')!
      expect(hardLucid.formattedValue).toBe('504,000,000')
    })

    it('full number formatting works for values under 1,000', () => {
      const families = getFamilies([], '', { abbreviated: false })
      const zakumFamily = families.find((f) => f.family === 'zakum')!
      const easyZakum = zakumFamily.bosses.find((b) => b.id === 'easy-zakum')!
      expect(easyZakum.formattedValue).toBe('1,000,000')
    })
  })
})
