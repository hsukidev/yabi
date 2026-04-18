import { describe, expect, it, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@/test/test-utils'

import { MuleDetailDrawer } from '../MuleDetailDrawer'
import type { Mule } from '../../types'
import { bosses } from '../../data/bosses'
import { makeKey } from '../../data/bossSelection'
import { formatMeso } from '../../utils/meso'

const LUCID_BOSS = bosses.find((b) => b.family === 'lucid')!
const LUCID = LUCID_BOSS.id
const LUCID_FAMILY = LUCID_BOSS.family
const LUCID_HARD_VALUE = LUCID_BOSS.difficulty.find((d) => d.tier === 'hard')!.crystalValue
const HARD_LUCID = makeKey(LUCID, 'hard')
const NORMAL_LUCID = makeKey(LUCID, 'normal')

const baseMule: Mule = {
  id: 'test-mule-1',
  name: 'TestMule',
  level: 200,
  muleClass: 'Hero',
  selectedBosses: [],
}

function renderDrawer(
  overrides: Partial<Parameters<typeof MuleDetailDrawer>[0]> = {},
  options?: { defaultAbbreviated?: boolean },
) {
  const props = {
    mule: baseMule,
    open: true,
    onClose: vi.fn(),
    onUpdate: vi.fn(),
    onDelete: vi.fn(),
    ...overrides,
  }
  return {
    ...render(<MuleDetailDrawer {...props} />, options),
    props,
  }
}

describe('MuleDetailDrawer', () => {
  it('renders drawer content when open with a mule', () => {
    renderDrawer()
    expect(screen.getByRole('heading', { name: 'TestMule' })).toBeTruthy()
  })

  it('does not render content when mule is null', () => {
    renderDrawer({ mule: null })
    expect(screen.queryByRole('heading', { name: 'TestMule' })).toBeNull()
  })

  it('does not render an X close button', () => {
    renderDrawer()
    expect(screen.queryByRole('button', { name: /close/i })).toBeNull()
  })

  it('renders a trash icon button', () => {
    renderDrawer()
    expect(screen.getByRole('button', { name: /delete/i })).toBeTruthy()
  })

  it('clicking trash icon shows inline delete confirmation', async () => {
    renderDrawer()
    fireEvent.click(screen.getByRole('button', { name: /delete/i }))
    await waitFor(() => {
      expect(screen.getByText('Delete?')).toBeTruthy()
      expect(screen.getByRole('button', { name: 'Yes' })).toBeTruthy()
      expect(screen.getByRole('button', { name: 'Cancel' })).toBeTruthy()
    })
  })

  it('clicking Yes calls onDelete and closes the drawer', async () => {
    const onDelete = vi.fn()
    const onClose = vi.fn()
    renderDrawer({ onDelete, onClose })
    fireEvent.click(screen.getByRole('button', { name: /delete/i }))
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Yes' })).toBeTruthy()
    })
    fireEvent.click(screen.getByRole('button', { name: 'Yes' }))
    await waitFor(() => {
      expect(onDelete).toHaveBeenCalledWith('test-mule-1')
      expect(onClose).toHaveBeenCalled()
    })
  })

  it('clicking Cancel hides confirmation and shows trash icon again', async () => {
    renderDrawer()
    fireEvent.click(screen.getByRole('button', { name: /delete/i }))
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Cancel' })).toBeTruthy()
    })
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    await waitFor(() => {
      expect(screen.queryByText('Delete?')).toBeNull()
      expect(screen.getByRole('button', { name: /delete/i })).toBeTruthy()
    })
  })

  it('resets delete confirmation when mule changes', async () => {
    const muleA = { ...baseMule, id: 'mule-a', name: 'MuleA' }
    const muleB = { ...baseMule, id: 'mule-b', name: 'MuleB' }
    const { rerender } = renderDrawer({ mule: muleA })

    fireEvent.click(screen.getByRole('button', { name: /delete/i }))
    await waitFor(() => expect(screen.getByText('Delete?')).toBeTruthy())

    rerender(
      <MuleDetailDrawer
        mule={muleB}
        open={true}
        onClose={vi.fn()}
        onUpdate={vi.fn()}
        onDelete={vi.fn()}
      />,
    )

    await waitFor(() => expect(screen.queryByText('Delete?')).toBeNull())
  })

  it('renders a Sheet when open=true even if mule is null (so Base-UI can animate out)', () => {
    render(
      <MuleDetailDrawer mule={null} open={true} onClose={vi.fn()} onUpdate={vi.fn()} onDelete={vi.fn()} />,
    )
    expect(document.querySelector('[data-slot="sheet-content"]')).toBeTruthy()
  })

  // jsdom does not simulate viewport breakpoints, so we assert the class
  // strings are applied to SheetContent rather than measuring visual widths.
  // Tailwind handles the actual `<768px` vs `>=768px` switch at runtime.
  it('applies full-screen width below md and 560px at md+', () => {
    renderDrawer()
    const content = document.querySelector(
      '[data-slot="sheet-content"][data-side="right"]',
    )
    expect(content).toBeTruthy()
    const className = content?.className ?? ''
    expect(className).toContain('data-[side=right]:w-screen')
    expect(className).toContain('data-[side=right]:md:w-[560px]')
    expect(className).toContain('data-[side=right]:md:max-w-[560px]')
  })

  it('renders abbreviated income by default', () => {
    renderDrawer({ mule: { ...baseMule, selectedBosses: [HARD_LUCID] } })
    // "504M" now appears both in the KPI pill and in the Matrix cell, so
    // target the KPI pill specifically via its unique size/colour classes.
    const kpi = document.querySelector(
      '.font-mono-nums.text-base.text-\\[var\\(--accent-numeric\\)\\]',
    )
    expect(kpi?.textContent).toBe('504M')
  })

  it('renders full income when abbreviated is false', () => {
    renderDrawer(
      { mule: { ...baseMule, selectedBosses: [HARD_LUCID] } },
      { defaultAbbreviated: false },
    )
    // Full-number form is unique — no other element renders 504,000,000.
    expect(screen.getByText('504,000,000')).toBeTruthy()
  })

  describe('BossMatrix integration', () => {
    it('renders the BossMatrix (not the old BossCheckboxList)', () => {
      renderDrawer()
      // The Matrix exposes a "Boss Family" column header in its grid.
      expect(screen.getByText('Boss Family')).toBeTruthy()
      // The old search input from BossCheckboxList must be gone.
      expect(screen.queryByPlaceholderText('Search bosses...')).toBeNull()
    })

    it('keeps the "Weekly Bosses" section heading', () => {
      renderDrawer()
      expect(screen.getByText('Weekly Bosses')).toBeTruthy()
    })

    it('clicking a tier cell calls onUpdate with toggleBoss result', () => {
      const onUpdate = vi.fn()
      renderDrawer({ onUpdate })
      const hardLucidCell = screen.getByTestId(`matrix-cell-${LUCID}-hard`)
      fireEvent.click(hardLucidCell)
      expect(onUpdate).toHaveBeenCalledWith('test-mule-1', {
        selectedBosses: [HARD_LUCID],
      })
    })

    it('clicking a sibling tier swaps (one-per-family rule)', () => {
      const onUpdate = vi.fn()
      renderDrawer({
        mule: { ...baseMule, selectedBosses: [NORMAL_LUCID] },
        onUpdate,
      })
      const hardLucidCell = screen.getByTestId(`matrix-cell-${LUCID}-hard`)
      fireEvent.click(hardLucidCell)
      expect(onUpdate).toHaveBeenCalledWith('test-mule-1', {
        selectedBosses: [HARD_LUCID],
      })
    })

    it('clicking the selected cell again clears it', () => {
      const onUpdate = vi.fn()
      renderDrawer({
        mule: { ...baseMule, selectedBosses: [HARD_LUCID] },
        onUpdate,
      })
      const hardLucidCell = screen.getByTestId(`matrix-cell-${LUCID}-hard`)
      fireEvent.click(hardLucidCell)
      expect(onUpdate).toHaveBeenCalledWith('test-mule-1', {
        selectedBosses: [],
      })
    })
  })

  describe('party-size stepper integration', () => {
    it('clicking + on a family stepper calls onUpdate with the incremented partySizes map', () => {
      const onUpdate = vi.fn()
      renderDrawer({ onUpdate })
      const incBtn = screen.getByTestId(`party-inc-${LUCID_FAMILY}`)
      fireEvent.click(incBtn)
      expect(onUpdate).toHaveBeenCalledWith('test-mule-1', {
        partySizes: { [LUCID_FAMILY]: 2 },
      })
    })

    it('preserves existing partySizes for other families when updating one', () => {
      const onUpdate = vi.fn()
      renderDrawer({
        mule: {
          ...baseMule,
          partySizes: { 'black-mage': 3, [LUCID_FAMILY]: 1 },
        },
        onUpdate,
      })
      const incBtn = screen.getByTestId(`party-inc-${LUCID_FAMILY}`)
      fireEvent.click(incBtn)
      expect(onUpdate).toHaveBeenCalledWith('test-mule-1', {
        partySizes: { 'black-mage': 3, [LUCID_FAMILY]: 2 },
      })
    })

    it('cell meso values visually divide after party size increases', () => {
      renderDrawer({
        mule: { ...baseMule, partySizes: { [LUCID_FAMILY]: 2 } },
      })
      const hardLucidCell = screen.getByTestId(`matrix-cell-${LUCID}-hard`)
      expect(hardLucidCell.textContent).toBe(formatMeso(LUCID_HARD_VALUE / 2, true))
    })

    it('clamps party size at 6 when incrementing from 6 (no-op)', () => {
      const onUpdate = vi.fn()
      renderDrawer({
        mule: { ...baseMule, partySizes: { [LUCID_FAMILY]: 6 } },
        onUpdate,
      })
      const incBtn = screen.getByTestId(`party-inc-${LUCID_FAMILY}`)
      fireEvent.click(incBtn)
      // Either the component swallows the click or the drawer clamps it;
      // the invariant is that onUpdate is never called with a value > 6.
      for (const call of onUpdate.mock.calls) {
        const partySizes = (call[1] as { partySizes?: Record<string, number> }).partySizes
        if (partySizes) {
          for (const n of Object.values(partySizes)) {
            expect(n).toBeLessThanOrEqual(6)
          }
        }
      }
    })

    it('clamps party size at 1 when decrementing from 1 (no-op)', () => {
      const onUpdate = vi.fn()
      renderDrawer({
        mule: { ...baseMule, partySizes: { [LUCID_FAMILY]: 1 } },
        onUpdate,
      })
      const decBtn = screen.getByTestId(`party-dec-${LUCID_FAMILY}`)
      fireEvent.click(decBtn)
      for (const call of onUpdate.mock.calls) {
        const partySizes = (call[1] as { partySizes?: Record<string, number> }).partySizes
        if (partySizes) {
          for (const n of Object.values(partySizes)) {
            expect(n).toBeGreaterThanOrEqual(1)
          }
        }
      }
    })
  })
})
