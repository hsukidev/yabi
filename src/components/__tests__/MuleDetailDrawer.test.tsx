import { describe, expect, it, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@/test/test-utils'

import { MuleDetailDrawer } from '../MuleDetailDrawer'
import type { Mule } from '../../types'

vi.mock('../BossCheckboxList', () => ({
  BossCheckboxList: () => <div data-testid="boss-checkbox-list" />,
}))

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

  it('renders abbreviated income by default', () => {
    renderDrawer({ mule: { ...baseMule, selectedBosses: ['hard-lucid'] } })
    expect(screen.getByText(/504M.*\/week/)).toBeTruthy()
  })

  it('renders full income when abbreviated is false', () => {
    renderDrawer(
      { mule: { ...baseMule, selectedBosses: ['hard-lucid'] } },
      { defaultAbbreviated: false },
    )
    expect(screen.getByText(/504,000,000.*\/week/)).toBeTruthy()
  })
})
