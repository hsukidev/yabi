import { useState } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { Mule } from '../types'
import { useMuleIncome } from '../modules/income-hooks'
import placeholderPng from '../assets/placeholder.png'

const DRAG_OPACITY = 0.5
const HOVER_OPACITY = 0.85

interface MuleCharacterCardProps {
  mule: Mule
  onClick: () => void
}

export function MuleCharacterCard({ mule, onClick }: MuleCharacterCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: mule.id })

  const { formatted: potentialIncome } = useMuleIncome(mule)
  const [isHovered, setIsHovered] = useState(false)

  let opacity = 1
  if (isDragging) opacity = DRAG_OPACITY
  else if (isHovered) opacity = HOVER_OPACITY

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition: [transition, 'opacity 150ms'].filter(Boolean).join(', '),
    opacity,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      data-mule-card={mule.id}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      {...attributes}
      {...listeners}
    >
      <Card
        className="shadow-sm rounded-lg border w-[200px] h-[300px] cursor-pointer overflow-hidden p-0"
        onClick={onClick}
      >
        <div className="h-[60%] overflow-hidden">
          <img
            src={placeholderPng}
            alt={mule.name || 'Mule avatar'}
            className="w-full h-full object-cover"
          />
        </div>
        <div className="p-2 flex flex-col gap-1 h-[40%]">
          <p className="text-sm font-semibold truncate">
            {mule.name || 'Unnamed Mule'}
          </p>
          <div className="flex gap-1 flex-nowrap">
            {mule.level > 0 && (
              <Badge variant="outline" className="text-xs">Lv. {mule.level}</Badge>
            )}
            {mule.muleClass && (
              <Badge variant="secondary" className="text-xs">{mule.muleClass}</Badge>
            )}
          </div>
          <p className="text-sm font-bold text-yellow-500">
            {potentialIncome}/week
          </p>
        </div>
      </Card>
    </div>
  )
}
