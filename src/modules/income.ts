import { getBossById } from '../data/bosses'
import { parseKey } from '../data/bossSelection'
import { formatMeso } from '../utils/meso'

export interface IncomeDisplay {
  raw: number
  formatted: string
}

/**
 * Sum crystalValues for a list of `<uuid>:<tier>` selection keys, folding
 * daily tiers into the weekly headline at `crystalValue × 7`.
 *
 * The source of truth for cadence is `BossDifficulty.cadence` — daily tiers
 * are farmable up to 7× per week, weekly tiers clear once. Unknown bosses
 * and tiers no longer offered contribute 0.
 */
export function sumSelectedKeys(keys: string[]): number {
  let total = 0
  for (const key of keys) {
    const parsed = parseKey(key)
    if (!parsed) continue
    const boss = getBossById(parsed.bossId)
    if (!boss) continue
    const diff = boss.difficulty.find((d) => d.tier === parsed.tier)
    if (!diff) continue
    total += diff.cadence === 'daily' ? diff.crystalValue * 7 : diff.crystalValue
  }
  return total
}

export function computeMuleIncome(selectedBosses: string[], abbreviated: boolean): IncomeDisplay {
  const raw = sumSelectedKeys(selectedBosses)
  return { raw, formatted: formatMeso(raw, abbreviated) }
}

export function computeTotalIncome(
  mules: { selectedBosses: string[]; active?: boolean }[],
  abbreviated: boolean,
): IncomeDisplay {
  // Only `active === false` is excluded; missing/undefined `active` still
  // sums so existing fixtures and older callers keep working untouched.
  const raw = mules.reduce(
    (sum, m) => (m.active === false ? sum : sum + sumSelectedKeys(m.selectedBosses)),
    0,
  )
  return { raw, formatted: formatMeso(raw, abbreviated) }
}
