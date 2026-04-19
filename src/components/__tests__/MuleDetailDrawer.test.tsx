import { describe, expect, it, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@/test/test-utils'

import { MuleDetailDrawer } from '../MuleDetailDrawer'
import type { Mule } from '../../types'
import { bosses, getBossByFamily } from '../../data/bosses'
import { hardestDifficulty, makeKey } from '../../data/bossSelection'
import {
  PRESET_FAMILIES,
  presetEntryFamily,
  presetEntryKey,
} from '../../data/bossPresets'
import { formatMeso } from '../../utils/meso'

const LUCID_BOSS = bosses.find((b) => b.family === 'lucid')!
const LUCID = LUCID_BOSS.id
const LUCID_FAMILY = LUCID_BOSS.family
const LUCID_HARD_VALUE = LUCID_BOSS.difficulty.find((d) => d.tier === 'hard')!.crystalValue
const HARD_LUCID = makeKey(LUCID, 'hard', 'weekly')
const NORMAL_LUCID = makeKey(LUCID, 'normal', 'weekly')

const VELLUM_BOSS = bosses.find((b) => b.family === 'vellum')!
const CRIMSON_QUEEN_BOSS = bosses.find((b) => b.family === 'crimson-queen')!
const BLACK_MAGE_BOSS = bosses.find((b) => b.family === 'black-mage')!
const HORNTAIL_BOSS = bosses.find((b) => b.family === 'horntail')!
const MORI_BOSS = bosses.find((b) => b.family === 'mori-ranmaru')!

const baseMule: Mule = {
  id: 'test-mule-1',
  name: 'TestMule',
  level: 200,
  muleClass: 'Hero',
  selectedBosses: [],
  active: true,
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

  it('renders a Close button that calls onClose when clicked', () => {
    const { props } = renderDrawer()
    const closeBtn = screen.getByRole('button', { name: /^close$/i })
    fireEvent.click(closeBtn)
    expect(props.onClose).toHaveBeenCalled()
  })

  it('hides the Close button on md+ screens (mobile-only)', () => {
    renderDrawer()
    const closeBtn = screen.getByRole('button', { name: /^close$/i })
    expect(closeBtn.className).toContain('md:hidden')
  })

  it('sanitizes the name on input — strips non-letters and caps at 12 chars', () => {
    const { props } = renderDrawer()
    const input = screen.getByLabelText('Character Name') as HTMLInputElement
    fireEvent.change(input, { target: { value: 'Hero123!WorldTooLong' } })
    expect(props.onUpdate).toHaveBeenCalledWith(baseMule.id, { name: 'HeroWorldToo' })
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
  it('applies full-screen width below md and 640px at md+', () => {
    renderDrawer()
    const content = document.querySelector(
      '[data-slot="sheet-content"][data-side="right"]',
    )
    expect(content).toBeTruthy()
    const className = content?.className ?? ''
    expect(className).toContain('data-[side=right]:w-screen')
    expect(className).toContain('data-[side=right]:md:w-[640px]')
    expect(className).toContain('data-[side=right]:md:max-w-[640px]')
  })

  // Guard against the base Sheet's `sm:max-w-sm` capping the drawer to 384px
  // between the sm (640px) and md (768px) breakpoints — that band would squish
  // the matrix. Our override must neutralize it so the drawer stays full-screen
  // until the md breakpoint takes over at 640px.
  it('does not cap the drawer at sm:max-w-sm (avoids 384px squish band)', () => {
    renderDrawer()
    const content = document.querySelector(
      '[data-slot="sheet-content"][data-side="right"]',
    )
    const className = content?.className ?? ''
    expect(className).not.toContain('data-[side=right]:sm:max-w-sm')
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
      // The Matrix exposes a "Bosses" column header in its grid.
      expect(screen.getByText('Bosses')).toBeTruthy()
      // The old search input from BossCheckboxList must be gone.
      expect(screen.queryByPlaceholderText('Search bosses...')).toBeNull()
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

  describe('BossSearch integration', () => {
    function getSearchInput() {
      return screen.getByPlaceholderText('Search bosses\u2026') as HTMLInputElement
    }

    it('renders a fused BossSearch directly above the BossMatrix', () => {
      renderDrawer()
      const search = document.querySelector('.d-search') as HTMLElement
      expect(search).toBeTruthy()
      expect(search.classList.contains('d-search-fused')).toBe(true)
      // Matrix must be the next element sibling so there is no gap or seam
      // between the search bar and the matrix wrapper.
      const matrix = search.nextElementSibling as HTMLElement | null
      expect(matrix).toBeTruthy()
      expect(matrix?.getAttribute('role')).toBe('table')
    })

    it('narrows visible family rows by substring match (vell → Vellum only)', () => {
      renderDrawer()
      fireEvent.change(getSearchInput(), { target: { value: 'vell' } })
      const rowHeaders = screen.getAllByRole('rowheader')
      expect(rowHeaders).toHaveLength(1)
      expect(rowHeaders[0].textContent).toContain(VELLUM_BOSS.name)
    })

    it('matches via family slug (cri → Crimson Queen)', () => {
      renderDrawer()
      fireEvent.change(getSearchInput(), { target: { value: 'cri' } })
      const rowHeaders = screen.getAllByRole('rowheader')
      expect(rowHeaders.some((r) => r.textContent?.includes(CRIMSON_QUEEN_BOSS.name))).toBe(true)
    })

    it('matches case-insensitively (VELL matches Vellum)', () => {
      renderDrawer()
      fireEvent.change(getSearchInput(), { target: { value: 'VELL' } })
      const rowHeaders = screen.getAllByRole('rowheader')
      expect(rowHeaders).toHaveLength(1)
      expect(rowHeaders[0].textContent).toContain(VELLUM_BOSS.name)
    })

    it('clears the query when the drawer opens for a different mule', async () => {
      const muleA = { ...baseMule, id: 'mule-a', name: 'MuleA' }
      const muleB = { ...baseMule, id: 'mule-b', name: 'MuleB' }
      const { rerender } = renderDrawer({ mule: muleA })

      fireEvent.change(getSearchInput(), { target: { value: 'vell' } })
      expect(getSearchInput().value).toBe('vell')

      rerender(
        <MuleDetailDrawer
          mule={muleB}
          open={true}
          onClose={vi.fn()}
          onUpdate={vi.fn()}
          onDelete={vi.fn()}
        />,
      )

      await waitFor(() => expect(getSearchInput().value).toBe(''))
      expect(screen.getAllByRole('rowheader').length).toBeGreaterThan(1)
    })

    it('empty query shows every family (no filtering)', () => {
      renderDrawer()
      expect(getSearchInput().value).toBe('')
      expect(screen.getAllByRole('rowheader')).toHaveLength(bosses.length)
    })
  })

  describe('MatrixToolbar + Cadence Filter integration', () => {
    function getSearchInput() {
      return screen.getByPlaceholderText('Search bosses\u2026') as HTMLInputElement
    }

    it('renders the MatrixToolbar above the fused BossSearch', () => {
      renderDrawer()
      const toolbar = document.querySelector('.d-c-toggle') as HTMLElement
      expect(toolbar).toBeTruthy()
      const search = document.querySelector('.d-search') as HTMLElement
      expect(search).toBeTruthy()
      // Toolbar must appear before the search bar in document order.
      const position = toolbar.compareDocumentPosition(search)
      expect(position & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    })

    it('defaults the cadence filter to All (All button has .on)', () => {
      renderDrawer()
      const allBtn = screen.getByRole('button', { name: /^all$/i })
      expect(allBtn.classList.contains('on')).toBe(true)
    })

    it('clicking Weekly hides daily-only families (Horntail, Mori Ranmaru)', () => {
      renderDrawer()
      const weeklyBtn = screen.getByRole('button', { name: /^weekly$/i })
      fireEvent.click(weeklyBtn)
      const rowHeaderText = screen.getAllByRole('rowheader').map((r) => r.textContent ?? '')
      expect(rowHeaderText.some((t) => t.includes(HORNTAIL_BOSS.name))).toBe(false)
      expect(rowHeaderText.some((t) => t.includes(MORI_BOSS.name))).toBe(false)
      // Weekly-only family (Black Mage) still visible.
      expect(rowHeaderText.some((t) => t.includes(BLACK_MAGE_BOSS.name))).toBe(true)
      // Mixed family (Vellum: daily + weekly) still visible.
      expect(rowHeaderText.some((t) => t.includes(VELLUM_BOSS.name))).toBe(true)
    })

    it('clicking Daily hides weekly-only families (Black Mage)', () => {
      renderDrawer()
      const dailyBtn = screen.getByRole('button', { name: /^daily$/i })
      fireEvent.click(dailyBtn)
      const rowHeaderText = screen.getAllByRole('rowheader').map((r) => r.textContent ?? '')
      expect(rowHeaderText.some((t) => t.includes(BLACK_MAGE_BOSS.name))).toBe(false)
      // Daily-only families still visible.
      expect(rowHeaderText.some((t) => t.includes(HORNTAIL_BOSS.name))).toBe(true)
      // Mixed family (Vellum) still visible.
      expect(rowHeaderText.some((t) => t.includes(VELLUM_BOSS.name))).toBe(true)
    })

    it('clicking All after a filter restores every family', () => {
      renderDrawer()
      fireEvent.click(screen.getByRole('button', { name: /^weekly$/i }))
      fireEvent.click(screen.getByRole('button', { name: /^all$/i }))
      expect(screen.getAllByRole('rowheader')).toHaveLength(bosses.length)
    })

    it('cadence filter composes with the search box', () => {
      renderDrawer()
      // Weekly filter + "vell" search → only Vellum remains.
      fireEvent.click(screen.getByRole('button', { name: /^weekly$/i }))
      fireEvent.change(getSearchInput(), { target: { value: 'vell' } })
      const rowHeaders = screen.getAllByRole('rowheader')
      expect(rowHeaders).toHaveLength(1)
      expect(rowHeaders[0].textContent).toContain(VELLUM_BOSS.name)
    })

    it('resets the cadence filter to All when the drawer opens for a different mule', () => {
      const muleA = { ...baseMule, id: 'mule-a', name: 'MuleA' }
      const muleB = { ...baseMule, id: 'mule-b', name: 'MuleB' }
      const { rerender } = renderDrawer({ mule: muleA })

      fireEvent.click(screen.getByRole('button', { name: /^weekly$/i }))
      expect(
        screen.getByRole('button', { name: /^weekly$/i }).classList.contains('on'),
      ).toBe(true)

      rerender(
        <MuleDetailDrawer
          mule={muleB}
          open={true}
          onClose={vi.fn()}
          onUpdate={vi.fn()}
          onDelete={vi.fn()}
        />,
      )

      expect(
        screen.getByRole('button', { name: /^all$/i }).classList.contains('on'),
      ).toBe(true)
      expect(
        screen.getByRole('button', { name: /^weekly$/i }).classList.contains('on'),
      ).toBe(false)
    })
  })

  describe('Weekly Count + Matrix Reset integration', () => {
    function getSearchInput() {
      return screen.getByPlaceholderText('Search bosses\u2026') as HTMLInputElement
    }

    it('renders the weekly count reflecting mule.selectedBosses', () => {
      // Two weekly selections: Hard Lucid + Normal Lucid would collide on same
      // boss — use two different families instead.
      const WILL_BOSS = bosses.find((b) => b.family === 'will')!
      const HARD_WILL = makeKey(WILL_BOSS.id, 'hard', 'weekly')
      renderDrawer({
        mule: { ...baseMule, selectedBosses: [HARD_LUCID, HARD_WILL] },
      })
      const count = screen.getByLabelText(/weekly boss selections/i)
      expect(count.textContent).toBe('2/14')
    })

    it('renders 0/14 when there are no selections', () => {
      renderDrawer()
      const count = screen.getByLabelText(/weekly boss selections/i)
      expect(count.textContent).toBe('0/14')
    })

    it('clicking Reset calls onUpdate with { selectedBosses: [] }', () => {
      const onUpdate = vi.fn()
      renderDrawer({
        mule: { ...baseMule, selectedBosses: [HARD_LUCID] },
        onUpdate,
      })
      fireEvent.click(screen.getByRole('button', { name: /^reset$/i }))
      expect(onUpdate).toHaveBeenCalledWith('test-mule-1', { selectedBosses: [] })
    })

    it('Reset leaves the Cadence Filter selection intact', () => {
      const onUpdate = vi.fn()
      renderDrawer({
        mule: { ...baseMule, selectedBosses: [HARD_LUCID] },
        onUpdate,
      })
      fireEvent.click(screen.getByRole('button', { name: /^weekly$/i }))
      fireEvent.click(screen.getByRole('button', { name: /^reset$/i }))
      expect(
        screen.getByRole('button', { name: /^weekly$/i }).classList.contains('on'),
      ).toBe(true)
    })

    it('Reset leaves the Boss Search query intact', () => {
      const onUpdate = vi.fn()
      renderDrawer({
        mule: { ...baseMule, selectedBosses: [HARD_LUCID] },
        onUpdate,
      })
      fireEvent.change(getSearchInput(), { target: { value: 'vell' } })
      expect(getSearchInput().value).toBe('vell')
      fireEvent.click(screen.getByRole('button', { name: /^reset$/i }))
      expect(getSearchInput().value).toBe('vell')
    })

    it('Reset onUpdate payload does not include filter/search/presets keys', () => {
      const onUpdate = vi.fn()
      renderDrawer({
        mule: { ...baseMule, selectedBosses: [HARD_LUCID] },
        onUpdate,
      })
      fireEvent.click(screen.getByRole('button', { name: /^reset$/i }))
      // Only selectedBosses should be updated — verify the payload shape.
      expect(onUpdate).toHaveBeenCalledTimes(1)
      const [, updates] = onUpdate.mock.calls[0]
      expect(Object.keys(updates)).toEqual(['selectedBosses'])
    })
  })

  describe('Boss Presets integration', () => {
    /** Hardest-tier key for a family slug, computed off the real boss data. */
    function hardestKey(family: string): string {
      const boss = getBossByFamily(family)!
      const diff = hardestDifficulty(boss)
      return makeKey(boss.id, diff.tier, diff.cadence)
    }

    const CRA_KEYS = PRESET_FAMILIES.CRA.map(hardestKey)
    const CTENE_KEYS = PRESET_FAMILIES.CTENE.map((entry) => presetEntryKey(entry)!)

    it('renders CRA and CTENE preset pills in the toolbar', () => {
      renderDrawer()
      expect(screen.getByRole('button', { name: /^cra$/i })).toBeTruthy()
      expect(screen.getByRole('button', { name: /^ctene$/i })).toBeTruthy()
    })

    it('clicking CRA on an empty selection calls onUpdate with all 10 CRA hardest keys', () => {
      const onUpdate = vi.fn()
      renderDrawer({ onUpdate })
      fireEvent.click(screen.getByRole('button', { name: /^cra$/i }))
      expect(onUpdate).toHaveBeenCalledTimes(1)
      const update = onUpdate.mock.calls[0][1] as { selectedBosses: string[] }
      expect(new Set(update.selectedBosses)).toEqual(new Set(CRA_KEYS))
    })

    it('clicking CRA preserves pre-existing non-CRA keys', () => {
      const onUpdate = vi.fn()
      renderDrawer({
        mule: { ...baseMule, selectedBosses: [HARD_LUCID] },
        onUpdate,
      })
      fireEvent.click(screen.getByRole('button', { name: /^cra$/i }))
      const update = onUpdate.mock.calls[0][1] as { selectedBosses: string[] }
      expect(update.selectedBosses).toContain(HARD_LUCID)
      for (const k of CRA_KEYS) {
        expect(update.selectedBosses).toContain(k)
      }
    })

    it('CRA pill is active when all 10 CRA hardest keys are selected', () => {
      renderDrawer({
        mule: { ...baseMule, selectedBosses: CRA_KEYS },
      })
      expect(
        screen.getByRole('button', { name: /^cra$/i }).classList.contains('on'),
      ).toBe(true)
    })

    it('CRA pill is not active when even one hardest key is missing', () => {
      const missingOne = CRA_KEYS.slice(0, -1)
      renderDrawer({
        mule: { ...baseMule, selectedBosses: missingOne },
      })
      expect(
        screen.getByRole('button', { name: /^cra$/i }).classList.contains('on'),
      ).toBe(false)
    })

    it('clicking CRA while active calls onUpdate with CRA keys removed', () => {
      const onUpdate = vi.fn()
      renderDrawer({
        mule: { ...baseMule, selectedBosses: CRA_KEYS },
        onUpdate,
      })
      fireEvent.click(screen.getByRole('button', { name: /^cra$/i }))
      const update = onUpdate.mock.calls[0][1] as { selectedBosses: string[] }
      expect(update.selectedBosses).toEqual([])
    })

    it('clicking CRA while active preserves non-CRA keys', () => {
      const onUpdate = vi.fn()
      renderDrawer({
        mule: { ...baseMule, selectedBosses: [...CRA_KEYS, HARD_LUCID] },
        onUpdate,
      })
      fireEvent.click(screen.getByRole('button', { name: /^cra$/i }))
      const update = onUpdate.mock.calls[0][1] as { selectedBosses: string[] }
      expect(update.selectedBosses).toEqual([HARD_LUCID])
    })

    it('toggling CRA off with both presets active removes the 10 CRA families (including overlap)', () => {
      // Helper-level contract: removePreset drops ALL families in the list,
      // including CRA ∩ CTENE. Higher-level overlap persistence (re-selecting
      // CTENE after) is an issue for the caller, not this wiring.
      const onUpdate = vi.fn()
      const both = Array.from(new Set([...CRA_KEYS, ...CTENE_KEYS]))
      renderDrawer({
        mule: { ...baseMule, selectedBosses: both },
        onUpdate,
      })
      fireEvent.click(screen.getByRole('button', { name: /^cra$/i }))
      const update = onUpdate.mock.calls[0][1] as { selectedBosses: string[] }
      const craSet: ReadonlySet<string> = new Set(PRESET_FAMILIES.CRA)
      const cteneOnlyEntries = PRESET_FAMILIES.CTENE.filter(
        (entry) => !craSet.has(presetEntryFamily(entry)),
      )
      for (const entry of cteneOnlyEntries) {
        expect(update.selectedBosses).toContain(presetEntryKey(entry)!)
      }
      for (const f of PRESET_FAMILIES.CRA) {
        expect(update.selectedBosses).not.toContain(hardestKey(f))
      }
    })

    it('clicking CTENE on empty selection calls onUpdate with 14 CTENE hardest keys', () => {
      const onUpdate = vi.fn()
      renderDrawer({ onUpdate })
      fireEvent.click(screen.getByRole('button', { name: /^ctene$/i }))
      const update = onUpdate.mock.calls[0][1] as { selectedBosses: string[] }
      expect(new Set(update.selectedBosses)).toEqual(new Set(CTENE_KEYS))
    })

    it('CTENE pill is active when all 14 CTENE hardest keys are selected', () => {
      renderDrawer({
        mule: { ...baseMule, selectedBosses: CTENE_KEYS },
      })
      expect(
        screen.getByRole('button', { name: /^ctene$/i }).classList.contains('on'),
      ).toBe(true)
    })

    it('clicking CTENE while CRA is active swaps to exactly CTENE (CRA-only families cleared)', () => {
      const onUpdate = vi.fn()
      renderDrawer({
        mule: { ...baseMule, selectedBosses: CRA_KEYS },
        onUpdate,
      })
      fireEvent.click(screen.getByRole('button', { name: /^ctene$/i }))
      expect(onUpdate).toHaveBeenCalledTimes(1)
      const update = onUpdate.mock.calls[0][1] as { selectedBosses: string[] }
      // Every CTENE resolved key is present.
      for (const k of CTENE_KEYS) {
        expect(update.selectedBosses).toContain(k)
      }
      // CRA-only families (those in CRA but not in CTENE) are gone.
      const cteneFamilies = new Set(
        PRESET_FAMILIES.CTENE.map(presetEntryFamily),
      )
      for (const f of PRESET_FAMILIES.CRA) {
        if (cteneFamilies.has(f)) continue
        expect(update.selectedBosses).not.toContain(hardestKey(f))
      }
    })

    it('clicking CRA while CTENE is active swaps to exactly CRA (CTENE-only families cleared)', () => {
      const onUpdate = vi.fn()
      renderDrawer({
        mule: { ...baseMule, selectedBosses: CTENE_KEYS },
        onUpdate,
      })
      fireEvent.click(screen.getByRole('button', { name: /^cra$/i }))
      const update = onUpdate.mock.calls[0][1] as { selectedBosses: string[] }
      for (const k of CRA_KEYS) {
        expect(update.selectedBosses).toContain(k)
      }
      const craFamilies = new Set(PRESET_FAMILIES.CRA)
      for (const entry of PRESET_FAMILIES.CTENE) {
        const family = presetEntryFamily(entry)
        if (craFamilies.has(family)) continue
        expect(update.selectedBosses).not.toContain(presetEntryKey(entry)!)
      }
    })

    it('clicking the currently active preset deselects it (no pill active)', () => {
      const onUpdate = vi.fn()
      renderDrawer({
        mule: { ...baseMule, selectedBosses: CRA_KEYS },
        onUpdate,
      })
      fireEvent.click(screen.getByRole('button', { name: /^cra$/i }))
      const update = onUpdate.mock.calls[0][1] as { selectedBosses: string[] }
      // No CRA family key survives.
      for (const f of PRESET_FAMILIES.CRA) {
        expect(update.selectedBosses).not.toContain(hardestKey(f))
      }
      // No CTENE family key is spuriously added.
      for (const k of CTENE_KEYS) {
        expect(update.selectedBosses).not.toContain(k)
      }
    })

    it('hand-picked non-preset keys survive a CRA→CTENE swap', () => {
      const onUpdate = vi.fn()
      // HARD_LUCID's family (lucid) is in CTENE, so pick a non-preset family
      // instead — Horntail is in neither CRA nor CTENE.
      const HARD_HORNTAIL = makeKey(HORNTAIL_BOSS.id, 'chaos', 'daily')
      renderDrawer({
        mule: { ...baseMule, selectedBosses: [...CRA_KEYS, HARD_HORNTAIL] },
        onUpdate,
      })
      fireEvent.click(screen.getByRole('button', { name: /^ctene$/i }))
      const update = onUpdate.mock.calls[0][1] as { selectedBosses: string[] }
      expect(update.selectedBosses).toContain(HARD_HORNTAIL)
    })

    it('hand-picked non-preset keys survive a CTENE→deselect click', () => {
      const onUpdate = vi.fn()
      const HARD_HORNTAIL = makeKey(HORNTAIL_BOSS.id, 'chaos', 'daily')
      renderDrawer({
        mule: { ...baseMule, selectedBosses: [...CTENE_KEYS, HARD_HORNTAIL] },
        onUpdate,
      })
      fireEvent.click(screen.getByRole('button', { name: /^ctene$/i }))
      const update = onUpdate.mock.calls[0][1] as { selectedBosses: string[] }
      expect(update.selectedBosses).toContain(HARD_HORNTAIL)
    })

    it('the union state is unreachable via the pill-click flow (no sequence produces two active pills)', () => {
      // Simulate the real drawer pipeline: each click's onUpdate payload
      // becomes the next render's selectedBosses. Exercise both orderings
      // (CRA→CTENE and CTENE→CRA) and assert the resulting state is never
      // a union where both pills light up.
      for (const order of [
        ['cra', 'ctene'],
        ['ctene', 'cra'],
      ] as const) {
        let selectedBosses: string[] = []
        const onUpdate = vi.fn((_id: string, upd: { selectedBosses?: string[] }) => {
          if (upd.selectedBosses !== undefined) selectedBosses = upd.selectedBosses
        })
        const { rerender } = renderDrawer({
          mule: { ...baseMule, selectedBosses },
          onUpdate,
        })
        for (const which of order) {
          fireEvent.click(screen.getByRole('button', { name: new RegExp(`^${which}$`, 'i') }))
          rerender(
            <MuleDetailDrawer
              mule={{ ...baseMule, selectedBosses }}
              open={true}
              onClose={vi.fn()}
              onUpdate={onUpdate}
              onDelete={vi.fn()}
            />,
          )
        }
        const craActive = screen
          .getByRole('button', { name: /^cra$/i })
          .classList.contains('on')
        const cteneActive = screen
          .getByRole('button', { name: /^ctene$/i })
          .classList.contains('on')
        expect(craActive && cteneActive).toBe(false)
      }
    })
  })
})
