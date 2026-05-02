import { useMemo } from 'react';
import { MuleBossSlate, type SlateSlot } from '../data/muleBossSlate';
import { resolveWorldGroup } from '../data/worlds';
import type { Mule } from '../types';
import { useIncome } from './income';

/**
 * `WorldIncome` — pure aggregator that turns a **World Lens**'d mule list
 * into the cap-aware aggregate readouts consumed by the **KPI Card**, the
 * **Weekly Cap Rail**, the **Income Pie Chart**, and the per-card
 * **Cap Drop Badge** (slice 2/3).
 *
 * The `WorldIncome.of(mulesInWorld)` factory pools every active mule's
 * **Crystal Slots**, sorts them descending by **Slot Value**, takes the
 * top `WORLD_WEEKLY_CRYSTAL_CAP`, and attributes survivors back to their
 * owning mules — the **World Cap Cut**. The class is React-agnostic; the
 * `useWorldIncome` hook below adds memoization + format-preference
 * threading via `IncomeContext`.
 */

/**
 * MapleStory's per-world per-week boss-crystal sale ceiling. Lives here
 * because it's part of the cap-math contract, not just a display reference.
 */
export const WORLD_WEEKLY_CRYSTAL_CAP = 180;

export interface MuleContribution {
  /** Sum of every slot Value the mule put into the pool (uncapped). */
  potentialMeso: number;
  /** Sum of slot Values that survived the cut. */
  contributedMeso: number;
  /** `potentialMeso − contributedMeso`. Zero when no drops. */
  droppedMeso: number;
  /** Number of slots dropped to the cap. Zero when no drops. */
  droppedSlots: number;
}

interface PoolSlot {
  value: number;
  cadence: SlateSlot['cadence'];
  slateKey: string;
  muleId: string;
  muleIndex: number;
  /** Order within the mule's `slots()` output — preserves selectedBosses
   *  precedence for the **Cap Tiebreak**'s within-mule axis. */
  withinMuleIndex: number;
}

/** Mutable per-mule running totals, finalized into a `MuleContribution`. */
interface MuleAccumulator {
  potential: number;
  contributed: number;
  totalSlots: number;
  survivedSlots: number;
}

interface WorldIncomeFields {
  totalContributedMeso: number;
  weeklySlotsContributed: number;
  dailySlotsContributed: number;
  slotsTotalContributed: number;
  perMule: ReadonlyMap<string, MuleContribution>;
}

export class WorldIncome {
  readonly totalContributedMeso: number;
  readonly weeklySlotsContributed: number;
  readonly dailySlotsContributed: number;
  readonly slotsTotalContributed: number;
  readonly perMule: ReadonlyMap<string, MuleContribution>;

  private constructor(f: WorldIncomeFields) {
    this.totalContributedMeso = f.totalContributedMeso;
    this.weeklySlotsContributed = f.weeklySlotsContributed;
    this.dailySlotsContributed = f.dailySlotsContributed;
    this.slotsTotalContributed = f.slotsTotalContributed;
    this.perMule = f.perMule;
  }

  /**
   * Build a `WorldIncome` from a **World Lens**'d mule list. The caller is
   * responsible for filtering to the **Selected World** upstream
   * (`lensMules`); this factory only applies the **Active-Flag Filter** and
   * the **World Cap Cut**.
   */
  static of(mulesInWorld: readonly Mule[]): WorldIncome {
    const pool: PoolSlot[] = [];
    const accumulators = new Map<string, MuleAccumulator>();

    for (let muleIndex = 0; muleIndex < mulesInWorld.length; muleIndex++) {
      const mule = mulesInWorld[muleIndex];
      // Active-Flag Filter: exclude active===false; include active===true and
      // active===undefined (matches `Income.of` semantics).
      if (mule.active === false) continue;
      const slate = MuleBossSlate.from(mule.selectedBosses, resolveWorldGroup(mule.worldId));
      const slots = slate.slots(mule.partySizes);
      let potential = 0;
      for (let i = 0; i < slots.length; i++) {
        const slot = slots[i];
        pool.push({
          value: slot.value,
          cadence: slot.cadence,
          slateKey: slot.slateKey,
          muleId: mule.id,
          muleIndex,
          withinMuleIndex: i,
        });
        potential += slot.value;
      }
      accumulators.set(mule.id, {
        potential,
        contributed: 0,
        totalSlots: slots.length,
        survivedSlots: 0,
      });
    }

    // World Cap Cut: rank slots by Slot Value descending. Cap Tiebreak axes
    // (lower wins ⇒ keeps): muleIndex, then withinMuleIndex. Both are stable
    // orderings already present in the inputs.
    pool.sort((a, b) => {
      if (b.value !== a.value) return b.value - a.value;
      if (a.muleIndex !== b.muleIndex) return a.muleIndex - b.muleIndex;
      return a.withinMuleIndex - b.withinMuleIndex;
    });

    const survivors = pool.slice(0, WORLD_WEEKLY_CRYSTAL_CAP);

    let totalContributedMeso = 0;
    let weeklySlotsContributed = 0;
    let dailySlotsContributed = 0;
    for (const s of survivors) {
      totalContributedMeso += s.value;
      if (s.cadence === 'weekly') weeklySlotsContributed++;
      else dailySlotsContributed++;
      const acc = accumulators.get(s.muleId)!;
      acc.contributed += s.value;
      acc.survivedSlots += 1;
    }

    const perMule = new Map<string, MuleContribution>();
    for (const [muleId, acc] of accumulators) {
      perMule.set(muleId, {
        potentialMeso: acc.potential,
        contributedMeso: acc.contributed,
        droppedMeso: acc.potential - acc.contributed,
        droppedSlots: acc.totalSlots - acc.survivedSlots,
      });
    }

    return new WorldIncome({
      totalContributedMeso,
      weeklySlotsContributed,
      dailySlotsContributed,
      slotsTotalContributed: weeklySlotsContributed + dailySlotsContributed,
      perMule,
    });
  }
}

type UseWorldIncomeResult = WorldIncome & { abbreviated: boolean; toggle: () => void };

/**
 * React adapter for `WorldIncome.of`. Memoizes the aggregator output keyed on
 * the mule list identity (Dashboard already feeds the deferred reference) and
 * threads the **Format Preference** + toggle from `IncomeContext` so the KPI
 * bignum can render abbreviated/full and react to user clicks.
 */
export function useWorldIncome(mulesInWorld: readonly Mule[]): UseWorldIncomeResult {
  // useIncome() with no arg is the lightweight path through IncomeContext —
  // it gives us abbreviated + toggle without re-deriving any cap-aware math.
  const { abbreviated, toggle } = useIncome();
  return useMemo(
    () => Object.assign(WorldIncome.of(mulesInWorld), { abbreviated, toggle }),
    [mulesInWorld, abbreviated, toggle],
  );
}
