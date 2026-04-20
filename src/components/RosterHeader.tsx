import { Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { DensityToggle } from './DensityToggle'

export interface RosterHeaderProps {
  muleCount: number
  bulkMode: boolean
  selectedCount: number
  onEnterBulk: () => void
  onCancel: () => void
  onDelete: () => void
}

// `--destructive` is stored as a full `hsl(...)` call, not a raw triplet, so
// we can't use `hsl(var(--destructive) / <alpha>)`. `color-mix` lets us blend
// the theme token with transparent to produce the same alpha variants while
// keeping all reds theme-token-driven (no #e05040 literals).
const destructive = 'var(--destructive)'
const destructiveAlpha = (pct: number) =>
  `color-mix(in oklab, var(--destructive) ${pct}%, transparent)`

export function RosterHeader({
  muleCount,
  bulkMode,
  selectedCount,
  onEnterBulk,
  onCancel,
  onDelete,
}: RosterHeaderProps) {
  if (bulkMode) {
    return (
      <div
        data-bulk-action-bar
        className="mb-4 flex items-center justify-between gap-3"
        style={{
          padding: '10px 14px',
          borderRadius: 10,
          border: `1px solid ${destructiveAlpha(35)}`,
          background: destructiveAlpha(10),
          animation: 'bulk-slide 0.22s ease-out',
        }}
      >
        <div className="flex items-center gap-3 min-w-0">
          <span
            aria-hidden
            data-bulk-pulse-dot
            style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: destructive,
              boxShadow: `0 0 10px ${destructive}`,
              animation: 'bulk-pulse 1.5s ease-in-out infinite',
              flexShrink: 0,
            }}
          />
          <span
            style={{
              color: destructive,
              fontWeight: 600,
              fontSize: 14,
              letterSpacing: '-0.01em',
            }}
          >
            Select mules to delete
          </span>
          <span
            data-bulk-selection-pill
            style={{
              padding: '3px 9px',
              borderRadius: 999,
              background: destructiveAlpha(20),
              border: `1px solid ${destructiveAlpha(40)}`,
              color: destructive,
              fontFamily: 'JetBrains Mono, monospace',
              fontSize: 10,
              letterSpacing: '0.12em',
              fontWeight: 500,
            }}
          >
            {selectedCount} SELECTED
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button
            size="sm"
            variant="destructive"
            onClick={onDelete}
            disabled={selectedCount === 0}
          >
            {selectedCount > 0 ? `Delete ${selectedCount}` : 'Delete'}
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-end justify-between mb-4">
      <div className="flex items-center gap-3">
        <span
          aria-hidden
          className="h-px w-8"
          style={{
            background:
              'linear-gradient(90deg, transparent, var(--accent-raw, var(--accent)))',
          }}
        />
        <h2 className="font-display text-2xl font-bold tracking-tight">Roster</h2>
        <span className="eyebrow-plain">
          {muleCount} {muleCount === 1 ? 'MULE' : 'MULES'}
        </span>
        <DensityToggle />
      </div>
      <div className="flex items-center gap-3">
        {muleCount > 1 && (
          <p className="eyebrow-plain hidden sm:block" style={{ opacity: 0.6 }}>
            drag to reorder
          </p>
        )}
        <button
          type="button"
          aria-label="Bulk delete mules"
          onClick={onEnterBulk}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 32,
            height: 32,
            borderRadius: 8,
            background: 'transparent',
            border: '1px solid var(--border)',
            color: 'var(--muted-raw, var(--muted-foreground))',
            cursor: 'pointer',
            transition: 'color 150ms, border-color 150ms, background 150ms',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = destructive
            e.currentTarget.style.borderColor = destructiveAlpha(40)
            e.currentTarget.style.background = destructiveAlpha(8)
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = 'var(--muted-raw, var(--muted-foreground))'
            e.currentTarget.style.borderColor = 'var(--border)'
            e.currentTarget.style.background = 'transparent'
          }}
        >
          <Trash2 style={{ width: 16, height: 16 }} />
        </button>
      </div>
    </div>
  )
}
