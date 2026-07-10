import { memo, useMemo } from 'react';
import type { BossCadence, BossTier } from '../types';
import type { SlateFamily, SlateKey, SlateRow } from '../data/muleBossSlate';
import { TIER_COLOR, TIER_HEADER_LABEL } from '../constants/tiers';
import { MesoValue } from './MesoDisplay';
import { PartyStepper } from './PartyStepper';

/** Column order in the Matrix — extreme → easy, hardest first. */
const MATRIX_TIER_COLUMNS: BossTier[] = ['extreme', 'chaos', 'hard', 'normal', 'easy'];

interface BossMatrixProps {
  /**
   * Projection from `MuleBossSlate.view(search)` — one entry per **Slate
   * Family**, each carrying its **Slate Rows** with `selected: bool` baked
   * into every row.
   */
  families: SlateFamily[];
  onToggleKey: (key: SlateKey) => void;
  partySizes: Record<string, number>;
  onChangePartySize: (family: string, n: number) => void;
  /**
   * When true, the outer wrapper squares its top corners and drops its top
   * border so a search bar can sit fused directly above it. Defaults to
   * `false` (the existing `rounded-[10px]` treatment).
   */
  fusedTop?: boolean;
  /** Drives Visible Tier collapse and Filtered-out Cell rendering; undefined = no filter. */
  activeCadence?: BossCadence;
}

function TierHeader({ tier }: { tier: BossTier }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <span
        aria-hidden
        data-difficulty-pip={tier}
        className="inline-block w-[18px] h-[3px] rounded-[2px]"
        style={{ background: TIER_COLOR[tier] }}
      />
      <span className="font-mono-nums text-[10px] uppercase tracking-[0.08em] text-(--muted-raw,var(--muted-foreground))">
        {TIER_HEADER_LABEL[tier]}
      </span>
    </div>
  );
}

const FamilyMatrixRow = memo(function FamilyMatrixRow({
  family,
  partySize,
  onToggleKey,
  onChangePartySize,
  visibleTiers,
  activeCadence,
}: {
  family: SlateFamily;
  partySize: number;
  onToggleKey: (key: SlateKey) => void;
  onChangePartySize: (family: string, n: number) => void;
  visibleTiers: BossTier[];
  activeCadence?: BossCadence;
}) {
  // Index rows by tier so we can render the 5-column grid even when the family
  // doesn't offer a tier (empty cell) or offers multiple cadences on one tier
  // (the project currently has at most one row per tier per family).
  const rowByTier = new Map<BossTier, SlateRow>(family.rows.map((r) => [r.tier, r]));

  // A tier cell dims iff another tier of the SAME cadence is selected on this
  // boss — opposite-cadence tiers stay fully clickable (slice 2).
  const selectedCadences = new Set(family.rows.filter((r) => r.selected).map((r) => r.cadence));
  const hasPartyableTier = family.rows.some(
    (r) =>
      (r.cadence === 'weekly' || r.cadence === 'monthly') &&
      (!activeCadence || r.cadence === activeCadence),
  );
  const displayName = family.displayName;
  // Any row carries the bossId we need for stable test ids across cells.
  const bossId = family.rows[0]?.bossId ?? family.family;

  return (
    <div
      role="row"
      className="col-span-full grid grid-cols-subgrid border-b border-(--border) last:border-b-0"
    >
      <div
        role="rowheader"
        className="flex flex-col justify-center gap-[5px] px-[10px] py-2 border-r border-(--border) text-[12px] font-medium bg-(--surface-2)"
      >
        <span data-testid="family-name" className="font-display leading-[1.2] whitespace-nowrap">
          {displayName}
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
      {visibleTiers.map((tier) => {
        const row = rowByTier.get(tier);
        const filteredOut = !!row && !!activeCadence && row.cadence !== activeCadence;
        if (!row || filteredOut) {
          return (
            <div
              key={tier}
              role="cell"
              data-testid={`matrix-cell-${bossId}-${tier}`}
              aria-disabled="true"
              className="grid place-items-center py-[10px] px-1 border-r border-(--border) last:border-r-0 font-mono-nums text-[12px] text-(--muted-raw,var(--muted-foreground))"
              style={{ cursor: 'default' }}
            >
              <span style={{ opacity: 0.3 }}>—</span>
            </div>
          );
        }

        const isSelected = row.selected;
        const isDim = !isSelected && selectedCadences.has(row.cadence);
        // Daily cells always render at full crystalValue; weekly and monthly
        // cells divide by the party size.
        const displayedValue =
          row.cadence === 'daily' ? row.crystalValue : row.crystalValue / partySize;

        return (
          <button
            type="button"
            key={tier}
            role="cell"
            data-testid={`matrix-cell-${bossId}-${tier}`}
            data-state={isSelected ? 'on' : 'off'}
            data-dim={isDim ? 'true' : undefined}
            onClick={() => onToggleKey(row.key)}
            className={[
              'grid place-items-center py-[10px] px-1 border-r border-[var(--border)] last:border-r-0 font-mono-nums text-[12px] tabular-nums cursor-pointer transition-colors',
              isSelected
                ? 'bg-[var(--accent-soft)] text-[var(--accent)] font-semibold'
                : 'text-[var(--muted-raw,var(--muted-foreground))] hover:bg-[var(--surface-2)] hover:text-[var(--text,var(--foreground))]',
            ].join(' ')}
          >
            <MesoValue
              value={displayedValue}
              data-testid={`matrix-meso-value-${bossId}-${tier}`}
              style={isDim ? { opacity: 0.35 } : undefined}
            >
              {row.cadence === 'daily' && <span className="ml-1 text-[9px] opacity-60">x 7</span>}
            </MesoValue>
          </button>
        );
      })}
    </div>
  );
});

export const BossMatrix = memo(function BossMatrix({
  families,
  onToggleKey,
  partySizes,
  onChangePartySize,
  fusedTop = false,
  activeCadence,
}: BossMatrixProps) {
  // When a search bar is fused above, the matrix drops its top border and
  // squares its top corners so the two elements visually share a border.
  const cornerClass = fusedTop ? 'rounded-t-none rounded-b-[10px] border-t-0' : 'rounded-[10px]';

  // Memoized so the array identity is stable across renders that don't change
  // `families` or `activeCadence` — preserves `FamilyMatrixRow`'s memo.
  const visibleTiers = useMemo<BossTier[]>(
    () =>
      activeCadence
        ? MATRIX_TIER_COLUMNS.filter((tier) =>
            families.some((f) =>
              f.rows.some((r) => r.tier === tier && r.cadence === activeCadence),
            ),
          )
        : MATRIX_TIER_COLUMNS,
    [families, activeCadence],
  );
  const gridTemplate = `max-content repeat(${visibleTiers.length}, 1fr)`;

  return (
    // overflow-clip (not hidden) — keeps sticky header attached to drawer scroll; narrow drawer trades sticky for horizontal scroll
    <div
      className={`${cornerClass} overflow-clip @max-[500px]/drawer:overflow-x-auto @max-[500px]/drawer:overflow-y-hidden border border-(--border) bg-(--surface)`}
    >
      <div
        role="table"
        className="grid @max-[500px]/drawer:min-w-[500px]"
        style={{ gridTemplateColumns: gridTemplate }}
      >
        <div
          role="row"
          className="col-span-full grid grid-cols-subgrid border-b border-(--border) sticky top-0 z-10 bg-(--surface-2)"
        >
          <div
            role="columnheader"
            className="grid place-items-center px-3 py-[10px] border-r border-(--border) font-mono-nums text-[10px] uppercase tracking-[0.08em] text-(--muted-raw,var(--muted-foreground))"
          >
            Bosses
          </div>
          {visibleTiers.map((tier) => (
            <div
              key={tier}
              role="columnheader"
              aria-label={TIER_HEADER_LABEL[tier]}
              className="px-2 py-[10px]"
            >
              <TierHeader tier={tier} />
            </div>
          ))}
        </div>

        {families.map((family) => (
          <FamilyMatrixRow
            key={family.family}
            family={family}
            partySize={partySizes[family.family] ?? 1}
            onToggleKey={onToggleKey}
            onChangePartySize={onChangePartySize}
            visibleTiers={visibleTiers}
            activeCadence={activeCadence}
          />
        ))}
      </div>
    </div>
  );
});
