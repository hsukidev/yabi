import { useDensity } from '../context/DensityProvider'

const OPTIONS: ReadonlyArray<{ value: 'comfy' | 'compact'; label: string }> = [
  { value: 'comfy', label: 'COMFY' },
  { value: 'compact', label: 'COMPACT' },
]

export function DensityToggle() {
  const { density, setDensity } = useDensity()
  return (
    <div
      role="radiogroup"
      aria-label="Card density"
      data-testid="density-toggle"
      style={{
        display: 'inline-flex',
        border: '1px solid var(--border)',
        borderRadius: 8,
        padding: 2,
        background: 'var(--surface-2, var(--surface-raised))',
      }}
    >
      {OPTIONS.map((opt) => {
        const isActive = density === opt.value
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={isActive}
            onClick={() => setDensity(opt.value)}
            style={{
              padding: '4px 10px',
              borderRadius: 6,
              fontFamily: 'JetBrains Mono, monospace',
              fontSize: 10,
              letterSpacing: '0.14em',
              fontWeight: 500,
              border: 'none',
              cursor: 'pointer',
              background: isActive ? 'var(--accent-soft)' : 'transparent',
              color: isActive
                ? 'var(--accent-raw, var(--accent))'
                : 'var(--muted-raw, var(--muted-foreground))',
              transition: 'background 120ms, color 120ms',
            }}
          >
            {opt.label}
          </button>
        )
      })}
    </div>
  )
}
