import { describe, expect, it, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@/test/test-utils'
import { Header } from '../Header'

describe('Header (shadcn/ThemeProvider)', () => {
  beforeEach(() => {
    localStorage.clear()
    document.documentElement.classList.remove('dark')
  })

  it('renders dark mode toggle button', () => {
    render(<Header />)
    const toggleBtn = screen.getByLabelText('Toggle color scheme')
    expect(toggleBtn).toBeTruthy()
  })

  it('shows sun icon in dark mode and moon icon in light mode', () => {
    const { unmount } = render(<Header />, { defaultTheme: 'dark' })
    expect(screen.getByLabelText('Sun')).toBeTruthy()

    unmount()
    localStorage.clear()
    document.documentElement.classList.remove('dark')

    render(<Header />, { defaultTheme: 'light' })
    expect(screen.getByLabelText('Moon')).toBeTruthy()
  })

  it('toggles theme on button click', () => {
    render(<Header />, { defaultTheme: 'dark' })
    expect(document.documentElement.classList.contains('dark')).toBe(true)
    fireEvent.click(screen.getByLabelText('Toggle color scheme'))
    expect(document.documentElement.classList.contains('dark')).toBe(false)
  })
})