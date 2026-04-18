import { bossFamilies, ALL_BOSS_IDS, getBossById } from './bosses';
import { formatMeso } from '../utils/meso';

const DIFFICULTY_PREFIX = /^(Extreme|Chaos|Hard|Normal|Easy) /;

export type BossDifficulty = 'Extreme' | 'Chaos' | 'Hard' | 'Normal' | 'Easy';

export function getDifficulty(name: string): BossDifficulty | null {
  const m = name.match(DIFFICULTY_PREFIX);
  return (m?.[1] as BossDifficulty) ?? null;
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
  const valid = ids.filter((id) => ALL_BOSS_IDS.has(id));
  const familyWinners = new Map<string, string>();
  for (const id of valid) {
    const boss = getBossById(id)!;
    const currentWinner = familyWinners.get(boss.family);
    if (!currentWinner || boss.crystalValue > getBossById(currentWinner)!.crystalValue) {
      familyWinners.set(boss.family, id);
    }
  }
  const winnerIds = new Set(familyWinners.values());
  return valid.filter((id) => winnerIds.has(id));
}

export function toggleBoss(selectedIds: string[], bossId: string): string[] {
  const boss = getBossById(bossId);
  if (!boss) return selectedIds;
  const existingId = selectedIds.find((id) => {
    const b = getBossById(id);
    return b?.family === boss.family;
  });
  if (existingId === bossId) return selectedIds.filter((id) => id !== bossId);
  if (existingId) return selectedIds.map((id) => (id === existingId ? bossId : id));
  return [...selectedIds, bossId];
}

export function getFamilies(selectedIds: string[], search: string, { abbreviated = true }: { abbreviated?: boolean } = {}): FamilyView[] {
  const selectedSet = new Set(selectedIds);

  const families: FamilyView[] = bossFamilies.map((bf) => ({
    family: bf.family,
    displayName: bf.bosses[0].name.replace(DIFFICULTY_PREFIX, ''),
    bosses: bf.bosses.map((b) => ({
      id: b.id,
      name: b.name,
      crystalValue: b.crystalValue,
      formattedValue: formatMeso(b.crystalValue, abbreviated),
      difficulty: getDifficulty(b.name),
      selected: selectedSet.has(b.id),
    })),
  }));

  if (!search) return families;

  const lower = search.toLowerCase();
  return families.filter(
    (f) =>
      f.family.toLowerCase().includes(lower) ||
      f.bosses.some((b) => b.name.toLowerCase().includes(lower)),
  );
}
