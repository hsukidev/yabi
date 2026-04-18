import type { Mule } from '../types'
import { IncomePieChart } from './IncomePieChart'

interface SplitCardProps {
  mules: Mule[]
  onSliceClick: (muleId: string) => void
}

export function SplitCard({ mules, onSliceClick }: SplitCardProps) {
  return (
    <div data-testid="income-chart" className="panel" style={{ padding: 'var(--card-pad, 16px)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 8 }}>
        <span style={{ color: 'var(--text, var(--foreground))', fontWeight: 500, fontSize: 14 }}>
          Income Split
        </span>
        <span className="eyebrow-plain">BY MULE</span>
      </div>
      <IncomePieChart mules={mules} onSliceClick={onSliceClick} />
    </div>
  )
}
