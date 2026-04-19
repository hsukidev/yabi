import { describe, expect, it, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '../../test/test-utils'
import { DndContext } from '@dnd-kit/core'
import { SortableContext, rectSortingStrategy } from '@dnd-kit/sortable'
import { MuleCharacterCard, MuleCharacterCardOverlay } from '../MuleCharacterCard'
import type { Mule } from '../../types'
import { bosses } from '../../data/bosses'
import { makeKey } from '../../data/bossSelection'

const LUCID = bosses.find((b) => b.family === 'lucid')!.id
const HARD_LUCID = makeKey(LUCID, 'hard', 'weekly')

const baseMule: Mule = {
  id: 'test-mule-1',
  name: 'TestMule',
  level: 200,
  muleClass: 'Hero',
  selectedBosses: [],
  active: true,
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
    expect(screen.getByText('Unnamed')).toBeTruthy()
  })

  it('renders level badge when level > 0', () => {
    renderCard()
    expect(screen.getByText('Lv.200')).toBeTruthy()
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
    expect(screen.getByText(/income/i)).toBeTruthy()
    // Two value spans render (mobile-only abbreviated + md+ toggle-aware); both read "0" when no bosses.
    expect(screen.getAllByText('0').length).toBeGreaterThan(0)
  })

  it('stacks the INCOME label and meso value vertically on mobile, horizontally on md+', () => {
    renderCard()
    const labelEl = screen.getByText(/income/i)
    const row = labelEl.parentElement!
    expect(row.className).toContain('flex-col')
    expect(row.className).toContain('md:flex-row')
  })

  it('always stacks INCOME + meso value when the value is unabbreviated (prevents overflow)', () => {
    renderCard({ selectedBosses: [HARD_LUCID] }, { defaultAbbreviated: false })
    const labelEl = screen.getByText(/income/i)
    const row = labelEl.parentElement!
    expect(row.className).toContain('flex-col')
    expect(row.className).not.toContain('md:flex-row')
  })

  it('always renders an abbreviated mobile value even when unabbreviated is enabled', () => {
    renderCard({ selectedBosses: [HARD_LUCID] }, { defaultAbbreviated: false })
    // Full number is what md+ screens show (respects the toggle).
    const full = screen.getByText('504,000,000')
    expect(full.className).toContain('hidden')
    expect(full.className).toContain('md:inline')
    // Abbreviated version is always present for mobile.
    const abbr = screen.getByText('504M')
    expect(abbr.className).toContain('md:hidden')
  })

  it('renders abbreviated income by default', () => {
    renderCard({ selectedBosses: [HARD_LUCID] })
    // Both the mobile-always-abbreviated span and the md+ toggle-aware span render "504M".
    expect(screen.getAllByText('504M').length).toBeGreaterThan(0)
  })

  it('renders full income when abbreviated is false', () => {
    renderCard({ selectedBosses: [HARD_LUCID] }, { defaultAbbreviated: false })
    expect(screen.getByText('504,000,000')).toBeTruthy()
  })

  it('keeps an active mule card at opacity 1 when not dragging', () => {
    const { container } = renderCard({ active: true })
    const cardWrapper = container.querySelector('[data-mule-card]') as HTMLElement
    // Opacity stays at 1 regardless of hover; only drop during active drag.
    expect(cardWrapper.style.opacity).toBe('1')
    fireEvent.mouseEnter(cardWrapper)
    expect(cardWrapper.style.opacity).toBe('1')
    fireEvent.mouseLeave(cardWrapper)
    expect(cardWrapper.style.opacity).toBe('1')
  })

  it('renders an inactive mule card at 0.55 opacity', () => {
    const { container } = renderCard({ active: false })
    const cardWrapper = container.querySelector('[data-mule-card]') as HTMLElement
    expect(cardWrapper.style.opacity).toBe('0.55')
  })

  it('keeps an inactive mule card at 0.55 opacity on hover', () => {
    const { container } = renderCard({ active: false })
    const cardWrapper = container.querySelector('[data-mule-card]') as HTMLElement
    const panel = cardWrapper.querySelector('.panel') as HTMLElement
    expect(cardWrapper.style.opacity).toBe('0.55')
    fireEvent.mouseEnter(panel)
    expect(cardWrapper.style.opacity).toBe('0.55')
    fireEvent.mouseLeave(panel)
    expect(cardWrapper.style.opacity).toBe('0.55')
  })

  it('renders inactive mule income line in the dim color even when bosses are selected', () => {
    renderCard({ active: false, selectedBosses: [HARD_LUCID] })
    const incomeSpans = screen.getAllByText('504M')
    for (const span of incomeSpans) {
      expect(span.style.color).not.toContain('accent')
      expect(span.style.color).toContain('dim')
    }
  })

  it('renders active mule income line in the accent color when bosses are selected', () => {
    renderCard({ active: true, selectedBosses: [HARD_LUCID] })
    const incomeSpans = screen.getAllByText('504M')
    for (const span of incomeSpans) {
      expect(span.style.color).toContain('accent')
    }
  })

  it('keeps the drag overlay dimmed when the mule is inactive', () => {
    const mule: Mule = { ...baseMule, active: false }
    const { container } = render(<MuleCharacterCardOverlay mule={mule} />)
    const overlay = container.querySelector('.panel') as HTMLElement
    expect(overlay.style.opacity).toBe('0.55')
  })

  describe('trash icon and delete popover', () => {
    it('shows trash icon on card hover', () => {
      const { container } = renderCard()
      const trashButton = screen.getByRole('button', { name: /delete/i })
      expect(trashButton.style.opacity).toBe('0')

      const cardWrapper = container.querySelector('[data-mule-card]') as HTMLElement
      const panel = cardWrapper.querySelector('.panel') as HTMLElement
      fireEvent.mouseEnter(panel)
      expect(trashButton.style.opacity).toBe('1')
    })

    it('hides trash icon when card is not hovered', () => {
      const { container } = renderCard()
      const trashButton = screen.getByRole('button', { name: /delete/i })
      const cardWrapper = container.querySelector('[data-mule-card]') as HTMLElement
      const panel = cardWrapper.querySelector('.panel') as HTMLElement

      fireEvent.mouseEnter(panel)
      expect(trashButton.style.opacity).toBe('1')

      fireEvent.mouseLeave(panel)
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
