import { memo } from 'react';
import type { BossCadence } from '../types';
import type { SlateFamily } from '../data/muleBossSlate';
import { bossImageUrl } from '../data/bosses';
import { PartyStepper } from './PartyStepper';

interface BossCardViewProps {
  /**
   * Projection from `MuleBossSlate.view(search)`, narrowed by the cadence
   * filter — the SAME `visibleBosses` array the Boss Matrix renders, so search
   * and cadence filtering apply identically across both Slate Display Modes.
   */
  families: SlateFamily[];
  partySizes: Record<string, number>;
  onChangePartySize: (family: string, n: number) => void;
  /** Mirrors the matrix's Solo-fallback logic under an active cadence filter. */
  activeCadence?: BossCadence;
}

/**
 * One **Boss Card** per **Boss Family**. This slice renders only the card
 * header — natural-size 66×67 sprite, family name, and the shared PartyStepper
 * (or the matrix's `Solo` fallback for families with no partyable tier).
 * Difficulty Rows and the meso readout land in later slices.
 *
 * Memoized exactly like `FamilyMatrixRow`: a keystroke in a drawer input
 * re-renders `MuleDetailDrawer`, but a card whose `family` / `partySize` /
 * callbacks are referentially unchanged skips re-render.
 */
const BossCard = memo(function BossCard({
  family,
  partySize,
  onChangePartySize,
  activeCadence,
}: {
  family: SlateFamily;
  partySize: number;
  onChangePartySize: (family: string, n: number) => void;
  activeCadence?: BossCadence;
}) {
  // A family shows the PartyStepper iff it offers a partyable (weekly/monthly)
  // tier under the active cadence filter — otherwise the `Solo` placeholder,
  // matching the Boss Matrix row header exactly.
  const hasPartyableTier = family.rows.some(
    (r) =>
      (r.cadence === 'weekly' || r.cadence === 'monthly') &&
      (!activeCadence || r.cadence === activeCadence),
  );
  // Any row carries the bossId we need for stable test ids.
  const bossId = family.rows[0]?.bossId ?? family.family;

  return (
    <div
      data-testid={`boss-card-${bossId}`}
      className="flex flex-col overflow-clip rounded-[10px] border border-(--border) bg-(--surface)"
    >
      <div className="flex items-center gap-3 p-3 border-b border-(--border) bg-(--surface-2)">
        <img
          src={bossImageUrl(family.displayName)}
          alt={family.displayName}
          width={66}
          height={67}
          data-testid={`boss-card-sprite-${bossId}`}
          className="shrink-0"
        />
        <div className="flex min-w-0 flex-col gap-[5px]">
          <span
            data-testid="boss-card-name"
            className="font-display text-[13px] font-medium leading-[1.2]"
          >
            {family.displayName}
          </span>
          {hasPartyableTier ? (
            <PartyStepper
              family={family.family}
              party={partySize}
              onChangePartySize={onChangePartySize}
            />
          ) : (
            <div
              className="inline-flex items-center font-mono-nums text-[10px] uppercase tracking-widest text-(--muted-raw,var(--muted-foreground))"
              style={{ height: 20 }}
            >
              Solo
            </div>
          )}
        </div>
      </div>
    </div>
  );
});

export const BossCardView = memo(function BossCardView({
  families,
  partySizes,
  onChangePartySize,
  activeCadence,
}: BossCardViewProps) {
  return (
    // Responsive Boss Card grid: 1-across on narrow drawers, 2-across from
    // ~440px of drawer width via the `@container/drawer` container query. Two
    // is the ceiling — the winning card proportions don't support 3-across.
    <div
      data-testid="boss-card-view"
      className="grid grid-cols-1 gap-3 @min-[440px]/drawer:grid-cols-2"
    >
      {families.map((family) => (
        <BossCard
          key={family.family}
          family={family}
          partySize={partySizes[family.family] ?? 1}
          onChangePartySize={onChangePartySize}
          activeCadence={activeCadence}
        />
      ))}
    </div>
  );
});
