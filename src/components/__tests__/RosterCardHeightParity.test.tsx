/// <reference types="node" />
/**
 * Slice 1 parent #141 / issue #142: pins the height contract that keeps AddCard
 * flush with mule cards in the roster grid regardless of row position.
 *
 * jsdom has no layout engine, so we can't measure pixel heights. Instead these
 * tests pin the *contract*:
 *   1. AddCard and MuleCharacterCard read the same min-height token, so their
 *      floors can never drift from each other.
 *   2. The roster grid applies `grid-auto-rows` with that same min, so an
 *      AddCard wrapping alone to a new row still gets the floor (density-boundary
 *      parity — the case that failed before, in both comfy and compact).
 *   3. Within any row, CSS grid's default stretch alignment pulls every cell
 *      (including AddCard) to the tallest card — we don't set `align-items`
 *      away from stretch, so the non-uniform-content parity falls out for free.
 *      The test here just pins that we're not accidentally opting out.
 *   4. Empty-roster fallback: even with zero mules, the AddCard still renders
 *      at the shared floor.
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it, beforeEach } from 'vitest'
import { DndContext } from '@dnd-kit/core'
import { SortableContext, rectSortingStrategy } from '@dnd-kit/sortable'
import { render } from '../../test/test-utils'
import App from '../../App'
import { AddCard } from '../AddCard'
import { MuleCharacterCard } from '../MuleCharacterCard'
import type { Mule } from '../../types'

// Read index.css once at module load. Node env is available under vitest.
const indexCssRaw = readFileSync(resolve(process.cwd(), 'src/index.css'), 'utf-8')

const STORAGE_KEY = 'maplestory-mule-tracker'

function persistedRoot(mules: Mule[]) {
  return { schemaVersion: 2, mules }
}

function seedMules(mules: Mule[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(persistedRoot(mules)))
}

let muleCounter = 0
function makeMule(overrides: Partial<Mule> = {}): Mule {
  muleCounter += 1
  return {
    id: `mule-${muleCounter}`,
    name: 'Mule',
    level: 200,
    muleClass: 'Hero',
    selectedBosses: [],
    ...overrides,
  }
}


beforeEach(() => {
  localStorage.clear()
  document.documentElement.removeAttribute('data-density')
})

describe('Roster card height parity contract', () => {
  it('MuleCharacterCard inner panel min-height reads the shared roster-card-min-height variable', () => {
    const onClick = () => {}
    const onDelete = () => {}
    const mule = makeMule()
    const { container } = render(
      <DndContext>
        <SortableContext items={[mule.id]} strategy={rectSortingStrategy}>
          <MuleCharacterCard mule={mule} onClick={onClick} onDelete={onDelete} />
        </SortableContext>
      </DndContext>,
    )
    const panel = container.querySelector('[data-mule-card] .panel') as HTMLElement
    expect(panel).toBeTruthy()
    // The inline min-height must reference the shared CSS variable — not a hard number.
    expect(panel.style.minHeight).toContain('var(--roster-card-min-height')
  })

  it('AddCard min-height reads the same shared roster-card-min-height variable', () => {
    const { container } = render(<AddCard onClick={() => {}} />)
    const addCard = container.querySelector('[data-add-card]') as HTMLElement
    expect(addCard).toBeTruthy()
    expect(addCard.style.minHeight).toContain('var(--roster-card-min-height')
  })

  it('AddCard and MuleCharacterCard reference the exact same min-height variable (no drift)', () => {
    const mule = makeMule()
    const { container: muleContainer } = render(
      <DndContext>
        <SortableContext items={[mule.id]} strategy={rectSortingStrategy}>
          <MuleCharacterCard mule={mule} onClick={() => {}} onDelete={() => {}} />
        </SortableContext>
      </DndContext>,
    )
    const { container: addContainer } = render(<AddCard onClick={() => {}} />)
    const panel = muleContainer.querySelector('[data-mule-card] .panel') as HTMLElement
    const addCard = addContainer.querySelector('[data-add-card]') as HTMLElement
    expect(panel.style.minHeight).toBe(addCard.style.minHeight)
  })

  it('the shared min-height token is declared in both density scopes and above the stale 160px floor', () => {
    // jsdom doesn't parse Tailwind/@import CSS, so getComputedStyle on :root
    // won't see tokens from index.css. Inspect the stylesheet source directly.
    // Variable exists at the comfy and compact density scopes (those are the
    // only two scopes the roster grid actually renders under).
    const comfyMatch = indexCssRaw.match(/\[data-density="comfy"\]\s*\{[^}]*--roster-card-min-height:\s*(\d+)px/)
    const compactMatch = indexCssRaw.match(/\[data-density="compact"\]\s*\{[^}]*--roster-card-min-height:\s*(\d+)px/)
    expect(comfyMatch).not.toBeNull()
    expect(compactMatch).not.toBeNull()
    // Must be taller than the stale 160px floor the parent PRD called out,
    // otherwise AddCard would still collapse below the mule-card intrinsic height.
    expect(parseInt(comfyMatch![1], 10)).toBeGreaterThanOrEqual(240)
    // Compact cards have tighter padding and smaller name size, so the floor
    // can be smaller, but it must still clear the stale 160px floor.
    expect(parseInt(compactMatch![1], 10)).toBeGreaterThan(160)
  })

  it('roster grid pins every implicit row to the shared min via grid-auto-rows (density-boundary parity)', () => {
    // Seed enough mules to hit the comfy column boundary (6 mules → AddCard wraps alone).
    const mules = Array.from({ length: 6 }, (_, i) =>
      makeMule({ id: `mule-${i}`, name: `M${i}` }),
    )
    seedMules(mules)
    const { container } = render(<App />)
    const grid = container.querySelector('[data-drag-boundary] .grid') as HTMLElement
    expect(grid).toBeTruthy()
    // grid-auto-rows (or a grid-template-rows) must reference the shared variable
    // so the AddCard-alone row gets the same floor as mule rows.
    const gridAutoRows = grid.style.gridAutoRows
    expect(gridAutoRows).toContain('var(--roster-card-min-height')
  })

  it('parity holds at the compact-density boundary (8 mules → AddCard wraps alone in compact)', () => {
    document.documentElement.setAttribute('data-density', 'compact')
    const mules = Array.from({ length: 8 }, (_, i) =>
      makeMule({ id: `mule-${i}`, name: `M${i}` }),
    )
    seedMules(mules)
    const { container } = render(<App />)
    const grid = container.querySelector('[data-drag-boundary] .grid') as HTMLElement
    // Same contract on the grid regardless of density — the variable resolves at
    // the density's :root scope, but the grid rule stays density-agnostic.
    expect(grid.style.gridAutoRows).toContain('var(--roster-card-min-height')
  })

  it('roster grid does not override align-items (cells stretch to tallest in-row card for non-uniform content parity)', () => {
    const mules = [
      makeMule({ id: 'short', name: 'A' }),
      // A very long name would wrap and grow this card; the AddCard sharing the row
      // stretches with it via CSS grid's default align-items: stretch.
      makeMule({ id: 'long', name: 'A'.repeat(80), muleClass: '' }),
    ]
    seedMules(mules)
    const { container } = render(<App />)
    const grid = container.querySelector('[data-drag-boundary] .grid') as HTMLElement
    // Don't opt out of stretch — that's how in-row parity works.
    expect(grid.style.alignItems === '' || grid.style.alignItems === 'stretch').toBe(true)
  })

  it('empty roster still renders AddCard at the shared min (no collapse to content-only)', () => {
    // No seeded mules → roster contains only the AddCard.
    const { container } = render(<App />)
    const addCard = container.querySelector('[data-add-card]') as HTMLElement
    expect(addCard).toBeTruthy()
    // The AddCard itself still carries the shared min on its own inline style,
    // so an empty roster doesn't collapse to the +-and-label intrinsic height.
    expect(addCard.style.minHeight).toContain('var(--roster-card-min-height')
    // And the grid rule still applies, so the lone row also has the floor.
    const grid = container.querySelector('[data-drag-boundary] .grid') as HTMLElement
    expect(grid.style.gridAutoRows).toContain('var(--roster-card-min-height')
  })
})
