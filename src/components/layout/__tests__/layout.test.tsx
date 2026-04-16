import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Stack } from '../Stack'
import { Group } from '../Group'
import { Container } from '../Container'

describe('Stack', () => {
  it('renders children in a flex column', () => {
    render(<Stack data-testid="stack"><span>a</span><span>b</span></Stack>)
    const el = screen.getByTestId('stack')
    expect(el.className).toContain('flex')
    expect(el.className).toContain('flex-col')
    expect(el.textContent).toBe('ab')
  })

  it('applies gap class from gap prop', () => {
    render(<Stack data-testid="stack" gap="md"><span>a</span></Stack>)
    expect(screen.getByTestId('stack').className).toContain('gap-4')
  })

  it('renders a div by default', () => {
    render(<Stack data-testid="stack">content</Stack>)
    expect(screen.getByTestId('stack').tagName).toBe('DIV')
  })
})

describe('Group', () => {
  it('renders children in a flex row', () => {
    render(<Group data-testid="group"><span>a</span><span>b</span></Group>)
    const el = screen.getByTestId('group')
    expect(el.className).toContain('flex')
    expect(el.className).toContain('flex-row')
    expect(el.textContent).toBe('ab')
  })

  it('applies gap class from gap prop', () => {
    render(<Group data-testid="group" gap="sm"><span>a</span></Group>)
    expect(screen.getByTestId('group').className).toContain('gap-2')
  })

  it('applies justify class', () => {
    render(<Group data-testid="group" justify="between"><span>a</span></Group>)
    expect(screen.getByTestId('group').className).toContain('justify-between')
  })

  it('applies align class', () => {
    render(<Group data-testid="group" align="center"><span>a</span></Group>)
    expect(screen.getByTestId('group').className).toContain('items-center')
  })

  it('applies wrap class', () => {
    render(<Group data-testid="group" wrap><span>a</span></Group>)
    expect(screen.getByTestId('group').className).toContain('flex-wrap')
  })

  it('applies nowrap when wrap is false', () => {
    render(<Group data-testid="group" wrap={false}><span>a</span></Group>)
    expect(screen.getByTestId('group').className).toContain('flex-nowrap')
  })
})

describe('Container', () => {
  it('renders children centered with max-width', () => {
    render(<Container data-testid="container"><span>a</span></Container>)
    const el = screen.getByTestId('container')
    expect(el.className).toContain('mx-auto')
    expect(el.textContent).toBe('a')
  })

  it('applies size prop as max-width class', () => {
    render(<Container data-testid="container" size="lg"><span>a</span></Container>)
    expect(screen.getByTestId('container').className).toContain('max-w-5xl')
  })

  it('applies padding', () => {
    render(<Container data-testid="container"><span>a</span></Container>)
    expect(screen.getByTestId('container').className).toContain('px-4')
    expect(screen.getByTestId('container').className).toContain('py-4')
  })
})
