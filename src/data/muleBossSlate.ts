import type { BossCadence, BossTier } from '../types';
import { getBossById } from './bosses';
import {
  countWeeklySelections,
  getFamilies,
  parseKey,
  toggleBoss,
  validateBossSelection,
  type BossDifficultyLabel,
} from './bossSelection';

/**
 * `MuleBossSlate` — the validated, immutable value class representing a
 * **Mule's** **Boss Slate**. Every instance respects the **Selection
 * Invariant**: at most one **Slate Key** per `(bossId, cadence)` bucket.
 */

/** Opaque selection-key shape: `<uuid>:<tier>:<cadence>`. */
export type SlateKey = string;

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
 * Emitted in `bossesByDisplayOrder` order by `MuleBossSlate.view()`.
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
   * Families are ordered by `bossesByDisplayOrder`; rows within a family are
   * sorted by **Crystal Value** descending. `search` filters
   * case-insensitively on family slug + display name + boss/row name.
   */
  view(
    search: string = '',
    opts: { abbreviated?: boolean } = {},
  ): SlateFamily[] {
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
      const diff = getBossById(parsed.bossId)!.difficulty.find(
        (d) => d.tier === parsed.tier,
      )!;
      total += diff.crystalValue * (parsed.cadence === 'daily' ? 7 : 1);
    }
    return total;
  }
}
