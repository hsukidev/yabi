import { describe, expect, it, vi } from 'vitest'
import { render, screen, fireEvent } from '../../test/test-utils'
import { AddCard } from '../AddCard'

describe('AddCard', () => {
  it('renders with "Add Mule" text', () => {
    render(<AddCard onClick={vi.fn()} />)
    expect(screen.getByText('Add Mule')).toBeTruthy()
  })

  it('renders as a 200×300px element', () => {
    const { container } = render(<AddCard onClick={vi.fn()} />)
    const card = container.firstElementChild as HTMLElement
    expect(card.style.width).toBe('200px')
    expect(card.style.height).toBe('300px')
  })

  it('calls onClick when clicked', () => {
    const onClick = vi.fn()
    render(<AddCard onClick={onClick} />)
    fireEvent.click(screen.getByText('Add Mule'))
    expect(onClick).toHaveBeenCalledOnce()
  })

  it('has dashed border styling', () => {
    const { container } = render(<AddCard onClick={vi.fn()} />)
    const card = container.firstElementChild as HTMLElement
    expect(card.style.borderStyle).toBe('dashed')
  })

  it('reduces opacity on hover and restores on mouse leave', () => {
    const { container } = render(<AddCard onClick={vi.fn()} />)
    const card = container.firstElementChild as HTMLElement
    expect(card.style.opacity).toBe('1')
    fireEvent.mouseEnter(card)
    expect(card.style.opacity).toBe('0.85')
    fireEvent.mouseLeave(card)
    expect(card.style.opacity).toBe('1')
  })
})
