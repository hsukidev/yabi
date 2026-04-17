import { useState } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import type { Mule } from '../types'
import { useMuleIncome } from '../modules/income-hooks'
import placeholderPng from '../assets/placeholder.png'

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

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition: [transition, 'box-shadow 180ms, transform 180ms, border-color 180ms, filter 180ms']
      .filter(Boolean)
      .join(', '),
    filter: isDragging ? 'saturate(0.7) brightness(0.9)' : undefined,
  }

  function stopPropagation(e: React.SyntheticEvent) {
    e.stopPropagation()
  }

  function handleDeleteConfirm() {
    onDelete(mule.id)
    setPopoverOpen(false)
  }

  function handleDeleteCancel() {
    setPopoverOpen(false)
  }

  const hasBosses = mule.selectedBosses.length > 0

  return (
    <div
      ref={setNodeRef}
      style={style}
      data-mule-card={mule.id}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="group relative"
      {...attributes}
      {...listeners}
    >
      <div
        onClick={onClick}
        className={[
          'relative w-[200px] h-[300px] rounded-xl overflow-hidden cursor-pointer',
          'border border-border bg-card',
          'ring-1 ring-inset ring-white/[0.06]',
          'transition-[transform,box-shadow,border-color] duration-200',
'hover:-translate-y-0.5 hover:border-[var(--accent-primary)]/60',
'hover:shadow-[0_18px_40px_-18px_var(--accent-primary),0_0_0_1px_color-mix(in_oklch,var(--accent-primary)_35%,transparent)]',
        ].join(' ')}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            onClick()
          }
        }}
      >
        <div className="relative h-[62%] overflow-hidden">
          <div
            aria-hidden
            className="absolute inset-0"
            style={{
              background: 'linear-gradient(180deg, var(--surface-raised) 0%, var(--card) 100%)',
            }}
          />
          <img
            src={placeholderPng}
            alt={mule.name || 'Mule avatar'}
            className="absolute inset-0 w-full h-full object-cover opacity-95 mix-blend-normal transition-transform duration-500 group-hover:scale-[1.04]"
          />
          <div
            aria-hidden
            className="absolute inset-x-0 bottom-0 h-16 pointer-events-none"
            style={{ background: 'linear-gradient(180deg, transparent, var(--card) 92%)' }}
          />
          {mule.level > 0 && (
            <span className="absolute top-2 left-2 font-mono-nums text-[10px] tracking-wide px-1.5 py-0.5 rounded border border-border/60 bg-background/70 backdrop-blur-sm text-[var(--accent-numeric)]">
              Lv.{mule.level}
            </span>
          )}
          {!hasBosses && (
            <span className="absolute top-2 left-1/2 -translate-x-1/2 font-sans text-[9px] uppercase tracking-[0.22em] px-1.5 py-0.5 rounded-full border border-border/60 bg-background/70 text-muted-foreground">
              unbound
            </span>
          )}
        </div>

        <div
          aria-hidden
          className="absolute left-3 right-3 h-px"
          style={{
            top: '62%',
            background: 'linear-gradient(90deg, transparent, var(--accent-primary), transparent)',
            opacity: 0.75,
          }}
        />

        <div className="relative h-[38%] px-3 py-3 flex flex-col justify-between">
          <div className="min-w-0">
            <p className="font-display text-base font-bold leading-tight truncate">
              {mule.name || <span className="text-muted-foreground italic font-normal">Unnamed</span>}
            </p>
            <p className="mt-0.5 font-sans text-[10px] uppercase tracking-[0.22em] text-[var(--accent-secondary)] truncate">
              {mule.muleClass || <span className="text-muted-foreground/70">no class</span>}
            </p>
          </div>
          <div className="flex items-baseline justify-between gap-2">
            <span className="font-sans text-[9px] uppercase tracking-[0.22em] text-muted-foreground">
              weekly
            </span>
            <span className={[
              'font-mono-nums text-sm',
              hasBosses ? 'text-[var(--accent-numeric)]' : 'text-muted-foreground/60',
            ].join(' ')}>
              {potentialIncome}
            </span>
          </div>
        </div>

        <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
          <PopoverTrigger
            render={
              <button
                aria-label="Delete mule"
                className="absolute top-2 right-2 p-1.5 rounded-md text-red-200 hover:text-white bg-black/40 hover:bg-destructive/80 border border-white/10 backdrop-blur-sm"
                style={{
                  opacity: isHovered || popoverOpen ? 1 : 0,
                  transition: 'opacity 140ms, background-color 140ms, color 140ms',
                }}
                onClick={stopPropagation}
                onPointerDown={stopPropagation}
              />
            }
          >
            <Trash2 className="h-3.5 w-3.5" />
          </PopoverTrigger>
          <PopoverContent
            className="w-auto p-3"
            side="bottom"
            align="end"
            onClick={stopPropagation}
            onPointerDown={stopPropagation}
          >
            <div className="flex items-center gap-2">
              <span className="font-sans text-sm">Delete this mule?</span>
              <Button size="sm" variant="destructive" onClick={handleDeleteConfirm}>
                Yes
              </Button>
              <Button size="sm" variant="outline" onClick={handleDeleteCancel}>
                Cancel
              </Button>
            </div>
          </PopoverContent>
        </Popover>
      </div>
    </div>
  )
}
