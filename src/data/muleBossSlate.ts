import type { Boss, BossCadence, BossDifficulty, BossTier } from '../types';
import { bosses, getBossById, TIER_LESS_FAMILIES } from './bosses';
import { formatMeso } from '../utils/meso';

/**
 * `MuleBossSlate` — the validated, immutable value class representing a
 * **Mule's** **Boss Slate**. Every instance respects the **Selection
 * Invariant**: at most one **Slate Key** per `(bossId, cadence)` bucket.
 *
 * This module is the sole owner of the selection-key grammar, the
 * `(bossId, cadence)` uniqueness invariant, the tier-swap-on-toggle
 * semantics, and the family/tier view projection. The helpers below
 * (`makeKey`, `parseKey`, `validateBossSelection`, `toggleBoss`, etc.) are
 * module-private on purpose: external code must go through
 * `MuleBossSlate.from` or `slate.toggle`, so the Selection Invariant is
 * unreachable by any other code path.
 */

/** Opaque selection-key shape: `<uuid>:<tier>:<cadence>`. */
export type SlateKey = string;

/**
 * Capitalized difficulty label for the pip colour / row name prefix. Distinct
 * from the `BossDifficulty` *interface* in `../types` that holds the
 * `{ tier, crystalValue, cadence }` shape.
 */
export type BossDifficultyLabel = 'Extreme' | 'Chaos' | 'Hard' | 'Normal' | 'Easy';

/** Tier order for the Matrix view (columns, extreme → easy, hardest first). */
const TIER_ORDER: BossTier[] = ['extreme', 'chaos', 'hard', 'normal', 'easy'];

const TIER_SET: ReadonlySet<BossTier> = new Set(TIER_ORDER);

const CADENCE_SET: ReadonlySet<BossCadence> = new Set(['daily', 'weekly']);

const TIER_LABEL: Record<BossTier, BossDifficultyLabel> = {
  easy: 'Easy',
  normal: 'Normal',
  hard: 'Hard',
  chaos: 'Chaos',
  extreme: 'Extreme',
};

/** Build a native selection key from a boss id, tier, and cadence. */
function makeKey(bossId: string, tier: BossTier, cadence: BossCadence): string {
  return `${bossId}:${tier}:${cadence}`;
}

/**
 * Parse a selection key. Returns null if malformed, unknown boss, tier not
 * offered, or if the cadence segment disagrees with the boss data. Splits
 * on the last two colons so `bossId` (a UUID with its own dashes) stays
 * intact as the prefix.
 */
function parseKey(key: string): { bossId: string; tier: BossTier; cadence: BossCadence } | null {
  const lastColon = key.lastIndexOf(':');
  if (lastColon < 0) return null;
  const tierColon = key.lastIndexOf(':', lastColon - 1);
  if (tierColon < 0) return null;

  const tierStr = key.slice(tierColon + 1, lastColon);
  const cadenceStr = key.slice(lastColon + 1);
  if (!TIER_SET.has(tierStr as BossTier)) return null;
  if (!CADENCE_SET.has(cadenceStr as BossCadence)) return null;

  const bossId = key.slice(0, tierColon);
  const boss = getBossById(bossId);
  if (!boss) return null;

  const tier = tierStr as BossTier;
  const cadence = cadenceStr as BossCadence;
  const diff = boss.difficulty.find((d) => d.tier === tier);
  if (!diff || diff.cadence !== cadence) return null;
  return { bossId, tier, cadence };
}

function resolveKey(key: string): { boss: Boss; diff: BossDifficulty } | null {
  const parsed = parseKey(key);
  if (!parsed) return null;
  const boss = getBossById(parsed.bossId)!;
  const diff = boss.difficulty.find((d) => d.tier === parsed.tier)!;
  return { boss, diff };
}

/**
 * Row shape emitted internally by `getFamilies` and projected into
 * `SlateRow` by `MuleBossSlate.view()`.
 */
interface FamilyRow {
  bossId: string;
  tier: BossTier;
  /** Selection key = `makeKey(bossId, tier, cadence)`. Also used as React list key. */
  key: string;
  /** Display label — "<Tier> <Family>" for tiered families, bare family name otherwise. */
  name: string;
  crystalValue: number;
  formattedValue: string;
  /** Pip-colour label (null for tier-less families). */
  difficulty: BossDifficultyLabel | null;
  selected: boolean;
}

interface FamilyView {
  family: string;
  displayName: string;
  bosses: FamilyRow[];
}

function rowLabel(family: string, tier: BossTier, familyName: string): string {
  return TIER_LESS_FAMILIES.has(family) ? familyName : `${TIER_LABEL[tier]} ${familyName}`;
}

function validateBossSelection(keys: string[]): string[] {
  interface ResolvedKey {
    key: string;
    bossId: string;
    cadence: BossCadence;
    crystalValue: number;
  }
  const resolved: ResolvedKey[] = [];
  for (const key of keys) {
    const r = resolveKey(key);
    if (r) {
      resolved.push({
        key,
        bossId: r.boss.id,
        cadence: r.diff.cadence,
        crystalValue: r.diff.crystalValue,
      });
    }
  }

  // One winner per (bossId, cadence): a boss can retain one daily AND one
  // weekly selection simultaneously.
  const winner = new Map<string, ResolvedKey>();
  for (const r of resolved) {
    const bucket = `${r.bossId}:${r.cadence}`;
    const current = winner.get(bucket);
    if (!current || r.crystalValue > current.crystalValue) winner.set(bucket, r);
  }
  const winnerKeys = new Set(Array.from(winner.values(), (w) => w.key));
  return resolved.filter((r) => winnerKeys.has(r.key)).map((r) => r.key);
}

function toggleBoss(keys: string[], bossId: string, tier: BossTier): string[] {
  const boss = getBossById(bossId);
  if (!boss) return keys;
  const diff = boss.difficulty.find((d) => d.tier === tier);
  if (!diff) return keys;

  const target = makeKey(bossId, tier, diff.cadence);
  // Same-cadence sibling on the same boss: opposite-cadence selections are
  // untouched so a mule can keep one daily + one weekly simultaneously.
  const existingKey = keys.find((k) => {
    const p = parseKey(k);
    return p?.bossId === bossId && p.cadence === diff.cadence;
  });
  if (existingKey === target) return keys.filter((k) => k !== target);
  if (existingKey) return keys.map((k) => (k === existingKey ? target : k));
  return [...keys, target];
}

/**
 * Curated family order for the Matrix display. This is the single source of
 * truth for row order in BossMatrix and `getFamilies`; keep in sync with any
 * Boss added to `bosses`.
 */
const DISPLAY_ORDER: readonly string[] = [
  'black-mage',
  'baldrix',
  'limbo',
  'kaling',
  'first-adversary',
  'kalos-the-guardian',
  'chosen-seren',
  'darknell',
  'verus-hilla',
  'gloom',
  'will',
  'lucid',
  'guardian-angel-slime',
  'damien',
  'lotus',
  'papulatus',
  'vellum',
  'crimson-queen',
  'von-bon',
  'pierre',
  'akechi-mitsuhide',
  'princess-no',
  'magnus',
  'cygnus',
  'pink-bean',
  'hilla',
  'zakum',
  'arkarium',
  'mori-ranmaru',
  'horntail',
  'von-leon',
  'omni-cln',
];

const bossesByDisplayOrder: readonly Boss[] = DISPLAY_ORDER.map((family) => {
  const boss = bosses.find((b) => b.family === family);
  if (!boss) throw new Error(`DISPLAY_ORDER references unknown family: ${family}`);
  return boss;
});

function countWeeklySelections(keys: string[]): number {
  let count = 0;
  for (const key of keys) {
    const parsed = parseKey(key);
    if (parsed?.cadence === 'weekly') count++;
  }
  return count;
}

function countDailySelections(keys: string[]): number {
  let count = 0;
  for (const key of keys) {
    const parsed = parseKey(key);
    if (parsed?.cadence === 'daily') count++;
  }
  return count;
}

function getFamilies(
  keys: string[],
  search: string,
  { abbreviated = true }: { abbreviated?: boolean } = {},
): FamilyView[] {
  const selectedSet = new Set(keys);

  const families: FamilyView[] = bossesByDisplayOrder.map((boss) => ({
    family: boss.family,
    displayName: boss.name,
    bosses: boss.difficulty
      .slice()
      .sort((a, b) => b.crystalValue - a.crystalValue)
      .map((diff): FamilyRow => {
        const key = makeKey(boss.id, diff.tier, diff.cadence);
        return {
          bossId: boss.id,
          tier: diff.tier,
          key,
          name: rowLabel(boss.family, diff.tier, boss.name),
          crystalValue: diff.crystalValue,
          formattedValue: formatMeso(diff.crystalValue, abbreviated),
          difficulty: TIER_LESS_FAMILIES.has(boss.family) ? null : TIER_LABEL[diff.tier],
          selected: selectedSet.has(key),
        };
      }),
  }));

  if (!search) return families;

  const lower = search.toLowerCase();
  return families.filter(
    (f) =>
      f.family.toLowerCase().includes(lower) ||
      f.displayName.toLowerCase().includes(lower) ||
      f.bosses.some((b) => b.name.toLowerCase().includes(lower)),
  );
}

/**
 * A single view-projection row from `MuleBossSlate.view()` — one **Boss
 * Difficulty** of a **Boss** at a **Boss Cadence** with its `selected`
 * boolean baked in. Consumed by **Boss Matrix** and similar UI.
 */
export interface SlateRow {
  key: SlateKey;
  bossId: string;
  tier: BossTier;
  cadence: BossCadence;
  /** Display label — "<Tier> <Family>" for tiered families, bare name otherwise. */
  name: string;
  crystalValue: number;
  formattedValue: string;
  /** Capitalized pip label; null for tier-less families. */
  difficultyLabel: BossDifficultyLabel | null;
  selected: boolean;
}

/**
 * A view-projection group of **Slate Rows** keyed by **Boss Family**.
 * Emitted in display order by `MuleBossSlate.view()`.
 */
export interface SlateFamily {
  family: string;
  displayName: string;
  rows: SlateRow[];
}

export class MuleBossSlate {
  /**
   * Reference-stable empty singleton. `MuleBossSlate.from([])` returns this
   * same instance so `slate === MuleBossSlate.EMPTY` is a cheap equality
   * check for React memoization.
   */
  static readonly EMPTY: MuleBossSlate = new MuleBossSlate([]);

  /** Read-only array of validated **Slate Keys**, in caller-supplied order. */
  readonly keys: readonly SlateKey[];

  private constructor(keys: readonly SlateKey[]) {
    this.keys = keys;
  }

  /**
   * Construct a **Boss Slate** from a raw key array.
   *
   * - Duplicate `(bossId, cadence)` buckets keep the highest-**Crystal
   *   Value** **Slate Key**.
   * - Unresolvable keys (unknown boss, unknown tier, cadence disagrees with
   *   boss data) drop silently.
   * - **Legacy Slate Keys** (`<uuid>:<tier>` without cadence) are rejected;
   *   migration is the caller's responsibility upstream in `useMules`.
   * - `from([])` returns the `EMPTY` singleton.
   */
  static from(keys: readonly string[]): MuleBossSlate {
    if (keys.length === 0) return MuleBossSlate.EMPTY;
    const validated = validateBossSelection(keys as string[]);
    if (validated.length === 0) return MuleBossSlate.EMPTY;
    return new MuleBossSlate(validated);
  }

  /**
   * Return a new **Boss Slate** after toggling `key`:
   *
   * - Same key present → deselect.
   * - Different tier on the same `(bossId, cadence)` → **Tier Swap**.
   * - Different cadence on the same boss → the new key coexists.
   * - Unresolvable `key` → the slate is returned unchanged.
   */
  toggle(key: SlateKey): MuleBossSlate {
    const parsed = parseKey(key);
    if (!parsed) return this;
    const next = toggleBoss(this.keys as string[], parsed.bossId, parsed.tier);
    if (next === this.keys) return this;
    if (next.length === 0) return MuleBossSlate.EMPTY;
    return new MuleBossSlate(next);
  }

  /**
   * Project this slate into `SlateFamily[]` for rendering by **Boss Matrix**.
   * Families are ordered by the curated display order; rows within a family
   * are sorted by **Crystal Value** descending. `search` filters
   * case-insensitively on family slug + display name + boss/row name.
   */
  view(search: string = '', opts: { abbreviated?: boolean } = {}): SlateFamily[] {
    const families = getFamilies(this.keys as string[], search, opts);
    return families.map((f) => ({
      family: f.family,
      displayName: f.displayName,
      rows: f.bosses.map((b) => ({
        key: b.key,
        bossId: b.bossId,
        tier: b.tier,
        cadence: parseKey(b.key)!.cadence,
        name: b.name,
        crystalValue: b.crystalValue,
        formattedValue: b.formattedValue,
        difficultyLabel: b.difficulty,
        selected: b.selected,
      })),
    }));
  }

  /** Count of **Slate Keys** whose **Boss Cadence** is `weekly`. */
  get weeklyCount(): number {
    return countWeeklySelections(this.keys as string[]);
  }

  /** Count of **Slate Keys** whose **Boss Cadence** is `daily`. */
  get dailyCount(): number {
    return countDailySelections(this.keys as string[]);
  }

  /**
   * Cadence-weighted sum: daily **Slate Keys** contribute `crystalValue × 7`,
   * weekly contribute `crystalValue × 1`. The basis for **Potential Income**
   * before **Active Flag** / **Party Size** adjustments (caller applies those).
   */
  get totalCrystalValue(): number {
    let total = 0;
    for (const key of this.keys) {
      const parsed = parseKey(key);
      if (!parsed) continue;
      const diff = getBossById(parsed.bossId)!.difficulty.find((d) => d.tier === parsed.tier)!;
      total += diff.crystalValue * (parsed.cadence === 'daily' ? 7 : 1);
    }
    return total;
  }
}
