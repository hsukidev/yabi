import { MuleBossSlate } from '../data/muleBossSlate'
import { formatMeso } from '../utils/meso'

export interface IncomeDisplay {
  raw: number
  formatted: string
}

/**
 * Sum crystalValues for a list of `<uuid>:<tier>:<cadence>` selection keys,
 * folding daily tiers into the weekly headline at `crystalValue × 7`.
 *
 * Goes through `MuleBossSlate.from` so unresolvable keys and
 * duplicate-bucket losers drop silently — the same normalization any
 * persisted slate would receive.
 */
export function sumSelectedKeys(keys: string[]): number {
  return MuleBossSlate.from(keys).totalCrystalValue
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
