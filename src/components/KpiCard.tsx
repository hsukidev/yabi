import { memo, useLayoutEffect, useRef, useState } from 'react';
import { useMatchMedia } from '../hooks/useMatchMedia';
import { formatMeso } from '../utils/meso';
import { useWorldIncome, WORLD_WEEKLY_CRYSTAL_CAP } from '../modules/worldIncome';
import { ResetCountdown } from './ResetCountdown';
import { WeeklyCapRail } from './WeeklyCapRail';
import weeklyCrystalPng from '../assets/weekly-crystal.png';
import dailyCrystalPng from '../assets/daily-crystal.png';
import type { Mule } from '../types';

interface KpiCardProps {
  mules: Mule[];
}

const NARROW_VIEWPORT_QUERY = '(max-width: 374.99px)';
const STACK_VIEWPORT_QUERY = '(max-width: 479.99px)';

export const KpiCard = memo(function KpiCard({ mules }: KpiCardProps) {
  const {
    totalContributedMeso: totalRaw,
    weeklySlotsContributed,
    dailySlotsContributed,
    slotsTotalContributed,
    abbreviated,
    toggle,
  } = useWorldIncome(mules);
  const activeMuleCount = mules.reduce((n, m) => (m.active ? n + 1 : n), 0);
  const canToggleFormat = totalRaw > 0;

  // Below 375px the abbreviated value drops decimals (e.g. "504.32M" → "504M")
  // to free up horizontal space for the "mesos" caption.
  const isNarrowViewport = useMatchMedia(NARROW_VIEWPORT_QUERY);
  const isStackedLayout = useMatchMedia(STACK_VIEWPORT_QUERY);

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

  const displayValue = !abbreviated && !unabbreviatedOverflows ? fullFormatted : abbrFormatted;

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
          justifyContent: isStackedLayout ? 'center' : 'space-between',
          alignItems: 'center',
          gap: 12,
        }}
      >
        {!isStackedLayout && (
          <div className="eyebrow">
            <span className="dot" aria-hidden />
            EXPECTED WEEKLY INCOME
          </div>
        )}
        <ResetCountdown align={isStackedLayout ? 'left' : 'right'} />
      </div>
      <div
        ref={rowRef}
        style={{
          display: 'flex',
          alignItems: 'baseline',
          gap: 10,
          marginTop: 22,
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
        <span
          className="kpi-meta"
          style={{
            color: 'var(--muted-raw, var(--muted-foreground))',
            fontStyle: 'italic',
            fontFamily: 'monospace',
          }}
        >
          mesos
        </span>
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
          <span style={{ fontStyle: 'italic', fontFamily: 'monospace' }}>mesos</span>
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
          fontFamily: 'JetBrains Mono, monospace',
          fontSize: 30,
          marginTop: 6,
        }}
      >
        {value}
      </div>
    </div>
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
          fontFamily: 'JetBrains Mono, monospace',
          fontSize: 30,
          marginTop: 6,
        }}
      >
        {value}
      </div>
    </div>
  );
}
