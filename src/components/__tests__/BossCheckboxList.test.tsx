import { describe, expect, it, vi } from 'vitest'
import { render, screen, fireEvent } from '@/test/test-utils'
import { BossCheckboxList } from '../BossCheckboxList'

function renderList(selectedBosses: string[] = [], onChange = vi.fn(), abbreviated?: boolean) {
  const props: React.ComponentProps<typeof BossCheckboxList> = { selectedBosses, onChange }
  if (abbreviated !== undefined) props.abbreviated = abbreviated
  return {
    ...render(<BossCheckboxList {...props} />),
    onChange,
  }
}

describe('BossCheckboxList', () => {
  it('calls onChange with toggleBoss result when a checkbox is clicked', () => {
    const onChange = vi.fn()
    renderList([], onChange)

    const checkbox = screen.getByRole('checkbox', { name: /Hard Lucid/i })
    fireEvent.click(checkbox)
    expect(onChange).toHaveBeenCalledWith(['hard-lucid'])
  })

  it('calls onChange with toggleBoss for deselect', () => {
    const onChange = vi.fn()
    renderList(['hard-lucid'], onChange)

    const checkbox = screen.getByRole('checkbox', { name: /Hard Lucid/i })
    fireEvent.click(checkbox)
    expect(onChange).toHaveBeenCalledWith([])
  })

  it('calls onChange with toggleBoss for auto-replace in same family', () => {
    const onChange = vi.fn()
    renderList(['normal-lucid'], onChange)

    const checkbox = screen.getByRole('checkbox', { name: /Hard Lucid/i })
    fireEvent.click(checkbox)
    expect(onChange).toHaveBeenCalledWith(['hard-lucid'])
  })

  it('renders checkboxes with selected state from FamilyView', () => {
    renderList(['hard-lucid'])

    const hardCheckbox = screen.getByRole('checkbox', { name: /Hard Lucid/i })
    const normalCheckbox = screen.getByRole('checkbox', { name: /Normal Lucid/i })
    expect(hardCheckbox.getAttribute('aria-checked')).toBe('true')
    expect(normalCheckbox.getAttribute('aria-checked')).toBe('false')
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

  it('shows abbreviated values by default', () => {
    renderList()
    expect(screen.getByText(/504M/)).toBeTruthy()
  })

  it('shows full number values when abbreviated is false', () => {
    renderList([], vi.fn(), false)
    expect(screen.getByText(/504,000,000/)).toBeTruthy()
  })
})
