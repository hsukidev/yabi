import type { BossTier } from '../types';
import { bosses, getLegacyBoss } from './bosses';
import { formatMeso } from '../utils/meso';

/**
 * Difficulty labels used by the pre-1A UI (capitalized tier words).
 * Kept as strings during slice 1A so BossCheckboxList can keep rendering
 * difficulty pips exactly as before; internally derived from the new
 * lowercase `BossTier` union.
 */
export type BossDifficulty = 'Extreme' | 'Chaos' | 'Hard' | 'Normal' | 'Easy';

const TIER_LABEL: Record<BossTier, BossDifficulty> = {
  easy: 'Easy',
  normal: 'Normal',
  hard: 'Hard',
  chaos: 'Chaos',
  extreme: 'Extreme',
};

const TIER_LESS_FAMILIES = new Set(['akechi-mitsuhide', 'omni-cln', 'princess-no']);

const DIFFICULTY_PREFIX = /^(Extreme|Chaos|Hard|Normal|Easy) /;

/** Pre-1A helper: parse a legacy display name into its difficulty label. */
export function getDifficulty(name: string): BossDifficulty | null {
  const m = name.match(DIFFICULTY_PREFIX);
  return (m?.[1] as BossDifficulty) ?? null;
}

/**
 * Reconstruct the legacy display name for a `(family, tier)` pair. Preserves
 * the exact strings the pre-1A UI rendered (e.g. "Hard Lucid", "Akechi Mitsuhide").
 */
function legacyDisplayName(family: string, tier: BossTier, familyName: string): string {
  if (TIER_LESS_FAMILIES.has(family)) return familyName;
  return `${TIER_LABEL[tier]} ${familyName}`;
}

/** Legacy id for a `(family, tier)` pair. Round-trips through `getLegacyBoss`. */
function legacyId(family: string, tier: BossTier): string {
  return TIER_LESS_FAMILIES.has(family) ? family : `${tier}-${family}`;
}

export interface FamilyView {
  family: string;
  displayName: string;
  bosses: {
    id: string;
    name: string;
    crystalValue: number;
    formattedValue: string;
    difficulty: BossDifficulty | null;
    selected: boolean;
  }[];
}

export function validateBossSelection(ids: string[]): string[] {
  const valid = ids.filter((id) => getLegacyBoss(id) !== undefined);
  const familyWinners = new Map<string, string>();
  for (const id of valid) {
    const ref = getLegacyBoss(id)!;
    const currentWinner = familyWinners.get(ref.uuid);
    const currentValue = currentWinner ? getLegacyBoss(currentWinner)!.crystalValue : -Infinity;
    if (ref.crystalValue > currentValue) {
      familyWinners.set(ref.uuid, id);
    }
  }
  const winnerIds = new Set(familyWinners.values());
  return valid.filter((id) => winnerIds.has(id));
}

export function toggleBoss(selectedIds: string[], bossLegacyId: string): string[] {
  const ref = getLegacyBoss(bossLegacyId);
  if (!ref) return selectedIds;
  const existingId = selectedIds.find((id) => {
    const r = getLegacyBoss(id);
    return r?.uuid === ref.uuid;
  });
  if (existingId === bossLegacyId) return selectedIds.filter((id) => id !== bossLegacyId);
  if (existingId) return selectedIds.map((id) => (id === existingId ? bossLegacyId : id));
  return [...selectedIds, bossLegacyId];
}

export function getFamilies(
  selectedIds: string[],
  search: string,
  { abbreviated = true }: { abbreviated?: boolean } = {},
): FamilyView[] {
  const selectedSet = new Set(selectedIds);

  // Build FamilyView rows from the new Boss[] shape. Each family produces
  // one row whose `bosses` list is a sorted (crystalValue desc) expansion
  // of the difficulty[] array — mirroring the pre-1A per-tier rows.
  const families: FamilyView[] = bosses
    .slice()
    .sort((a, b) => {
      const topA = Math.max(...a.difficulty.map((d) => d.crystalValue));
      const topB = Math.max(...b.difficulty.map((d) => d.crystalValue));
      return topB - topA;
    })
    .map((boss) => ({
      family: boss.family,
      displayName: boss.name,
      bosses: boss.difficulty
        .slice()
        .sort((a, b) => b.crystalValue - a.crystalValue)
        .map((diff) => {
          const id = legacyId(boss.family, diff.tier);
          return {
            id,
            name: legacyDisplayName(boss.family, diff.tier, boss.name),
            crystalValue: diff.crystalValue,
            formattedValue: formatMeso(diff.crystalValue, abbreviated),
            difficulty: TIER_LESS_FAMILIES.has(boss.family) ? null : TIER_LABEL[diff.tier],
            selected: selectedSet.has(id),
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
