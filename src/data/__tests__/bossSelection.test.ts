import { describe, expect, it } from 'vitest'
import {
  toggleBoss,
  getFamilies,
  validateBossSelection,
  makeKey,
  parseKey,
  TIER_ORDER,
} from '../bossSelection'
import { bosses } from '../bosses'
import type { BossTier } from '../../types'

function idForFamily(family: string): string {
  const boss = bosses.find((b) => b.family === family)
  if (!boss) throw new Error(`No boss found for family ${family}`)
  return boss.id
}

const LUCID = idForFamily('lucid')
const WILL = idForFamily('will')
const LOTUS = idForFamily('lotus')
const DAMIEN = idForFamily('damien')
const AKECHI = idForFamily('akechi-mitsuhide')
const BLACK_MAGE = idForFamily('black-mage')
const ZAKUM = idForFamily('zakum')
const KALOS = idForFamily('kalos-the-guardian')

describe('TIER_ORDER', () => {
  it('exports tiers in extreme → easy order (hardest first)', () => {
    const expected: BossTier[] = ['extreme', 'chaos', 'hard', 'normal', 'easy']
    expect(TIER_ORDER).toEqual(expected)
  })
})

describe('makeKey / parseKey', () => {
  it('makeKey concatenates bossId and tier with a colon', () => {
    expect(makeKey(LUCID, 'hard')).toBe(`${LUCID}:hard`)
  })

  it('parseKey round-trips a valid key', () => {
    const key = makeKey(LUCID, 'hard')
    expect(parseKey(key)).toEqual({ bossId: LUCID, tier: 'hard' })
  })

  it('parseKey returns null for a malformed key with no colon', () => {
    expect(parseKey('hard-lucid')).toBeNull()
  })

  it('parseKey returns null when tier is unknown', () => {
    expect(parseKey(`${LUCID}:mythic`)).toBeNull()
  })

  it('parseKey returns null when bossId is not in bosses', () => {
    expect(parseKey('not-a-uuid:hard')).toBeNull()
  })
})

describe('toggleBoss', () => {
  it('selects a boss in an empty family', () => {
    expect(toggleBoss([], LUCID, 'hard')).toEqual([makeKey(LUCID, 'hard')])
  })

  it('auto-replaces when selecting a different tier in the same family', () => {
    const selection = [makeKey(LUCID, 'normal')]
    expect(toggleBoss(selection, LUCID, 'hard')).toEqual([makeKey(LUCID, 'hard')])
  })

  it('deselects when toggling the already-selected tier', () => {
    const selection = [makeKey(LUCID, 'hard')]
    expect(toggleBoss(selection, LUCID, 'hard')).toEqual([])
  })

  it('adds a boss from a different family without conflict', () => {
    const selection = [makeKey(LUCID, 'hard')]
    expect(toggleBoss(selection, WILL, 'hard')).toEqual([
      makeKey(LUCID, 'hard'),
      makeKey(WILL, 'hard'),
    ])
  })

  it('replaces in same family while preserving other families and array order', () => {
    const selection = [makeKey(WILL, 'normal'), makeKey(LUCID, 'hard')]
    expect(toggleBoss(selection, WILL, 'hard')).toEqual([
      makeKey(WILL, 'hard'),
      makeKey(LUCID, 'hard'),
    ])
  })

  it('returns unchanged array for unknown bossId', () => {
    const selection = [makeKey(LUCID, 'hard')]
    expect(toggleBoss(selection, 'not-a-real-boss-id', 'hard')).toEqual(selection)
  })

  it('returns unchanged array when tier is not offered for the boss', () => {
    const selection = [makeKey(LUCID, 'hard')]
    // Lucid offers easy/normal/hard — chaos is not in its difficulty[]
    expect(toggleBoss(selection, LUCID, 'chaos')).toEqual(selection)
  })

  it('handles replace with multiple concurrent selections', () => {
    const selection = [makeKey(LUCID, 'hard'), makeKey(WILL, 'normal'), makeKey(LOTUS, 'hard')]
    expect(toggleBoss(selection, WILL, 'easy')).toEqual([
      makeKey(LUCID, 'hard'),
      makeKey(WILL, 'easy'),
      makeKey(LOTUS, 'hard'),
    ])
  })
})

describe('validateBossSelection', () => {
  it('removes unknown keys', () => {
    expect(
      validateBossSelection([makeKey(LUCID, 'hard'), 'stale-id', 'another:stale']),
    ).toEqual([makeKey(LUCID, 'hard')])
  })

  it('drops keys with unknown bossId', () => {
    expect(validateBossSelection(['not-a-uuid:hard'])).toEqual([])
  })

  it('drops keys with a tier not offered for the boss', () => {
    // Lucid does not offer chaos
    expect(validateBossSelection([makeKey(LUCID, 'chaos')])).toEqual([])
  })

  it('returns empty array when all keys invalid', () => {
    expect(validateBossSelection(['stale1', 'stale2'])).toEqual([])
  })

  it('returns input when all keys valid and no family conflicts', () => {
    const keys = [makeKey(LUCID, 'hard'), makeKey(WILL, 'hard')]
    expect(validateBossSelection(keys)).toEqual(keys)
  })

  it('returns empty array for empty input', () => {
    expect(validateBossSelection([])).toEqual([])
  })

  it('keeps highest-value tier per family when duplicates exist', () => {
    const keys = [makeKey(LUCID, 'normal'), makeKey(LUCID, 'hard')]
    expect(validateBossSelection(keys)).toEqual([makeKey(LUCID, 'hard')])
  })

  it('preserves original order among kept entries', () => {
    const keys = [
      makeKey(WILL, 'hard'),
      makeKey(LUCID, 'normal'),
      makeKey(LUCID, 'hard'),
    ]
    expect(validateBossSelection(keys)).toEqual([
      makeKey(WILL, 'hard'),
      makeKey(LUCID, 'hard'),
    ])
  })

  it('removes both invalid and duplicate-family entries', () => {
    const keys = [
      'fake-key',
      makeKey(LUCID, 'easy'),
      makeKey(LUCID, 'hard'),
      makeKey(WILL, 'hard'),
    ]
    expect(validateBossSelection(keys)).toEqual([
      makeKey(LUCID, 'hard'),
      makeKey(WILL, 'hard'),
    ])
  })

  it('handles three tiers from same family keeping highest', () => {
    const keys = [
      makeKey(LUCID, 'easy'),
      makeKey(LUCID, 'normal'),
      makeKey(LUCID, 'hard'),
    ]
    expect(validateBossSelection(keys)).toEqual([makeKey(LUCID, 'hard')])
  })

  it('keeps singletons across families', () => {
    const keys = [makeKey(LUCID, 'hard'), makeKey(WILL, 'hard'), makeKey(DAMIEN, 'hard')]
    expect(validateBossSelection(keys)).toEqual(keys)
  })
})

describe('getFamilies', () => {
  it('returns all families with correct selected flags', () => {
    const families = getFamilies([makeKey(LUCID, 'hard')], '')
    const lucidFamily = families.find((f) => f.family === 'lucid')!
    expect(lucidFamily).toBeDefined()

    const hardLucid = lucidFamily.bosses.find((b) => b.tier === 'hard')!
    const normalLucid = lucidFamily.bosses.find((b) => b.tier === 'normal')!
    const easyLucid = lucidFamily.bosses.find((b) => b.tier === 'easy')!
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

  it('uses the display name without difficulty prefix', () => {
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

  it('each tier entry carries the boss id', () => {
    const families = getFamilies([], '')
    const lucidFamily = families.find((f) => f.family === 'lucid')!
    for (const t of lucidFamily.bosses) {
      expect(t.bossId).toBe(LUCID)
    }
  })

  it('each tier entry carries a `key` equal to makeKey(bossId, tier)', () => {
    const families = getFamilies([], '')
    const lucidFamily = families.find((f) => f.family === 'lucid')!
    const hardLucid = lucidFamily.bosses.find((b) => b.tier === 'hard')!
    expect(hardLucid.key).toBe(makeKey(LUCID, 'hard'))
  })

  it('populates crystalValue on each tier', () => {
    const families = getFamilies([], '')
    const lucidFamily = families.find((f) => f.family === 'lucid')!
    const hardLucid = lucidFamily.bosses.find((b) => b.tier === 'hard')!
    expect(hardLucid.crystalValue).toBe(504000000)
  })

  it('populates difficulty (capitalized label) on each boss', () => {
    const families = getFamilies([], '')
    const lucid = families.find((f) => f.family === 'lucid')!
    expect(lucid.bosses.find((b) => b.tier === 'hard')!.difficulty).toBe('Hard')
    expect(lucid.bosses.find((b) => b.tier === 'normal')!.difficulty).toBe('Normal')
    expect(lucid.bosses.find((b) => b.tier === 'easy')!.difficulty).toBe('Easy')
  })

  it('difficulty is null when family has no difficulty pip (tier-less)', () => {
    const families = getFamilies([], '')
    const akechi = families.find((f) => f.family === 'akechi-mitsuhide')!
    expect(akechi.bosses[0].difficulty).toBeNull()
  })

  it('populates formattedValue on each boss', () => {
    const families = getFamilies([], '')
    const lucidFamily = families.find((f) => f.family === 'lucid')!
    const hardLucid = lucidFamily.bosses.find((b) => b.tier === 'hard')!
    expect(hardLucid.formattedValue).toBe('504M')
  })

  it('produces checkbox-list-friendly label name that includes tier + family', () => {
    const families = getFamilies([], '')
    const lucidFamily = families.find((f) => f.family === 'lucid')!
    const hardLucid = lucidFamily.bosses.find((b) => b.tier === 'hard')!
    // Must still contain "Hard" and "Lucid" so the existing label
    // regex-matching in BossCheckboxList tests keeps working.
    expect(hardLucid.name).toContain('Hard')
    expect(hardLucid.name).toContain('Lucid')
  })

  it('keeps tier-less family name intact (no prefix)', () => {
    const families = getFamilies([], '')
    const akechi = families.find((f) => f.family === 'akechi-mitsuhide')!
    expect(akechi.bosses[0].name).toBe('Akechi Mitsuhide')
  })

  it('filters by family slug with search', () => {
    const families = getFamilies([], 'lucid')
    expect(families.length).toBe(1)
    expect(families[0].family).toBe('lucid')
  })

  it('filters by boss name with search', () => {
    const families = getFamilies([], 'Black Mage')
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
      const hardLucid = lucidFamily.bosses.find((b) => b.tier === 'hard')!
      expect(hardLucid.formattedValue).toBe('504M')
    })

    it('returns full number formatting when abbreviated: false', () => {
      const families = getFamilies([], '', { abbreviated: false })
      const lucidFamily = families.find((f) => f.family === 'lucid')!
      const hardLucid = lucidFamily.bosses.find((b) => b.tier === 'hard')!
      expect(hardLucid.formattedValue).toBe('504,000,000')
    })

    it('full number formatting works for values under 1,000,000', () => {
      const families = getFamilies([], '', { abbreviated: false })
      const zakumFamily = families.find((f) => f.family === 'zakum')!
      const easyZakum = zakumFamily.bosses.find((b) => b.tier === 'easy')!
      expect(easyZakum.formattedValue).toBe('1,000,000')
    })
  })
})

describe('cross-reference sanity', () => {
  it('BLACK_MAGE extreme tier is a valid key', () => {
    const key = makeKey(BLACK_MAGE, 'extreme')
    expect(parseKey(key)).toEqual({ bossId: BLACK_MAGE, tier: 'extreme' })
  })

  it('ZAKUM easy tier is a valid key', () => {
    const key = makeKey(ZAKUM, 'easy')
    expect(parseKey(key)).toEqual({ bossId: ZAKUM, tier: 'easy' })
  })

  it('KALOS chaos tier is a valid key', () => {
    const key = makeKey(KALOS, 'chaos')
    expect(parseKey(key)).toEqual({ bossId: KALOS, tier: 'chaos' })
  })

  it('AKECHI normal tier is a valid key (tier-less family)', () => {
    const key = makeKey(AKECHI, 'normal')
    expect(parseKey(key)).toEqual({ bossId: AKECHI, tier: 'normal' })
  })
})
