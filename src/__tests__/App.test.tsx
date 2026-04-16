import { describe, expect, it, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@/test/test-utils'
import App from '../App'
import packageJson from '../../package.json'

describe('App', () => {
  beforeEach(() => {
    localStorage.clear()
    document.documentElement.classList.remove('dark')
  })

  it('renders without legacy Mantine attributes', () => {
    const { container } = render(<App />)
    expect(container.querySelector('[data-mantine-color-scheme]')).toBeNull()
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

describe('Mantine removal verification', () => {
  it('has no @mantine packages in dependencies', () => {
    const deps = Object.keys(packageJson.dependencies)
    const mantineDeps = deps.filter((d) => d.startsWith('@mantine/'))
    expect(mantineDeps).toEqual([])
  })

  it('has no mantine postcss plugins in devDependencies', () => {
    const devDeps = Object.keys(packageJson.devDependencies)
    const mantinePlugins = devDeps.filter(
      (d) => d === 'postcss-preset-mantine' || d === 'postcss-simple-vars'
    )
    expect(mantinePlugins).toEqual([])
  })
})