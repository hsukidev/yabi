import { describe, expect, it, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'

import { MantineProvider } from '@mantine/core'
import { MuleDetailDrawer } from '../MuleDetailDrawer'
import type { Mule } from '../../types'

const baseMule: Mule = {
  id: 'test-mule-1',
  name: 'TestMule',
  level: 200,
  muleClass: 'Hero',
  selectedBosses: [],
}

function renderDrawer(overrides: Partial<Parameters<typeof MuleDetailDrawer>[0]> = {}) {
  const props = {
    mule: baseMule,
    open: true,
    onClose: vi.fn(),
    onUpdate: vi.fn(),
    onDelete: vi.fn(),
    ...overrides,
  }
  return {
    ...render(
      <MantineProvider defaultColorScheme="dark">
        <MuleDetailDrawer {...props} />
      </MantineProvider>
    ),
    props,
  }
}

describe('MuleDetailDrawer', () => {
  it('renders drawer content when open with a mule', () => {
    renderDrawer()
    expect(screen.getByText('TestMule')).toBeTruthy()
  })

  it('does not render content when mule is null', () => {
    renderDrawer({ mule: null })
    expect(screen.queryByText('TestMule')).toBeNull()
  })

  it('calls onClose when the close button is clicked', () => {
    const onClose = vi.fn()
    renderDrawer({ onClose })
    const closeButton = document.querySelector('[data-close]')
    if (closeButton) {
      fireEvent.click(closeButton)
      expect(onClose).toHaveBeenCalled()
    }
  })
})