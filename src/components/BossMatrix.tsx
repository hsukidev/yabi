import { memo } from 'react';
import type { BossTier } from '../types';
import type { SlateFamily, SlateKey, SlateRow } from '../data/muleBossSlate';
import { formatMeso } from '../utils/meso';

/** Column order in the Matrix — extreme → easy, hardest first. */
const MATRIX_TIER_COLUMNS: BossTier[] = ['extreme', 'chaos', 'hard', 'normal', 'easy'];

const TIER_COLOR: Record<BossTier, string> = {
  easy: '#6fb878',
  normal: '#8fb3d9',
  hard: '#d98a3a',
  chaos: '#c94f8f',
  extreme: '#e8533a',
};

const TIER_HEADER_LABEL: Record<BossTier, string> = {
  easy: 'Easy',
  normal: 'Normal',
  hard: 'Hard',
  chaos: 'Chaos',
  extreme: 'Extreme',
};

const GRID_TEMPLATE = '140px repeat(5, 1fr)';

const STEPPER_BTN_CLASS =
  'grid place-items-center w-5 self-stretch text-sm leading-none text-[var(--muted-raw,var(--muted-foreground))] hover:bg-[var(--surface-2)] hover:text-[var(--accent)] disabled:opacity-40 disabled:cursor-not-allowed';

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
      <span className="font-mono-nums text-[10px] uppercase tracking-[0.08em] text-[var(--muted-raw,var(--muted-foreground))]">
        {TIER_HEADER_LABEL[tier]}
      </span>
    </div>
  );
}

function PartyStepper({
  family,
  party,
  onChangePartySize,
}: {
  family: string;
  party: number;
  onChangePartySize: (family: string, n: number) => void;
}) {
  const atMin = party <= 1;
  const atMax = party >= 6;

  function step(delta: -1 | 1) {
    return (e: React.MouseEvent) => {
      e.stopPropagation();
      e.preventDefault();
      const next = party + delta;
      if (next < 1 || next > 6) return;
      onChangePartySize(family, next);
    };
  }

  return (
    <div
      data-testid={`party-stepper-${family}`}
      className="inline-flex items-center gap-1.5"
    >
      <span className="font-mono-nums text-[9px] uppercase tracking-[0.1em] text-[var(--muted-raw,var(--muted-foreground))]">
        Party
      </span>
      <div
        className="inline-flex items-stretch overflow-hidden rounded-[5px] border border-[var(--border)]"
        style={{ background: 'var(--surface)', height: 20 }}
      >
        <button
          type="button"
          data-testid={`party-dec-${family}`}
          aria-label={`Decrease party size for ${family}`}
          disabled={atMin}
          onClick={step(-1)}
          className={STEPPER_BTN_CLASS}
        >
          −
        </button>
        <span
          className="grid place-items-center self-stretch px-1 font-mono-nums text-[10px] leading-none tabular-nums text-center min-w-[26px] border-x border-[var(--border)]"
        >
          {party}
        </span>
        <button
          type="button"
          data-testid={`party-inc-${family}`}
          aria-label={`Increase party size for ${family}`}
          disabled={atMax}
          onClick={step(1)}
          className={STEPPER_BTN_CLASS}
        >
          +
        </button>
      </div>
    </div>
  );
}

function FamilyMatrixRow({
  family,
  partySize,
  onToggleKey,
  onChangePartySize,
}: {
  family: SlateFamily;
  partySize: number;
  onToggleKey: (key: SlateKey) => void;
  onChangePartySize: (family: string, n: number) => void;
}) {
  // Index rows by tier so we can render the 5-column grid even when the family
  // doesn't offer a tier (empty cell) or offers multiple cadences on one tier
  // (the project currently has at most one row per tier per family).
  const rowByTier = new Map<BossTier, SlateRow>(
    family.rows.map((r) => [r.tier, r]),
  );

  // A tier cell dims iff another tier of the SAME cadence is selected on this
  // boss — opposite-cadence tiers stay fully clickable (slice 2).
  const selectedCadences = new Set(
    family.rows.filter((r) => r.selected).map((r) => r.cadence),
  );
  const hasWeeklyTier = family.rows.some((r) => r.cadence === 'weekly');
  const displayName = family.displayName;
  // Any row carries the bossId we need for stable test ids across cells.
  const bossId = family.rows[0]?.bossId ?? family.family;

  return (
    <div
      role="row"
      className="grid border-b border-[var(--border)] last:border-b-0"
      style={{ gridTemplateColumns: GRID_TEMPLATE }}
    >
      <div
        role="rowheader"
        className="flex flex-col justify-center gap-[5px] px-[10px] py-2 border-r border-[var(--border)] text-[12px] font-medium bg-[var(--surface-2)]"
      >
        <span
          data-testid="family-name"
          className="font-display leading-[1.2] truncate"
        >
          {displayName}
        </span>
        {hasWeeklyTier ? (
          <PartyStepper
            family={family.family}
            party={partySize}
            onChangePartySize={onChangePartySize}
          />
        ) : (
          <div
            className="inline-flex items-center font-mono-nums text-[9px] uppercase tracking-[0.1em] text-[var(--muted-raw,var(--muted-foreground))]"
            style={{ height: 20 }}
          >
            Solo
          </div>
        )}
      </div>
      {MATRIX_TIER_COLUMNS.map((tier) => {
        const row = rowByTier.get(tier);
        if (!row) {
          return (
            <div
              key={tier}
              role="cell"
              data-testid={`matrix-cell-${bossId}-${tier}`}
              aria-disabled="true"
              className="grid place-items-center py-[10px] px-1 border-r border-[var(--border)] last:border-r-0 font-mono-nums text-[11px] text-[var(--muted-raw,var(--muted-foreground))]"
              style={{ cursor: 'default' }}
            >
              <span style={{ opacity: 0.3 }}>—</span>
            </div>
          );
        }

        const isSelected = row.selected;
        const isDim = !isSelected && selectedCadences.has(row.cadence);
        // Daily cells always render at full crystalValue; only weekly cells
        // divide by the party size.
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
              'grid place-items-center py-[10px] px-1 border-r border-[var(--border)] last:border-r-0 font-mono-nums text-[11px] tabular-nums cursor-pointer transition-colors',
              isSelected
                ? 'bg-[var(--accent-soft)] text-[var(--accent)] font-semibold'
                : 'text-[var(--muted-raw,var(--muted-foreground))] hover:bg-[var(--surface-2)] hover:text-[var(--text,var(--foreground))]',
            ].join(' ')}
          >
            <span style={isDim ? { opacity: 0.35 } : undefined}>
              {formatMeso(displayedValue, true)}
              {row.cadence === 'daily' && (
                <span className="ml-1 text-[9px] opacity-60">x 7</span>
              )}
            </span>
          </button>
        );
      })}
    </div>
  );
}

export const BossMatrix = memo(function BossMatrix({
  families,
  onToggleKey,
  partySizes,
  onChangePartySize,
  fusedTop = false,
}: BossMatrixProps) {
  // When a search bar is fused above, the matrix drops its top border and
  // squares its top corners so the two elements visually share a border.
  const cornerClass = fusedTop
    ? 'rounded-t-none rounded-b-[10px] border-t-0'
    : 'rounded-[10px]';

  return (
    <div
      role="table"
      className={`${cornerClass} border border-[var(--border)] overflow-clip bg-[var(--surface)]`}
    >
        <div
          role="row"
          className="grid border-b border-[var(--border)] sticky top-0 z-10 bg-[var(--surface-2)]"
          style={{ gridTemplateColumns: GRID_TEMPLATE }}
        >
          <div
            role="columnheader"
            className="grid place-items-center px-3 py-[10px] border-r border-[var(--border)] font-mono-nums text-[10px] uppercase tracking-[0.08em] text-[var(--muted-raw,var(--muted-foreground))]"
          >
            Bosses
          </div>
          {MATRIX_TIER_COLUMNS.map((tier) => (
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
        />
      ))}
    </div>
  );
});
