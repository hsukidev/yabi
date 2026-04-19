import { describe, expect, it, vi } from 'vitest'
import { render, screen, fireEvent } from '@/test/test-utils'
import { BossMatrix } from '../BossMatrix'
import { bosses } from '../../data/bosses'
import { makeKey, TIER_ORDER } from '../../data/bossSelection'
import { formatMeso } from '../../utils/meso'

const LUCID_BOSS = bosses.find((b) => b.family === 'lucid')!
const LUCID = LUCID_BOSS.id
const HARD_LUCID = makeKey(LUCID, 'hard')
const NORMAL_LUCID = makeKey(LUCID, 'normal')
const LUCID_HARD_VALUE = LUCID_BOSS.difficulty.find((d) => d.tier === 'hard')!.crystalValue

const BLACK_MAGE_BOSS = bosses.find((b) => b.family === 'black-mage')!
const BLACK_MAGE = BLACK_MAGE_BOSS.id
const BLACK_MAGE_EXTREME_VALUE = BLACK_MAGE_BOSS.difficulty.find((d) => d.tier === 'extreme')!.crystalValue
const AKECHI = bosses.find((b) => b.family === 'akechi-mitsuhide')!.id

const HORNTAIL_BOSS = bosses.find((b) => b.family === 'horntail')!
const HORNTAIL = HORNTAIL_BOSS.id

const VELLUM_BOSS = bosses.find((b) => b.family === 'vellum')!
const VELLUM = VELLUM_BOSS.id
const VELLUM_NORMAL_VALUE = VELLUM_BOSS.difficulty.find((d) => d.tier === 'normal')!.crystalValue
const VELLUM_CHAOS_VALUE = VELLUM_BOSS.difficulty.find((d) => d.tier === 'chaos')!.crystalValue

const DAILY_ONLY_FAMILIES = ['horntail', 'von-leon', 'arkarium', 'mori-ranmaru', 'omni-cln']
const BOSSES_WITH_WEEKLY_TIER_COUNT = bosses.filter((b) =>
  b.difficulty.some((d) => d.cadence === 'weekly'),
).length

function renderMatrix(
  selectedKeys: string[] = [],
  onToggleKey = vi.fn(),
  partySizes: Record<string, number> = {},
  onChangePartySize = vi.fn(),
) {
  return {
    ...render(
      <BossMatrix
        selectedKeys={selectedKeys}
        onToggleKey={onToggleKey}
        partySizes={partySizes}
        onChangePartySize={onChangePartySize}
      />,
    ),
    onToggleKey,
    onChangePartySize,
  }
}

describe('BossMatrix', () => {
  describe('structure', () => {
    it('renders one row per family', () => {
      renderMatrix()
      const rows = screen.getAllByRole('row')
      // One header row + one row per family (bosses.length families).
      expect(rows).toHaveLength(bosses.length + 1)
    })

    it('renders a header row with a Boss Family label and 5 tier columns', () => {
      renderMatrix()
      expect(screen.getByText('Boss Family')).toBeTruthy()
      for (const tier of TIER_ORDER) {
        const header = screen.getByRole('columnheader', {
          name: new RegExp(tier, 'i'),
        })
        expect(header).toBeTruthy()
      }
    })

    it('orders tier columns left-to-right as Extreme, Chaos, Hard, Normal, Easy', () => {
      renderMatrix()
      const tierHeaders = screen
        .getAllByRole('columnheader')
        .filter((h) => h.getAttribute('aria-label'))
        .map((h) => h.getAttribute('aria-label'))
      expect(tierHeaders).toEqual(['Extreme', 'Chaos', 'Hard', 'Normal', 'Easy'])
    })

    it('renders one DiffPip color strip per tier column in the header', () => {
      renderMatrix()
      for (const tier of TIER_ORDER) {
        const pip = document.querySelector(`[data-difficulty-pip="${tier}"]`)
        expect(pip).toBeTruthy()
      }
    })

    it('renders each family row with its display name in the leftmost cell', () => {
      renderMatrix()
      const names = screen.getAllByRole('rowheader').map((r) => r.textContent ?? '')
      expect(names.some((n) => n.includes('Black Mage'))).toBe(true)
      expect(names.some((n) => n.includes('Lucid'))).toBe(true)
      expect(names.some((n) => n.includes('Akechi Mitsuhide'))).toBe(true)
    })

    it('sorts family rows by top-tier crystalValue descending (Black Mage first)', () => {
      renderMatrix()
      const rowHeaders = screen.getAllByRole('rowheader')
      expect(rowHeaders[0].textContent).toContain('Black Mage')
    })

  })

  describe('empty cells', () => {
    it('renders a dashed — for a tier the family does not offer', () => {
      renderMatrix()
      // Black Mage has no easy / normal / chaos tiers.
      const cell = screen.getByTestId(`matrix-cell-${BLACK_MAGE}-easy`)
      expect(cell.textContent).toBe('—')
    })

    it('empty cells are non-interactive (no click handler fires)', () => {
      const onToggleKey = vi.fn()
      renderMatrix([], onToggleKey)
      const cell = screen.getByTestId(`matrix-cell-${BLACK_MAGE}-easy`)
      fireEvent.click(cell)
      expect(onToggleKey).not.toHaveBeenCalled()
    })

    it('empty cells do not dim their whole box (borders stay at full strength)', () => {
      renderMatrix()
      const cell = screen.getByTestId(`matrix-cell-${BLACK_MAGE}-easy`) as HTMLElement
      expect(cell.style.opacity).not.toBe('0.3')
    })
  })

  describe('populated cells', () => {
    it('renders formatMeso(crystalValue, true) as the cell value', () => {
      renderMatrix()
      const cell = screen.getByTestId(`matrix-cell-${BLACK_MAGE}-extreme`)
      // 18,000,000,000 → "18B"
      expect(cell.textContent).toContain('18B')
    })

    it('clicking a populated cell calls onToggleKey with <uuid>:<tier>', () => {
      const onToggleKey = vi.fn()
      renderMatrix([], onToggleKey)
      const cell = screen.getByTestId(`matrix-cell-${LUCID}-hard`)
      fireEvent.click(cell)
      expect(onToggleKey).toHaveBeenCalledWith(HARD_LUCID)
    })

    it('tier-less families (Akechi) render a single populated cell at normal', () => {
      const onToggleKey = vi.fn()
      renderMatrix([], onToggleKey)
      const normalCell = screen.getByTestId(`matrix-cell-${AKECHI}-normal`)
      fireEvent.click(normalCell)
      expect(onToggleKey).toHaveBeenCalledWith(makeKey(AKECHI, 'normal'))
    })
  })

  describe('selected styling', () => {
    it('marks the selected cell with data-state="on"', () => {
      renderMatrix([HARD_LUCID])
      const cell = screen.getByTestId(`matrix-cell-${LUCID}-hard`)
      expect(cell.getAttribute('data-state')).toBe('on')
    })

    it('does not mark other families as selected', () => {
      renderMatrix([HARD_LUCID])
      const cell = screen.getByTestId(`matrix-cell-${BLACK_MAGE}-extreme`)
      expect(cell.getAttribute('data-state')).not.toBe('on')
    })

    it('selected cells do not add an inset ring (keeps grid borders uniform)', () => {
      renderMatrix([HARD_LUCID])
      const selected = screen.getByTestId(`matrix-cell-${LUCID}-hard`)
      expect(selected.className).not.toMatch(/\bring-\S+/)
    })
  })

  describe('dim sibling styling', () => {
    it('marks other populated tier cells in the same family with data-dim="true"', () => {
      renderMatrix([HARD_LUCID])
      const normalCell = screen.getByTestId(`matrix-cell-${LUCID}-normal`)
      const easyCell = screen.getByTestId(`matrix-cell-${LUCID}-easy`)
      expect(normalCell.getAttribute('data-dim')).toBe('true')
      expect(easyCell.getAttribute('data-dim')).toBe('true')
    })

    it('does not dim cells in other families', () => {
      renderMatrix([HARD_LUCID])
      const blackMageHard = screen.getByTestId(`matrix-cell-${BLACK_MAGE}-hard`)
      expect(blackMageHard.getAttribute('data-dim')).not.toBe('true')
    })

    it('does not dim the selected cell itself', () => {
      renderMatrix([HARD_LUCID])
      const selected = screen.getByTestId(`matrix-cell-${LUCID}-hard`)
      expect(selected.getAttribute('data-dim')).not.toBe('true')
    })

    it('does not dim any cells when nothing is selected', () => {
      renderMatrix([])
      const cell = screen.getByTestId(`matrix-cell-${LUCID}-hard`)
      expect(cell.getAttribute('data-dim')).not.toBe('true')
    })

    it('dim sibling cells do not dim their whole box (borders stay at full strength)', () => {
      renderMatrix([HARD_LUCID])
      const sibling = screen.getByTestId(`matrix-cell-${LUCID}-normal`) as HTMLElement
      expect(sibling.style.opacity).toBe('')
    })
  })

  describe('interaction regression', () => {
    it('clicking a sibling tier sends the new key (swap is handled upstream)', () => {
      const onToggleKey = vi.fn()
      renderMatrix([NORMAL_LUCID], onToggleKey)
      const hardCell = screen.getByTestId(`matrix-cell-${LUCID}-hard`)
      fireEvent.click(hardCell)
      expect(onToggleKey).toHaveBeenCalledWith(HARD_LUCID)
    })

    it('clicking the currently-selected cell again sends the same key (clear handled upstream)', () => {
      const onToggleKey = vi.fn()
      renderMatrix([HARD_LUCID], onToggleKey)
      const hardCell = screen.getByTestId(`matrix-cell-${LUCID}-hard`)
      fireEvent.click(hardCell)
      expect(onToggleKey).toHaveBeenCalledWith(HARD_LUCID)
    })
  })

  describe('family cell layout', () => {
    it('renders boss name before the party stepper in DOM order (stacked)', () => {
      renderMatrix()
      const rowHeader = screen
        .getAllByRole('rowheader')
        .find((r) => r.textContent?.includes('Lucid'))!
      const nameEl = rowHeader.querySelector('[data-testid="family-name"]')!
      const stepper = rowHeader.querySelector(
        `[data-testid^="party-stepper-"]`,
      )!
      expect(nameEl).toBeTruthy()
      expect(stepper).toBeTruthy()
      // compareDocumentPosition: FOLLOWING means stepper is after nameEl
      expect(
        nameEl.compareDocumentPosition(stepper) &
          Node.DOCUMENT_POSITION_FOLLOWING,
      ).toBeTruthy()
    })
  })

  describe('party stepper', () => {
    it('renders a Party label per family row that has at least one weekly tier', () => {
      renderMatrix()
      const labels = screen.getAllByText('Party')
      expect(labels.length).toBe(BOSSES_WITH_WEEKLY_TIER_COUNT)
    })

    it('renders a party stepper per family showing "1" when partySizes is absent', () => {
      renderMatrix()
      const stepper = screen.getByTestId(`party-stepper-${LUCID_BOSS.family}`)
      expect(stepper.textContent).toContain('1')
    })

    it('uses the provided partySizes value when present', () => {
      renderMatrix([], vi.fn(), { [LUCID_BOSS.family]: 3 })
      const stepper = screen.getByTestId(`party-stepper-${LUCID_BOSS.family}`)
      expect(stepper.textContent).toContain('3')
    })

    it('clicking + calls onChangePartySize with value + 1', () => {
      const onChangePartySize = vi.fn()
      renderMatrix([], vi.fn(), { [LUCID_BOSS.family]: 2 }, onChangePartySize)
      const incBtn = screen.getByTestId(`party-inc-${LUCID_BOSS.family}`)
      fireEvent.click(incBtn)
      expect(onChangePartySize).toHaveBeenCalledWith(LUCID_BOSS.family, 3)
    })

    it('clicking − calls onChangePartySize with value − 1', () => {
      const onChangePartySize = vi.fn()
      renderMatrix([], vi.fn(), { [LUCID_BOSS.family]: 3 }, onChangePartySize)
      const decBtn = screen.getByTestId(`party-dec-${LUCID_BOSS.family}`)
      fireEvent.click(decBtn)
      expect(onChangePartySize).toHaveBeenCalledWith(LUCID_BOSS.family, 2)
    })

    it('does not call onChangePartySize below 1 (clamped to 1 min)', () => {
      const onChangePartySize = vi.fn()
      renderMatrix([], vi.fn(), { [LUCID_BOSS.family]: 1 }, onChangePartySize)
      const decBtn = screen.getByTestId(`party-dec-${LUCID_BOSS.family}`)
      fireEvent.click(decBtn)
      expect(onChangePartySize).not.toHaveBeenCalled()
    })

    it('does not call onChangePartySize above 6 (clamped to 6 max)', () => {
      const onChangePartySize = vi.fn()
      renderMatrix([], vi.fn(), { [LUCID_BOSS.family]: 6 }, onChangePartySize)
      const incBtn = screen.getByTestId(`party-inc-${LUCID_BOSS.family}`)
      fireEvent.click(incBtn)
      expect(onChangePartySize).not.toHaveBeenCalled()
    })

    it('clicking the + button does NOT toggle the cell (event propagation stopped)', () => {
      const onToggleKey = vi.fn()
      const onChangePartySize = vi.fn()
      renderMatrix([], onToggleKey, { [LUCID_BOSS.family]: 2 }, onChangePartySize)
      const incBtn = screen.getByTestId(`party-inc-${LUCID_BOSS.family}`)
      fireEvent.click(incBtn)
      expect(onChangePartySize).toHaveBeenCalledTimes(1)
      expect(onToggleKey).not.toHaveBeenCalled()
    })

    it('clicking the − button does NOT toggle the cell (event propagation stopped)', () => {
      const onToggleKey = vi.fn()
      const onChangePartySize = vi.fn()
      renderMatrix([], onToggleKey, { [LUCID_BOSS.family]: 3 }, onChangePartySize)
      const decBtn = screen.getByTestId(`party-dec-${LUCID_BOSS.family}`)
      fireEvent.click(decBtn)
      expect(onChangePartySize).toHaveBeenCalledTimes(1)
      expect(onToggleKey).not.toHaveBeenCalled()
    })
  })

  describe('party-size division', () => {
    it('shows the full crystalValue in cells when partySize is 1 (default)', () => {
      renderMatrix()
      const cell = screen.getByTestId(`matrix-cell-${BLACK_MAGE}-extreme`)
      expect(cell.textContent).toBe(formatMeso(BLACK_MAGE_EXTREME_VALUE, true))
    })

    it('divides the displayed meso value by the family party size', () => {
      renderMatrix([], vi.fn(), { [LUCID_BOSS.family]: 2 })
      const cell = screen.getByTestId(`matrix-cell-${LUCID}-hard`)
      expect(cell.textContent).toBe(formatMeso(LUCID_HARD_VALUE / 2, true))
    })

    it('cells do not contain any "÷N" hint', () => {
      renderMatrix([], vi.fn(), { [LUCID_BOSS.family]: 2 })
      const cell = screen.getByTestId(`matrix-cell-${LUCID}-hard`)
      expect(cell.textContent).not.toContain('÷')
    })

    it('party size for one family does not affect another family', () => {
      renderMatrix([], vi.fn(), { [LUCID_BOSS.family]: 4 })
      const cell = screen.getByTestId(`matrix-cell-${BLACK_MAGE}-extreme`)
      expect(cell.textContent).toBe(formatMeso(BLACK_MAGE_EXTREME_VALUE, true))
    })
  })

  describe('cadence-aware party stepper visibility', () => {
    it.each(DAILY_ONLY_FAMILIES)(
      'omits the party stepper for daily-only family %s',
      (family) => {
        renderMatrix()
        expect(
          screen.queryByTestId(`party-stepper-${family}`),
        ).toBeNull()
      },
    )

    it('keeps the party stepper on mixed-cadence bosses (Vellum)', () => {
      renderMatrix()
      expect(
        screen.getByTestId(`party-stepper-${VELLUM_BOSS.family}`),
      ).toBeTruthy()
    })

    it('keeps the party stepper on weekly-only bosses (Black Mage)', () => {
      renderMatrix()
      expect(
        screen.getByTestId(`party-stepper-${BLACK_MAGE_BOSS.family}`),
      ).toBeTruthy()
    })

    it('daily-only rows still render with the same tier column layout as other rows', () => {
      renderMatrix()
      const horntailRow = screen
        .getByTestId(`matrix-cell-${HORNTAIL}-easy`)
        .closest('[role="row"]') as HTMLElement
      const lucidRow = screen
        .getByTestId(`matrix-cell-${LUCID}-easy`)
        .closest('[role="row"]') as HTMLElement
      expect(horntailRow.style.gridTemplateColumns).toBe(
        lucidRow.style.gridTemplateColumns,
      )
    })
  })

  describe('cadence-aware cell displays', () => {
    it('weekly cells on a mixed boss (Chaos Vellum) divide by party size', () => {
      renderMatrix([], vi.fn(), { [VELLUM_BOSS.family]: 3 })
      const chaosCell = screen.getByTestId(`matrix-cell-${VELLUM}-chaos`)
      expect(chaosCell.textContent).toBe(
        formatMeso(VELLUM_CHAOS_VALUE / 3, true),
      )
    })

    it('daily cells on a mixed boss (Normal Vellum) ignore party size', () => {
      renderMatrix([], vi.fn(), { [VELLUM_BOSS.family]: 3 })
      const normalCell = screen.getByTestId(`matrix-cell-${VELLUM}-normal`)
      expect(normalCell.textContent).toBe(formatMeso(VELLUM_NORMAL_VALUE, true))
    })

    it('changing party size from 1 to 3 updates only the weekly-tier cell display', () => {
      const { rerender } = renderMatrix([], vi.fn(), {
        [VELLUM_BOSS.family]: 1,
      })
      const chaosAt1 = screen.getByTestId(`matrix-cell-${VELLUM}-chaos`)
        .textContent
      const normalAt1 = screen.getByTestId(`matrix-cell-${VELLUM}-normal`)
        .textContent

      rerender(
        <BossMatrix
          selectedKeys={[]}
          onToggleKey={vi.fn()}
          partySizes={{ [VELLUM_BOSS.family]: 3 }}
          onChangePartySize={vi.fn()}
        />,
      )

      const chaosAt3 = screen.getByTestId(`matrix-cell-${VELLUM}-chaos`)
        .textContent
      const normalAt3 = screen.getByTestId(`matrix-cell-${VELLUM}-normal`)
        .textContent

      expect(chaosAt3).not.toBe(chaosAt1)
      expect(chaosAt3).toBe(formatMeso(VELLUM_CHAOS_VALUE / 3, true))
      expect(normalAt3).toBe(normalAt1)
      expect(normalAt3).toBe(formatMeso(VELLUM_NORMAL_VALUE, true))
    })

    it.each(['easy', 'normal', 'chaos'] as const)(
      'daily-only boss cells (Horntail %s) ignore party size even if a size is set',
      (tier) => {
        renderMatrix([], vi.fn(), { [HORNTAIL_BOSS.family]: 4 })
        const cell = screen.getByTestId(`matrix-cell-${HORNTAIL}-${tier}`)
        const diff = HORNTAIL_BOSS.difficulty.find((d) => d.tier === tier)!
        expect(cell.textContent).toBe(formatMeso(diff.crystalValue, true))
      },
    )
  })
})
