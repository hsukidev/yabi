import type { Boss, BossDifficulty, BossTier } from '../types';
import {
  bossesByTopCrystalDesc,
  makeKey,
  parseKey,
  TIER_ORDER,
} from '../data/bossSelection';
import { formatMeso } from '../utils/meso';

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
  'grid place-items-center w-5 h-5 text-sm leading-none text-[var(--muted-raw,var(--muted-foreground))] hover:bg-[var(--surface-2)] hover:text-[var(--accent)] disabled:opacity-40 disabled:cursor-not-allowed';

// Precompute tier → BossDifficulty lookup per family once at module load.
const tierByBossId = new Map<string, Map<BossTier, BossDifficulty>>(
  bossesByTopCrystalDesc.map((b): [string, Map<BossTier, BossDifficulty>] => [
    b.id,
    new Map(b.difficulty.map((d) => [d.tier, d])),
  ]),
);

interface BossMatrixProps {
  selectedKeys: string[];
  onToggleKey: (key: string) => void;
  partySizes: Record<string, number>;
  onChangePartySize: (family: string, n: number) => void;
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
          className="grid place-items-center px-1 font-mono-nums text-[10px] tabular-nums text-center min-w-[26px] border-x border-[var(--border)]"
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

function FamilyRow({
  boss,
  selectedTier,
  partySize,
  onToggleKey,
  onChangePartySize,
}: {
  boss: Boss;
  selectedTier: BossTier | undefined;
  partySize: number;
  onToggleKey: (key: string) => void;
  onChangePartySize: (family: string, n: number) => void;
}) {
  const tierMap = tierByBossId.get(boss.id)!;
  return (
    <div
      role="row"
      className="grid border-t border-[var(--border)] first:border-t-0"
      style={{ gridTemplateColumns: GRID_TEMPLATE }}
    >
      <div
        role="rowheader"
        className="flex flex-col justify-center gap-[5px] px-[10px] py-2 border-r border-[var(--border)] text-[12px] font-medium"
        style={{ background: 'var(--surface-2)' }}
      >
        <span
          data-testid="family-name"
          className="font-display leading-[1.2] truncate"
        >
          {boss.name}
        </span>
        <PartyStepper
          family={boss.family}
          party={partySize}
          onChangePartySize={onChangePartySize}
        />
      </div>
      {TIER_ORDER.map((tier) => {
        const diff = tierMap.get(tier);
        if (!diff) {
          return (
            <div
              key={tier}
              role="cell"
              data-testid={`matrix-cell-${boss.id}-${tier}`}
              aria-disabled="true"
              className="grid place-items-center py-[10px] px-1 border-r border-[var(--border)] last:border-r-0 font-mono-nums text-[11px] text-[var(--muted-raw,var(--muted-foreground))]"
              style={{ cursor: 'default', opacity: 0.3 }}
            >
              —
            </div>
          );
        }

        const isSelected = selectedTier === tier;
        const isDim = selectedTier !== undefined && !isSelected;
        const key = makeKey(boss.id, tier);

        return (
          <button
            type="button"
            key={tier}
            role="cell"
            data-testid={`matrix-cell-${boss.id}-${tier}`}
            data-state={isSelected ? 'on' : 'off'}
            data-dim={isDim ? 'true' : undefined}
            onClick={() => onToggleKey(key)}
            className={[
              'grid place-items-center py-[10px] px-1 border-r border-[var(--border)] last:border-r-0 font-mono-nums text-[11px] tabular-nums cursor-pointer transition-colors',
              isSelected
                ? 'bg-[var(--accent-soft)] ring-1 ring-inset ring-[var(--accent)] text-[var(--accent)] font-semibold'
                : 'text-[var(--muted-raw,var(--muted-foreground))] hover:bg-[var(--surface-2)] hover:text-[var(--text,var(--foreground))]',
            ].join(' ')}
            style={isDim ? { opacity: 0.35 } : undefined}
          >
            {formatMeso(diff.crystalValue / partySize, true)}
          </button>
        );
      })}
    </div>
  );
}

export function BossMatrix({
  selectedKeys,
  onToggleKey,
  partySizes,
  onChangePartySize,
}: BossMatrixProps) {
  const selectedTierByBoss = new Map<string, BossTier>();
  for (const key of selectedKeys) {
    const parsed = parseKey(key);
    if (parsed) selectedTierByBoss.set(parsed.bossId, parsed.tier);
  }

  return (
    <div className="flex flex-col gap-2">
      <div
        role="table"
        className="rounded-[10px] border border-[var(--border)] overflow-hidden"
        style={{ background: 'var(--surface)' }}
      >
        <div
          role="row"
          className="grid border-b border-[var(--border)]"
          style={{
            gridTemplateColumns: GRID_TEMPLATE,
            background: 'var(--surface-2)',
          }}
        >
          <div
            role="columnheader"
            className="px-3 py-[10px] border-r border-[var(--border)] font-mono-nums text-[10px] uppercase tracking-[0.08em] text-[var(--muted-raw,var(--muted-foreground))]"
          >
            Boss Family
          </div>
          {TIER_ORDER.map((tier) => (
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

        {bossesByTopCrystalDesc.map((boss) => (
          <FamilyRow
            key={boss.id}
            boss={boss}
            selectedTier={selectedTierByBoss.get(boss.id)}
            partySize={partySizes[boss.family] ?? 1}
            onToggleKey={onToggleKey}
            onChangePartySize={onChangePartySize}
          />
        ))}
      </div>

      <p className="font-display italic text-[11px] text-[var(--muted-raw,var(--muted-foreground))]">
        Tap a cell to pick difficulty · adjust party size per family.
      </p>
    </div>
  );
}
