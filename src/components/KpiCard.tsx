import { useTotalIncome } from '../modules/income-hooks'
import type { Mule } from '../types'

interface KpiCardProps {
  mules: Mule[]
  onToggleFormat: () => void
}

export function KpiCard({ mules, onToggleFormat }: KpiCardProps) {
  const { formatted: totalWeeklyIncome } = useTotalIncome(mules)
  const activeMuleCount = mules.filter((m) => m.selectedBosses.length > 0).length

  return (
    <div
      data-testid="income-card"
      className="panel panel-glow relative overflow-hidden"
      style={{ padding: 'var(--kpi-pad, 24px)' }}
    >
      <div className="eyebrow">
        <span className="dot" aria-hidden />
        TOTAL WEEKLY INCOME
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginTop: 14 }}>
        <button
          type="button"
          onClick={onToggleFormat}
          className="bignum"
          aria-label="Toggle abbreviated meso format"
          style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
        >
          {totalWeeklyIncome}
        </button>
        <span style={{ color: 'var(--muted-raw, var(--muted-foreground))', fontStyle: 'italic', fontFamily: 'monospace' }}>
          mesos
        </span>
      </div>
      <div style={{ display: 'flex', gap: 28, marginTop: 18 }}>
        <KpiStat label="MULES" value={String(mules.length)} />
        <KpiStat label="ACTIVE" value={String(activeMuleCount)} accent />
      </div>
    </div>
  )
}

function KpiStat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div>
      <div className="eyebrow-plain">{label}</div>
      <div style={{
        color: accent ? 'var(--accent-raw, var(--accent))' : 'var(--text, var(--foreground))',
        fontFamily: 'JetBrains Mono, monospace',
        fontSize: 22,
        marginTop: 4,
      }}>
        {value}
      </div>
    </div>
  )
}
