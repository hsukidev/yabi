import { useState } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import type { Mule } from '../types'
import { useMuleIncome } from '../modules/income-hooks'
import { ClassSilhouette } from './ClassSilhouette'

interface MuleCharacterCardProps {
  mule: Mule
  onClick: () => void
  onDelete: (id: string) => void
}

export function MuleCharacterCard({ mule, onClick, onDelete }: MuleCharacterCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: mule.id })
  const { formatted: potentialIncome } = useMuleIncome(mule)
  const [isHovered, setIsHovered] = useState(false)
  const [popoverOpen, setPopoverOpen] = useState(false)

  const hasBosses = mule.selectedBosses.length > 0
  const extraTransitions = isDragging
    ? 'box-shadow 180ms, border-color 180ms'
    : 'box-shadow 180ms, transform 180ms, border-color 180ms'

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition: [transition, extraTransitions].filter(Boolean).join(', '),
    opacity: isDragging ? 0.7 : 1,
  }

  function stopPropagation(e: React.SyntheticEvent) { e.stopPropagation() }
  function handleDeleteConfirm() { onDelete(mule.id); setPopoverOpen(false) }
  function handleDeleteCancel() { setPopoverOpen(false) }

  return (
    <div
      ref={setNodeRef}
      style={style}
      data-mule-card={mule.id}
      className="group relative"
      {...attributes}
      {...listeners}
    >
      <div
        onClick={onClick}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className="panel cursor-pointer"
        style={{
          padding: 'var(--card-pad, 16px)',
          transform: isHovered && !isDragging ? 'translateY(-2px)' : undefined,
          boxShadow: isHovered && !isDragging
            ? '0 8px 32px -8px var(--accent-glow), 0 0 0 1px var(--border)'
            : '0 0 0 1px var(--border)',
          transition: 'transform 150ms, box-shadow 150ms',
        }}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick() }
        }}
      >
        {mule.level > 0 && (
          <div style={{
            position: 'absolute', top: 8, left: 8,
            fontFamily: 'JetBrains Mono, monospace', fontSize: 10, letterSpacing: '0.1em',
            color: 'var(--muted-raw, var(--muted-foreground))',
            padding: '2px 6px', borderRadius: 4,
            border: '1px solid var(--border)',
            background: 'var(--surface-2, var(--surface-raised))',
          }}>Lv.{mule.level}</div>
        )}

        <div style={{ display: 'grid', placeItems: 'center', padding: '16px 0 8px' }}>
          <ClassSilhouette klass={mule.muleClass} size={72} />
        </div>

        <div style={{ marginTop: 4 }}>
          <div style={{
            color: mule.name ? 'var(--text, var(--foreground))' : 'var(--muted-raw, var(--muted-foreground))',
            fontWeight: 600,
            fontSize: 'var(--mule-name-size, 14px)',
            fontStyle: mule.name ? 'normal' : 'italic',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {mule.name || 'Unnamed'}
          </div>
          <div style={{
            color: 'var(--muted-raw, var(--muted-foreground))',
            fontFamily: 'JetBrains Mono, monospace', fontSize: 10,
            letterSpacing: '0.1em', textTransform: 'uppercase', marginTop: 2,
          }}>
            {mule.muleClass || 'No class'}
          </div>
        </div>

        <div
          className="flex flex-col items-start gap-0.5 md:flex-row md:items-center md:justify-between md:gap-0"
          style={{ marginTop: 10, paddingTop: 8, borderTop: '1px solid var(--border)' }}
        >
          <span style={{
            color: 'var(--muted-raw, var(--muted-foreground))',
            fontFamily: 'JetBrains Mono, monospace', fontSize: 10, letterSpacing: '0.12em',
          }}>WEEKLY</span>
          <span style={{
            color: hasBosses ? 'var(--accent-raw, var(--accent))' : 'var(--dim, var(--surface-dim))',
            fontFamily: 'JetBrains Mono, monospace', fontSize: 13, fontWeight: 600,
          }}>{potentialIncome}</span>
        </div>

        <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
          <PopoverTrigger
            render={
              <button
                aria-label="Delete mule"
                style={{
                  position: 'absolute', top: 8, right: 8,
                  padding: '4px 6px', borderRadius: 4,
                  background: 'var(--surface-2, var(--surface-raised))',
                  border: '1px solid var(--border)',
                  color: 'var(--muted-raw, var(--muted-foreground))',
                  opacity: isHovered || popoverOpen ? 1 : 0,
                  transition: 'opacity 140ms',
                  cursor: 'pointer',
                  display: 'flex', alignItems: 'center',
                }}
                onClick={stopPropagation}
                onPointerDown={stopPropagation}
              />
            }
          >
            <Trash2 style={{ width: 14, height: 14 }} />
          </PopoverTrigger>
          <PopoverContent className="w-auto p-3" side="bottom" align="end" onClick={stopPropagation} onPointerDown={stopPropagation}>
            <div className="flex items-center gap-2">
              <span className="text-sm">Delete this mule?</span>
              <Button size="sm" variant="destructive" onClick={handleDeleteConfirm}>Yes</Button>
              <Button size="sm" variant="outline" onClick={handleDeleteCancel}>Cancel</Button>
            </div>
          </PopoverContent>
        </Popover>
      </div>
    </div>
  )
}
