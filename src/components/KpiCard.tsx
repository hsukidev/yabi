import { memo } from 'react'
import { useAutoFullFormatOnZero, useIncome } from '../modules/income'
import type { Mule } from '../types'

interface KpiCardProps {
  mules: Mule[]
}

export const KpiCard = memo(function KpiCard({ mules }: KpiCardProps) {
  const { raw: totalRaw, formatted: totalWeeklyIncome, toggle } = useIncome(mules)
  useAutoFullFormatOnZero(totalRaw)
  const activeMuleCount = mules.filter((m) => m.active).length
  const canToggleFormat = totalRaw > 0

  return (
    <div
      data-testid="income-card"
      className="panel panel-glow relative overflow-hidden"
      style={{ padding: '24px' }}
    >
      <div className="eyebrow">
        <span className="dot" aria-hidden />
        EXPECTED WEEKLY INCOME
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginTop: 14 }}>
        <button
          type="button"
          onClick={canToggleFormat ? toggle : undefined}
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
})

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
