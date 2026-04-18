export type BossTier = 'easy' | 'normal' | 'hard' | 'chaos' | 'extreme';
export type BossContentType = 'daily' | 'weekly' | 'monthly';

export interface BossDifficulty {
  tier: BossTier;
  crystalValue: number;
  contentType: BossContentType;
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
   * Slice 1A: still stores legacy string ids (e.g. "hard-lucid",
   * "akechi-mitsuhide"). The native `<uuid>:<tier>` key migration
   * lands in slice 1B.
   */
  selectedBosses: string[];
}
