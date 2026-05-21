import { MuleBossSlate } from '../data/muleBossSlate';
import { resolveWorldGroup } from '../data/worlds';
import type { Mule } from '../types';

/**
 * Roster-level Expected Black Mage Income for an already world-lensed mule list.
 * Applies the Active-Flag Filter, resolves each mule's World Group, and
 * delegates selection pricing and party-size division to `MuleBossSlate`.
 */
export function expectedBlackMageIncomeForRoster(mulesInWorld: readonly Mule[]): number {
  return mulesInWorld.reduce((total, mule) => {
    if (mule.active === false) return total;
    return (
      total +
      MuleBossSlate.from(mule.selectedBosses, resolveWorldGroup(mule.worldId)).monthlyCrystalValue(
        mule.partySizes,
      )
    );
  }, 0);
}
