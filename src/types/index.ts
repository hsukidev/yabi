import type { WorldGroup, WorldId } from '../data/worlds';

export type BossTier = 'easy' | 'normal' | 'hard' | 'chaos' | 'extreme';

/**
 * Per-tier cadence: daily tiers are farmable up to 7× per week and fold into
 * the weekly headline at `crystalValue × 7`; weekly tiers clear once per
 * week; monthly tiers clear once per month (scoped today to Black Mage's
 * Hard/Extreme entries, which are mutually exclusive — see the **Monthly
 * Radio Mutex** in `muleBossSlate.ts`). The selection-key format carries the
 * cadence segment explicitly so a single boss can retain one daily + one
 * weekly + one monthly selection simultaneously.
 */
export type BossCadence = 'daily' | 'weekly' | 'monthly';

export interface BossDifficulty {
  tier: BossTier;
  /**
   * Per-world-group crystal sale price (in meso). Heroic worlds pay the
   * headline price; Interactive worlds pay ~1/5 across most bosses, but the
   * ratio is **not** guaranteed per boss — Extreme Kaling already deviates,
   * and future bosses may ship with their own non-uniform Interactive price.
   * Both values are authoritative and stored independently.
   */
  crystalValue: Record<WorldGroup, number>;
  cadence: BossCadence;
}

export interface Boss {
  /** Stable UUIDv4, hard-coded in bosses.ts. */
  id: string;
  /** Display name without any difficulty prefix, e.g. "Black Mage". */
  name: string;
  /** Family slug, unchanged from the pre-1A dataset. */
  family: string;
  /** One entry per difficulty tier offered for this family. */
  difficulty: BossDifficulty[];
}

export interface BossFamily {
  family: string;
  bosses: Boss[];
}

export interface Mule {
  id: string;
  name: string;
  level: number;
  muleClass: string;
  /**
   * Native `<uuid>:<tier>:<cadence>` selection keys (e.g.
   * "a4d1238d-…:chaos:weekly"). The cadence segment lets a single boss
   * carry independent daily + weekly selections simultaneously. Always
   * go through `MuleBossSlate.from` in `src/data/muleBossSlate.ts` to
   * normalize a persisted array into a validated slate — the key
   * grammar and the per-(bossId, cadence) uniqueness invariant live
   * inside that module.
   */
  selectedBosses: string[];
  /**
   * Per-family party size (1..6). Absent or empty → default 1.
   * Written fully in slice 2 (Matrix), but tracked on the type now so
   * migration can zero it out when wiping legacy selections.
   */
  partySizes?: Record<string, number>;
  /**
   * Whether the mule contributes to Total Weekly Income and counts toward
   * the ACTIVE KPI. New mules default to `true`; toggled in the drawer.
   */
  active: boolean;
  /**
   * World the mule belongs to. Set at creation via `addMule(worldId)` and
   * never edited afterward. Optional so legacy payloads (no worldId) still
   * load — they simply won't match any World Lens and stay invisible until
   * the user replaces them.
   */
  worldId?: WorldId;
  /**
   * URL of the character's avatar PNG, fetched from MapleStory's CDN via
   * the Worker's character-lookup endpoint. Stored as a plain string —
   * no proxying or byte caching. Optional so v4 payloads (and mules that
   * have never been looked up) continue to render the blank-character
   * fallback.
   */
  avatarUrl?: string;
}
