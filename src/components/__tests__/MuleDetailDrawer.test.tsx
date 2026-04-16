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

  it('calls onClose when the close button is clicked', async () => {
    const onClose = vi.fn()
    renderDrawer({ onClose })
    const closeButton = screen.getByRole('button', { name: /close/i })
    fireEvent.click(closeButton)
    await waitFor(() => {
      expect(onClose).toHaveBeenCalled()
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
