import { describe, expect, it, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '../../test/test-utils'
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

function renderCard(
  overrides: Partial<Mule> = {},
  options?: { defaultAbbreviated?: boolean; onDelete?: (id: string) => void },
) {
  const onClick = vi.fn()
  const onDelete = options?.onDelete ?? vi.fn()
  const mule = { ...baseMule, ...overrides }
  return {
    ...render(
      <DndContext>
        <SortableContext items={[mule.id]} strategy={rectSortingStrategy}>
          <MuleCharacterCard mule={mule} onClick={onClick} onDelete={onDelete} />
        </SortableContext>
      </DndContext>,
      options,
    ),
    onClick,
    onDelete,
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

  describe('trash icon and delete popover', () => {
    it('shows trash icon on card hover', () => {
      const { container } = renderCard()
      const trashButton = screen.getByRole('button', { name: /delete/i })
      expect(trashButton.style.opacity).toBe('0')

      const cardWrapper = container.querySelector('[data-mule-card]') as HTMLElement
      fireEvent.mouseEnter(cardWrapper)
      expect(trashButton.style.opacity).toBe('1')
    })

    it('hides trash icon when card is not hovered', () => {
      const { container } = renderCard()
      const trashButton = screen.getByRole('button', { name: /delete/i })
      const cardWrapper = container.querySelector('[data-mule-card]') as HTMLElement

      fireEvent.mouseEnter(cardWrapper)
      expect(trashButton.style.opacity).toBe('1')

      fireEvent.mouseLeave(cardWrapper)
      expect(trashButton.style.opacity).toBe('0')
    })

    it('opens popover with Delete? and Yes/Cancel when trash icon is clicked', async () => {
      const { container } = renderCard()
      const cardWrapper = container.querySelector('[data-mule-card]') as HTMLElement
      fireEvent.mouseEnter(cardWrapper)

      const trashButton = screen.getByRole('button', { name: /delete/i })
      fireEvent.click(trashButton)

      await waitFor(() => {
        expect(screen.getByText('Delete?')).toBeTruthy()
        expect(screen.getByRole('button', { name: 'Yes' })).toBeTruthy()
        expect(screen.getByRole('button', { name: 'Cancel' })).toBeTruthy()
      })
    })

    it('calls onDelete and closes popover when Yes is clicked', async () => {
      const onDelete = vi.fn()
      const { container } = renderCard({}, { onDelete })
      const cardWrapper = container.querySelector('[data-mule-card]') as HTMLElement
      fireEvent.mouseEnter(cardWrapper)

      fireEvent.click(screen.getByRole('button', { name: /delete/i }))

      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Yes' })).toBeTruthy()
      })

      fireEvent.click(screen.getByRole('button', { name: 'Yes' }))
      expect(onDelete).toHaveBeenCalledWith('test-mule-1')
    })

    it('closes popover without deleting when Cancel is clicked', async () => {
      const onDelete = vi.fn()
      const { container } = renderCard({}, { onDelete })
      const cardWrapper = container.querySelector('[data-mule-card]') as HTMLElement
      fireEvent.mouseEnter(cardWrapper)

      fireEvent.click(screen.getByRole('button', { name: /delete/i }))

      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Cancel' })).toBeTruthy()
      })

      fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
      expect(onDelete).not.toHaveBeenCalled()

      await waitFor(() => {
        expect(screen.queryByText('Delete?')).toBeNull()
      })
    })

    it('does not trigger card onClick when trash icon is clicked', async () => {
      const { container, onClick } = renderCard()
      const cardWrapper = container.querySelector('[data-mule-card]') as HTMLElement
      fireEvent.mouseEnter(cardWrapper)

      const trashButton = screen.getByRole('button', { name: /delete/i })
      fireEvent.click(trashButton)

      expect(onClick).not.toHaveBeenCalled()
    })

  })
})
