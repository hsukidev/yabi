import type { BossTier } from '../types';
import { getBossByFamily } from './bosses';
import { hardestDifficulty, makeKey, parseKey, toggleBoss } from './bossSelection';

/**
 * Boss Preset shortcuts for the Matrix Toolbar. Each preset is a fixed list
 * of boss family entries; clicking a preset pill swaps in (or drops) one
 * selection key per entry. A bare family slug resolves to the Hardest-Tier
 * key; an `{ family, tier }` entry pins a specific tier (e.g. CTENE's Hard
 * Lotus, chosen over the Extreme tier most mules can't clear).
 *
 * Single-select swap semantics: at most one preset pill is ever active.
 * Clicking an inactive preset while another is active first removes the
 * previously active preset's families from the selection, then applies the
 * clicked preset — so the CRA ∩ CTENE overlap (Vellum / Crimson Queen /
 * Papulatus / Magnus) is just re-added by the apply step with the clicked
 * preset's resolved tiers, no special-casing needed. Clicking the currently
 * active preset deselects it. The drawer-level handler owns this policy;
 * the helpers below (`applyPreset` / `removePreset` / `isPresetActive`) stay
 * single-purpose and family-scoped.
 */

export type PresetKey = 'CRA' | 'CTENE';

/**
 * A preset entry is either a family slug (resolves to the hardest tier) or
 * an `{ family, tier }` object that pins a specific tier for that family.
 */
export type PresetFamily = string | { family: string; tier: BossTier };

export const PRESET_FAMILIES = {
  CRA: [
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
  ],
  CTENE: [
    'akechi-mitsuhide',
    'princess-no',
    'darknell',
    'verus-hilla',
    'gloom',
    'will',
    'lucid',
    'guardian-angel-slime',
    'damien',
    { family: 'lotus', tier: 'hard' },
    'vellum',
    'crimson-queen',
    'papulatus',
    'magnus',
  ],
} as const satisfies Record<PresetKey, readonly PresetFamily[]>;

/** Unwrap a preset entry to `{ family, tier? }`. */
function entryInfo(entry: PresetFamily): { family: string; tier?: BossTier } {
  return typeof entry === 'string' ? { family: entry } : entry;
}

/**
 * Selection key for a preset entry — uses the explicit tier if the entry
 * specifies one, else falls back to the hardest tier. Returns null if the
 * family is unknown or the pinned tier isn't offered by the boss.
 */
export function presetEntryKey(entry: PresetFamily): string | null {
  const { family, tier } = entryInfo(entry);
  const boss = getBossByFamily(family);
  if (!boss) return null;
  const diff = tier
    ? boss.difficulty.find((d) => d.tier === tier)
    : hardestDifficulty(boss);
  if (!diff) return null;
  return makeKey(boss.id, diff.tier, diff.cadence);
}

/** Family slug for a preset entry (unwraps the `{ family, tier }` form). */
export function presetEntryFamily(entry: PresetFamily): string {
  return entryInfo(entry).family;
}

/**
 * Swap each entry's target selection key into `keys`, using `toggleBoss`
 * semantics so any prior same-cadence sibling on that boss is replaced (and
 * opposite-cadence selections are preserved).
 */
export function applyPreset(
  keys: string[],
  families: readonly PresetFamily[],
): string[] {
  let next = keys;
  for (const entry of families) {
    const { family, tier } = entryInfo(entry);
    const boss = getBossByFamily(family);
    if (!boss) continue;
    const diff = tier
      ? boss.difficulty.find((d) => d.tier === tier)
      : hardestDifficulty(boss);
    if (!diff) continue;
    const target = makeKey(boss.id, diff.tier, diff.cadence);
    if (next.includes(target)) continue; // idempotent
    next = toggleBoss(next, boss.id, diff.tier);
  }
  return next;
}

/**
 * Drop every key whose bossId resolves to a family in `families`. Malformed
 * keys (unparseable) pass through untouched. Tier overrides on entries are
 * ignored here — removal is family-wide, matching the "Ctrl-click the pill
 * to clear the whole preset" gesture.
 */
export function removePreset(
  keys: string[],
  families: readonly PresetFamily[],
): string[] {
  const dropFamilyIds = new Set<string>();
  for (const entry of families) {
    const boss = getBossByFamily(entryInfo(entry).family);
    if (boss) dropFamilyIds.add(boss.id);
  }
  return keys.filter((k) => {
    const parsed = parseKey(k);
    if (!parsed) return true;
    return !dropFamilyIds.has(parsed.bossId);
  });
}

/**
 * Active iff every preset entry has its resolved key present in `keys`.
 * Mirrors the visual: pill highlights iff the selection state fully matches
 * what `applyPreset` would have produced.
 */
export function isPresetActive(preset: PresetKey, keys: string[]): boolean {
  const keySet = new Set(keys);
  for (const entry of PRESET_FAMILIES[preset]) {
    const target = presetEntryKey(entry);
    if (!target) return false;
    if (!keySet.has(target)) return false;
  }
  return true;
}
