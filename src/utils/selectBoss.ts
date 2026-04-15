import { getBossById } from '../data/bosses';

export function selectBoss(
  currentSelection: string[],
  bossId: string,
  family: string,
): string[] {
  const existingId = currentSelection.find((id) => {
    const boss = getBossById(id);
    return boss?.family === family;
  });

  if (existingId === bossId) {
    return currentSelection.filter((id) => id !== bossId);
  }
  if (existingId) {
    return currentSelection.map((id) => (id === existingId ? bossId : id));
  }
  return [...currentSelection, bossId];
}