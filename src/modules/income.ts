import { calculatePotentialIncome } from '../data/bosses'
import { formatMeso } from '../utils/meso'

export interface IncomeResult {
  raw: number
  formatted: string
}

export function getMuleIncome(selectedBosses: string[], abbreviated: boolean): IncomeResult {
  const raw = calculatePotentialIncome(selectedBosses)
  const formatted = formatMeso(raw, abbreviated)
  return { raw, formatted }
}

export function getTotalIncome(mules: { selectedBosses: string[] }[], abbreviated: boolean): IncomeResult {
  const raw = mules.reduce((sum, m) => sum + calculatePotentialIncome(m.selectedBosses), 0)
  const formatted = formatMeso(raw, abbreviated)
  return { raw, formatted }
}