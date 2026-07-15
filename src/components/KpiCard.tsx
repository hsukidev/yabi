import { memo, useMemo } from 'react';
import { useMatchMedia } from '../hooks/useMatchMedia';
import { useCurrentCycle } from '../hooks/useCurrentCycle';
import { useWorldIncome, WORLD_WEEKLY_CRYSTAL_CAP } from '../modules/worldIncome';
import { expectedBlackMageIncomeForRoster } from '../modules/monthlyIncome';
import { markedProgress } from '../modules/markedIncome';
import { MuleBossSlate } from '../data/muleBossSlate';
import { resolveWorldGroup } from '../data/worlds';
import { ResetCountdown } from './ResetCountdown';
import { WeeklyCapRail } from './WeeklyCapRail';
import { IncomeReadout, TileReadout } from './KpiProgressReadout';
import weeklyCrystalPng from '../assets/weekly-crystal.png';
import dailyCrystalPng from '../assets/daily-crystal.png';
import monthlyCrystalPng from '../assets/monthly-crystal.png';
import type { Mule } from '../types';

interface KpiCardProps {
  mules: Mule[];
}

const NARROW_VIEWPORT_QUERY = '(max-width: 374.99px)';
const STACK_VIEWPORT_QUERY = '(max-width: 639.99px)';
const BLACK_MAGE_LABEL_ABBR_VIEWPORT_QUERY = '(max-width: 644.99px)';
const INCOME_STACK_VIEWPORT_QUERY = '(max-width: 599.99px)';

const KPI_BLOCK_CHROME = {
  borderRadius: 8,
  border: '1px solid color-mix(in srgb, var(--border) 60%, transparent)',
  background: 'color-mix(in srgb, var(--surface-2) 92%, transparent)',
  boxShadow:
    'inset 0 1px 0 color-mix(in srgb, white 6%, transparent), 0 1px 2px color-mix(in srgb, black 8%, transparent)',
} satisfies React.CSSProperties;

export const KpiCard = memo(function KpiCard({ mules }: KpiCardProps) {
  const worldIncome = useWorldIncome(mules);
  const {
    totalContributedMeso: totalRaw,
    weeklySlotsContributed,
    dailySlotsContributed,
    slotsTotalContributed,
  } = worldIncome;
  const activeMuleCount = mules.reduce((n, m) => (m.active ? n + 1 : n), 0);
  const monthlySlotsContributed = mules.reduce((total, mule) => {
    if (mule.active === false) return total;
    return (
      total + MuleBossSlate.from(mule.selectedBosses, resolveWorldGroup(mule.worldId)).monthlyCount
    );
  }, 0);
  const expectedBlackMageIncomeRaw = expectedBlackMageIncomeForRoster(mules);

  // **Cleared Meso** numerators — derived from `mules` + the shared Cycle
  // Clock so a mark expiring at a cycle boundary drops the numerator live
  // (no reload, no separate store). Numerators are post-World-Cap-Cut and
  // ≤ their denominators by construction.
  const nowMs = useCurrentCycle();
  const progress = useMemo(
    () => markedProgress(mules, worldIncome, nowMs),
    [mules, worldIncome, nowMs],
  );

  // Below 375px the abbreviated value drops decimals (e.g. "504.32M" → "504M")
  // to free up horizontal space in the readout.
  const isNarrowViewport = useMatchMedia(NARROW_VIEWPORT_QUERY);
  const isStackedLayout = useMatchMedia(STACK_VIEWPORT_QUERY);
  const isBlackMageLabelAbbreviated = useMatchMedia(BLACK_MAGE_LABEL_ABBR_VIEWPORT_QUERY);
  const isIncomeStackedLayout = useMatchMedia(INCOME_STACK_VIEWPORT_QUERY);

  const statRowStyle: React.CSSProperties = isStackedLayout
    ? { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 20 }
    : { display: 'grid', gridTemplateColumns: 'repeat(5, minmax(0, 1fr))', gap: 10, marginTop: 20 };

  const incomeGridStyle: React.CSSProperties = isIncomeStackedLayout
    ? { display: 'grid', gridTemplateColumns: '1fr', gap: 12, marginTop: 18 }
    : {
        display: 'grid',
        gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)',
        gap: 12,
        marginTop: 18,
      };

  return (
    <div
      data-testid="income-card"
      className="panel panel-glow kpi-card relative overflow-hidden h-full"
      style={{ padding: 24, display: 'flex', flexDirection: 'column' }}
    >
      <div
        data-testid="kpi-eyebrow-row"
        style={{
          display: 'flex',
          justifyContent: 'flex-start',
          alignItems: 'center',
          gap: 12,
        }}
      >
        <ResetCountdown />
      </div>
      <div data-testid="kpi-income-grid" style={incomeGridStyle}>
        <KpiIncomeBlock>
          <KpiIncomeTitle>EXPECTED WEEKLY INCOME</KpiIncomeTitle>
          <div
            style={{
              display: 'flex',
              alignItems: 'baseline',
              gap: 10,
              marginTop: 12,
              position: 'relative',
            }}
          >
            <IncomeReadout
              x={progress.clearedWeeklyMeso}
              expected={totalRaw}
              narrow={isNarrowViewport}
              label="Expected weekly income"
            />
          </div>
        </KpiIncomeBlock>
        <KpiIncomeBlock>
          <KpiIncomeTitle>
            {isBlackMageLabelAbbreviated ? 'EXPECTED BM INCOME' : 'EXPECTED BLACK MAGE INCOME'}
          </KpiIncomeTitle>
          <div
            style={{
              display: 'flex',
              alignItems: 'baseline',
              gap: 10,
              marginTop: 12,
              position: 'relative',
            }}
          >
            <IncomeReadout
              x={progress.clearedBmMeso}
              expected={expectedBlackMageIncomeRaw}
              narrow={isNarrowViewport}
              label="Expected Black Mage income"
            />
          </div>
        </KpiIncomeBlock>
      </div>
      <div data-testid="kpi-stat-row" style={statRowStyle}>
        <KpiStat label="MULES" value={String(mules.length)} />
        <KpiStat label="ACTIVE" value={String(activeMuleCount)} accent />
        <CrystalKpiStat
          icon={dailyCrystalPng}
          label="DAILY"
          value={<TileReadout x={progress.dailyTileCleared} total={dailySlotsContributed} />}
        />
        <CrystalKpiStat
          icon={weeklyCrystalPng}
          label="WEEKLY"
          value={<TileReadout x={progress.weeklyTileCleared} total={weeklySlotsContributed} />}
        />
        <CrystalKpiStat
          icon={monthlyCrystalPng}
          label="MONTHLY"
          value={<TileReadout x={progress.monthlyTileCleared} total={monthlySlotsContributed} />}
        />
      </div>
      <div style={{ marginTop: 'auto', paddingTop: 18 }}>
        <WeeklyCapRail crystalTotal={slotsTotalContributed} cap={WORLD_WEEKLY_CRYSTAL_CAP} />
      </div>
    </div>
  );
});

const KpiIncomeBlock = memo(function KpiIncomeBlock({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        ...KPI_BLOCK_CHROME,
        minWidth: 0,
        padding: '16px 16px 20px',
      }}
    >
      {children}
    </div>
  );
});

function KpiStat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div
      style={{
        ...KPI_BLOCK_CHROME,
        minWidth: 0,
        padding: '16px 12px 15px',
      }}
    >
      <div className="eyebrow-plain">{label}</div>
      <div
        style={{
          color: accent ? 'var(--accent-raw, var(--accent))' : 'var(--text, var(--foreground))',
          fontFamily: 'Geist Mono, monospace',
          fontSize: 28,
          lineHeight: 1.05,
          marginTop: 7,
        }}
      >
        {value}
      </div>
    </div>
  );
}

function KpiIncomeTitle({ children }: { children: React.ReactNode }) {
  return (
    <div className="eyebrow">
      <span className="dot" aria-hidden />
      {children}
    </div>
  );
}

function CrystalKpiStat({
  icon,
  label,
  value,
}: {
  icon: string;
  label: string;
  // ReactNode (not string) so the `TileReadout` x/total fraction can slot in.
  value: React.ReactNode;
}) {
  return (
    <div
      style={{
        ...KPI_BLOCK_CHROME,
        minWidth: 0,
        padding: '16px 12px 15px',
      }}
    >
      <div className="eyebrow-plain" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <img
          src={icon}
          alt=""
          draggable={false}
          style={{ width: 18, height: 18, objectFit: 'contain' }}
        />
        {label}
      </div>
      <div
        style={{
          color: 'var(--text, var(--foreground))',
          fontFamily: 'Geist Mono, monospace',
          fontSize: 28,
          lineHeight: 1.05,
          marginTop: 7,
        }}
      >
        {value}
      </div>
    </div>
  );
}
