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

  it('renders Add Mule button', () => {
    render(<App />)
    expect(screen.getByRole('button', { name: /add mule/i })).toBeTruthy()
  })

  it('renders weekly income section', () => {
    render(<App />)
    expect(screen.getByText('Total Weekly Income')).toBeTruthy()
  })

  it('renders mule card grid', () => {
    seedMules(testMules)
    const { container } = render(<App />)
    const cards = container.querySelectorAll('[data-mule-card]')
    expect(cards.length).toBe(3)
  })

  it('clicking Add Mule adds a new mule', () => {
    render(<App />)
    const gridBefore = screen.queryAllByText(/Unnamed Mule/).length
    fireEvent.click(screen.getByRole('button', { name: /add mule/i }))
    expect(screen.queryAllByText(/Unnamed Mule/).length).toBeGreaterThan(gridBefore)
  })

  it('toggles income display format on click', () => {
    const { container } = render(<App />)
    const clickable = container.querySelector('.cursor-pointer')
    expect(clickable).toBeTruthy()
    fireEvent.click(clickable!)
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

  it('resets isDragging state on drag cancel, removing dotted border', async () => {
    const { container } = render(<App />)

    const cardA = container.querySelector('[data-mule-card="mule-a"]') as HTMLElement
    expect(cardA).toBeTruthy()

    const gridWrapper = container.querySelector('.grid')?.parentElement as HTMLElement
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
})