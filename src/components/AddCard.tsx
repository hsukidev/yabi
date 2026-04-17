import { useState } from 'react'
import { Plus } from 'lucide-react'

interface AddCardProps {
  onClick: () => void
}

export function AddCard({ onClick }: AddCardProps) {
  const [isHovered, setIsHovered] = useState(false)

  return (
    <div
      data-add-card
      role="button"
      tabIndex={0}
      aria-label="Add mule"
      className={[
        'relative w-[200px] h-[300px] rounded-xl cursor-pointer',
        'border-2 border-dashed',
        'flex flex-col items-center justify-center gap-3',
        'transition-[border-color,background-color,box-shadow] duration-200',
        isHovered
          ? 'border-[var(--accent-primary)] bg-[color-mix(in_oklch,var(--accent-primary)_6%,transparent)] shadow-[0_0_40px_-10px_var(--accent-primary)]'
          : 'border-border/60 bg-transparent',
      ].join(' ')}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onClick()
        }
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div
        aria-hidden
        className={[
          'flex items-center justify-center h-14 w-14 rounded-full transition-all duration-200',
          isHovered
            ? 'bg-[color-mix(in_oklch,var(--accent-primary)_15%,transparent)] text-[var(--accent-primary)]'
            : 'bg-muted/40 text-muted-foreground',
        ].join(' ')}
      >
        <Plus size={22} strokeWidth={2} />
      </div>
      <div className="flex flex-col items-center gap-1">
        <span
          className={[
            'font-display text-lg font-semibold transition-colors',
            isHovered ? 'text-foreground' : 'text-muted-foreground',
          ].join(' ')}
        >
          Add Mule
        </span>
      </div>
    </div>
  )
}
