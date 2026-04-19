import { memo, useState } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import type { Mule } from '../types'
import { useMuleIncome, useFormatPreference } from '../modules/income-hooks'
import { formatMeso } from '../utils/meso'
import blankCharacterPng from '../assets/blank-character.png'

interface MuleCharacterCardProps {
  mule: Mule
  onClick: () => void
  onDelete: (id: string) => void
}

const MuleCardInner = memo(function MuleCardInner({ mule }: { mule: Mule }) {
  const { raw: rawIncome, formatted: potentialIncome } = useMuleIncome(mule)
  const { abbreviated } = useFormatPreference()
  const abbreviatedIncome = formatMeso(rawIncome, true)
  const hasBosses = mule.selectedBosses.length > 0

  return (
    <>
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

      <div style={{ display: 'grid', placeItems: 'center', padding: '16px 0 8px', flex: 1 }}>
        <img
          src={blankCharacterPng}
          alt=""
          aria-hidden
          style={{ width: 112, height: 112, objectFit: 'contain' }}
        />
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
        className={
          abbreviated
            ? 'flex flex-col items-start gap-0.5 md:flex-row md:items-center md:justify-between md:gap-0'
            : 'flex flex-col items-start gap-0.5'
        }
        style={{ marginTop: 10, paddingTop: 8, borderTop: '1px solid var(--border)' }}
      >
        <span style={{
          color: 'var(--muted-raw, var(--muted-foreground))',
          fontFamily: 'JetBrains Mono, monospace', fontSize: 10, letterSpacing: '0.12em',
        }}>INCOME</span>
        <span
          className="md:hidden"
          style={{
            color: hasBosses ? 'var(--accent-raw, var(--accent))' : 'var(--dim, var(--surface-dim))',
            fontFamily: 'JetBrains Mono, monospace', fontSize: 13, fontWeight: 600,
          }}
        >{abbreviatedIncome}</span>
        <span
          className="hidden md:inline"
          style={{
            color: hasBosses ? 'var(--accent-raw, var(--accent))' : 'var(--dim, var(--surface-dim))',
            fontFamily: 'JetBrains Mono, monospace', fontSize: 13, fontWeight: 600,
          }}
        >{potentialIncome}</span>
      </div>
    </>
  )
})

export const MuleCharacterCardOverlay = memo(function MuleCharacterCardOverlay({ mule }: { mule: Mule }) {
  return (
    <div
      className="panel cursor-grabbing"
      style={{
        padding: 'var(--card-pad, 16px)',
        minHeight: 260,
        display: 'flex',
        flexDirection: 'column',
        transform: 'translateY(-2px)',
        boxShadow: '0 12px 40px -8px var(--accent-glow), 0 0 0 1px var(--border)',
      }}
    >
      <MuleCardInner mule={mule} />
    </div>
  )
})

export function MuleCharacterCard({ mule, onClick, onDelete }: MuleCharacterCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: mule.id })
  const [isHovered, setIsHovered] = useState(false)
  const [popoverOpen, setPopoverOpen] = useState(false)

  const style: React.CSSProperties = isDragging
    ? { opacity: 0 }
    : {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: 1,
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
          minHeight: 260,
          display: 'flex',
          flexDirection: 'column',
          transform: isHovered ? 'translateY(-2px)' : undefined,
          boxShadow: isHovered
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
        <MuleCardInner mule={mule} />

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
              <span className="text-sm">Delete?</span>
              <Button size="sm" variant="destructive" onClick={handleDeleteConfirm}>Yes</Button>
              <Button size="sm" variant="outline" onClick={handleDeleteCancel}>Cancel</Button>
            </div>
          </PopoverContent>
        </Popover>
      </div>
    </div>
  )
}
