import type { BossTier } from '../types';
import { bosses, getLegacyBoss, legacyIdFor, TIER_LESS_FAMILIES } from './bosses';
import { formatMeso } from '../utils/meso';

/**
 * Capitalized difficulty labels used by the pre-1A UI (renders "Hard Lucid",
 * difficulty pip colors, etc.). Distinct from the `BossDifficulty` *interface*
 * in `../types` that holds the new `{ tier, crystalValue, contentType }` shape.
 */
export type BossDifficultyLabel = 'Extreme' | 'Chaos' | 'Hard' | 'Normal' | 'Easy';

const TIER_LABEL: Record<BossTier, BossDifficultyLabel> = {
  easy: 'Easy',
  normal: 'Normal',
  hard: 'Hard',
  chaos: 'Chaos',
  extreme: 'Extreme',
};

const DIFFICULTY_PREFIX = /^(Extreme|Chaos|Hard|Normal|Easy) /;

export function getDifficulty(name: string): BossDifficultyLabel | null {
  const m = name.match(DIFFICULTY_PREFIX);
  return (m?.[1] as BossDifficultyLabel) ?? null;
}

function legacyDisplayName(family: string, tier: BossTier, familyName: string): string {
  return TIER_LESS_FAMILIES.has(family) ? familyName : `${TIER_LABEL[tier]} ${familyName}`;
}

export interface FamilyView {
  family: string;
  displayName: string;
  bosses: {
    id: string;
    name: string;
    crystalValue: number;
    formattedValue: string;
    difficulty: BossDifficultyLabel | null;
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
  const existingId = selectedIds.find((id) => getLegacyBoss(id)?.uuid === ref.uuid);
  if (existingId === bossLegacyId) return selectedIds.filter((id) => id !== bossLegacyId);
  if (existingId) return selectedIds.map((id) => (id === existingId ? bossLegacyId : id));
  return [...selectedIds, bossLegacyId];
}

// Precomputed top crystalValue per family → sort comparator stays O(1) lookup.
const familyTopCrystal = new Map<string, number>(
  bosses.map((b) => [b.family, Math.max(...b.difficulty.map((d) => d.crystalValue))]),
);

export function getFamilies(
  selectedIds: string[],
  search: string,
  { abbreviated = true }: { abbreviated?: boolean } = {},
): FamilyView[] {
  const selectedSet = new Set(selectedIds);

  const families: FamilyView[] = bosses
    .slice()
    .sort((a, b) => familyTopCrystal.get(b.family)! - familyTopCrystal.get(a.family)!)
    .map((boss) => ({
      family: boss.family,
      displayName: boss.name,
      bosses: boss.difficulty
        .slice()
        .sort((a, b) => b.crystalValue - a.crystalValue)
        .map((diff) => {
          const id = legacyIdFor(boss.family, diff.tier);
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
