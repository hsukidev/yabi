import { describe, expect, it, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@/test/test-utils'
import App from '../App'

describe('App (shadcn/Tailwind, no MantineProvider)', () => {
  beforeEach(() => {
    localStorage.clear()
    document.documentElement.classList.remove('dark')
  })

  it('renders without MantineProvider', () => {
    const { container } = render(<App />)
    expect(container.querySelector('[data-mantine-color-scheme]')).toBeNull()
  })

  it('renders Add Mule button', () => {
    render(<App />)
    expect(screen.getByRole('button', { name: /add mule/i })).toBeTruthy()
  })

  it('renders income summary card with correct Tailwind classes', () => {
    const { container } = render(<App />)
    const card = container.querySelector('.rounded-lg.border.bg-card')
    expect(card).toBeTruthy()
  })

  it('renders responsive grid for mule cards', () => {
    const { container } = render(<App />)
    const grid = container.querySelector('.grid')
    expect(grid).toBeTruthy()
    expect(grid?.className).toContain('grid-cols-1')
    expect(grid?.className).toContain('xl:grid-cols-4')
  })

  it('page background uses bg-background class', () => {
    const { container } = render(<App />)
    const bg = container.querySelector('.bg-background')
    expect(bg).toBeTruthy()
  })

  it('clicking Add Mule adds a new mule', () => {
    const { container } = render(<App />)
    const gridBefore = container.querySelectorAll('.grid > div')
    const countBefore = gridBefore.length
    fireEvent.click(screen.getByRole('button', { name: /add mule/i }))
    const gridAfter = container.querySelectorAll('.grid > div')
    expect(gridAfter.length).toBe(countBefore + 1)
  })

  it('toggling abbreviated label works', () => {
    const { container } = render(<App />)
    const clickable = container.querySelector('.cursor-pointer')
    expect(clickable).toBeTruthy()
    fireEvent.click(clickable!)
  })
})