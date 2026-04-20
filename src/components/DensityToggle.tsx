import { useDensity } from '../context/DensityProvider'

const OPTIONS: ReadonlyArray<{ value: 'comfy' | 'compact'; label: string }> = [
  { value: 'comfy', label: 'COMFY' },
  { value: 'compact', label: 'COMPACT' },
]

export function DensityToggle() {
  const { density, setDensity } = useDensity()
  const next = density === 'comfy' ? 'compact' : 'comfy'
  const toggle = () => setDensity(next)
  return (
    <div
      data-testid="density-toggle"
      data-density={density}
      style={{
        border: '1px solid var(--border)',
        borderRadius: 8,
        padding: 4,
        background: 'var(--surface-2, var(--surface-raised))',
      }}
    >
      {OPTIONS.map((opt) => {
        const isActive = density === opt.value
        return (
          <button
            key={opt.value}
            type="button"
            aria-label={`Switch to ${next} density`}
            aria-pressed={isActive}
            onClick={toggle}
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
