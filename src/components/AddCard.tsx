import { useState } from 'react'
import { Plus } from 'lucide-react'

const HOVER_OPACITY = 0.85

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
      style={{
        width: '200px',
        height: '300px',
        borderStyle: 'dashed',
        opacity: isHovered ? HOVER_OPACITY : 1,
        transition: 'opacity 150ms',
      }}
      className="rounded-lg border-2 border-border bg-muted flex flex-col items-center justify-center gap-2 cursor-pointer"
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
      <Plus size={24} className="text-muted-foreground" />
      <span className="text-sm text-muted-foreground font-medium">Add Mule</span>
    </div>
  )
}
