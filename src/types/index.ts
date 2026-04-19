export type BossTier = 'easy' | 'normal' | 'hard' | 'chaos' | 'extreme';

export interface BossDifficulty {
  tier: BossTier;
  crystalValue: number;
  /**
   * Per-tier cadence (single source of truth). Daily tiers are farmable up to
   * 7× per week and contribute `crystalValue × 7` to the weekly headline;
   * weekly tiers contribute `crystalValue` once.
   */
  cadence: 'daily' | 'weekly';
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
   * Slice 1B: native `<uuid>:<tier>` selection keys (e.g.
   * "a4d1238d-…:extreme"). Use `makeKey`/`parseKey` from
   * `src/data/bossSelection.ts` to construct / decode.
   */
  selectedBosses: string[];
  /**
   * Per-family party size (1..6). Absent or empty → default 1.
   * Written fully in slice 2 (Matrix), but tracked on the type now so
   * migration can zero it out when wiping legacy selections.
   */
  partySizes?: Record<string, number>;
}
