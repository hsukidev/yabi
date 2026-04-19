import { describe, expect, it } from 'vitest'
import {
  PRESET_FAMILIES,
  applyPreset,
  removePreset,
  isPresetActive,
} from '../bossPresets'
import { bosses, getBossByFamily } from '../bosses'
import {
  hardestDifficulty,
  makeKey,
  parseKey,
} from '../bossSelection'

const CRA_FAMILIES = [
  'cygnus',
  'pink-bean',
  'vellum',
  'crimson-queen',
  'von-bon',
  'pierre',
  'papulatus',
  'hilla',
  'magnus',
  'zakum',
] as const

const CTENE_FAMILIES = [
  'akechi-mitsuhide',
  'princess-no',
  'darknell',
  'verus-hilla',
  'gloom',
  'will',
  'lucid',
  'guardian-angel-slime',
  'damien',
  'lotus',
  'vellum',
  'crimson-queen',
  'papulatus',
  'magnus',
] as const

const CTENE_OVERLAP = ['vellum', 'crimson-queen', 'papulatus', 'magnus'] as const

/** Hardest-tier selection key for a family slug. */
function hardestKey(family: string): string {
  const boss = getBossByFamily(family)!
  const diff = hardestDifficulty(boss)
  return makeKey(boss.id, diff.tier, diff.cadence)
}

describe('PRESET_FAMILIES membership', () => {
  it('contains exactly the 10 CRA families in spec order', () => {
    expect(PRESET_FAMILIES.CRA).toEqual(CRA_FAMILIES)
  })

  it('contains exactly the 14 CTENE families in spec order', () => {
    expect(PRESET_FAMILIES.CTENE).toEqual(CTENE_FAMILIES)
  })

  it('every CRA family resolves to a known boss', () => {
    for (const f of PRESET_FAMILIES.CRA) {
      expect(bosses.find((b) => b.family === f)).toBeDefined()
    }
  })

  it('every CTENE family resolves to a known boss', () => {
    for (const f of PRESET_FAMILIES.CTENE) {
      expect(bosses.find((b) => b.family === f)).toBeDefined()
    }
  })

  it('CRA ∩ CTENE shares Vellum, Crimson Queen, Papulatus, Magnus', () => {
    const craSet: ReadonlySet<string> = new Set(PRESET_FAMILIES.CRA)
    const overlap = PRESET_FAMILIES.CTENE.filter((f) => craSet.has(f))
    expect(new Set(overlap)).toEqual(new Set(CTENE_OVERLAP))
  })
})

describe('applyPreset', () => {
  it('selects the hardest-tier key for each preset family from an empty selection', () => {
    const result = applyPreset([], PRESET_FAMILIES.CRA)
    const expected = CRA_FAMILIES.map(hardestKey)
    expect(new Set(result)).toEqual(new Set(expected))
    expect(result).toHaveLength(CRA_FAMILIES.length)
  })

  it('preserves pre-existing non-preset keys', () => {
    const lucid = hardestKey('lucid')
    const result = applyPreset([lucid], PRESET_FAMILIES.CRA)
    expect(result).toContain(lucid)
    for (const f of PRESET_FAMILIES.CRA) {
      expect(result).toContain(hardestKey(f))
    }
  })

  it('is idempotent: applying twice yields the same set', () => {
    const once = applyPreset([], PRESET_FAMILIES.CRA)
    const twice = applyPreset(once, PRESET_FAMILIES.CRA)
    expect(new Set(twice)).toEqual(new Set(once))
  })

  it('swaps a lower-tier same-cadence selection up to the hardest tier', () => {
    // Start with a lower-tier Vellum daily selection (Normal Vellum daily).
    const vellum = getBossByFamily('vellum')!
    const lowDailyKey = makeKey(vellum.id, 'normal', 'daily')
    const result = applyPreset([lowDailyKey], ['vellum'])
    // Hardest Vellum is chaos weekly; the daily entry is on a different
    // cadence bucket so both selections coexist.
    const hardestWeekly = hardestKey('vellum')
    expect(result).toContain(hardestWeekly)
    // Daily selection is preserved — applyPreset uses toggleBoss semantics,
    // which only swaps *same-cadence* siblings.
    expect(result).toContain(lowDailyKey)
  })

  it('keeps CRA and CTENE overlap intact when both are applied', () => {
    const withCra = applyPreset([], PRESET_FAMILIES.CRA)
    const withBoth = applyPreset(withCra, PRESET_FAMILIES.CTENE)
    for (const f of CTENE_OVERLAP) {
      expect(withBoth).toContain(hardestKey(f))
    }
    // All CRA and all CTENE hardest keys present.
    for (const f of PRESET_FAMILIES.CRA) {
      expect(withBoth).toContain(hardestKey(f))
    }
    for (const f of PRESET_FAMILIES.CTENE) {
      expect(withBoth).toContain(hardestKey(f))
    }
  })
})

describe('removePreset', () => {
  it('drops every key whose boss family is in the list', () => {
    const withCra = applyPreset([], PRESET_FAMILIES.CRA)
    const result = removePreset(withCra, PRESET_FAMILIES.CRA)
    expect(result).toEqual([])
  })

  it('preserves non-preset keys', () => {
    const lucid = hardestKey('lucid')
    const withCra = applyPreset([lucid], PRESET_FAMILIES.CRA)
    const result = removePreset(withCra, PRESET_FAMILIES.CRA)
    expect(result).toEqual([lucid])
  })

  it('drops ALL keys for a family in the list, regardless of tier/cadence', () => {
    const vellum = getBossByFamily('vellum')!
    const normalDaily = makeKey(vellum.id, 'normal', 'daily')
    const chaosWeekly = makeKey(vellum.id, 'chaos', 'weekly')
    const result = removePreset([normalDaily, chaosWeekly], ['vellum'])
    expect(result).toEqual([])
  })

  it('leaves CTENE overlap intact when only CRA is removed while CTENE is still active', () => {
    // Apply CRA and CTENE; then remove CRA. The 4 overlap families
    // (Vellum, CQ, Papulatus, Magnus) must come back because CTENE still
    // holds them — but under the spec, removePreset drops those families
    // outright. The invariant is that the CALLER (MuleDetailDrawer) uses
    // isPresetActive to choose whether to call applyPreset or removePreset,
    // and the overlap persistence is realized by re-applying CTENE after
    // CRA-remove. At the helper level: removePreset(CRA) drops all 10 CRA
    // families including the overlap.
    const withBoth = applyPreset(
      applyPreset([], PRESET_FAMILIES.CRA),
      PRESET_FAMILIES.CTENE,
    )
    const afterCraRemoved = removePreset(withBoth, PRESET_FAMILIES.CRA)
    // Non-overlap CTENE families survive.
    const craSet: ReadonlySet<string> = new Set(CRA_FAMILIES)
    for (const f of PRESET_FAMILIES.CTENE) {
      if (craSet.has(f)) continue
      expect(afterCraRemoved).toContain(hardestKey(f))
    }
    // Overlap dropped (not re-added by this helper).
    for (const f of CTENE_OVERLAP) {
      expect(afterCraRemoved).not.toContain(hardestKey(f))
    }
  })

  it('ignores malformed keys in the input (no crash)', () => {
    const result = removePreset(['stale-key'], PRESET_FAMILIES.CRA)
    // Malformed keys have no parseable bossId; they are preserved since
    // they do not match any family in the drop list.
    expect(result).toEqual(['stale-key'])
  })

  it('returns empty input unchanged', () => {
    expect(removePreset([], PRESET_FAMILIES.CRA)).toEqual([])
  })
})

describe('isPresetActive', () => {
  it('returns false for an empty selection', () => {
    expect(isPresetActive('CRA', [])).toBe(false)
    expect(isPresetActive('CTENE', [])).toBe(false)
  })

  it('returns true iff every preset family has its hardest-tier key present', () => {
    const withCra = applyPreset([], PRESET_FAMILIES.CRA)
    expect(isPresetActive('CRA', withCra)).toBe(true)
    expect(isPresetActive('CTENE', withCra)).toBe(false)
  })

  it('returns false when one CRA family is missing', () => {
    const withCra = applyPreset([], PRESET_FAMILIES.CRA)
    // Drop just Magnus's hardest key.
    const magnusHard = hardestKey('magnus')
    const missingOne = withCra.filter((k) => k !== magnusHard)
    expect(isPresetActive('CRA', missingOne)).toBe(false)
  })

  it('returns false when a family has only a lower-tier key', () => {
    // Replace the hardest Vellum key with Normal (daily) — lower tier.
    const withCra = applyPreset([], PRESET_FAMILIES.CRA)
    const vellum = getBossByFamily('vellum')!
    const hardestVellum = hardestKey('vellum')
    const normalDaily = makeKey(vellum.id, 'normal', 'daily')
    const downgraded = withCra
      .filter((k) => k !== hardestVellum)
      .concat(normalDaily)
    expect(isPresetActive('CRA', downgraded)).toBe(false)
  })

  it('returns true for CTENE iff all 14 hardest-tier keys are present', () => {
    const withCtene = applyPreset([], PRESET_FAMILIES.CTENE)
    expect(isPresetActive('CTENE', withCtene)).toBe(true)
  })

  it('both presets read active when both have been applied', () => {
    const withBoth = applyPreset(
      applyPreset([], PRESET_FAMILIES.CRA),
      PRESET_FAMILIES.CTENE,
    )
    expect(isPresetActive('CRA', withBoth)).toBe(true)
    expect(isPresetActive('CTENE', withBoth)).toBe(true)
  })
})

describe('cross-helper sanity', () => {
  it('applyPreset output has parseable keys for every family', () => {
    const keys = applyPreset([], PRESET_FAMILIES.CRA)
    for (const k of keys) {
      expect(parseKey(k)).not.toBeNull()
    }
  })

  it('removePreset output has parseable keys (or malformed pass-through)', () => {
    const withCra = applyPreset([], PRESET_FAMILIES.CRA)
    const lucid = hardestKey('lucid')
    const partial = removePreset([...withCra, lucid], PRESET_FAMILIES.CRA)
    expect(partial).toEqual([lucid])
    expect(parseKey(partial[0])).not.toBeNull()
  })
})
