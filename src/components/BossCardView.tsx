import { memo } from 'react';
import type { BossCadence } from '../types';
import type { SlateFamily, SlateKey, SlateRow } from '../data/muleBossSlate';
import { bossImageUrl } from '../data/bosses';
import { TIER_COLOR, TIER_HEADER_LABEL } from '../constants/tiers';
import { formatMeso } from '../utils/meso';
import { PartyStepper } from './PartyStepper';
import { MetricTooltip } from './MetricTooltip';

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
 * One stacked, full-width **Difficulty Row** per (tier, cadence) the family
 * offers — tier color pip + tier label on the left, lowercase cadence label on
 * the right edge. This list is the Boss Card's **only** selection surface.
 *
 * Clicks route straight to the shared `onToggleKey`, so the row inherits the
 * matrix cell's exact selection semantics: a selected row lights up (accent
 * background), and an unselected row of an already-selected cadence dims to
 * ~0.4 opacity but stays clickable (**Tier Swap** — tapping it swaps
 * atomically). Rows are never disabled; a rejected 15th weekly add surfaces
 * the existing "Weekly cap reached" toast from the handler layer.
 */
function DifficultyRow({
  row,
  bossId,
  isDim,
  onToggleKey,
}: {
  row: SlateRow;
  bossId: string;
  isDim: boolean;
  onToggleKey: (key: SlateKey) => void;
}) {
  const isSelected = row.selected;
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
      <span
        className={[
          'font-mono-nums text-[10px] lowercase tracking-widest',
          isSelected ? 'text-[var(--accent)]' : 'text-(--muted-raw,var(--muted-foreground))',
        ].join(' ')}
      >
        {row.cadence}
      </span>
    </button>
  );
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
 * Cadence decoration on a meso line: daily folds into weekly income at ×7 (the
 * matrix cell's `x 7` tag), monthly is flagged `mo`. Weekly carries no tag.
 */
const CADENCE_TAG: Partial<Record<BossCadence, string>> = {
  daily: 'x 7',
  monthly: 'mo',
};

/**
 * One meso line in the readout for a single **Slate Row**. Follows the **Meso
 * Display** convention exactly: abbreviated inline (`formatMeso(v, true)`), the
 * full value (`formatMeso(v, false)`) exposed by the hover/focus tooltip **only
 * when non-zero** — a zero renders as plain `0` with no tooltip. The cadence
 * tag (`x 7` / `mo`) sits outside the numeric node so equivalence tests can
 * read the bare number.
 */
function MesoLine({
  row,
  partySize,
  bossId,
  muted,
  preview,
}: {
  row: SlateRow;
  partySize: number;
  bossId: string;
  muted?: boolean;
  preview?: boolean;
}) {
  const value = perClearValue(row, partySize);
  const abbreviated = formatMeso(value, true);
  const full = formatMeso(value, false);
  const tag = CADENCE_TAG[row.cadence];

  return (
    <div
      data-testid={`boss-card-meso-line-${bossId}-${row.tier}`}
      data-muted={muted ? 'true' : undefined}
      data-preview={preview ? 'true' : undefined}
      className={[
        'flex items-baseline justify-end font-mono-nums text-[12px] tabular-nums leading-[1.4]',
        muted ? 'text-(--muted-raw,var(--muted-foreground))' : 'text-(--text,var(--foreground))',
      ].join(' ')}
    >
      <span data-testid={`boss-card-meso-value-${bossId}-${row.tier}`}>
        {value === 0 ? (
          abbreviated
        ) : (
          <MetricTooltip
            ariaLabel={`${TIER_HEADER_LABEL[row.tier]} per-clear meso ${full}`}
            tooltip={full}
          >
            {abbreviated}
          </MetricTooltip>
        )}
      </span>
      {tag && <span className="ml-1 text-[9px] opacity-60">{tag}</span>}
    </div>
  );
}

/**
 * The **Boss Card** meso readout — per-clear **Computed Values**, each always
 * numerically equal to the matching **Boss Matrix** cell.
 *
 * - **Held keys**: one line per selected **Slate Row**, never summed — daily at
 *   full Crystal Value (`x 7`), weekly at Crystal Value ÷ Party Size, monthly
 *   likewise (`mo`). Multiple held cadences on one family render one line each.
 * - **No key held**: the family's **Hardest Tier** (highest Crystal Value)
 *   per-clear value, muted, as a planning preview.
 *
 * Lives inside the memoized `BossCard`, so it reprices live as the card's
 * PartyStepper moves — weekly/monthly lines divide by the new party size on the
 * very next render.
 */
function MesoReadout({
  family,
  partySize,
  bossId,
}: {
  family: SlateFamily;
  partySize: number;
  bossId: string;
}) {
  const selected = family.rows.filter((r) => r.selected);
  // No key held → muted Hardest Tier preview (highest Crystal Value row; first
  // wins on a tie, matching insertion order).
  const previewRow =
    selected.length === 0
      ? family.rows.reduce<SlateRow | undefined>(
          (best, r) => (!best || r.crystalValue > best.crystalValue ? r : best),
          undefined,
        )
      : undefined;

  return (
    <div
      data-testid={`boss-card-meso-${bossId}`}
      className="flex flex-col gap-1 px-3 py-2 border-t border-(--border)"
    >
      {selected.length > 0
        ? selected.map((row) => (
            <MesoLine key={row.key} row={row} partySize={partySize} bossId={bossId} />
          ))
        : previewRow && (
            <MesoLine row={previewRow} partySize={partySize} bossId={bossId} muted preview />
          )}
    </div>
  );
}

/**
 * One **Boss Card** per **Boss Family**: natural-size 66×67 sprite, family
 * name, the shared PartyStepper (or the matrix's `Solo` fallback for families
 * with no partyable tier), and the stacked **Difficulty Rows** that own
 * selection.
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

      {/* Difficulty Rows — the card's only selection surface. The card body
          above is inert; selection happens only here. */}
      <div data-testid={`boss-card-rows-${bossId}`} className="flex flex-col">
        {family.rows.map((row) => (
          <DifficultyRow
            key={row.key}
            row={row}
            bossId={bossId}
            isDim={!row.selected && selectedCadences.has(row.cadence)}
            onToggleKey={onToggleKey}
          />
        ))}
      </div>

      {/* Meso readout — per-clear values that always equal the matrix cell.
          Reprices live with the PartyStepper (weekly/monthly ÷ Party Size). */}
      <MesoReadout family={family} partySize={partySize} bossId={bossId} />
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
