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
 * NOTE: contentType filtering (`=== 'weekly'`) lands in slice 1C. For now
 * we sum every matched tier, which preserves current behaviour because
 * slice 1A seeded every tier `contentType: 'weekly'`.
 */
export function sumSelectedKeys(keys: string[]): number {
  let total = 0
  for (const key of keys) {
    const parsed = parseKey(key)
    if (!parsed) continue
    const boss = getBossById(parsed.bossId)
    const diff = boss?.difficulty.find((d) => d.tier === parsed.tier)
    if (diff) total += diff.crystalValue
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
