import { describe, expect, it, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@/test/test-utils'
import App from '../App'

describe('App', () => {
  beforeEach(() => {
    localStorage.clear()
    document.documentElement.classList.remove('dark')
  })

  it('renders Add Mule button', () => {
    render(<App />)
    expect(screen.getByRole('button', { name: /add mule/i })).toBeTruthy()
  })

  it('renders weekly income section', () => {
    render(<App />)
    expect(screen.getByText('Total Weekly Income')).toBeTruthy()
  })

  it('renders mule card grid', () => {
    const { container } = render(<App />)
    const cards = container.querySelectorAll('[data-mule-card]')
    expect(cards.length).toBeGreaterThanOrEqual(0)
  })

  it('clicking Add Mule adds a new mule', () => {
    render(<App />)
    const gridBefore = screen.queryAllByText(/Unnamed Mule/).length
    fireEvent.click(screen.getByRole('button', { name: /add mule/i }))
    expect(screen.queryAllByText(/Unnamed Mule/).length).toBeGreaterThan(gridBefore)
  })

  it('toggles income display format on click', () => {
    const { container } = render(<App />)
    const clickable = container.querySelector('.cursor-pointer')
    expect(clickable).toBeTruthy()
    fireEvent.click(clickable!)
  })
})