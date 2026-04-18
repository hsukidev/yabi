import { getBossById } from '../data/bosses'
import { parseKey } from '../data/bossSelection'
import { formatMeso } from '../utils/meso'

export interface IncomeDisplay {
  raw: number
  formatted: string
}

/**
 * Sum crystalValues for a list of `<uuid>:<tier>` selection keys.
 *
 * Only tiers whose `contentType === 'weekly'` contribute; daily and monthly
 * tiers resolve but sum to 0. All slice 1A seed data is `'weekly'`, so this
 * filter is plumbing that unlocks future daily/monthly boss data without
 * distorting the current weekly KPI.
 */
export function sumSelectedKeys(keys: string[]): number {
  let total = 0
  for (const key of keys) {
    const parsed = parseKey(key)
    if (!parsed) continue
    const boss = getBossById(parsed.bossId)
    const diff = boss?.difficulty.find((d) => d.tier === parsed.tier)
    if (diff && diff.contentType === 'weekly') total += diff.crystalValue
  }
  return total
}

export function computeMuleIncome(selectedBosses: string[], abbreviated: boolean): IncomeDisplay {
  const raw = sumSelectedKeys(selectedBosses)
  return { raw, formatted: formatMeso(raw, abbreviated) }
}

export function computeTotalIncome(
  mules: { selectedBosses: string[] }[],
  abbreviated: boolean,
): IncomeDisplay {
  const raw = mules.reduce((sum, m) => sum + sumSelectedKeys(m.selectedBosses), 0)
  return { raw, formatted: formatMeso(raw, abbreviated) }
}
