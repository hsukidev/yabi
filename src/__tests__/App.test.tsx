import { describe, expect, it, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@/test/test-utils'
import App from '../App'
import type { Mule } from '../types'

const STORAGE_KEY = 'maplestory-mule-tracker'

const testMules: Mule[] = [
  { id: 'mule-a', name: 'Alpha', level: 200, muleClass: 'Hero', selectedBosses: [] },
  { id: 'mule-b', name: 'Beta', level: 180, muleClass: 'Paladin', selectedBosses: [] },
  { id: 'mule-c', name: 'Gamma', level: 160, muleClass: 'Dark Knight', selectedBosses: [] },
]

const DEFAULT_RECT = { x: 0, y: 0, width: 800, height: 600, top: 0, right: 800, bottom: 600, left: 0, toJSON: () => ({}) }

function seedMules(mules: Mule[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(mules))
}

function resetTestEnvironment() {
  localStorage.clear()
  document.documentElement.classList.remove('dark')
}

function mockGetBoundingClientRect() {
  const orig = Element.prototype.getBoundingClientRect
  Element.prototype.getBoundingClientRect = function () {
    const el = this as HTMLElement
    const cardId = el.getAttribute('data-mule-card')
    if (cardId) {
      const i = testMules.findIndex((m) => m.id === cardId)
      if (i < 0) return { ...DEFAULT_RECT }
      return {
        x: i * 220,
        y: 0,
        width: 200,
        height: 300,
        top: 0,
        right: i * 220 + 200,
        bottom: 300,
        left: i * 220,
        toJSON: () => ({}),
      }
    }
    return { ...DEFAULT_RECT }
  }
  return () => {
    Element.prototype.getBoundingClientRect = orig
  }
}

function simulatePointerDrag(
  startEl: HTMLElement,
  startX: number,
  startY: number,
  endX: number,
  endY: number,
) {
  fireEvent.pointerDown(startEl, {
    pointerId: 1,
    clientX: startX,
    clientY: startY,
    button: 0,
    isPrimary: true,
    bubbles: true,
  })

  fireEvent.pointerMove(document, {
    pointerId: 1,
    clientX: startX + 10,
    clientY: startY,
    isPrimary: true,
    bubbles: true,
  })

  fireEvent.pointerMove(document, {
    pointerId: 1,
    clientX: endX,
    clientY: endY,
    isPrimary: true,
    bubbles: true,
  })

  fireEvent.pointerUp(document, {
    pointerId: 1,
    clientX: endX,
    clientY: endY,
    isPrimary: true,
    bubbles: true,
  })
}

describe('App', () => {
  beforeEach(() => {
    resetTestEnvironment()
  })

  it('renders Add Card in the grid with "Add Mule" text', () => {
    render(<App />)
    expect(screen.getByRole('button', { name: /add mule/i })).toBeTruthy()
  })

  it('renders weekly income section', () => {
    render(<App />)
    expect(screen.getByText(/TOTAL WEEKLY INCOME/i)).toBeTruthy()
  })

  it('renders mule card grid', () => {
    seedMules(testMules)
    const { container } = render(<App />)
    const cards = container.querySelectorAll('[data-mule-card]')
    expect(cards.length).toBe(3)
  })

  it('Add Card appears as the last item in the grid', () => {
    seedMules(testMules)
    const { container } = render(<App />)
    const grid = container.querySelector('[data-drag-boundary] .grid') as HTMLElement
    const lastChild = grid.lastElementChild as HTMLElement
    expect(lastChild.hasAttribute('data-add-card')).toBe(true)
  })

  it('clicking Add Card creates a new mule and opens the detail drawer', async () => {
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: /add mule/i }))
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Unnamed Mule' })).toBeTruthy()
    })
  })

  it('toggles income display format on click', () => {
    render(<App />)
    const clickable = screen.getByRole('button', { name: /toggle abbreviated meso format/i })
    expect(clickable).toBeTruthy()
    fireEvent.click(clickable)
  })

  describe('selectedMuleId self-healing', () => {
    it('clears selectedMuleId when the selected mule is deleted', async () => {
      const mules = [
        {
          id: 'mule-a',
          name: 'DeleteMe',
          level: 200,
          muleClass: 'Hero',
          selectedBosses: [],
        },
      ]
      localStorage.setItem('maplestory-mule-tracker', JSON.stringify(mules))
      render(<App />)

      fireEvent.click(screen.getByText('DeleteMe'))
      expect(screen.getByRole('heading', { name: 'DeleteMe' })).toBeTruthy()

      fireEvent.click(screen.getByRole('button', { name: /delete/i }))
      fireEvent.click(screen.getByRole('button', { name: /yes/i }))

      await waitFor(() => {
        expect(screen.queryByRole('heading', { name: 'DeleteMe' })).toBeNull()
      })
    })

    it('keeps selectedMuleId when a different mule is deleted', async () => {
      const mules = [
        {
          id: 'mule-a',
          name: 'KeepMe',
          level: 200,
          muleClass: 'Hero',
          selectedBosses: [],
        },
        {
          id: 'mule-b',
          name: 'DeleteMe',
          level: 150,
          muleClass: 'Paladin',
          selectedBosses: [],
        },
      ]
      localStorage.setItem('maplestory-mule-tracker', JSON.stringify(mules))
      render(<App />)

      fireEvent.click(screen.getByText('KeepMe'))
      expect(screen.getByRole('heading', { name: 'KeepMe' })).toBeTruthy()

      const overlay = document.querySelector('[data-slot="sheet-overlay"]')!
      fireEvent.click(overlay)
      await waitFor(() => {
        expect(screen.queryByRole('heading', { name: 'KeepMe' })).toBeNull()
      })

      fireEvent.click(screen.getByText('DeleteMe'))
      expect(screen.getByRole('heading', { name: 'DeleteMe' })).toBeTruthy()

      fireEvent.click(screen.getByRole('button', { name: /delete/i }))
      fireEvent.click(screen.getByRole('button', { name: /yes/i }))

      await waitFor(() => {
        expect(screen.queryByRole('heading', { name: 'DeleteMe' })).toBeNull()
      })

      fireEvent.click(screen.getByText('KeepMe'))
      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'KeepMe' })).toBeTruthy()
      })
    })
  })
})

describe('section entrance animations', () => {
  it('Header renders with sticky positioning', () => {
    render(<App />)
    const header = screen.getByRole('banner')
    expect(header.className).toContain('sticky')
    expect(header.className).toContain('top-0')
  })

  it('income card has slide-up fade-in animation classes', () => {
    const { container } = render(<App />)
    const incomeCard = container.querySelector('[data-testid="income-card"]')
    expect(incomeCard).toBeTruthy()
    const wrapper = incomeCard!.parentElement!
    expect(wrapper.className).toContain('animate-in')
    expect(wrapper.className).toContain('fade-in')
    expect(wrapper.className).toContain('slide-in-from-bottom-4')
    expect(wrapper.className).toContain('duration-500')
    expect(wrapper.className).toContain('fill-mode-both')
  })

  it('income chart has slide-up fade-in animation classes', () => {
    const { container } = render(<App />)
    const incomeChart = container.querySelector('[data-testid="income-chart"]')
    expect(incomeChart).toBeTruthy()
    const wrapper = incomeChart!.parentElement!
    expect(wrapper.className).toContain('animate-in')
    expect(wrapper.className).toContain('fade-in')
    expect(wrapper.className).toContain('slide-in-from-bottom-4')
    expect(wrapper.className).toContain('duration-500')
    expect(wrapper.className).toContain('fill-mode-both')
  })

  it('roster section has slide-up fade-in animation classes', () => {
    const { container } = render(<App />)
    const rosterSection = container.querySelector('[data-testid="roster-section"]')
    expect(rosterSection).toBeTruthy()
    expect(rosterSection!.className).toContain('animate-in')
    expect(rosterSection!.className).toContain('fade-in')
    expect(rosterSection!.className).toContain('slide-in-from-bottom-4')
    expect(rosterSection!.className).toContain('duration-500')
    expect(rosterSection!.className).toContain('fill-mode-both')
  })
})

describe('App DnD interactions', () => {
  let restoreRect: () => void

  beforeEach(() => {
    resetTestEnvironment()
    seedMules(testMules)
    restoreRect = mockGetBoundingClientRect()
  })

  afterEach(() => {
    restoreRect()
  })

  it('renders mule cards in grid order', () => {
    const { container } = render(<App />)
    const cards = container.querySelectorAll('[data-mule-card]')
    expect(cards).toHaveLength(3)
    expect(cards[0].getAttribute('data-mule-card')).toBe('mule-a')
    expect(cards[1].getAttribute('data-mule-card')).toBe('mule-b')
    expect(cards[2].getAttribute('data-mule-card')).toBe('mule-c')
  })

  it('calls reorderMules with correct indices on drag end', async () => {
    const { container } = render(<App />)

    const cardA = container.querySelector('[data-mule-card="mule-a"]') as HTMLElement
    expect(cardA).toBeTruthy()

    simulatePointerDrag(cardA, 100, 150, 320, 150)

    await waitFor(() => {
      const cardsAfter = container.querySelectorAll('[data-mule-card]')
      const order = Array.from(cardsAfter).map((c) => c.getAttribute('data-mule-card'))
      expect(order).toEqual(['mule-b', 'mule-a', 'mule-c'])
    })
  })

  it('non-dragged cards retain transform transition during active drag', async () => {
    const { container } = render(<App />)
    const cardA = container.querySelector('[data-mule-card="mule-a"]') as HTMLElement
    const cardB = container.querySelector('[data-mule-card="mule-b"]') as HTMLElement

    fireEvent.pointerDown(cardA, {
      pointerId: 1, clientX: 100, clientY: 150,
      button: 0, isPrimary: true, bubbles: true,
    })
    fireEvent.pointerMove(document, {
      pointerId: 1, clientX: 110, clientY: 150,
      isPrimary: true, bubbles: true,
    })

    await waitFor(() => {
      expect(cardA.style.transition).not.toMatch(/transform\s+\d/)
    })

    const transitionB = cardB.style.transition
    const transformParts = transitionB.split(',').filter((p: string) => p.trim().startsWith('transform'))
    expect(transformParts.length).toBeGreaterThan(0)

    fireEvent.pointerUp(document, {
      pointerId: 1, clientX: 110, clientY: 150,
      isPrimary: true, bubbles: true,
    })
  })

  it('dragged card has no transform transition during active drag', async () => {
    const { container } = render(<App />)
    const cardA = container.querySelector('[data-mule-card="mule-a"]') as HTMLElement

    fireEvent.pointerDown(cardA, {
      pointerId: 1, clientX: 100, clientY: 150,
      button: 0, isPrimary: true, bubbles: true,
    })
    fireEvent.pointerMove(document, {
      pointerId: 1, clientX: 110, clientY: 150,
      isPrimary: true, bubbles: true,
    })

    await waitFor(() => {
      const transition = cardA.style.transition
      const transformParts = transition.split(',').filter((p: string) => p.trim().startsWith('transform'))
      expect(transformParts.length).toBe(0)
    })

    fireEvent.pointerUp(document, {
      pointerId: 1, clientX: 110, clientY: 150,
      isPrimary: true, bubbles: true,
    })
  })

  it('applies filter during drag and restores on drag end', async () => {
    const { container } = render(<App />)
    const cardA = container.querySelector('[data-mule-card="mule-a"]') as HTMLElement

    fireEvent.mouseEnter(cardA)
    expect(cardA.style.filter).toBeFalsy()

    fireEvent.pointerDown(cardA, {
      pointerId: 1, clientX: 100, clientY: 150,
      button: 0, isPrimary: true, bubbles: true,
    })
    fireEvent.pointerMove(document, {
      pointerId: 1, clientX: 110, clientY: 150,
      isPrimary: true, bubbles: true,
    })

    await waitFor(() => {
      expect(cardA.style.filter).toBe('saturate(0.7) brightness(0.9)')
    })

    fireEvent.pointerUp(document, {
      pointerId: 1, clientX: 110, clientY: 150,
      isPrimary: true, bubbles: true,
    })

    await waitFor(() => {
      expect(cardA.style.filter).toBeFalsy()
    })
  })

  it('resets isDragging state on drag cancel, removing dotted border', async () => {
    const { container } = render(<App />)

    const cardA = container.querySelector('[data-mule-card="mule-a"]') as HTMLElement
    expect(cardA).toBeTruthy()

    const gridWrapper = container.querySelector('[data-drag-boundary]') as HTMLElement
    expect(gridWrapper).toBeTruthy()

    expect(gridWrapper!.style.borderStyle).toBeFalsy()

    fireEvent.pointerDown(cardA, {
      pointerId: 1,
      clientX: 100,
      clientY: 150,
      button: 0,
      isPrimary: true,
      bubbles: true,
    })

    fireEvent.pointerMove(document, {
      pointerId: 1,
      clientX: 110,
      clientY: 150,
      isPrimary: true,
      bubbles: true,
    })

    fireEvent.keyDown(document, { key: 'Escape', code: 'Escape' })

    await waitFor(() => {
      expect(gridWrapper!.style.borderStyle).toBeFalsy()
    })
  })

  it('grid wrapper transition does not include padding or all', async () => {
    const { container } = render(<App />)
    const boundary = container.querySelector('[data-drag-boundary]') as HTMLElement

    expect(boundary.className).not.toContain('transition-all')

    const parts = boundary.className.split(/\s+/)
    const transitionClass = parts.find((p: string) => p.startsWith('transition-['))
    expect(transitionClass).toBeTruthy()
    const props = transitionClass!.replace('transition-[', '').replace(']', '').split(',')
    expect(props).not.toContain('padding')
    expect(props).not.toContain('all')
  })

  it('grid wrapper padding changes instantly when isDragging toggles', async () => {
    const { container } = render(<App />)
    const boundary = container.querySelector('[data-drag-boundary]') as HTMLElement

    const cardA = container.querySelector('[data-mule-card="mule-a"]') as HTMLElement
    fireEvent.pointerDown(cardA, {
      pointerId: 1, clientX: 100, clientY: 150,
      button: 0, isPrimary: true, bubbles: true,
    })
    fireEvent.pointerMove(document, {
      pointerId: 1, clientX: 110, clientY: 150,
      isPrimary: true, bubbles: true,
    })

    await waitFor(() => {
      expect(boundary.style.padding).toBeTruthy()
    })

    fireEvent.pointerUp(document, {
      pointerId: 1, clientX: 110, clientY: 150,
      isPrimary: true, bubbles: true,
    })

    await waitFor(() => {
      expect(boundary.style.padding).toBeFalsy()
    })
  })

  it('Add Card is not included in DnD sortable items', () => {
    const { container } = render(<App />)
    const addCard = container.querySelector('[data-add-card]') as HTMLElement
    expect(addCard).toBeTruthy()
    // Add Card should not have dnd-kit sortable attributes
    expect(addCard.closest('[data-mule-card]')).toBeNull()
  })

  it('mule order updates during drag-over before pointer is released', async () => {
    const { container } = render(<App />)
    const cardA = container.querySelector('[data-mule-card="mule-a"]') as HTMLElement

    fireEvent.pointerDown(cardA, { pointerId: 1, clientX: 100, clientY: 150, button: 0, isPrimary: true, bubbles: true })
    fireEvent.pointerMove(document, { pointerId: 1, clientX: 110, clientY: 150, isPrimary: true, bubbles: true })
    fireEvent.pointerMove(document, { pointerId: 1, clientX: 320, clientY: 150, isPrimary: true, bubbles: true })

    await waitFor(() => {
      const cards = container.querySelectorAll('[data-mule-card]')
      const order = Array.from(cards).map((c) => c.getAttribute('data-mule-card'))
      expect(order).toEqual(['mule-b', 'mule-a', 'mule-c'])
    })

    fireEvent.pointerUp(document, { pointerId: 1, clientX: 320, clientY: 150, isPrimary: true, bubbles: true })
  })

  it('dragging cards does not change Add Card position (stays last)', async () => {
    const { container } = render(<App />)

    const cardA = container.querySelector('[data-mule-card="mule-a"]') as HTMLElement
    simulatePointerDrag(cardA, 100, 150, 320, 150)

    await waitFor(() => {
      const grid = container.querySelector('[data-drag-boundary] .grid') as HTMLElement
      const lastChild = grid.lastElementChild as HTMLElement
      expect(lastChild.hasAttribute('data-add-card')).toBe(true)
    })
  })
})
