import type { Boss, BossCadence, BossDifficulty, BossTier } from '../types';
import { getBossByFamily } from './bosses';

/**
 * **Boss Preset** shortcuts for the **Matrix Toolbar**. Each preset is an
 * ordered list of **Preset Entries**; clicking a **Preset Pill** runs
 * **Conform**, which wipes weekly **Slate Keys** whose family is outside the
 * preset and replaces non-**Accepted Tier** keys with the **Default Tier**.
 * Dailies are always preserved.
 *
 * Entry authoring forms:
 * - Bare string — family slug; **Accepted Tiers** = `[hardest]`.
 * - `{ family, tier }` — legacy single-tier pin; desugars to `tiers: [tier]`.
 * - `{ family, tiers }` — **Multi-Tier Entry** (e.g. LOMIEN's Damien and
 *   Lotus `['normal', 'hard']`); `tiers[0]` is the **Default Tier**.
 *
 * **Same-Cadence Equality**: a **Canonical Preset** is **Active Preset** iff
 * every **Preset Entry** is satisfied by exactly one weekly key on that
 * family whose tier is in **Accepted Tiers**, and no weekly keys exist on
 * families outside the preset's entries. Daily keys never affect the result.
 *
 * The selection-key grammar itself lives module-private inside
 * `muleBossSlate.ts`; the helpers here duplicate only the string shape,
 * because every key this module produces flows through `MuleBossSlate.from`
 * or `slate.toggle` downstream where the **Selection Invariant** is actually
 * enforced.
 */

export type PresetKey = 'CRA' | 'LOMIEN' | 'CTENE';

/** Authoring form for a preset entry; normalized via `normalizeEntry`. */
export type PresetFamily =
  | string
  | { family: string; tier: BossTier }
  | { family: string; tiers: readonly BossTier[] };

/** Normalized **Preset Entry**; `tiers[0]` is the **Default Tier**. */
export interface PresetEntry {
  family: string;
  tiers: readonly BossTier[];
}

/** Shallow-parsed segments of a `<bossId>:<tier>:<cadence>` selection key. */
interface ParsedKey {
  bossId: string;
  tier: string;
  cadence: string;
}

/** Split a selection key on its last two colons; `null` if malformed. */
function parseKey(key: string): ParsedKey | null {
  const lastColon = key.lastIndexOf(':');
  if (lastColon < 0) return null;
  const tierColon = key.lastIndexOf(':', lastColon - 1);
  if (tierColon < 0) return null;
  return {
    bossId: key.slice(0, tierColon),
    tier: key.slice(tierColon + 1, lastColon),
    cadence: key.slice(lastColon + 1),
  };
}

function buildSelectionKey(bossId: string, tier: BossTier, cadence: BossCadence): string {
  return `${bossId}:${tier}:${cadence}`;
}

/** Hardest-Tier difficulty — biggest `crystalValue` wins, tier name ignored. */
function pickHardest(boss: Boss): BossDifficulty {
  return boss.difficulty.reduce((best, d) => (d.crystalValue > best.crystalValue ? d : best));
}

/**
 * Desugar an authoring-form entry into a normalized `PresetEntry`. Bare
 * strings resolve **Default Tier** to the boss's **Hardest Tier**; legacy
 * `{ family, tier }` becomes `tiers: [tier]`; `{ family, tiers }` passes
 * through. Returns `null` for unknown families.
 */
export function normalizeEntry(spec: PresetFamily): PresetEntry | null {
  if (typeof spec === 'string') {
    const boss = getBossByFamily(spec);
    if (!boss) return null;
    return { family: spec, tiers: [pickHardest(boss).tier] };
  }
  if ('tiers' in spec) return { family: spec.family, tiers: spec.tiers };
  return { family: spec.family, tiers: [spec.tier] };
}

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
    { family: 'lotus', tiers: ['normal', 'hard'] },
    { family: 'damien', tiers: ['normal', 'hard'] },
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

/** Resolved **Default Tier** selection key for an entry, or `null`. */
export function presetEntryKey(spec: PresetFamily): string | null {
  const entry = normalizeEntry(spec);
  if (!entry) return null;
  return defaultTierKey(entry);
}

/** Family slug for an authoring-form entry. */
export function presetEntryFamily(spec: PresetFamily): string {
  return typeof spec === 'string' ? spec : spec.family;
}

/** Resolved **Default Tier** key for a normalized entry, or `null`. */
function defaultTierKey(entry: PresetEntry): string | null {
  const boss = getBossByFamily(entry.family);
  if (!boss) return null;
  const diff = boss.difficulty.find((d) => d.tier === entry.tiers[0]);
  if (!diff) return null;
  return buildSelectionKey(boss.id, diff.tier, diff.cadence);
}

/**
 * Build `{ bossId → entry }` for a preset's entries. Entries whose family
 * doesn't resolve are skipped so callers can iterate without null checks.
 */
function entryByBossId(preset: PresetKey): Map<string, PresetEntry> {
  const map = new Map<string, PresetEntry>();
  for (const spec of PRESET_FAMILIES[preset]) {
    const entry = normalizeEntry(spec);
    if (!entry) continue;
    const boss = getBossByFamily(entry.family);
    if (!boss) continue;
    map.set(boss.id, entry);
  }
  return map;
}

/**
 * **Same-Cadence Equality**: `true` iff every **Preset Entry** is satisfied
 * by exactly one weekly key whose tier is in **Accepted Tiers**, AND no
 * weekly keys exist on families outside the preset's entries. Daily keys
 * are ignored entirely.
 */
export function isPresetActive(preset: PresetKey, keys: readonly string[]): boolean {
  const entries = entryByBossId(preset);
  const weeklyTierByBossId = new Map<string, string>();

  for (const key of keys) {
    const parsed = parseKey(key);
    if (!parsed || parsed.cadence !== 'weekly') continue;
    // Any weekly key on a non-preset family breaks the match.
    if (!entries.has(parsed.bossId)) return false;
    weeklyTierByBossId.set(parsed.bossId, parsed.tier);
  }

  for (const [bossId, entry] of entries) {
    const tier = weeklyTierByBossId.get(bossId);
    if (!tier) return false;
    if (!entry.tiers.includes(tier as BossTier)) return false;
  }
  return true;
}

/**
 * **Conform** the mule's selection to `preset`:
 *
 * - Preserve weekly keys whose family is in the preset's entries AND whose
 *   tier is in **Accepted Tiers**.
 * - Wipe every other weekly key (non-preset families + non-accepted tiers).
 * - For every entry not already satisfied, add the **Default Tier** key.
 * - All daily keys pass through untouched.
 *
 * Idempotent on an already-**Active Preset** selection.
 */
export function conform(keys: readonly string[], preset: PresetKey): string[] {
  const entries = entryByBossId(preset);
  const next: string[] = [];
  const satisfied = new Set<string>();

  for (const key of keys) {
    const parsed = parseKey(key);
    // Malformed keys (un-parseable) pass through. Dailies pass through too.
    if (!parsed || parsed.cadence !== 'weekly') {
      next.push(key);
      continue;
    }
    const entry = entries.get(parsed.bossId);
    if (!entry) continue; // weekly on non-preset family → wipe
    if (!entry.tiers.includes(parsed.tier as BossTier)) continue; // non-accepted tier → wipe
    next.push(key);
    satisfied.add(parsed.bossId);
  }

  for (const [bossId, entry] of entries) {
    if (satisfied.has(bossId)) continue;
    const key = defaultTierKey(entry);
    if (key) next.push(key);
  }

  return next;
}
