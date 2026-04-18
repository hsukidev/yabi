import type { Boss, BossDifficulty, BossTier } from '../types';
import { bosses, getBossById, TIER_LESS_FAMILIES } from './bosses';
import { formatMeso } from '../utils/meso';

/**
 * Selection key format: `<bossUuid>:<tier>`. Stored directly on
 * `Mule.selectedBosses`. Use `makeKey` / `parseKey` to construct or decode.
 */

/** Tier order used by the Matrix component (columns, extreme → easy, hardest first). */
export const TIER_ORDER: BossTier[] = ['extreme', 'chaos', 'hard', 'normal', 'easy'];

const TIER_SET: ReadonlySet<BossTier> = new Set(TIER_ORDER);

/**
 * Capitalized difficulty label for the pip colour / row name prefix. Distinct
 * from the `BossDifficulty` *interface* in `../types` that holds the
 * `{ tier, crystalValue, contentType }` shape.
 */
export type BossDifficultyLabel = 'Extreme' | 'Chaos' | 'Hard' | 'Normal' | 'Easy';

const TIER_LABEL: Record<BossTier, BossDifficultyLabel> = {
  easy: 'Easy',
  normal: 'Normal',
  hard: 'Hard',
  chaos: 'Chaos',
  extreme: 'Extreme',
};

/** Build a native selection key from a boss id and tier. */
export function makeKey(bossId: string, tier: BossTier): string {
  return `${bossId}:${tier}`;
}

/** Parse a selection key. Returns null if malformed, unknown boss, or tier not offered. */
export function parseKey(key: string): { bossId: string; tier: BossTier } | null {
  const colon = key.lastIndexOf(':');
  if (colon < 0) return null;
  const tierStr = key.slice(colon + 1);
  if (!TIER_SET.has(tierStr as BossTier)) return null;
  const bossId = key.slice(0, colon);
  const boss = getBossById(bossId);
  if (!boss) return null;
  const tier = tierStr as BossTier;
  if (!boss.difficulty.some((d) => d.tier === tier)) return null;
  return { bossId, tier };
}

function resolveKey(key: string): { boss: Boss; diff: BossDifficulty } | null {
  const parsed = parseKey(key);
  if (!parsed) return null;
  const boss = getBossById(parsed.bossId)!;
  const diff = boss.difficulty.find((d) => d.tier === parsed.tier)!;
  return { boss, diff };
}

/**
 * Row shape rendered by both the existing BossCheckboxList and the future
 * Matrix component. Each row is one `(bossId, tier)` pair.
 */
export interface FamilyRow {
  bossId: string;
  tier: BossTier;
  /** Selection key = `makeKey(bossId, tier)`. Also used as React list key. */
  key: string;
  /** Display label — "<Tier> <Family>" for tiered families, bare family name otherwise. */
  name: string;
  crystalValue: number;
  formattedValue: string;
  /** Pip-colour label (null for tier-less families). */
  difficulty: BossDifficultyLabel | null;
  selected: boolean;
}

export interface FamilyView {
  family: string;
  displayName: string;
  bosses: FamilyRow[];
}

function rowLabel(family: string, tier: BossTier, familyName: string): string {
  return TIER_LESS_FAMILIES.has(family) ? familyName : `${TIER_LABEL[tier]} ${familyName}`;
}

export function validateBossSelection(keys: string[]): string[] {
  interface ResolvedKey { key: string; bossId: string; crystalValue: number }
  const resolved: ResolvedKey[] = [];
  for (const key of keys) {
    const r = resolveKey(key);
    if (r) resolved.push({ key, bossId: r.boss.id, crystalValue: r.diff.crystalValue });
  }

  // Pick the first-seen key with the highest crystalValue per family.
  const winner = new Map<string, ResolvedKey>();
  for (const r of resolved) {
    const current = winner.get(r.bossId);
    if (!current || r.crystalValue > current.crystalValue) winner.set(r.bossId, r);
  }
  const winnerKeys = new Set(Array.from(winner.values(), (w) => w.key));
  return resolved.filter((r) => winnerKeys.has(r.key)).map((r) => r.key);
}

export function toggleBoss(keys: string[], bossId: string, tier: BossTier): string[] {
  const boss = getBossById(bossId);
  if (!boss || !boss.difficulty.some((d) => d.tier === tier)) return keys;

  const target = makeKey(bossId, tier);
  const existingKey = keys.find((k) => parseKey(k)?.bossId === bossId);
  if (existingKey === target) return keys.filter((k) => k !== target);
  if (existingKey) return keys.map((k) => (k === existingKey ? target : k));
  return [...keys, target];
}

// Precomputed top crystalValue per family → comparator is O(1) per pair.
const familyTopCrystal = new Map<string, number>(
  bosses.map((b) => [b.family, Math.max(...b.difficulty.map((d) => d.crystalValue))]),
);

/**
 * Bosses sorted by top-tier crystalValue descending. Stable across calls —
 * both `getFamilies` and the BossMatrix component depend on this order.
 */
export const bossesByTopCrystalDesc: readonly Boss[] = bosses
  .slice()
  .sort((a, b) => familyTopCrystal.get(b.family)! - familyTopCrystal.get(a.family)!);

export function getFamilies(
  keys: string[],
  search: string,
  { abbreviated = true }: { abbreviated?: boolean } = {},
): FamilyView[] {
  const selectedSet = new Set(keys);

  const families: FamilyView[] = bossesByTopCrystalDesc.map((boss) => ({
    family: boss.family,
    displayName: boss.name,
    bosses: boss.difficulty
      .slice()
      .sort((a, b) => b.crystalValue - a.crystalValue)
      .map((diff): FamilyRow => {
        const key = makeKey(boss.id, diff.tier);
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
