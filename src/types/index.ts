export type BossTier = 'easy' | 'normal' | 'hard' | 'chaos' | 'extreme';

/**
 * Per-tier cadence: daily tiers are farmable up to 7× per week and fold into
 * the weekly headline at `crystalValue × 7`; weekly tiers clear once. The
 * selection-key format carries the cadence segment explicitly so a single
 * boss can retain one daily + one weekly selection simultaneously.
 */
export type BossCadence = 'daily' | 'weekly';

export interface BossDifficulty {
  tier: BossTier;
  crystalValue: number;
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
   * Slice 2: native `<uuid>:<tier>:<cadence>` selection keys (e.g.
   * "a4d1238d-…:chaos:weekly"). The cadence segment lets a single boss
   * carry independent daily + weekly selections simultaneously. Use
   * `makeKey`/`parseKey` from `src/data/bossSelection.ts` to construct /
   * decode.
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
}
