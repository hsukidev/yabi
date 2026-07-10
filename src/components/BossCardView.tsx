import { memo } from 'react';
import type { BossCadence } from '../types';
import type { SlateFamily, SlateKey, SlateRow } from '../data/muleBossSlate';
import { bossImageUrl } from '../data/bosses';
import { TIER_COLOR, TIER_HEADER_LABEL } from '../constants/tiers';
import { formatMeso } from '../utils/meso';
import { PartyStepper } from './PartyStepper';

interface BossCardViewProps {
  /**
   * Projection from `MuleBossSlate.view(search)`, narrowed by the cadence
   * filter — the SAME `visibleBosses` array the Boss Matrix renders, so search
   * and cadence filtering apply identically across both Slate Display Modes.
   */
  families: SlateFamily[];
  /**
   * The SAME shared toggle action the Boss Matrix cells call
   * (`slateActions.toggleKey`). Routing Difficulty Row clicks through it means
   * every guard rail — Weekly Crystal Cap toast, Tier Swap, Monthly Radio
   * Mutex — comes along for free; this component owns none of that logic.
   */
  onToggleKey: (key: SlateKey) => void;
  partySizes: Record<string, number>;
  onChangePartySize: (family: string, n: number) => void;
  /** Mirrors the matrix's Solo-fallback logic under an active cadence filter. */
  activeCadence?: BossCadence;
}

/**
 * Per-clear **Computed Value** for one **Slate Row**, byte-for-byte the same
 * arithmetic the **Boss Matrix** cell uses (see `FamilyMatrixRow`): **Daily
 * Cadence** clears pay full **Crystal Value** (Party Size ignored); Weekly and
 * Monthly clears split the Crystal Value across the **Party Size**. Reusing the
 * one formula is what guarantees the readout always numerically equals its
 * matrix cell.
 */
function perClearValue(row: SlateRow, partySize: number): number {
  return row.cadence === 'daily' ? row.crystalValue : row.crystalValue / partySize;
}

/**
 * One stacked, full-width **Difficulty Row** per (tier, cadence) the family
 * offers — tier color pip + tier label on the left; on the right, the per-clear
 * **Computed Value** and the lowercase cadence label. This list is the Boss
 * Card's **only** selection surface.
 *
 * Clicks route straight to the shared `onToggleKey`, so the row inherits the
 * matrix cell's exact selection semantics: a selected row lights up (accent
 * background), and an unselected row of an already-selected cadence dims to
 * ~0.4 opacity but stays clickable (**Tier Swap** — tapping it swaps
 * atomically). Rows are never disabled; a rejected 15th weekly add surfaces
 * the existing "Weekly cap reached" toast from the handler layer.
 *
 * The inline value is byte-for-byte the matrix cell's per-clear number and
 * follows the **Meso Display** convention: abbreviated inline
 * (`formatMeso(v, true)`), full value on hover via the native `title`
 * attribute **only when non-zero** (a zero shows plain `0`, no title). It
 * reprices live as the card's PartyStepper moves — weekly/monthly divide by
 * the new `partySize` on the very next render. Value and cadence share one
 * color (accent when the row is selected, muted otherwise) so they read as a
 * single right-edge cluster; a fixed-width cadence label keeps the value
 * column right-aligned down the card.
 */
function DifficultyRow({
  row,
  bossId,
  partySize,
  isDim,
  onToggleKey,
}: {
  row: SlateRow;
  bossId: string;
  partySize: number;
  isDim: boolean;
  onToggleKey: (key: SlateKey) => void;
}) {
  const isSelected = row.selected;
  const value = perClearValue(row, partySize);
  const abbreviated = formatMeso(value, true);
  // Value + cadence are one right-edge cluster, so they share color: accent
  // when the row holds a Slate Key, muted otherwise (echoes the old muted
  // preview, now spread across every row).
  const clusterColor = isSelected
    ? 'text-[var(--accent)]'
    : 'text-(--muted-raw,var(--muted-foreground))';

  return (
    <button
      type="button"
      data-testid={`boss-card-row-${bossId}-${row.tier}`}
      data-state={isSelected ? 'on' : 'off'}
      data-dim={isDim ? 'true' : undefined}
      aria-pressed={isSelected}
      onClick={() => onToggleKey(row.key)}
      style={isDim ? { opacity: 0.4 } : undefined}
      className={[
        'flex items-center justify-between gap-2 px-3 py-2 text-left border-b border-(--border) last:border-b-0 cursor-pointer transition-colors',
        isSelected ? 'bg-[var(--accent-soft)] text-[var(--accent)]' : 'hover:bg-(--surface-2)',
      ].join(' ')}
    >
      <span className="flex min-w-0 items-center gap-2">
        <span
          aria-hidden
          data-difficulty-pip={row.tier}
          className="inline-block size-2 shrink-0 rounded-full"
          style={{ background: TIER_COLOR[row.tier] }}
        />
        <span className="font-display text-[12px] font-medium leading-[1.2]">
          {TIER_HEADER_LABEL[row.tier]}
        </span>
      </span>
      <span className="flex shrink-0 items-baseline justify-end gap-2">
        <span
          data-testid={`boss-card-meso-value-${bossId}-${row.tier}`}
          title={value === 0 ? undefined : formatMeso(value, false)}
          className={['font-mono-nums text-[12px] tabular-nums leading-[1.4]', clusterColor].join(
            ' ',
          )}
        >
          {abbreviated}
        </span>
        <span
          className={[
            'w-14 text-right font-mono-nums text-[10px] lowercase tracking-widest',
            clusterColor,
          ].join(' ')}
        >
          {row.cadence}
        </span>
      </span>
    </button>
  );
}

/**
 * One **Boss Card** per **Boss Family**: natural-size 66×67 sprite, family
 * name, the shared PartyStepper (or the matrix's `Solo` fallback for families
 * with no partyable tier), and the stacked **Difficulty Rows** that own
 * selection and carry each tier's inline per-clear value.
 *
 * Memoized exactly like `FamilyMatrixRow`: a keystroke in a drawer input
 * re-renders `MuleDetailDrawer`, but a card whose `family` / `partySize` /
 * callbacks are referentially unchanged skips re-render.
 */
const BossCard = memo(function BossCard({
  family,
  partySize,
  onToggleKey,
  onChangePartySize,
  activeCadence,
}: {
  family: SlateFamily;
  partySize: number;
  onToggleKey: (key: SlateKey) => void;
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

  // A row dims iff another tier of the SAME cadence is selected on this boss —
  // opposite-cadence tiers stay fully lit. Identical rule to the matrix cell.
  const selectedCadences = new Set(family.rows.filter((r) => r.selected).map((r) => r.cadence));
  // Card holds ≥1 Slate Key → selected-card styling (accent border + subtle
  // accent tint), the bulk-delete treatment minus the checkbox.
  const hasSelection = selectedCadences.size > 0;

  return (
    <div
      data-testid={`boss-card-${bossId}`}
      data-selected={hasSelection ? 'true' : undefined}
      className={[
        'flex flex-col overflow-clip rounded-[10px] border bg-(--surface)',
        hasSelection ? 'border-[var(--accent)]' : 'border-(--border)',
      ].join(' ')}
      style={
        hasSelection
          ? { background: 'color-mix(in srgb, var(--accent) 6%, var(--surface))' }
          : undefined
      }
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

      {/* Difficulty Rows — the card's only selection surface, each carrying its
          own inline per-clear value (always equal to the matrix cell, repriced
          live with the PartyStepper). The card body above is inert. */}
      <div data-testid={`boss-card-rows-${bossId}`} className="flex flex-col">
        {family.rows.map((row) => (
          <DifficultyRow
            key={row.key}
            row={row}
            bossId={bossId}
            partySize={partySize}
            isDim={!row.selected && selectedCadences.has(row.cadence)}
            onToggleKey={onToggleKey}
          />
        ))}
      </div>
    </div>
  );
});

export const BossCardView = memo(function BossCardView({
  families,
  onToggleKey,
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
          onToggleKey={onToggleKey}
          onChangePartySize={onChangePartySize}
          activeCadence={activeCadence}
        />
      ))}
    </div>
  );
});
