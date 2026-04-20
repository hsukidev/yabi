import { describe, expect, it, vi } from 'vitest'
import { render, screen, fireEvent } from '../../test/test-utils'
import { DensityProvider } from '../../context/DensityProvider'
import { RosterHeader } from '../RosterHeader'

function renderHeader(overrides: Partial<Parameters<typeof RosterHeader>[0]> = {}) {
  const props = {
    muleCount: 3,
    bulkMode: false,
    selectedCount: 0,
    onEnterBulk: vi.fn(),
    onCancel: vi.fn(),
    onDelete: vi.fn(),
    ...overrides,
  }
  return {
    ...render(
      <DensityProvider>
        <RosterHeader {...props} />
      </DensityProvider>,
    ),
    props,
  }
}

describe('RosterHeader', () => {
  describe('default state', () => {
    it('renders the Roster heading', () => {
      renderHeader()
      expect(screen.getByRole('heading', { name: /roster/i })).toBeTruthy()
    })

    it('shows the mule count in MULES', () => {
      renderHeader({ muleCount: 3 })
      expect(screen.getByText(/3\s*MULES/i)).toBeTruthy()
    })

    it('uses singular MULE for one mule', () => {
      renderHeader({ muleCount: 1 })
      expect(screen.getByText(/1\s*MULE\b/i)).toBeTruthy()
    })

    it('renders the Bulk Trash Icon button (visible at every breakpoint)', () => {
      renderHeader()
      const btn = screen.getByRole('button', { name: /bulk.*delete|delete.*mode|bulk.*trash/i })
      expect(btn).toBeTruthy()
      // Should not carry a responsive-hidden class like hidden/sm:hidden
      expect(btn.className).not.toMatch(/\bhidden\b/)
    })

    it('calls onEnterBulk when the Bulk Trash Icon is clicked', () => {
      const { props } = renderHeader()
      const btn = screen.getByRole('button', { name: /bulk.*delete|delete.*mode|bulk.*trash/i })
      fireEvent.click(btn)
      expect(props.onEnterBulk).toHaveBeenCalled()
    })

    it('does not render the Bulk Trash Icon when there are no mules', () => {
      renderHeader({ muleCount: 0 })
      expect(
        screen.queryByRole('button', { name: /bulk.*delete|delete.*mode|bulk.*trash/i }),
      ).toBeNull()
    })

    it('does not render the Bulk Action Bar in default state', () => {
      renderHeader()
      expect(screen.queryByText(/select mules to delete/i)).toBeNull()
      expect(screen.queryByRole('button', { name: /^cancel$/i })).toBeNull()
    })
  })

  describe('bulk state', () => {
    it('renders the bulk title "Select mules to delete"', () => {
      renderHeader({ bulkMode: true })
      expect(screen.getByText(/select mules to delete/i)).toBeTruthy()
    })

    it('renders the Bulk Selection Pill with 0 SELECTED when no cards marked', () => {
      renderHeader({ bulkMode: true, selectedCount: 0 })
      expect(screen.getByText(/0\s*SELECTED/i)).toBeTruthy()
    })

    it('updates the Bulk Selection Pill to reflect the selected count', () => {
      renderHeader({ bulkMode: true, selectedCount: 5 })
      expect(screen.getByText(/5\s*SELECTED/i)).toBeTruthy()
    })

    it('renders a Bulk Pulse Dot using the bulk-pulse animation', () => {
      const { container } = renderHeader({ bulkMode: true })
      const dot = container.querySelector('[data-bulk-pulse-dot]') as HTMLElement
      expect(dot).toBeTruthy()
      // bulk-pulse keyframe is configured via inline animation or class
      const animation = dot.style.animation || getComputedStyle(dot).animation
      expect(animation).toContain('bulk-pulse')
    })

    it('applies the bulk-slide animation to the Bulk Action Bar wrapper', () => {
      const { container } = renderHeader({ bulkMode: true })
      const bar = container.querySelector('[data-bulk-action-bar]') as HTMLElement
      expect(bar).toBeTruthy()
      const animation = bar.style.animation || getComputedStyle(bar).animation
      expect(animation).toContain('bulk-slide')
    })

    it('renders a Bulk Cancel button', () => {
      renderHeader({ bulkMode: true })
      expect(screen.getByRole('button', { name: /^cancel$/i })).toBeTruthy()
    })

    it('calls onCancel when Bulk Cancel is clicked', () => {
      const { props } = renderHeader({ bulkMode: true, selectedCount: 2 })
      fireEvent.click(screen.getByRole('button', { name: /^cancel$/i }))
      expect(props.onCancel).toHaveBeenCalled()
    })

    it('renders a disabled Bulk Confirm reading "Delete" at 0 selected', () => {
      renderHeader({ bulkMode: true, selectedCount: 0 })
      const btn = screen.getByRole('button', { name: /^delete$/i }) as HTMLButtonElement
      expect(btn.disabled).toBe(true)
    })

    it('renders an enabled Bulk Confirm reading "Delete N" when N > 0', () => {
      renderHeader({ bulkMode: true, selectedCount: 3 })
      const btn = screen.getByRole('button', { name: /delete\s*3/i }) as HTMLButtonElement
      expect(btn.disabled).toBe(false)
    })

    it('calls onDelete when Bulk Confirm is clicked with a selection', () => {
      const { props } = renderHeader({ bulkMode: true, selectedCount: 2 })
      fireEvent.click(screen.getByRole('button', { name: /delete\s*2/i }))
      expect(props.onDelete).toHaveBeenCalled()
    })

    it('does not render the default Roster heading in bulk mode', () => {
      renderHeader({ bulkMode: true })
      expect(screen.queryByRole('heading', { name: /roster/i })).toBeNull()
    })

    it('does not render the Bulk Trash Icon in bulk mode', () => {
      renderHeader({ bulkMode: true })
      expect(screen.queryByRole('button', { name: /bulk.*trash/i })).toBeNull()
    })

    it('uses the --destructive token for the pulse dot background (no #e05040)', () => {
      const { container } = renderHeader({ bulkMode: true })
      const dot = container.querySelector('[data-bulk-pulse-dot]') as HTMLElement
      expect(dot.style.background.toLowerCase()).not.toContain('#e05040')
      expect(dot.style.background).toContain('destructive')
    })
  })
})
