import type { Mule } from '../types';
import type { MuleContribution } from '../modules/worldIncome';
import { MuleBossSlate, type SlateKey } from '../data/muleBossSlate';
import { resolveWorldGroup } from '../data/worlds';

const EMPTY_DROPPED_KEYS: ReadonlyMap<SlateKey, number> = new Map<SlateKey, number>();

export interface DisplayedWeeklyMeso {
  /** Meso amount rendered by weekly readout surfaces. */
  meso: number;
  /** Whether the readout came from post-cut contribution or inactive planning potential. */
  source: 'contributed' | 'potential';
  /** Whether the readout should render in the muted/dim treatment. */
  muted: boolean;
}

export interface RosterRowMetrics {
  /** Count of `:weekly` slate keys on the mule. Renders as `N/14`. */
  weeklyCount: number;
  /** Weekly-basis count of daily crystals on the mule. Renders as a bare `N`. */
  dailyCount: number;
  /** Count of `:monthly` slate keys on the mule. Renders as a bare `N`. */
  monthlyCount: number;
  /** Post-cap meso the mule contributed to the world total. */
  postCapMeso: number;
  /** Shared per-mule weekly readout used by roster display surfaces. */
  displayedWeeklyMeso: DisplayedWeeklyMeso;
  /** `postCapMeso / worldTotalContributedMeso`, zero-safe. Renders as `9.5% SHARE`. */
  sharePct: number;
  /** Per-slate-key drop counts from the World Cap Cut. Empty when nothing was cut. */
  droppedKeys: ReadonlyMap<SlateKey, number>;
}

/**
 * Derive the roster-facing weekly meso readout for one **Mule**.
 *
 * Active mules show post-**World Cap Cut** **Contributed Meso**. Inactive
 * mules show muted **Potential Meso** so the row can act as a planning hint
 * without affecting share or **Total Weekly Income**.
 */
export function deriveDisplayedWeeklyMeso(
  mule: Mule,
  contribution: MuleContribution | undefined,
): DisplayedWeeklyMeso {
  if (mule.active === false) {
    const slate = MuleBossSlate.from(mule.selectedBosses, resolveWorldGroup(mule.worldId));
    return {
      meso: slate.totalCrystalValue(mule.partySizes),
      source: 'potential',
      muted: true,
    };
  }

  const meso = contribution?.contributedMeso ?? 0;
  return {
    meso,
    source: 'contributed',
    muted: meso === 0,
  };
}

/**
 * Pure derivation for one Roster List row. Cadence counts come from the same
 * Boss Slate contract as the drawer's Crystal Tally: weeklies and monthlies
 * count selected keys, while dailies expand to weekly-basis crystals
 * (`daily keys * 7`).
 * Pulling `contributedMeso` + `droppedKeys` from the per-mule contribution
 * keeps the row consistent with the KPI/pie totals that share the same
 * `useWorldIncome` source. `contribution` is optional because inactive mules
 * (`active === false`) are skipped by `WorldIncome.of` and won't appear in
 * `perMule`; passing `undefined` means "treat as a 0-contribution mule"
 * without forcing the caller to fabricate an empty record.
 */
export function rosterRowMetrics(
  mule: Mule,
  contribution: MuleContribution | undefined,
  worldTotalContributedMeso: number,
): RosterRowMetrics {
  const slate = MuleBossSlate.from(mule.selectedBosses, resolveWorldGroup(mule.worldId));
  const postCapMeso = contribution?.contributedMeso ?? 0;
  const sharePct = worldTotalContributedMeso > 0 ? postCapMeso / worldTotalContributedMeso : 0;
  return {
    weeklyCount: slate.weeklyCount,
    dailyCount: slate.dailyCount,
    monthlyCount: slate.monthlyCount,
    postCapMeso,
    displayedWeeklyMeso: deriveDisplayedWeeklyMeso(mule, contribution),
    sharePct,
    droppedKeys: contribution?.droppedKeys ?? EMPTY_DROPPED_KEYS,
  };
}
