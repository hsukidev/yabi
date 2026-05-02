import { useEffect, useRef, useState } from 'react';
import { PieChart, Pie, Cell } from 'recharts';
import type { Mule } from '../types';
import { useWorldIncome } from '../modules/worldIncome';
import { formatMeso } from '../utils/meso';
import { colorForMulePosition } from '../utils/muleColor';
import { ChartContainer, type ChartConfig } from './ui/chart';
import { describeArc, formatCenterPercent, formatCompact } from './IncomePieChart.utils';

interface ChartDataItem {
  name: string;
  value: number;
  formatted: string;
  muleId: string;
  fill: string;
}

interface IncomePieChartProps {
  mules: Mule[];
  onSliceClick?: (muleId: string) => void;
}

export function IncomePieChart({ mules, onSliceClick }: IncomePieChartProps) {
  const { abbreviated, perMule } = useWorldIncome(mules);
  const [activeIndex, setActiveIndex] = useState<number | undefined>(undefined);

  // Crossing the paddingAngle gap between sectors fires a mouseLeave then a
  // mouseEnter. Clearing synchronously would flash the "Total" view for one
  // frame mid-sweep. Defer the clear so the very next enter can cancel it.
  const clearTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    return () => {
      if (clearTimerRef.current != null) clearTimeout(clearTimerRef.current);
    };
  }, []);

  const handleSliceEnter = (index: number) => {
    if (clearTimerRef.current != null) {
      clearTimeout(clearTimerRef.current);
      clearTimerRef.current = null;
    }
    setActiveIndex(index);
  };
  const handleSliceLeave = () => {
    if (clearTimerRef.current != null) clearTimeout(clearTimerRef.current);
    clearTimerRef.current = setTimeout(() => {
      setActiveIndex(undefined);
      clearTimerRef.current = null;
    }, 0);
  };

  // Slice color cycles through the palette by position in the visible set so
  // no color clusters. Reorders and insertions can shift which slice holds
  // which color, which is the tradeoff for a balanced distribution.
  //
  // Slice value is the mule's **Contributed Meso** (post-cap) from the
  // **World Cap Cut** so the pie agrees with the KPI bignum it sits next to.
  // A mule whose entire slate is dropped to the cap (`contributedMeso === 0`)
  // is filtered out and renders no slice — same behavior as `active === false`
  // and "no bosses selected".
  const data: ChartDataItem[] = mules
    .filter((m) => m.active !== false && m.selectedBosses.length > 0)
    .map((m) => ({ mule: m, contributed: perMule.get(m.id)?.contributedMeso ?? 0 }))
    .filter(({ contributed }) => contributed > 0)
    .map(({ mule, contributed }, i) => ({
      name: mule.name || 'Unnamed Mule',
      value: contributed,
      formatted: formatMeso(contributed, abbreviated),
      muleId: mule.id,
      fill: colorForMulePosition(i),
    }));

  if (data.length === 0) {
    return (
      <div className="h-[260px] flex items-center justify-center text-center px-4">
        <div className="max-w-[220px] flex flex-col items-center gap-2">
          <div
            aria-hidden
            className="size-16  rounded-full border border-dashed border-border/60"
            style={{
              background:
                'radial-gradient(closest-side, hsl(from var(--accent-primary) h s l / 0.12), transparent 70%)',
            }}
          />
          <p className="font-display italic text-sm text-muted-foreground">No bosses tallied yet</p>
        </div>
      </div>
    );
  }

  const total = data.reduce((sum, d) => sum + d.value, 0);
  const hoveredName = activeIndex !== undefined ? data[activeIndex]?.name : undefined;
  const hoveredValue = activeIndex !== undefined ? data[activeIndex]?.formatted : undefined;
  const centerPercentText = formatCenterPercent(
    activeIndex,
    data.map((d) => d.value),
  );

  const chartConfig: ChartConfig = Object.fromEntries(
    data.map((item) => [item.muleId, { label: item.name, color: item.fill }]),
  );

  return (
    <div className="relative">
      <ChartContainer config={chartConfig} className="h-[260px] w-full">
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            outerRadius={100}
            innerRadius={66}
            paddingAngle={2}
            stroke="var(--card)"
            strokeWidth={2}
            shape={renderSector as never}
            onMouseEnter={(_e: unknown, index: number) => handleSliceEnter(index)}
            onMouseLeave={handleSliceLeave}
            onClick={(_event: unknown, index: number) => {
              const muleId = data[index]?.muleId;
              if (muleId != null) onSliceClick?.(muleId);
            }}
            style={{ cursor: 'pointer' }}
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.fill} />
            ))}
          </Pie>
        </PieChart>
      </ChartContainer>

      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
        <span className="font-display text-base font-semibold max-w-[140px] truncate mt-0.5">
          {hoveredName ?? 'Total'}
        </span>
        <span className="font-mono-nums text-sm text-(--accent-numeric) mt-1">
          {hoveredValue ??
            (abbreviated ? formatCompact(total) : Math.round(total).toLocaleString())}
        </span>
        <span className="font-mono-nums text-xs text-muted-foreground mt-0.5">
          {centerPercentText}
        </span>
      </div>
    </div>
  );
}

interface SectorShapeProps {
  cx: number;
  cy: number;
  innerRadius: number;
  outerRadius: number;
  startAngle: number;
  endAngle: number;
  fill: string;
  isActive: boolean;
  [key: string]: unknown;
}

function renderSector(props: SectorShapeProps) {
  const {
    cx,
    cy,
    innerRadius,
    outerRadius: baseOuter,
    startAngle,
    endAngle,
    fill,
    isActive,
  } = props;
  const outerRadius = isActive ? baseOuter + 6 : baseOuter;
  const path = describeArc(cx, cy, innerRadius, outerRadius, startAngle, endAngle);
  if (isActive) {
    return (
      <g style={{ filter: `drop-shadow(0 0 8px ${fill})`, cursor: 'pointer' }}>
        <path d={path} fill={fill} stroke="var(--card)" strokeWidth={2} />
      </g>
    );
  }
  return (
    <path d={path} fill={fill} stroke="var(--card)" strokeWidth={2} style={{ cursor: 'pointer' }} />
  );
}
