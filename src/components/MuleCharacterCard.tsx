import { useState } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Trash2 } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import type { Mule } from '../types'
import { useMuleIncome } from '../modules/income-hooks'
import placeholderPng from '../assets/placeholder.png'

const DRAG_OPACITY = 0.5
const HOVER_OPACITY = 0.85

interface MuleCharacterCardProps {
  mule: Mule
  onClick: () => void
  onDelete: (id: string) => void
}

export function MuleCharacterCard({ mule, onClick, onDelete }: MuleCharacterCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: mule.id })

  const { formatted: potentialIncome } = useMuleIncome(mule)
  const [isHovered, setIsHovered] = useState(false)
  const [popoverOpen, setPopoverOpen] = useState(false)

  let opacity = 1
  if (isDragging) opacity = DRAG_OPACITY
  else if (isHovered) opacity = HOVER_OPACITY

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition: [transition, 'opacity 150ms'].filter(Boolean).join(', '),
    opacity,
  }

  function handleTrashClick(e: React.MouseEvent) {
    e.stopPropagation()
  }

  function handleTrashPointerDown(e: React.PointerEvent) {
    e.stopPropagation()
  }

  function handleDeleteConfirm() {
    onDelete(mule.id)
    setPopoverOpen(false)
  }

  function handleDeleteCancel() {
    setPopoverOpen(false)
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
        className="shadow-sm rounded-lg border w-[200px] h-[300px] cursor-pointer overflow-hidden p-0 relative"
        onClick={onClick}
      >
        <div className="h-[60%] overflow-hidden">
          <img
            src={placeholderPng}
            alt={mule.name || 'Mule avatar'}
            className="w-full h-full object-cover"
          />
        </div>

        <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
          <PopoverTrigger
            render={
              <button
                aria-label="Delete mule"
                className="absolute top-2 right-2 p-1 rounded text-red-500 hover:text-red-600 bg-black/50 hover:bg-black/70"
                style={{
                  opacity: isHovered || popoverOpen ? 1 : 0,
                  transition: 'opacity 100ms',
                }}
                onClick={handleTrashClick}
                onPointerDown={handleTrashPointerDown}
              />
            }
          >
            <Trash2 className="h-4 w-4" />
          </PopoverTrigger>
          <PopoverContent
            className="w-auto p-3"
            side="bottom"
            align="end"
            onClick={handleTrashClick}
            onPointerDown={handleTrashPointerDown}
          >
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Delete?</span>
              <Button size="sm" variant="destructive" onClick={handleDeleteConfirm}>
                Yes
              </Button>
              <Button size="sm" variant="outline" onClick={handleDeleteCancel}>
                Cancel
              </Button>
            </div>
          </PopoverContent>
        </Popover>

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
