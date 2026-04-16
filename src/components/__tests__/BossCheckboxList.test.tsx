import { describe, expect, it, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MantineProvider } from '@mantine/core'
import { BossCheckboxList } from '../BossCheckboxList'

function renderList(selectedBosses: string[] = [], onChange = vi.fn()) {
  return {
    ...render(
      <MantineProvider defaultColorScheme="dark">
        <BossCheckboxList selectedBosses={selectedBosses} onChange={onChange} />
      </MantineProvider>,
    ),
    onChange,
  }
}

describe('BossCheckboxList', () => {
  it('calls onChange with toggleBoss result when a checkbox is clicked', () => {
    const onChange = vi.fn()
    renderList([], onChange)

    const checkbox = screen.getByLabelText(/Hard Lucid/i)
    fireEvent.click(checkbox)
    expect(onChange).toHaveBeenCalledWith(['hard-lucid'])
  })

  it('calls onChange with toggleBoss for deselect', () => {
    const onChange = vi.fn()
    renderList(['hard-lucid'], onChange)

    const checkbox = screen.getByLabelText(/Hard Lucid/i)
    fireEvent.click(checkbox)
    expect(onChange).toHaveBeenCalledWith([])
  })

  it('calls onChange with toggleBoss for auto-replace in same family', () => {
    const onChange = vi.fn()
    renderList(['normal-lucid'], onChange)

    const checkbox = screen.getByLabelText(/Hard Lucid/i)
    fireEvent.click(checkbox)
    expect(onChange).toHaveBeenCalledWith(['hard-lucid'])
  })

  it('renders checkboxes with selected state from FamilyView', () => {
    renderList(['hard-lucid'])

    const hardCheckbox = screen.getByLabelText(/Hard Lucid/i) as HTMLInputElement
    const normalCheckbox = screen.getByLabelText(/Normal Lucid/i) as HTMLInputElement
    expect(hardCheckbox.checked).toBe(true)
    expect(normalCheckbox.checked).toBe(false)
  })

  it('filters families by search', () => {
    renderList()

    const searchInput = screen.getByPlaceholderText('Search bosses...')
    fireEvent.change(searchInput, { target: { value: 'lucid' } })

    expect(screen.getByText('Lucid')).toBeTruthy()
    expect(screen.queryByText('Will')).toBeNull()
  })

  it('shows no bosses found when search matches nothing', () => {
    renderList()

    const searchInput = screen.getByPlaceholderText('Search bosses...')
    fireEvent.change(searchInput, { target: { value: 'zzzzzzz' } })

    expect(screen.getByText('No bosses found')).toBeTruthy()
  })

  it('displays family displayName without difficulty prefix', () => {
    renderList()
    expect(screen.getByText('Lucid')).toBeTruthy()
  })

  it('uses formatMeso for crystal value labels', () => {
    renderList()
    expect(screen.getByText(/504M/)).toBeTruthy()
  })
})