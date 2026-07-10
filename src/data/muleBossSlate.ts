import type { Boss, BossCadence, BossDifficulty, BossTier } from '../types';
import { bosses, getBossById, getBossByFamily, TIER_LESS_FAMILIES } from './bosses';
import { FALLBACK_WORLD_GROUP, type WorldGroup } from './worlds';
import { formatMeso } from '../utils/meso';
import {
  normalizeEntry,
  PRESET_FAMILIES,
  type CanonicalPresetKey,
  type PresetEntry,
  type PresetKey,
} from './bossPresets';
import type { UserPreset } from './userPresets';

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
 * MapleStory's weekly boss crystal sale limit. Enforced as a data-layer
 * invariant: every `MuleBossSlate` carries at most `WEEKLY_CRYSTAL_CAP`
 * **Weekly Cadence** **Slate Keys** by construction — `MuleBossSlate.from`
 * trims excess weeklies after the **Selection Invariant** dedupe, dropping
 * the lowest-`crystalValue` entries first (ties broken by insertion order
 * in favour of the earlier-inserted key). Daily and monthly **Slate Keys**
 * are not affected by the trim. The **Crystal Tally** displays **Weekly
 * Count** against this cap as `X/14`.
 */
export const WEEKLY_CRYSTAL_CAP = 14;

/**
 * Capitalized difficulty label for the pip colour / row name prefix. Distinct
 * from the `BossDifficulty` *interface* in `../types` that holds the
 * `{ tier, crystalValue, cadence }` shape.
 */
export type BossDifficultyLabel = 'Extreme' | 'Chaos' | 'Hard' | 'Normal' | 'Easy';

/** Tier order for the Matrix view (columns, extreme → easy, hardest first). */
const TIER_ORDER: BossTier[] = ['extreme', 'chaos', 'hard', 'normal', 'easy'];

const TIER_SET: ReadonlySet<BossTier> = new Set(TIER_ORDER);

const CADENCE_SET: ReadonlySet<BossCadence> = new Set(['daily', 'weekly', 'monthly']);

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

/** Resolve a **Boss Difficulty**'s crystal value for a specific **World Group**. */
function priceFor(diff: BossDifficulty, worldGroup: WorldGroup): number {
  return diff.crystalValue[worldGroup];
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

function validateBossSelection(keys: string[], worldGroup: WorldGroup): string[] {
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
        crystalValue: priceFor(r.diff, worldGroup),
      });
    }
  }

  // One winner per (bossId, cadence): a boss can retain one daily, one
  // weekly, and one monthly selection simultaneously.
  const winner = new Map<string, ResolvedKey>();
  for (const r of resolved) {
    const bucket = `${r.bossId}:${r.cadence}`;
    const current = winner.get(bucket);
    if (!current || r.crystalValue > current.crystalValue) winner.set(bucket, r);
  }
  const winnerKeys = new Set(Array.from(winner.values(), (w) => w.key));
  return resolved.filter((r) => winnerKeys.has(r.key)).map((r) => r.key);
}

/**
 * Enforce `WEEKLY_CRYSTAL_CAP` on a post-validation key array. Trims
 * weeklies past the cap by dropping the lowest-`crystalValue` entries
 * first; ties break in favour of the earlier-inserted key. Surviving keys
 * stay in their original insertion order. Daily and monthly keys pass
 * through untouched.
 */
function trimWeeklies(keys: string[], worldGroup: WorldGroup): string[] {
  const weeklies: { index: number; crystalValue: number }[] = [];
  for (let i = 0; i < keys.length; i++) {
    const r = resolveKey(keys[i]);
    if (r?.diff.cadence === 'weekly') {
      weeklies.push({ index: i, crystalValue: priceFor(r.diff, worldGroup) });
    }
  }
  if (weeklies.length <= WEEKLY_CRYSTAL_CAP) return keys;

  // Sort: highest crystalValue first; on tie, the earlier-inserted (lower
  // index) key wins.
  weeklies.sort((a, b) => b.crystalValue - a.crystalValue || a.index - b.index);
  const dropIndices = new Set(weeklies.slice(WEEKLY_CRYSTAL_CAP).map((w) => w.index));
  return keys.filter((_, i) => !dropIndices.has(i));
}

function toggleBoss(keys: string[], bossId: string, tier: BossTier): string[] {
  const boss = getBossById(bossId);
  if (!boss) return keys;
  const diff = boss.difficulty.find((d) => d.tier === tier);
  if (!diff) return keys;

  const target = makeKey(bossId, tier, diff.cadence);
  // Same-cadence sibling on the same boss: opposite-cadence selections are
  // untouched so a mule can keep one daily + one weekly + one monthly
  // simultaneously. For monthly Black Mage this doubles as the **Monthly
  // Radio Mutex** — selecting Extreme while Hard is selected tier-swaps
  // (both live in the same (bossId, 'monthly') bucket), so `monthlyCount`
  // stays in {0, 1} without any extra branching here.
  const existingKey = keys.find((k) => {
    const p = parseKey(k);
    return p?.bossId === bossId && p.cadence === diff.cadence;
  });
  if (existingKey === target) return keys.filter((k) => k !== target);
  if (existingKey) return keys.map((k) => (k === existingKey ? target : k));
  return [...keys, target];
}

/**
 * Family order for the Matrix display. Single source of truth for row order
 * in BossMatrix and `getFamilies`; keep in sync with any Boss added to
 * `bosses`.
 *
 * Ranking rule:
 *  1. Black Mage is pinned first so the monthly-only selection is immediately
 *     visible in the Boss Matrix.
 *  2. Weekly-eligible families (any difficulty has cadence `weekly`) come
 *     first, sorted by their highest-tier Heroic crystalValue descending.
 *     Ties are broken by stable insertion order.
 *  3. Daily-only families (every difficulty is daily) follow, sorted by
 *     their highest-tier Heroic crystalValue descending — equivalent to
 *     weekly-normalized (× 7) since the multiplier is uniform.
 */
const DISPLAY_ORDER: readonly string[] = [
  'black-mage',
  'jupiter',
  'kaling',
  'first-adversary',
  'kalos-the-guardian',
  'chosen-seren',
  'baldrix',
  'malefic-star',
  'limbo',
  'lotus',
  'verus-hilla',
  'darknell',
  'will',
  'guardian-angel-slime',
  'gloom',
  'lucid',
  'damien',
  'akechi-mitsuhide',
  'papulatus',
  'vellum',
  'magnus',
  'crimson-queen',
  'von-bon',
  'pierre',
  'princess-no',
  'zakum',
  'cygnus',
  'pink-bean',
  'hilla',
  'mori-ranmaru',
  'arkarium',
  'von-leon',
  'horntail',
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

function countMonthlySelections(keys: string[]): number {
  let count = 0;
  for (const key of keys) {
    const parsed = parseKey(key);
    if (parsed?.cadence === 'monthly') count++;
  }
  return count;
}

function getFamilies(
  keys: string[],
  search: string,
  worldGroup: WorldGroup,
  { abbreviated = true }: { abbreviated?: boolean } = {},
): FamilyView[] {
  const selectedSet = new Set(keys);

  const families: FamilyView[] = bossesByDisplayOrder.map((boss) => ({
    family: boss.family,
    displayName: boss.name,
    bosses: boss.difficulty
      .slice()
      .sort((a, b) => priceFor(b, worldGroup) - priceFor(a, worldGroup))
      .map((diff): FamilyRow => {
        const key = makeKey(boss.id, diff.tier, diff.cadence);
        const resolved = priceFor(diff, worldGroup);
        return {
          bossId: boss.id,
          tier: diff.tier,
          key,
          name: rowLabel(boss.family, diff.tier, boss.name),
          crystalValue: resolved,
          formattedValue: formatMeso(resolved, abbreviated),
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

/**
 * A single **Crystal Slot** — one unit of the **World Slot Pool** that the
 * **World Cap Cut** consumes. Daily Cadence keys expand into 7 slots (one per
 * day) at full **Crystal Value**; Weekly Cadence keys expand into 1 slot at
 * `crystalValue / partySize`; Monthly Cadence keys contribute zero slots.
 */
export interface SlateSlot {
  /** Per-slot meso value (Computed Value at the slot grain). */
  value: number;
  /** `'weekly'` or `'daily'` — Monthly Cadence keys do not appear here. */
  cadence: Exclude<BossCadence, 'monthly'>;
  /** The originating **Slate Key** so callers can attribute slots back to keys. */
  slateKey: SlateKey;
}

/**
 * Render a single dropped **Slate Key** into a human-readable line for the
 * per-card cap-drop tooltip. Cadence-aware:
 *
 * - Weekly Cadence → `<Boss Name> dropped` (count omitted; weekly keys always
 *   contribute exactly one slot, so a count would be redundant).
 * - Daily Cadence → `<count>× daily <Boss Name> dropped` (count is always
 *   shown, including `1×`, so partial-drop counts like `3×` aren't confusable
 *   with the all-7 case).
 * - Monthly Cadence / unresolvable keys → empty string. Monthly keys never
 *   reach the cap pool, so this is unreachable in practice but kept defensive.
 *
 * The display name is the Boss Matrix row label: tiered families render as
 * `<Tier> <Family Name>`; tier-less families render as the bare family name.
 */
export function formatDroppedSlot(slateKey: SlateKey, count: number): string {
  const resolved = resolveKey(slateKey);
  if (!resolved) return '';
  const { boss, diff } = resolved;
  const name = rowLabel(boss.family, diff.tier, boss.name);
  if (diff.cadence === 'weekly') return `${name} dropped`;
  if (diff.cadence === 'daily') return `${count}× daily ${name} dropped`;
  return '';
}

/**
 * Render every dropped key in the per-mule `droppedKeys` map into a
 * tooltip-ready `string[]`, ordered by **Boss Matrix** display order. The
 * input map's iteration order is not preserved; the helper resolves each
 * key, sorts on `(family display index, crystalValue desc)`, and emits one
 * line per surviving key. Unresolvable keys drop silently. Empty input
 * returns `[]`.
 */
export function formatDroppedSlots(droppedKeys: ReadonlyMap<SlateKey, number>): string[] {
  if (droppedKeys.size === 0) return [];
  interface Entry {
    line: string;
    familyIndex: number;
    crystalValue: number;
  }
  const entries: Entry[] = [];
  for (const [key, count] of droppedKeys) {
    const resolved = resolveKey(key);
    if (!resolved) continue;
    const line = formatDroppedSlot(key, count);
    if (!line) continue;
    const familyIndex = DISPLAY_ORDER.indexOf(resolved.boss.family);
    entries.push({
      line,
      familyIndex: familyIndex < 0 ? Number.MAX_SAFE_INTEGER : familyIndex,
      crystalValue: priceFor(resolved.diff, FALLBACK_WORLD_GROUP),
    });
  }
  entries.sort((a, b) => {
    if (a.familyIndex !== b.familyIndex) return a.familyIndex - b.familyIndex;
    return b.crystalValue - a.crystalValue;
  });
  return entries.map((e) => e.line);
}

/**
 * Resolve the **Default Tier** selection key for a normalized **Preset Entry**.
 * Returns `null` if the family or its **Default Tier** is unresolvable.
 * Module-private helper for `conform` / `isPresetActive`.
 */
function defaultTierKey(entry: PresetEntry): string | null {
  const boss = getBossByFamily(entry.family);
  if (!boss) return null;
  const diff = boss.difficulty.find((d) => d.tier === entry.tiers[0]);
  if (!diff) return null;
  return makeKey(boss.id, diff.tier, diff.cadence);
}

/**
 * Build `{ bossId → entry }` for a **Canonical Preset's** entries. Entries
 * whose family doesn't resolve are skipped so callers can iterate without
 * null checks.
 */
function entryByBossId(preset: CanonicalPresetKey): Map<string, PresetEntry> {
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
 * **Full-Slate Equality** — `true` iff every **Preset Entry** is satisfied
 * by exactly one weekly key whose tier is in **Accepted Tiers**, no weekly
 * keys exist on families outside the preset's entries, AND the slate
 * carries zero daily and zero monthly keys.
 */
function isPresetActive(preset: CanonicalPresetKey, keys: readonly string[]): boolean {
  const entries = entryByBossId(preset);
  const weeklyTierByBossId = new Map<string, BossTier>();
  for (const key of keys) {
    const parsed = parseKey(key);
    if (!parsed) continue;
    if (parsed.cadence !== 'weekly') return false;
    if (!entries.has(parsed.bossId)) return false;
    weeklyTierByBossId.set(parsed.bossId, parsed.tier);
  }
  for (const [bossId, entry] of entries) {
    const tier = weeklyTierByBossId.get(bossId);
    if (!tier) return false;
    if (!entry.tiers.includes(tier)) return false;
  }
  return true;
}

/**
 * **Conform** the slate's keys to `preset`: keep weekly keys whose family
 * is in the preset and whose tier is in **Accepted Tiers**; wipe every
 * other weekly key plus all daily and monthly keys; for every entry not
 * already satisfied, add the **Default Tier** key. Idempotent on an
 * already-**Active Preset** selection.
 */
function conform(keys: readonly string[], preset: CanonicalPresetKey): string[] {
  const entries = entryByBossId(preset);
  const next: string[] = [];
  const satisfied = new Set<string>();
  for (const key of keys) {
    const parsed = parseKey(key);
    if (!parsed) continue;
    if (parsed.cadence !== 'weekly') continue;
    const entry = entries.get(parsed.bossId);
    if (!entry) continue;
    if (!entry.tiers.includes(parsed.tier)) continue;
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

/**
 * Default-aware per-family party-size compare for **User Preset Match**:
 * for every family in the snapshot's `partySizes`,
 * `(snapshot[family] ?? 1) === (current[family] ?? 1)`. Extraneous
 * entries on `current` for families not in the snapshot are ignored.
 */
function partySizesMatch(
  snapshot: Record<string, number>,
  current: Record<string, number>,
): boolean {
  for (const family of Object.keys(snapshot)) {
    if ((snapshot[family] ?? 1) !== (current[family] ?? 1)) return false;
  }
  return true;
}

export class MuleBossSlate {
  /**
   * Reference-stable empty slate cache, keyed by **World Group**. At most
   * one entry per World Group (today: 2). Populated lazily by `emptyFor`.
   */
  private static readonly emptyByGroup: Map<WorldGroup, MuleBossSlate> = new Map();

  /**
   * Reference-stable empty singleton for the default **World Group** (Heroic).
   * `MuleBossSlate.from([])` returns this same instance so
   * `slate === MuleBossSlate.EMPTY` remains a cheap equality check for React
   * memoization. Interactive empty slates have their own cached singleton via
   * `emptyFor`, so the optimization generalizes to every World Group.
   */
  static readonly EMPTY: MuleBossSlate = MuleBossSlate.emptyFor(FALLBACK_WORLD_GROUP);

  /**
   * Canonical preset search order for `matchedCanonical()`. Declaration
   * order is the tiebreak — at most one preset can satisfy **Full-Slate
   * Equality** at a time, so this only matters when adding a new preset.
   */
  private static readonly CANONICAL_SEARCH_ORDER: readonly CanonicalPresetKey[] = [
    'CRA',
    'LOMIEN',
    'CTENE',
  ];

  /** Read-only array of validated **Slate Keys**, in caller-supplied order. */
  readonly keys: readonly SlateKey[];

  /**
   * The **World Group** this slate is priced against. Private because no
   * external consumer needs to read it — callers already have `worldGroup`
   * in scope before constructing, and all price-reading methods
   * (`view`, `totalCrystalValue`) resolve against it internally.
   */
  private readonly worldGroup: WorldGroup;

  private constructor(keys: readonly SlateKey[], worldGroup: WorldGroup) {
    this.keys = keys;
    this.worldGroup = worldGroup;
  }

  /** Fetch-or-create the reference-stable empty slate for a **World Group**. */
  private static emptyFor(worldGroup: WorldGroup): MuleBossSlate {
    let cached = MuleBossSlate.emptyByGroup.get(worldGroup);
    if (!cached) {
      cached = new MuleBossSlate([], worldGroup);
      MuleBossSlate.emptyByGroup.set(worldGroup, cached);
    }
    return cached;
  }

  /**
   * Construct a **Boss Slate** from a raw key array.
   *
   * - `worldGroup` (default `'Heroic'`) binds the slate to a **World Group**;
   *   every price-reading method resolves against it.
   * - Duplicate `(bossId, cadence)` buckets keep the highest-**Crystal
   *   Value** **Slate Key** for the chosen World Group.
   * - Unresolvable keys (unknown boss, unknown tier, cadence disagrees with
   *   boss data) drop silently.
   * - **Legacy Slate Keys** (`<uuid>:<tier>` without cadence) are rejected;
   *   migration is the caller's responsibility upstream in `useMules`.
   * - Empty outcomes return a per-World-Group cached empty slate (see
   *   `emptyFor`) so reference equality survives across calls.
   */
  static from(
    keys: readonly string[],
    worldGroup: WorldGroup = FALLBACK_WORLD_GROUP,
  ): MuleBossSlate {
    if (keys.length === 0) return MuleBossSlate.emptyFor(worldGroup);
    const validated = validateBossSelection(keys as string[], worldGroup);
    if (validated.length === 0) return MuleBossSlate.emptyFor(worldGroup);
    const trimmed = trimWeeklies(validated, worldGroup);
    return new MuleBossSlate(trimmed, worldGroup);
  }

  /**
   * Predicate gate for the **Slate Toggle** action: returns `false` only
   * when applying `toggle(key)` would push a slate that is already at the
   * **Weekly Crystal Cap** past the cap — i.e. a Weekly Cadence *add* with
   * no existing same-`(bossId, weekly)` sibling. Tier-swaps (count
   * unchanged), removes (count decreases), Daily/Monthly Cadence toggles,
   * and unresolvable keys all return `true`. The handler layer
   * (`useSlateActions.toggleKey`) consults this predicate to surface a
   * rejection toast; `toggle()` itself is unchanged and does not enforce
   * the cap on its own.
   */
  canToggle(key: SlateKey): boolean {
    const parsed = parseKey(key);
    if (!parsed) return true;
    if (parsed.cadence !== 'weekly') return true;
    if (this.weeklyCount < WEEKLY_CRYSTAL_CAP) return true;
    const hasSibling = this.keys.some((k) => {
      const p = parseKey(k);
      return p?.bossId === parsed.bossId && p.cadence === 'weekly';
    });
    return hasSibling;
  }

  /**
   * Return a new **Boss Slate** after toggling `key`:
   *
   * - Same key present → deselect.
   * - Different tier on the same `(bossId, cadence)` → **Tier Swap**.
   * - Different cadence on the same boss → the new key coexists.
   * - Unresolvable `key` → the slate is returned unchanged.
   *
   * The new slate retains this slate's **World Group** binding.
   */
  toggle(key: SlateKey): MuleBossSlate {
    const parsed = parseKey(key);
    if (!parsed) return this;
    const next = toggleBoss(this.keys as string[], parsed.bossId, parsed.tier);
    if (next === this.keys) return this;
    if (next.length === 0) return MuleBossSlate.emptyFor(this.worldGroup);
    return new MuleBossSlate(next, this.worldGroup);
  }

  /**
   * Apply a **Canonical Preset** to this slate.
   *
   * - Returns `{ slate: this, changed: false }` when the receiver already
   *   satisfies **Full-Slate Equality** with `preset` — the no-op
   *   short-circuit becomes a slate invariant.
   * - Otherwise runs **Conform** and re-validates via the same constructor
   *   pipeline as `MuleBossSlate.from` (Selection Invariant dedupe +
   *   Weekly Crystal Cap trim), inheriting the receiver's **World Group**.
   *
   * `'CUSTOM'` is not accepted — the type signature requires
   * `CanonicalPresetKey`. Custom-pill click is owned by the toolbar.
   */
  applyCanonical(preset: CanonicalPresetKey): { slate: MuleBossSlate; changed: boolean } {
    if (isPresetActive(preset, this.keys)) return { slate: this, changed: false };
    const next = conform(this.keys, preset);
    return { slate: MuleBossSlate.from(next, this.worldGroup), changed: true };
  }

  /**
   * **Matched Canonical Preset** — return the first **Canonical Preset**
   * satisfying **Full-Slate Equality** against the receiver, or `null`
   * when none match. Searches in declaration order (`CRA → LOMIEN → CTENE`);
   * at most one match by definition.
   */
  matchedCanonical(): CanonicalPresetKey | null {
    for (const preset of MuleBossSlate.CANONICAL_SEARCH_ORDER) {
      if (isPresetActive(preset, this.keys)) return preset;
    }
    return null;
  }

  /**
   * **Matched User Preset** — return the first **User Preset** in
   * `snapshots` whose `slateKeys` set-equal the receiver's keys AND whose
   * per-family party sizes match the caller-supplied `partySizes`, or
   * `null` when none match.
   *
   * Slate-key equality is order-insensitive (set semantics — the
   * **Selection Invariant** rules out duplicate keys upstream).
   *
   * Party-size equality is default-aware: for every family present in the
   * snapshot's `partySizes`,
   * `(snapshot[family] ?? 1) === (current[family] ?? 1)`. Extraneous
   * entries on `partySizes` for families not in the snapshot are ignored.
   *
   * Slate stays party-size-agnostic; `partySizes` is threaded in by the
   * caller (the **Mule's** party sizes, not the slate's).
   */
  matchedUserPreset(
    snapshots: readonly UserPreset[],
    partySizes: Record<string, number>,
  ): UserPreset | null {
    const targetKeys = new Set<string>(this.keys);
    for (const preset of snapshots) {
      if (preset.slateKeys.length !== targetKeys.size) continue;
      if (!preset.slateKeys.every((key) => targetKeys.has(key))) continue;
      if (!partySizesMatch(preset.partySizes, partySizes)) continue;
      return preset;
    }
    return null;
  }

  /**
   * **Active Preset** — the **Boss Preset** this slate matches, derived by
   * the CONTEXT.md priority ladder:
   *
   *  1. **User Preset Match** → `'CUSTOM'` pill + the matched snapshot.
   *  2. Empty slate → no active preset. (Sits after step 1 so an empty
   *     saved preset can still match an empty slate.)
   *  3. **Full-Slate Equality** with a **Canonical Preset** → that preset.
   *  4. Any **Slate Key** of any cadence → `'CUSTOM'`, no matched snapshot.
   *
   * `partySizes` is the **Mule's** record, threaded by the caller — the
   * slate stays party-size-agnostic (same contract as `matchedUserPreset`).
   */
  activePreset(
    snapshots: readonly UserPreset[],
    partySizes: Record<string, number>,
  ): { activePreset: PresetKey | null; matchedUserPreset: UserPreset | null } {
    const matchedUserPreset = this.matchedUserPreset(snapshots, partySizes);
    if (matchedUserPreset) return { activePreset: 'CUSTOM', matchedUserPreset };
    if (this.totalKeys === 0) return { activePreset: null, matchedUserPreset: null };
    const canonical = this.matchedCanonical();
    if (canonical) return { activePreset: canonical, matchedUserPreset: null };
    return { activePreset: 'CUSTOM', matchedUserPreset: null };
  }

  /**
   * Project this slate into `SlateFamily[]` for rendering by **Boss Matrix**.
   * Families are ordered by the curated display order; rows within a family
   * are sorted by **Crystal Value** descending (for the slate's bound
   * **World Group**). `search` filters case-insensitively on family slug +
   * display name + boss/row name.
   */
  view(search: string = '', opts: { abbreviated?: boolean } = {}): SlateFamily[] {
    const families = getFamilies(this.keys as string[], search, this.worldGroup, opts);
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

  /**
   * Total count of **Slate Keys** across every **Boss Cadence**. Cheap
   * proxy for `keys.length` that callers can read without reaching into
   * `keys` — useful for the **Drawer's** **Active Pill** derivation,
   * which needs the empty-vs-non-empty distinction without caring about
   * cadence buckets.
   */
  get totalKeys(): number {
    return this.keys.length;
  }

  /** Count of **Slate Keys** whose **Boss Cadence** is `weekly`. */
  get weeklyCount(): number {
    return countWeeklySelections(this.keys as string[]);
  }

  /**
   * Weekly-basis count of crystals contributed by daily **Slate Keys**: each
   * daily selection yields 7 crystals (one per day). Used by the **Crystal
   * Tally** readouts, which express all cadences on a per-week basis so the
   * 180-crystal weekly cap comparison is meaningful.
   */
  get dailyCount(): number {
    return countDailySelections(this.keys as string[]) * 7;
  }

  /**
   * Count of **Slate Keys** whose **Boss Cadence** is `monthly`. Scoped
   * today to Black Mage Hard/Extreme, and capped at 1 per mule by the
   * **Monthly Radio Mutex** (see `toggleBoss`).
   */
  get monthlyCount(): number {
    return countMonthlySelections(this.keys as string[]);
  }

  /**
   * Weekly-basis meso total. Each selection contributes its **Computed
   * Value**: Daily Cadence → `crystalValue × 7` (Party Size ignored,
   * matching BossMatrix's cell rule); Weekly Cadence → `crystalValue /
   * partySize` with Party Size defaulting to 1; Monthly Cadence → 0
   * (deferred to a dedicated monthly readout). Every Weekly Cadence key
   * contributes — the **Weekly Crystal Cap** is enforced upstream by
   * `MuleBossSlate.from`, so any slate this method sees already has at
   * most `WEEKLY_CRYSTAL_CAP` weeklies by construction. The basis for
   * **Potential Income** before the **Active-Flag Filter**. Prices are
   * resolved against this slate's bound **World Group**.
   */
  totalCrystalValue(partySizes: Record<string, number> = {}): number {
    let dailyTotal = 0;
    let weeklyTotal = 0;
    for (const key of this.keys) {
      const parsed = parseKey(key);
      if (!parsed) continue;
      if (parsed.cadence === 'monthly') continue;
      const boss = getBossById(parsed.bossId)!;
      const diff = boss.difficulty.find((d) => d.tier === parsed.tier)!;
      const price = priceFor(diff, this.worldGroup);
      if (parsed.cadence === 'daily') {
        dailyTotal += price * 7;
      } else {
        const party = partySizes[boss.family] ?? 1;
        weeklyTotal += price / party;
      }
    }
    return dailyTotal + weeklyTotal;
  }

  /**
   * Monthly-basis meso total for Monthly Cadence selections. Scoped today to
   * Black Mage, priced against this slate's **World Group**, and divided by
   * the family's configured Party Size with the same default-1 rule as
   * weekly selections.
   */
  monthlyCrystalValue(partySizes: Record<string, number> = {}): number {
    let total = 0;
    for (const key of this.keys) {
      const parsed = parseKey(key);
      if (!parsed || parsed.cadence !== 'monthly') continue;
      const boss = getBossById(parsed.bossId)!;
      const diff = boss.difficulty.find((d) => d.tier === parsed.tier)!;
      const party = partySizes[boss.family] ?? 1;
      total += priceFor(diff, this.worldGroup) / party;
    }
    return total;
  }

  /**
   * Expand this slate into its **Crystal Slot** list — the per-slot pool the
   * **World Cap Cut** sorts and trims. Slot expansion follows the same rules
   * as `totalCrystalValue`:
   *
   * - Weekly Cadence → 1 slot at `crystalValue / partySize` (Party Size
   *   defaults to 1).
   * - Daily Cadence → 7 slots at `crystalValue` each (Party Size ignored).
   * - Monthly Cadence → 0 slots.
   *
   * Slots are emitted in this slate's `keys` order (which preserves the
   * caller's `selectedBosses[]` order post-validation), with daily keys
   * expanded as 7 contiguous entries. The `WorldIncome` aggregator relies on
   * this ordering for the **Cap Tiebreak**'s within-mule axis.
   */
  slots(partySizes: Record<string, number> = {}): SlateSlot[] {
    const out: SlateSlot[] = [];
    for (const key of this.keys) {
      const parsed = parseKey(key);
      if (!parsed) continue;
      if (parsed.cadence === 'monthly') continue;
      const boss = getBossById(parsed.bossId)!;
      const diff = boss.difficulty.find((d) => d.tier === parsed.tier)!;
      const price = priceFor(diff, this.worldGroup);
      if (parsed.cadence === 'daily') {
        for (let i = 0; i < 7; i++) {
          out.push({ value: price, cadence: 'daily', slateKey: key });
        }
      } else {
        const party = partySizes[boss.family] ?? 1;
        out.push({ value: price / party, cadence: 'weekly', slateKey: key });
      }
    }
    return out;
  }
}
