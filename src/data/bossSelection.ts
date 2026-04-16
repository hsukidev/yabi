import { bossFamilies, getBossById } from './bosses';
import { selectBoss } from '../utils/selectBoss';
import { formatMeso } from '../utils/meso';

export interface FamilyView {
  family: string;
  displayName: string;
  bosses: {
    id: string;
    name: string;
    crystalValue: number;
    formattedValue: string;
    selected: boolean;
  }[];
}

export function toggleBoss(selectedIds: string[], bossId: string): string[] {
  const boss = getBossById(bossId);
  if (!boss) return selectedIds;
  return selectBoss(selectedIds, bossId, boss.family);
}

const DIFFICULTY_PREFIX = /^(Extreme|Chaos|Hard|Normal|Easy) /;

export function getFamilies(selectedIds: string[], search: string): FamilyView[] {
  const selectedSet = new Set(selectedIds);

  const families: FamilyView[] = bossFamilies.map((bf) => ({
    family: bf.family,
    displayName: bf.bosses[0].name.replace(DIFFICULTY_PREFIX, ''),
    bosses: bf.bosses.map((b) => ({
      id: b.id,
      name: b.name,
      crystalValue: b.crystalValue,
      formattedValue: formatMeso(b.crystalValue),
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
