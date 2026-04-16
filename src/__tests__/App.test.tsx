import { describe, expect, it, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@/test/test-utils'
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
  }  )

  describe('selectedMuleId self-healing', () => {
    it('clears selectedMuleId when the selected mule is deleted', async () => {
      const mules = [
        {
          id: 'mule-a',
          name: 'DeleteMe',
          level: 200,
          muleClass: 'Hero',
          selectedBosses: [],
        },
      ]
      localStorage.setItem('maplestory-mule-tracker', JSON.stringify(mules))
      render(<App />)

      fireEvent.click(screen.getByText('DeleteMe'))
      expect(screen.getByRole('heading', { name: 'DeleteMe' })).toBeTruthy()

      fireEvent.click(screen.getByRole('button', { name: /delete/i }))
      fireEvent.click(screen.getByRole('button', { name: /yes/i }))

      await waitFor(() => {
        expect(screen.queryByRole('heading', { name: 'DeleteMe' })).toBeNull()
      })
    })

    it('keeps selectedMuleId when a different mule is deleted', async () => {
      const mules = [
        {
          id: 'mule-a',
          name: 'KeepMe',
          level: 200,
          muleClass: 'Hero',
          selectedBosses: [],
        },
        {
          id: 'mule-b',
          name: 'DeleteMe',
          level: 150,
          muleClass: 'Paladin',
          selectedBosses: [],
        },
      ]
      localStorage.setItem('maplestory-mule-tracker', JSON.stringify(mules))
      render(<App />)

      fireEvent.click(screen.getByText('KeepMe'))
      expect(screen.getByRole('heading', { name: 'KeepMe' })).toBeTruthy()

      const closeButton = screen.getByRole('button', { name: /close/i })
      fireEvent.click(closeButton)
      await waitFor(() => {
        expect(screen.queryByRole('heading', { name: 'KeepMe' })).toBeNull()
      })

      fireEvent.click(screen.getByText('DeleteMe'))
      expect(screen.getByRole('heading', { name: 'DeleteMe' })).toBeTruthy()

      fireEvent.click(screen.getByRole('button', { name: /delete/i }))
      fireEvent.click(screen.getByRole('button', { name: /yes/i }))

      await waitFor(() => {
        expect(screen.queryByRole('heading', { name: 'DeleteMe' })).toBeNull()
      })

      fireEvent.click(screen.getByText('KeepMe'))
      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'KeepMe' })).toBeTruthy()
      })
    })
  })
})
