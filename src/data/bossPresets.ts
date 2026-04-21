import type { Boss, BossCadence, BossDifficulty, BossTier } from '../types';
import { getBossByFamily } from './bosses';

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
 * Papulatus / Magnus / Princess No) is just re-added by the apply step with
 * the clicked preset's resolved tiers, no special-casing needed. Clicking
 * the currently active preset deselects it. The drawer-level handler owns
 * this policy; the helpers below (`applyPreset` / `removePreset` /
 * `isPresetActive`) stay single-purpose and family-scoped.
 *
 * The selection-key grammar itself lives module-private inside
 * `muleBossSlate.ts`; the two tiny helpers below duplicate only the string
 * shape, because every key this module produces flows through
 * `MuleBossSlate.from` or `slate.toggle` downstream where the Selection
 * Invariant is actually enforced.
 */

/** Build a native `<uuid>:<tier>:<cadence>` selection key. */
function buildSelectionKey(bossId: string, tier: BossTier, cadence: BossCadence): string {
  return `${bossId}:${tier}:${cadence}`;
}

/**
 * Extract the bossId prefix from a selection key. Returns `null` for any
 * string that doesn't have at least two colons, so malformed keys can pass
 * through `removePreset` untouched.
 */
function keyBossIdPrefix(key: string): string | null {
  const lastColon = key.lastIndexOf(':');
  if (lastColon < 0) return null;
  const tierColon = key.lastIndexOf(':', lastColon - 1);
  if (tierColon < 0) return null;
  return key.slice(0, tierColon);
}

/** Extract the `<cadence>` tail segment of a selection key, if present. */
function keyCadenceSuffix(key: string): string | null {
  const lastColon = key.lastIndexOf(':');
  if (lastColon < 0) return null;
  return key.slice(lastColon + 1);
}

/**
 * Return the difficulty entry with the highest crystalValue for this boss.
 * "Hardest" means "biggest numeric reward", irrespective of tier name or
 * cadence — e.g. Vellum's weekly chaos beats its daily normal.
 */
function pickHardest(boss: Boss): BossDifficulty {
  return boss.difficulty.reduce((best, d) => (d.crystalValue > best.crystalValue ? d : best));
}

/** Resolve a preset entry to `{ boss, diff }`, or `null` on an unknown family/tier. */
function resolveEntry(entry: PresetFamily): { boss: Boss; diff: BossDifficulty } | null {
  const { family, tier } = entryInfo(entry);
  const boss = getBossByFamily(family);
  if (!boss) return null;
  const diff = tier ? boss.difficulty.find((d) => d.tier === tier) : pickHardest(boss);
  if (!diff) return null;
  return { boss, diff };
}

export type PresetKey = 'CRA' | 'LOMIEN' | 'CTENE';

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
    'princess-no',
  ],
  LOMIEN: [
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
    'princess-no',
    'akechi-mitsuhide',
    { family: 'lotus', tier: 'normal' },
    { family: 'damien', tier: 'normal' },
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
  const resolved = resolveEntry(entry);
  if (!resolved) return null;
  return buildSelectionKey(resolved.boss.id, resolved.diff.tier, resolved.diff.cadence);
}

/** Family slug for a preset entry (unwraps the `{ family, tier }` form). */
export function presetEntryFamily(entry: PresetFamily): string {
  return entryInfo(entry).family;
}

/**
 * Swap each entry's target selection key into `keys`. Any prior same-cadence
 * sibling on that boss is replaced in-place (opposite-cadence selections are
 * preserved so a mule keeps its daily + weekly selections side-by-side).
 */
export function applyPreset(keys: string[], families: readonly PresetFamily[]): string[] {
  let next = keys;
  for (const entry of families) {
    const resolved = resolveEntry(entry);
    if (!resolved) continue;
    const { boss, diff } = resolved;
    const target = buildSelectionKey(boss.id, diff.tier, diff.cadence);
    if (next.includes(target)) continue; // idempotent

    // Same-cadence sibling on this boss: replace in-place so array order
    // (and opposite-cadence selections) are preserved.
    const siblingIdx = next.findIndex(
      (k) => keyBossIdPrefix(k) === boss.id && keyCadenceSuffix(k) === diff.cadence,
    );
    if (siblingIdx >= 0) {
      next = next.map((k, i) => (i === siblingIdx ? target : k));
    } else {
      next = [...next, target];
    }
  }
  return next;
}

/**
 * Drop every key whose bossId resolves to a family in `families`. Malformed
 * keys (unparseable) pass through untouched. Tier overrides on entries are
 * ignored here — removal is family-wide, matching the "Ctrl-click the pill
 * to clear the whole preset" gesture.
 */
export function removePreset(keys: string[], families: readonly PresetFamily[]): string[] {
  const dropFamilyIds = new Set<string>();
  for (const entry of families) {
    const boss = getBossByFamily(entryInfo(entry).family);
    if (boss) dropFamilyIds.add(boss.id);
  }
  return keys.filter((k) => {
    const bossId = keyBossIdPrefix(k);
    if (bossId === null) return true;
    return !dropFamilyIds.has(bossId);
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
