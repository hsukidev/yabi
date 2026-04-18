import { describe, expect, it, vi } from 'vitest'
import { render, screen, fireEvent } from '@/test/test-utils'
import { BossCheckboxList } from '../BossCheckboxList'
import { bosses } from '../../data/bosses'
import { makeKey } from '../../data/bossSelection'

const LUCID = bosses.find((b) => b.family === 'lucid')!.id
const HARD_LUCID = makeKey(LUCID, 'hard')
const NORMAL_LUCID = makeKey(LUCID, 'normal')

function renderList(selectedBosses: string[] = [], onChange = vi.fn(), abbreviated?: boolean) {
  return {
    ...render(
      <BossCheckboxList selectedBosses={selectedBosses} onChange={onChange} />,
      abbreviated !== undefined ? { defaultAbbreviated: abbreviated } : undefined,
    ),
    onChange,
  }
}

describe('BossCheckboxList', () => {
  it('calls onChange with toggleBoss result when a checkbox is clicked', () => {
    const onChange = vi.fn()
    renderList([], onChange)

    const checkbox = screen.getByRole('checkbox', { name: /Hard Lucid/i })
    fireEvent.click(checkbox)
    expect(onChange).toHaveBeenCalledWith([HARD_LUCID])
  })

  it('calls onChange with toggleBoss for deselect', () => {
    const onChange = vi.fn()
    renderList([HARD_LUCID], onChange)

    const checkbox = screen.getByRole('checkbox', { name: /Hard Lucid/i })
    fireEvent.click(checkbox)
    expect(onChange).toHaveBeenCalledWith([])
  })

  it('calls onChange with toggleBoss for auto-replace in same family', () => {
    const onChange = vi.fn()
    renderList([NORMAL_LUCID], onChange)

    const checkbox = screen.getByRole('checkbox', { name: /Hard Lucid/i })
    fireEvent.click(checkbox)
    expect(onChange).toHaveBeenCalledWith([HARD_LUCID])
  })

  it('renders checkboxes with selected state from FamilyView', () => {
    renderList([HARD_LUCID])

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

    expect(screen.getByText('No bosses match that search.')).toBeTruthy()
  })

  it('displays family displayName without difficulty prefix', () => {
    renderList()
    expect(screen.getByText('Lucid')).toBeTruthy()
  })

  it('shows abbreviated values by default', () => {
    renderList()
    expect(screen.getByText(/504M/)).toBeTruthy()
  })

  it('shows full number values when abbreviated is false', () => {
    renderList([], vi.fn(), false)
    expect(screen.getByText(/504,000,000/)).toBeTruthy()
  })

  it.each([
    ['Hard Lucid', 'Hard'],
    ['Normal Lucid', 'Normal'],
    ['Easy Lucid', 'Easy'],
  ])('renders a difficulty pip with data-difficulty-pip="%s"', (bossName, expectedDifficulty) => {
    renderList()
    const checkbox = screen.getByRole('checkbox', { name: new RegExp(bossName, 'i') })
    const row = checkbox.closest('label') as HTMLElement
    const pip = row.querySelector('[data-difficulty-pip]') as HTMLElement
    expect(pip).toBeTruthy()
    expect(pip.getAttribute('data-difficulty-pip')).toBe(expectedDifficulty)
  })

  it('renders no pip for a boss whose name has no difficulty prefix', () => {
    renderList()
    const checkbox = screen.getByRole('checkbox', { name: /Akechi Mitsuhide/i })
    const row = checkbox.closest('label') as HTMLElement
    const pip = row.querySelector('[data-difficulty-pip]')
    expect(pip).toBeNull()
  })
})
