import { describe, expect, it } from 'vitest'
import {
  toggleBoss,
  getFamilies,
  validateBossSelection,
  makeKey,
  parseKey,
  TIER_ORDER,
} from '../bossSelection'
import { bosses, getBossById } from '../bosses'
import type { BossTier } from '../../types'

function idForFamily(family: string): string {
  const boss = bosses.find((b) => b.family === family)
  if (!boss) throw new Error(`No boss found for family ${family}`)
  return boss.id
}

/** Build a selection key, looking up cadence from the real boss data. */
function key(bossId: string, tier: BossTier): string {
  const diff = getBossById(bossId)!.difficulty.find((d) => d.tier === tier)!
  return makeKey(bossId, tier, diff.cadence)
}

const LUCID = idForFamily('lucid')
const WILL = idForFamily('will')
const LOTUS = idForFamily('lotus')
const DAMIEN = idForFamily('damien')
const AKECHI = idForFamily('akechi-mitsuhide')
const BLACK_MAGE = idForFamily('black-mage')
const ZAKUM = idForFamily('zakum')
const KALOS = idForFamily('kalos-the-guardian')
const VELLUM = idForFamily('vellum')
const PAPULATUS = idForFamily('papulatus')
const HORNTAIL = idForFamily('horntail')

describe('TIER_ORDER', () => {
  it('exports tiers in extreme → easy order (hardest first)', () => {
    const expected: BossTier[] = ['extreme', 'chaos', 'hard', 'normal', 'easy']
    expect(TIER_ORDER).toEqual(expected)
  })
})

describe('makeKey / parseKey', () => {
  it('makeKey joins bossId, tier, and cadence with colons', () => {
    expect(makeKey(LUCID, 'hard', 'weekly')).toBe(`${LUCID}:hard:weekly`)
  })

  it('parseKey round-trips a valid weekly key', () => {
    const k = makeKey(LUCID, 'hard', 'weekly')
    expect(parseKey(k)).toEqual({ bossId: LUCID, tier: 'hard', cadence: 'weekly' })
  })

  it('parseKey round-trips a valid daily key (Normal Vellum)', () => {
    const k = makeKey(VELLUM, 'normal', 'daily')
    expect(parseKey(k)).toEqual({ bossId: VELLUM, tier: 'normal', cadence: 'daily' })
  })

  it('parseKey returns null for a malformed key with no colons', () => {
    expect(parseKey('hard-lucid')).toBeNull()
  })

  it('parseKey returns null for a two-segment (legacy v2) key', () => {
    expect(parseKey(`${LUCID}:hard`)).toBeNull()
  })

  it('parseKey returns null when tier is unknown', () => {
    expect(parseKey(`${LUCID}:mythic:weekly`)).toBeNull()
  })

  it('parseKey returns null when cadence segment is unknown', () => {
    expect(parseKey(`${LUCID}:hard:monthly`)).toBeNull()
  })

  it('parseKey returns null when cadence disagrees with boss data', () => {
    // Chaos Vellum is weekly; marking it daily in the key is a stale migration.
    expect(parseKey(`${VELLUM}:chaos:daily`)).toBeNull()
    // Hard Lucid is weekly; marking it daily is stale.
    expect(parseKey(`${LUCID}:hard:daily`)).toBeNull()
  })

  it('parseKey returns null when bossId is not in bosses', () => {
    expect(parseKey('not-a-uuid:hard:weekly')).toBeNull()
  })
})

describe('toggleBoss', () => {
  it('selects a boss in an empty family', () => {
    expect(toggleBoss([], LUCID, 'hard')).toEqual([key(LUCID, 'hard')])
  })

  it('auto-replaces when selecting a different tier in the same family', () => {
    const selection = [key(LUCID, 'normal')]
    expect(toggleBoss(selection, LUCID, 'hard')).toEqual([key(LUCID, 'hard')])
  })

  it('deselects when toggling the already-selected tier', () => {
    const selection = [key(LUCID, 'hard')]
    expect(toggleBoss(selection, LUCID, 'hard')).toEqual([])
  })

  it('adds a boss from a different family without conflict', () => {
    const selection = [key(LUCID, 'hard')]
    expect(toggleBoss(selection, WILL, 'hard')).toEqual([
      key(LUCID, 'hard'),
      key(WILL, 'hard'),
    ])
  })

  it('replaces in same family while preserving other families and array order', () => {
    const selection = [key(WILL, 'normal'), key(LUCID, 'hard')]
    expect(toggleBoss(selection, WILL, 'hard')).toEqual([
      key(WILL, 'hard'),
      key(LUCID, 'hard'),
    ])
  })

  it('returns unchanged array for unknown bossId', () => {
    const selection = [key(LUCID, 'hard')]
    expect(toggleBoss(selection, 'not-a-real-boss-id', 'hard')).toEqual(selection)
  })

  it('returns unchanged array when tier is not offered for the boss', () => {
    const selection = [key(LUCID, 'hard')]
    // Lucid offers easy/normal/hard — chaos is not in its difficulty[]
    expect(toggleBoss(selection, LUCID, 'chaos')).toEqual(selection)
  })

  it('handles replace with multiple concurrent selections', () => {
    const selection = [key(LUCID, 'hard'), key(WILL, 'normal'), key(LOTUS, 'hard')]
    expect(toggleBoss(selection, WILL, 'easy')).toEqual([
      key(LUCID, 'hard'),
      key(WILL, 'easy'),
      key(LOTUS, 'hard'),
    ])
  })

  // Slice 2: mixed-cadence bosses keep one daily + one weekly simultaneously.
  describe('mixed-cadence boss (Vellum)', () => {
    it('keeps daily + weekly selections on the same boss simultaneously', () => {
      // Normal Vellum is daily, Chaos Vellum is weekly.
      const normalDaily = key(VELLUM, 'normal')
      const chaosWeekly = key(VELLUM, 'chaos')
      // Select daily first, then weekly — both stay.
      let sel = toggleBoss([], VELLUM, 'normal')
      sel = toggleBoss(sel, VELLUM, 'chaos')
      expect(sel).toEqual([normalDaily, chaosWeekly])
    })

    it('picking a weekly tier on a mixed boss leaves the daily selection untouched', () => {
      // Papulatus: easy/normal are daily; chaos is weekly.
      const normalDaily = key(PAPULATUS, 'normal')
      const chaosWeekly = key(PAPULATUS, 'chaos')
      expect(toggleBoss([normalDaily], PAPULATUS, 'chaos')).toEqual([
        normalDaily,
        chaosWeekly,
      ])
    })

    it('selecting a different daily tier replaces only the existing daily', () => {
      // Papulatus: easy (daily) → normal (daily) replaces; chaos weekly stays.
      const easyDaily = key(PAPULATUS, 'easy')
      const normalDaily = key(PAPULATUS, 'normal')
      const chaosWeekly = key(PAPULATUS, 'chaos')
      expect(toggleBoss([easyDaily, chaosWeekly], PAPULATUS, 'normal')).toEqual([
        normalDaily,
        chaosWeekly,
      ])
    })

    it('re-clicking an already-selected daily tier clears only the daily', () => {
      const normalDaily = key(VELLUM, 'normal')
      const chaosWeekly = key(VELLUM, 'chaos')
      expect(toggleBoss([normalDaily, chaosWeekly], VELLUM, 'normal')).toEqual([
        chaosWeekly,
      ])
    })
  })

  describe('daily-only boss (Horntail)', () => {
    it('selecting a tier on an empty daily-only boss adds the daily key', () => {
      const chaosDaily = key(HORNTAIL, 'chaos')
      expect(toggleBoss([], HORNTAIL, 'chaos')).toEqual([chaosDaily])
    })

    it('selecting a different daily tier replaces the sibling', () => {
      // Horntail: easy, normal, chaos are all daily.
      const normalDaily = key(HORNTAIL, 'normal')
      const chaosDaily = key(HORNTAIL, 'chaos')
      expect(toggleBoss([normalDaily], HORNTAIL, 'chaos')).toEqual([chaosDaily])
    })

    it('re-clicking the selected daily tier clears it', () => {
      const chaosDaily = key(HORNTAIL, 'chaos')
      expect(toggleBoss([chaosDaily], HORNTAIL, 'chaos')).toEqual([])
    })
  })
})

describe('validateBossSelection', () => {
  it('removes unknown keys', () => {
    expect(
      validateBossSelection([key(LUCID, 'hard'), 'stale-id', 'another:stale']),
    ).toEqual([key(LUCID, 'hard')])
  })

  it('drops keys with unknown bossId', () => {
    expect(validateBossSelection(['not-a-uuid:hard:weekly'])).toEqual([])
  })

  it('drops keys with a tier not offered for the boss', () => {
    // Lucid does not offer chaos
    expect(validateBossSelection([`${LUCID}:chaos:weekly`])).toEqual([])
  })

  it('returns empty array when all keys invalid', () => {
    expect(validateBossSelection(['stale1', 'stale2'])).toEqual([])
  })

  it('returns input when all keys valid and no family conflicts', () => {
    const keys = [key(LUCID, 'hard'), key(WILL, 'hard')]
    expect(validateBossSelection(keys)).toEqual(keys)
  })

  it('returns empty array for empty input', () => {
    expect(validateBossSelection([])).toEqual([])
  })

  it('keeps highest-value tier per family when duplicates exist', () => {
    const keys = [key(LUCID, 'normal'), key(LUCID, 'hard')]
    expect(validateBossSelection(keys)).toEqual([key(LUCID, 'hard')])
  })

  it('preserves original order among kept entries', () => {
    const keys = [
      key(WILL, 'hard'),
      key(LUCID, 'normal'),
      key(LUCID, 'hard'),
    ]
    expect(validateBossSelection(keys)).toEqual([
      key(WILL, 'hard'),
      key(LUCID, 'hard'),
    ])
  })

  it('removes both invalid and duplicate-family entries', () => {
    const keys = [
      'fake-key',
      key(LUCID, 'easy'),
      key(LUCID, 'hard'),
      key(WILL, 'hard'),
    ]
    expect(validateBossSelection(keys)).toEqual([
      key(LUCID, 'hard'),
      key(WILL, 'hard'),
    ])
  })

  it('handles three tiers from same family keeping highest', () => {
    const keys = [
      key(LUCID, 'easy'),
      key(LUCID, 'normal'),
      key(LUCID, 'hard'),
    ]
    expect(validateBossSelection(keys)).toEqual([key(LUCID, 'hard')])
  })

  it('keeps singletons across families', () => {
    const keys = [key(LUCID, 'hard'), key(WILL, 'hard'), key(DAMIEN, 'hard')]
    expect(validateBossSelection(keys)).toEqual(keys)
  })

  // Slice 2: per-cadence winner — one daily + one weekly per boss.
  it('keeps a daily and a weekly winner on the same boss simultaneously', () => {
    const keys = [key(VELLUM, 'normal'), key(VELLUM, 'chaos')]
    expect(validateBossSelection(keys)).toEqual(keys)
  })

  it('keeps only the highest daily when two daily tiers conflict', () => {
    // Papulatus easy + normal are both daily → normal wins (higher value).
    const easyDaily = key(PAPULATUS, 'easy')
    const normalDaily = key(PAPULATUS, 'normal')
    const chaosWeekly = key(PAPULATUS, 'chaos')
    expect(
      validateBossSelection([easyDaily, normalDaily, chaosWeekly]),
    ).toEqual([normalDaily, chaosWeekly])
  })
})

describe('getFamilies', () => {
  it('returns all families with correct selected flags', () => {
    const families = getFamilies([key(LUCID, 'hard')], '')
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

  it('each tier entry carries a `key` equal to makeKey(bossId, tier, cadence)', () => {
    const families = getFamilies([], '')
    const lucidFamily = families.find((f) => f.family === 'lucid')!
    const hardLucid = lucidFamily.bosses.find((b) => b.tier === 'hard')!
    expect(hardLucid.key).toBe(makeKey(LUCID, 'hard', 'weekly'))
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
  it('BLACK_MAGE extreme tier is a valid weekly key', () => {
    const k = makeKey(BLACK_MAGE, 'extreme', 'weekly')
    expect(parseKey(k)).toEqual({
      bossId: BLACK_MAGE,
      tier: 'extreme',
      cadence: 'weekly',
    })
  })

  it('ZAKUM easy tier is a valid daily key', () => {
    const k = makeKey(ZAKUM, 'easy', 'daily')
    expect(parseKey(k)).toEqual({ bossId: ZAKUM, tier: 'easy', cadence: 'daily' })
  })

  it('KALOS chaos tier is a valid weekly key', () => {
    const k = makeKey(KALOS, 'chaos', 'weekly')
    expect(parseKey(k)).toEqual({
      bossId: KALOS,
      tier: 'chaos',
      cadence: 'weekly',
    })
  })

  it('AKECHI normal tier is a valid weekly key (tier-less family)', () => {
    const k = makeKey(AKECHI, 'normal', 'weekly')
    expect(parseKey(k)).toEqual({
      bossId: AKECHI,
      tier: 'normal',
      cadence: 'weekly',
    })
  })
})
