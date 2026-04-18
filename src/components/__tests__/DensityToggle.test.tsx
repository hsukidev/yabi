import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { DensityProvider } from '../../context/DensityProvider'
import { DensityToggle } from '../DensityToggle'

describe('DensityToggle', () => {
  beforeEach(() => {
    localStorage.clear()
    document.documentElement.removeAttribute('data-density')
  })

  it('renders two options: COMFY and COMPACT', () => {
    render(<DensityProvider><DensityToggle /></DensityProvider>)
    expect(screen.getByRole('radio', { name: /comfy/i })).toBeTruthy()
    expect(screen.getByRole('radio', { name: /compact/i })).toBeTruthy()
  })

  it('marks the current density as checked', () => {
    render(<DensityProvider><DensityToggle /></DensityProvider>)
    const comfy = screen.getByRole('radio', { name: /comfy/i })
    expect(comfy.getAttribute('aria-checked')).toBe('true')
  })

  it('switches density when other option is clicked', () => {
    render(<DensityProvider><DensityToggle /></DensityProvider>)
    fireEvent.click(screen.getByRole('radio', { name: /compact/i }))
    expect(document.documentElement.getAttribute('data-density')).toBe('compact')
    expect(screen.getByRole('radio', { name: /compact/i }).getAttribute('aria-checked')).toBe('true')
  })
})
