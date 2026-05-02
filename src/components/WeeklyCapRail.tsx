import { useCountUp } from '../hooks/useCountUp';

interface WeeklyCapRailProps {
  crystalTotal: number;
  cap: number;
}

// Numerator, fill, AND percent all clamp at the cap (`180/180 · 100%` once
// the **World Cap Cut** caps the pool). The pre-cap-aware overflow display
// (e.g. "185 / 180 · 100%") is retired — `crystalTotal` is bounded by the cap
// upstream by definition (see `WorldIncome.slotsTotalContributed`); clamping
// here is a defensive guard for callers that pass a raw count.
export function WeeklyCapRail({ crystalTotal, cap }: WeeklyCapRailProps) {
  const clampedTotal = Math.min(crystalTotal, cap);
  const rawPct = cap > 0 ? (clampedTotal / cap) * 100 : 0;
  const clampedPct = Math.min(100, rawPct);
  const animatedPct = useCountUp(clampedPct, 600);
  const displayPct = Math.round(animatedPct);
  return (
    <div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 6,
        }}
      >
        <span className="eyebrow-plain">WEEKLY CAP</span>
        <span
          className="kpi-meta"
          style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12 }}
        >
          <span style={{ color: 'var(--accent-raw, var(--accent))', fontWeight: 600 }}>
            {clampedTotal}
          </span>
          <span style={{ color: 'var(--muted-raw, var(--muted-foreground))' }}>
            {' / '}
            {cap}
            {' · '}
            {displayPct}%
          </span>
        </span>
      </div>
      <div
        role="progressbar"
        aria-label="Weekly crystal cap"
        aria-valuenow={Math.round(clampedPct)}
        aria-valuemin={0}
        aria-valuemax={100}
        style={{
          height: 8,
          background: 'var(--surface-2, var(--secondary))',
          borderRadius: 4,
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            height: '100%',
            width: `${animatedPct}%`,
            background: 'var(--accent-raw, var(--accent))',
            borderRadius: 4,
            transition: 'width 200ms ease',
          }}
        />
      </div>
    </div>
  );
}
