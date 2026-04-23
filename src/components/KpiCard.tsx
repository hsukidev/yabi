import { memo, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Info } from 'lucide-react';
import { useIncome } from '../modules/income';
import { formatMeso } from '../utils/meso';
import { MuleBossSlate } from '../data/muleBossSlate';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import weeklyCrystalPng from '../assets/weekly-crystal.png';
import dailyCrystalPng from '../assets/daily-crystal.png';
import type { Mule } from '../types';

const WORLD_WEEKLY_CRYSTAL_CAP = 180;

interface KpiCardProps {
  mules: Mule[];
}

const NARROW_VIEWPORT_QUERY = '(max-width: 374.99px)';

export const KpiCard = memo(function KpiCard({ mules }: KpiCardProps) {
  const { raw: totalRaw, abbreviated, toggle } = useIncome(mules);
  const activeMules = mules.filter((m) => m.active);
  const activeMuleCount = activeMules.length;
  const weeklyTotal = activeMules.reduce(
    (sum, m) => sum + MuleBossSlate.from(m.selectedBosses).weeklyCount,
    0,
  );
  const dailyTotal = activeMules.reduce(
    (sum, m) => sum + MuleBossSlate.from(m.selectedBosses).dailyCount,
    0,
  );
  const canToggleFormat = totalRaw > 0;

  // Below 375px the abbreviated value drops decimals (e.g. "504.32M" → "504M")
  // to free up horizontal space for the "mesos" caption.
  const [isNarrowViewport, setIsNarrowViewport] = useState(() => {
    try {
      return window.matchMedia(NARROW_VIEWPORT_QUERY).matches;
    } catch {
      return false;
    }
  });
  useEffect(() => {
    let mql: MediaQueryList;
    try {
      mql = window.matchMedia(NARROW_VIEWPORT_QUERY);
    } catch {
      return;
    }
    const update = () => setIsNarrowViewport(mql.matches);
    update();
    mql.addEventListener('change', update);
    return () => mql.removeEventListener('change', update);
  }, []);

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
      className="panel panel-glow relative overflow-hidden h-full"
      style={{ padding: '24px' }}
    >
      <div className="eyebrow">
        <span className="dot" aria-hidden />
        EXPECTED WEEKLY INCOME
      </div>
      <div
        ref={rowRef}
        style={{
          display: 'flex',
          alignItems: 'baseline',
          gap: 10,
          marginTop: 14,
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
      <div style={{ display: 'flex', gap: 28, marginTop: 18 }}>
        <KpiStat label="MULES" value={String(mules.length)} />
        <KpiStat label="ACTIVE" value={String(activeMuleCount)} accent />
        <CrystalKpiStat icon={weeklyCrystalPng} label="WEEKLY" value={String(weeklyTotal)} />
        <CrystalKpiStat icon={dailyCrystalPng} label="DAILY" value={String(dailyTotal)} />
        <WeeklyCapKpiStat crystalTotal={weeklyTotal + dailyTotal} cap={WORLD_WEEKLY_CRYSTAL_CAP} />
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
          fontSize: 22,
          marginTop: 4,
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
          style={{ width: 16, height: 16, objectFit: 'contain' }}
        />
        {label}
      </div>
      <div
        style={{
          color: 'var(--text, var(--foreground))',
          fontFamily: 'JetBrains Mono, monospace',
          fontSize: 22,
          marginTop: 4,
        }}
      >
        {value}
      </div>
    </div>
  );
}

function WeeklyCapKpiStat({ crystalTotal, cap }: { crystalTotal: number; cap: number }) {
  const [infoOpen, setInfoOpen] = useState(false);
  return (
    <div>
      <div className="eyebrow-plain" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        WEEKLY CAP
        <Tooltip open={infoOpen} onOpenChange={setInfoOpen}>
          <TooltipTrigger
            aria-label="Weekly cap info"
            closeOnClick={false}
            onClick={() => setInfoOpen(true)}
            className="inline-flex size-4 cursor-pointer items-center justify-center rounded-full text-muted-foreground/70 hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            <Info className="size-3" aria-hidden />
          </TooltipTrigger>
          <TooltipContent className="px-3.5 py-2.5">Monthly crystals excluded</TooltipContent>
        </Tooltip>
      </div>
      <div
        style={{
          color: 'var(--text, var(--foreground))',
          fontFamily: 'JetBrains Mono, monospace',
          fontSize: 22,
          marginTop: 4,
        }}
      >
        {crystalTotal}
        <span style={{ color: 'var(--muted-raw, var(--muted-foreground))', fontSize: 16 }}>
          /{cap}
        </span>
      </div>
    </div>
  );
}
