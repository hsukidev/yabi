import { describe, expect, it, vi } from 'vitest'
import { render, screen, fireEvent } from '../../test/test-utils'
import { DndContext } from '@dnd-kit/core'
import { SortableContext, rectSortingStrategy } from '@dnd-kit/sortable'
import { MuleCharacterCard } from '../MuleCharacterCard'
import type { Mule } from '../../types'

const baseMule: Mule = {
  id: 'test-mule-1',
  name: 'TestMule',
  level: 200,
  muleClass: 'Hero',
  selectedBosses: [],
}

function renderCard(overrides: Partial<Mule> = {}, options?: { defaultAbbreviated?: boolean }) {
  const onClick = vi.fn()
  const mule = { ...baseMule, ...overrides }
  return {
    ...render(
      <DndContext>
        <SortableContext items={[mule.id]} strategy={rectSortingStrategy}>
          <MuleCharacterCard mule={mule} onClick={onClick} />
        </SortableContext>
      </DndContext>,
      options,
    ),
    onClick,
  }
}

describe('MuleCharacterCard', () => {
  it('renders the mule name', () => {
    renderCard()
    expect(screen.getByText('TestMule')).toBeTruthy()
  })

  it('renders "Unnamed Mule" when name is empty', () => {
    renderCard({ name: '' })
    expect(screen.getByText('Unnamed Mule')).toBeTruthy()
  })

  it('renders level badge when level > 0', () => {
    renderCard()
    expect(screen.getByText('Lv. 200')).toBeTruthy()
  })

  it('hides level badge when level is 0', () => {
    renderCard({ level: 0 })
    expect(screen.queryByText(/Lv\./)).toBeNull()
  })

  it('renders class badge when muleClass is set', () => {
    renderCard({ muleClass: 'Hero' })
    expect(screen.getByText('Hero')).toBeTruthy()
  })

  it('hides class badge when muleClass is empty', () => {
    renderCard({ muleClass: '' })
    expect(screen.queryByText('Hero')).toBeNull()
  })

  it('calls onClick when card is clicked', () => {
    const { onClick } = renderCard()
    fireEvent.click(screen.getByText('TestMule'))
    expect(onClick).toHaveBeenCalled()
  })

  it('renders income text', () => {
    renderCard()
    expect(screen.getByText(/0.*\/week/)).toBeTruthy()
  })

  it('renders abbreviated income by default', () => {
    renderCard({ selectedBosses: ['hard-lucid'] })
    expect(screen.getByText(/504M.*\/week/)).toBeTruthy()
  })

  it('renders full income when abbreviated is false', () => {
    renderCard({ selectedBosses: ['hard-lucid'] }, { defaultAbbreviated: false })
    expect(screen.getByText(/504,000,000.*\/week/)).toBeTruthy()
  })

  it('reduces opacity on hover and restores on mouse leave', () => {
    const { container } = renderCard()
    const cardWrapper = container.querySelector('[data-mule-card]') as HTMLElement
    expect(cardWrapper.style.opacity).toBe('1')
    fireEvent.mouseEnter(cardWrapper)
    expect(cardWrapper.style.opacity).toBe('0.85')
    fireEvent.mouseLeave(cardWrapper)
    expect(cardWrapper.style.opacity).toBe('1')
  })
})
