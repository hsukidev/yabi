import { memo, useLayoutEffect, useRef, useState } from 'react';
import { useMatchMedia } from '../hooks/useMatchMedia';
import { formatMeso } from '../utils/meso';
import { useWorldIncome, WORLD_WEEKLY_CRYSTAL_CAP } from '../modules/worldIncome';
import { expectedBlackMageIncomeForRoster } from '../modules/monthlyIncome';
import { MuleBossSlate } from '../data/muleBossSlate';
import { resolveWorldGroup } from '../data/worlds';
import { useFormatPreference } from '../context/FormatPreferenceProvider';
import { ResetCountdown } from './ResetCountdown';
import { WeeklyCapRail } from './WeeklyCapRail';
import weeklyCrystalPng from '../assets/weekly-crystal.png';
import dailyCrystalPng from '../assets/daily-crystal.png';
import monthlyCrystalPng from '../assets/monthly-crystal.png';
import type { Mule } from '../types';

interface KpiCardProps {
  mules: Mule[];
}

const NARROW_VIEWPORT_QUERY = '(max-width: 374.99px)';
const STACK_VIEWPORT_QUERY = '(max-width: 479.99px)';
const INCOME_STACK_VIEWPORT_QUERY = '(max-width: 599.99px)';

export const KpiCard = memo(function KpiCard({ mules }: KpiCardProps) {
  const {
    totalContributedMeso: totalRaw,
    weeklySlotsContributed,
    dailySlotsContributed,
    slotsTotalContributed,
  } = useWorldIncome(mules);
  const { abbreviated, toggle } = useFormatPreference();
  const activeMuleCount = mules.reduce((n, m) => (m.active ? n + 1 : n), 0);
  const monthlySlotsContributed = mules.reduce((total, mule) => {
    if (mule.active === false) return total;
    return (
      total + MuleBossSlate.from(mule.selectedBosses, resolveWorldGroup(mule.worldId)).monthlyCount
    );
  }, 0);
  const expectedBlackMageIncomeRaw = expectedBlackMageIncomeForRoster(mules);
  const canToggleFormat = totalRaw > 0;

  // Below 375px the abbreviated value drops decimals (e.g. "504.32M" → "504M")
  // to free up horizontal space for the "mesos" caption.
  const isNarrowViewport = useMatchMedia(NARROW_VIEWPORT_QUERY);
  const isStackedLayout = useMatchMedia(STACK_VIEWPORT_QUERY);
  const isIncomeStackedLayout = useMatchMedia(INCOME_STACK_VIEWPORT_QUERY);

  const statRowStyle: React.CSSProperties = isStackedLayout
    ? { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px 28px', marginTop: 28 }
    : { display: 'flex', gap: 28, marginTop: 28 };

  // The toggle is a global format preference — it always flips on click.
  // Locally, if the unabbreviated value would push "mesos" past the row's
  // edge, fall back to the abbreviated string for display only. We measure by
  // rendering an off-screen probe at `width: max-content` and comparing its
  // natural width to the visible row's clientWidth.
  const abbrFormatted = formatMeso(totalRaw, true, isNarrowViewport);
  const fullFormatted = formatMeso(totalRaw, false);
  const rowRef = useRef<HTMLDivElement>(null);
  const probeRef = useRef<HTMLDivElement>(null);
  const [unabbreviatedOverflows, setUnabbreviatedOverflows] = useState(false);
  const expectedBlackMageIncomeAbbrFormatted = formatMeso(
    expectedBlackMageIncomeRaw,
    true,
    isNarrowViewport,
  );
  const expectedBlackMageIncomeFullFormatted = formatMeso(expectedBlackMageIncomeRaw, false);
  const expectedBlackMageIncomeRowRef = useRef<HTMLDivElement>(null);
  const expectedBlackMageIncomeProbeRef = useRef<HTMLDivElement>(null);
  const [
    expectedBlackMageIncomeUnabbreviatedOverflows,
    setExpectedBlackMageIncomeUnabbreviatedOverflows,
  ] = useState(false);

  useLayoutEffect(() => {
    const row = rowRef.current;
    const probe = probeRef.current;
    if (!row || !probe) return;
    const measure = () => {
      setUnabbreviatedOverflows(probe.offsetWidth > row.clientWidth);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(row);
    return () => ro.disconnect();
  }, [fullFormatted]);

  useLayoutEffect(() => {
    const row = expectedBlackMageIncomeRowRef.current;
    const probe = expectedBlackMageIncomeProbeRef.current;
    if (!row || !probe) return;
    const measure = () => {
      setExpectedBlackMageIncomeUnabbreviatedOverflows(probe.offsetWidth > row.clientWidth);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(row);
    return () => ro.disconnect();
  }, [expectedBlackMageIncomeFullFormatted]);

  const displayValue = !abbreviated && !unabbreviatedOverflows ? fullFormatted : abbrFormatted;
  const expectedBlackMageIncomeDisplayValue =
    !abbreviated && !expectedBlackMageIncomeUnabbreviatedOverflows
      ? expectedBlackMageIncomeFullFormatted
      : expectedBlackMageIncomeAbbrFormatted;
  const incomeGridStyle: React.CSSProperties = isIncomeStackedLayout
    ? { display: 'grid', gridTemplateColumns: '1fr', gap: 18, marginTop: 22 }
    : {
        display: 'grid',
        gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)',
        gap: 28,
        marginTop: 22,
      };

  return (
    <div
      data-testid="income-card"
      className="panel panel-glow kpi-card relative overflow-hidden h-full"
      style={{ padding: '24px', display: 'flex', flexDirection: 'column' }}
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
        <div
          ref={rowRef}
          style={{
            minWidth: 0,
          }}
        >
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
            <button
              type="button"
              onClick={canToggleFormat ? toggle : undefined}
              className="bignum"
              aria-label="Toggle abbreviated meso format"
              style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
            >
              {displayValue}
            </button>
            <KpiMesoSuffix />
            <div
              ref={probeRef}
              aria-hidden
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: 'max-content',
                visibility: 'hidden',
                pointerEvents: 'none',
                display: 'flex',
                alignItems: 'baseline',
                gap: 10,
              }}
            >
              <span className="bignum">{fullFormatted}</span>
              <span style={{ fontStyle: 'italic', fontFamily: 'Geist Mono, monospace' }}>
                mesos
              </span>
            </div>
          </div>
        </div>
        <div
          ref={expectedBlackMageIncomeRowRef}
          style={{
            minWidth: 0,
          }}
        >
          <KpiIncomeTitle>EXPECTED BLACK MAGE INCOME</KpiIncomeTitle>
          <div
            style={{
              display: 'flex',
              alignItems: 'baseline',
              gap: 10,
              marginTop: 12,
              position: 'relative',
            }}
          >
            <button
              type="button"
              onClick={expectedBlackMageIncomeRaw > 0 ? toggle : undefined}
              className="bignum"
              aria-label="Toggle expected Black Mage income meso format"
              style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
            >
              {expectedBlackMageIncomeDisplayValue}
            </button>
            <KpiMesoSuffix />
            <div
              ref={expectedBlackMageIncomeProbeRef}
              aria-hidden
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: 'max-content',
                visibility: 'hidden',
                pointerEvents: 'none',
                display: 'flex',
                alignItems: 'baseline',
                gap: 10,
              }}
            >
              <span className="bignum">{expectedBlackMageIncomeFullFormatted}</span>
              <span style={{ fontStyle: 'italic', fontFamily: 'Geist Mono, monospace' }}>
                mesos
              </span>
            </div>
          </div>
        </div>
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
      <div style={{ marginTop: 'auto', paddingTop: 20 }}>
        <WeeklyCapRail crystalTotal={slotsTotalContributed} cap={WORLD_WEEKLY_CRYSTAL_CAP} />
      </div>
    </div>
  );
});

function KpiStat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div>
      <div className="eyebrow-plain">{label}</div>
      <div
        style={{
          color: accent ? 'var(--accent-raw, var(--accent))' : 'var(--text, var(--foreground))',
          fontFamily: 'Geist Mono, monospace',
          fontSize: 31,
          marginTop: 6,
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

function KpiMesoSuffix() {
  return (
    <span
      className="kpi-meta"
      style={{
        color: 'var(--muted-raw, var(--muted-foreground))',
        fontStyle: 'italic',
        fontFamily: 'Geist Mono, monospace',
      }}
    >
      mesos
    </span>
  );
}

function CrystalKpiStat({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <div>
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
          fontSize: 31,
          marginTop: 6,
        }}
      >
        {value}
      </div>
    </div>
  );
}
