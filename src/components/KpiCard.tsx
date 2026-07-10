import { memo } from 'react';
import { useMatchMedia } from '../hooks/useMatchMedia';
import { useWorldIncome, WORLD_WEEKLY_CRYSTAL_CAP } from '../modules/worldIncome';
import { expectedBlackMageIncomeForRoster } from '../modules/monthlyIncome';
import { MuleBossSlate } from '../data/muleBossSlate';
import { resolveWorldGroup } from '../data/worlds';
import { ResetCountdown } from './ResetCountdown';
import { WeeklyCapRail } from './WeeklyCapRail';
import { MesoMetric } from './MesoDisplay';
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
  const {
    totalContributedMeso: totalRaw,
    weeklySlotsContributed,
    dailySlotsContributed,
    slotsTotalContributed,
  } = useWorldIncome(mules);
  const activeMuleCount = mules.reduce((n, m) => (m.active ? n + 1 : n), 0);
  const monthlySlotsContributed = mules.reduce((total, mule) => {
    if (mule.active === false) return total;
    return (
      total + MuleBossSlate.from(mule.selectedBosses, resolveWorldGroup(mule.worldId)).monthlyCount
    );
  }, 0);
  const expectedBlackMageIncomeRaw = expectedBlackMageIncomeForRoster(mules);

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
            <MesoMetric
              value={totalRaw}
              narrow={isNarrowViewport}
              label="Expected weekly income"
              className="bignum"
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
            <MesoMetric
              value={expectedBlackMageIncomeRaw}
              narrow={isNarrowViewport}
              label="Expected Black Mage income"
              className="bignum"
            />
          </div>
        </KpiIncomeBlock>
      </div>
      <div data-testid="kpi-stat-row" style={statRowStyle}>
        <KpiStat label="MULES" value={String(mules.length)} />
        <KpiStat label="ACTIVE" value={String(activeMuleCount)} accent />
        <CrystalKpiStat
          icon={weeklyCrystalPng}
          label="WEEKLY"
          value={String(weeklySlotsContributed)}
        />
        <CrystalKpiStat
          icon={dailyCrystalPng}
          label="DAILY"
          value={String(dailySlotsContributed)}
        />
        <CrystalKpiStat
          icon={monthlyCrystalPng}
          label="MONTHLY"
          value={String(monthlySlotsContributed)}
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
        padding: '11px 12px 10px',
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

function CrystalKpiStat({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <div
      style={{
        ...KPI_BLOCK_CHROME,
        minWidth: 0,
        padding: '11px 12px 10px',
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
