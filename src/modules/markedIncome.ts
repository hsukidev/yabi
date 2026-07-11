import { MuleBossSlate } from '../data/muleBossSlate';
import { resolveWorldGroup } from '../data/worlds';
import { isBmMarkValid, isDailyMarkValid, isWeeklyMarkValid } from '../utils/cycle';
import type { Mule } from '../types';
import type { WorldIncome } from './worldIncome';

/**
 * **Cleared Meso** aggregates — the numerators of the KPI card's income
 * **Progress Readouts** and crystal-tile fractions, derived from valid
 * **Clear Marks** over **Active Mules**.
 *
 * The two meso numerators are strictly ≤ their denominators
 * (`WorldIncome.totalContributedMeso` and `expectedBlackMageIncomeForRoster`)
 * because they are drawn from the *same* post-**World Cap Cut** pool: a mule's
 * weekly + daily contribution is exactly its `contributedMeso`, and its BM
 * value is exactly its `monthlyCrystalValue`. Marking every applicable mark on
 * every Active Mule therefore makes each numerator equal its denominator; a
 * clamp is unnecessary and deliberately omitted.
 */
export interface MarkedProgress {
  /**
   * **Cleared Weekly Meso** — the numerator of EXPECTED WEEKLY INCOME. Over
   * Active Mules: post-cut weekly-cadence attribution when the weekly mark is
   * valid, plus post-cut daily attribution when the daily mark is valid.
   */
  clearedWeeklyMeso: number;
  /**
   * **Cleared BM Meso** — the numerator of EXPECTED BLACK MAGE INCOME. Sum of
   * `monthlyCrystalValue(partySizes)` over Active Mules with a valid BM mark.
   */
  clearedBmMeso: number;
  /** DAILY tile numerator — post-cut daily slots of daily-marked mules. */
  dailyTileCleared: number;
  /** WEEKLY tile numerator — post-cut weekly slots of weekly-marked mules. */
  weeklyTileCleared: number;
  /** MONTHLY tile numerator — monthly keys of BM-marked mules. */
  monthlyTileCleared: number;
}

/**
 * Compute the **Cleared Meso** aggregates for an already **World Lens**'d mule
 * list against a `WorldIncome` snapshot and the current cycle instant `nowMs`.
 *
 * Numerators source their weekly/daily post-cut attribution from
 * `worldIncome.perMule` (never raw slate values) so the readout stays
 * post-Cap-Cut. Mark validity uses the `utils/cycle` predicates against
 * `nowMs`, so re-running at a cycle boundary (a fresh `nowMs` from
 * `useCurrentCycle`) drops expired marks with no separate store or sweep.
 * Inactive mules and mules without a `perMule` record contribute nothing.
 */
export function markedProgress(
  mulesInWorld: readonly Mule[],
  worldIncome: WorldIncome,
  nowMs: number,
): MarkedProgress {
  let clearedWeeklyMeso = 0;
  let clearedBmMeso = 0;
  let dailyTileCleared = 0;
  let weeklyTileCleared = 0;
  let monthlyTileCleared = 0;

  for (const mule of mulesInWorld) {
    // Active-Flag Filter (active===undefined counts as active, matching
    // `WorldIncome.of` and `expectedBlackMageIncomeForRoster`).
    if (mule.active === false) continue;

    const weeklyValid = isWeeklyMarkValid(mule.weeklyClearMark, nowMs);
    const dailyValid = isDailyMarkValid(mule.dailyClearMark, nowMs);
    if (weeklyValid || dailyValid) {
      const contribution = worldIncome.perMule.get(mule.id);
      if (contribution) {
        if (weeklyValid) {
          clearedWeeklyMeso += contribution.weeklyContributedMeso;
          weeklyTileCleared += contribution.weeklySurvivedSlots;
        }
        if (dailyValid) {
          clearedWeeklyMeso += contribution.dailyContributedMeso;
          dailyTileCleared += contribution.dailySurvivedSlots;
        }
      }
    }

    if (isBmMarkValid(mule.bmClearMark, nowMs)) {
      const slate = MuleBossSlate.from(mule.selectedBosses, resolveWorldGroup(mule.worldId));
      clearedBmMeso += slate.monthlyCrystalValue(mule.partySizes);
      monthlyTileCleared += slate.monthlyCount;
    }
  }

  return {
    clearedWeeklyMeso,
    clearedBmMeso,
    dailyTileCleared,
    weeklyTileCleared,
    monthlyTileCleared,
  };
}
