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
    <div className="flex items-center justify-center gap-1.5">
      <span
        aria-hidden
        data-difficulty-pip={tier}
        style={{
          width: 4,
          height: 14,
          borderRadius: 2,
          background: TIER_COLOR[tier],
          display: 'inline-block',
        }}
      />
      <span className="font-sans text-[10px] uppercase tracking-[0.22em] text-[var(--muted-raw,var(--muted-foreground))]">
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

  function handleDec(e: React.MouseEvent) {
    e.stopPropagation();
    e.preventDefault();
    if (atMin) return;
    onChangePartySize(family, party - 1);
  }

  function handleInc(e: React.MouseEvent) {
    e.stopPropagation();
    e.preventDefault();
    if (atMax) return;
    onChangePartySize(family, party + 1);
  }

  return (
    <div
      data-testid={`party-stepper-${family}`}
      className="inline-flex items-center gap-1.5"
    >
      <span className="font-sans text-[9px] uppercase tracking-[0.22em] text-[var(--muted-raw,var(--muted-foreground))]">
        Party
      </span>
      <div
        className="inline-flex items-center rounded-md border border-[var(--border)]"
        style={{ background: 'var(--surface)' }}
      >
        <button
          type="button"
          data-testid={`party-dec-${family}`}
          aria-label={`Decrease party size for ${family}`}
          disabled={atMin}
          onClick={handleDec}
          className="px-1.5 py-0.5 font-mono-nums text-[10px] text-[var(--muted-raw,var(--muted-foreground))] hover:text-[var(--accent)] disabled:opacity-40 disabled:cursor-not-allowed"
        >
          −
        </button>
        <span className="px-1 font-mono-nums text-[10px] tabular-nums min-w-[1.5rem] text-center">
          {party}P
        </span>
        <button
          type="button"
          data-testid={`party-inc-${family}`}
          aria-label={`Increase party size for ${family}`}
          disabled={atMax}
          onClick={handleInc}
          className="px-1.5 py-0.5 font-mono-nums text-[10px] text-[var(--muted-raw,var(--muted-foreground))] hover:text-[var(--accent)] disabled:opacity-40 disabled:cursor-not-allowed"
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
      className="grid border-b border-border/40 last:border-b-0"
      style={{ gridTemplateColumns: '1.6fr repeat(5, 1fr)' }}
    >
      <div
        role="rowheader"
        className="px-3 py-2 flex items-center justify-between gap-2 min-w-0"
      >
        <span className="font-display text-sm font-semibold truncate">
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
              className="px-2 py-2 flex items-center justify-center font-mono-nums text-[11px] text-[var(--muted-raw,var(--muted-foreground))]"
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
              'px-2 py-2 flex items-center justify-center font-mono-nums text-[11px] tabular-nums cursor-pointer transition-colors border-l border-border/30',
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
        className="rounded-lg border border-border/50 overflow-hidden"
        style={{ background: 'var(--surface-2)' }}
      >
        <div
          role="row"
          className="grid border-b border-border/50"
          style={{ gridTemplateColumns: '1.6fr repeat(5, 1fr)' }}
        >
          <div
            role="columnheader"
            className="px-3 py-2 font-sans text-[10px] uppercase tracking-[0.22em] text-[var(--muted-raw,var(--muted-foreground))]"
          >
            Boss Family
          </div>
          {TIER_ORDER.map((tier) => (
            <div
              key={tier}
              role="columnheader"
              aria-label={TIER_HEADER_LABEL[tier]}
              className="px-2 py-2"
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

      <p className="font-display italic text-xs text-[var(--muted-raw,var(--muted-foreground))]">
        Tap a cell to pick difficulty · adjust party size per family.
      </p>
    </div>
  );
}
