import { getBossByFamily } from './bosses';
import { hardestDifficulty, makeKey, parseKey, toggleBoss } from './bossSelection';

/**
 * Boss Preset shortcuts for the Matrix Toolbar. Each preset is a fixed list
 * of boss families; clicking a preset pill swaps in (or drops) the
 * Hardest-Tier selection key for every family in the list.
 *
 * Overlap-persistent by design: CRA ∩ CTENE share Vellum / Crimson Queen /
 * Papulatus / Magnus. Toggling one preset off leaves those four families
 * selected iff the OTHER preset is still active — the caller decides which
 * branch of (applyPreset | removePreset) to take based on `isPresetActive`,
 * and re-applying the overlap preset re-inserts the shared families.
 */

export type PresetKey = 'CRA' | 'CTENE';

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
    'lotus',
    'vellum',
    'crimson-queen',
    'papulatus',
    'magnus',
  ],
} as const satisfies Record<PresetKey, readonly string[]>;

/**
 * Swap each family's Hardest-Tier selection key into `keys`, using
 * `toggleBoss` semantics so any prior same-cadence sibling on that boss is
 * replaced (and opposite-cadence selections are preserved).
 */
export function applyPreset(keys: string[], families: readonly string[]): string[] {
  let next = keys;
  for (const family of families) {
    const boss = getBossByFamily(family);
    if (!boss) continue;
    const diff = hardestDifficulty(boss);
    const target = makeKey(boss.id, diff.tier, diff.cadence);
    if (next.includes(target)) continue; // idempotent
    next = toggleBoss(next, boss.id, diff.tier);
  }
  return next;
}

/**
 * Drop every key whose bossId resolves to a family in `families`. Malformed
 * keys (unparseable) pass through untouched.
 */
export function removePreset(keys: string[], families: readonly string[]): string[] {
  const dropFamilyIds = new Set<string>();
  for (const family of families) {
    const boss = getBossByFamily(family);
    if (boss) dropFamilyIds.add(boss.id);
  }
  return keys.filter((k) => {
    const parsed = parseKey(k);
    if (!parsed) return true;
    return !dropFamilyIds.has(parsed.bossId);
  });
}

/**
 * Active iff every family in the preset has its Hardest-Tier key present
 * in `keys`. Mirrors the visual: pill highlights iff the selection state
 * fully matches what `applyPreset` would have produced.
 */
export function isPresetActive(preset: PresetKey, keys: string[]): boolean {
  const keySet = new Set(keys);
  for (const family of PRESET_FAMILIES[preset]) {
    const boss = getBossByFamily(family);
    if (!boss) return false;
    const diff = hardestDifficulty(boss);
    if (!keySet.has(makeKey(boss.id, diff.tier, diff.cadence))) return false;
  }
  return true;
}
