import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SlateViewToggle } from '../SlateViewToggle';

function segment(value: 'matrix' | 'cards'): HTMLButtonElement {
  return screen
    .getByTestId('slate-view-toggle')
    .querySelector(`[data-value="${value}"]`) as HTMLButtonElement;
}

describe('SlateViewToggle', () => {
  it('renders a role=group container with an accessible label', () => {
    render(<SlateViewToggle mode="cards" onSelect={vi.fn()} />);
    const group = screen.getByRole('group', { name: /slate display mode/i });
    expect(group).toBeTruthy();
  });

  it('renders two segment buttons (cards + matrix)', () => {
    render(<SlateViewToggle mode="cards" onSelect={vi.fn()} />);
    expect(segment('cards')).toBeTruthy();
    expect(segment('matrix')).toBeTruthy();
  });

  it('renders the cards segment first and the matrix segment second', () => {
    render(<SlateViewToggle mode="cards" onSelect={vi.fn()} />);
    const buttons = screen.getByTestId('slate-view-toggle').querySelectorAll('button');
    expect(Array.from(buttons).map((b) => b.getAttribute('data-value'))).toEqual([
      'cards',
      'matrix',
    ]);
  });

  it('uses the shared d-c-toggle styling to match the cadence toggle', () => {
    render(<SlateViewToggle mode="cards" onSelect={vi.fn()} />);
    expect(screen.getByTestId('slate-view-toggle').className).toContain('d-c-toggle');
  });

  it('marks the cards segment pressed in cards mode', () => {
    render(<SlateViewToggle mode="cards" onSelect={vi.fn()} />);
    expect(segment('cards').getAttribute('aria-pressed')).toBe('true');
    expect(segment('matrix').getAttribute('aria-pressed')).toBe('false');
  });

  it('marks the matrix segment pressed in matrix mode', () => {
    render(<SlateViewToggle mode="matrix" onSelect={vi.fn()} />);
    expect(segment('matrix').getAttribute('aria-pressed')).toBe('true');
    expect(segment('cards').getAttribute('aria-pressed')).toBe('false');
  });

  it('applies the .on class to the active segment only', () => {
    render(<SlateViewToggle mode="cards" onSelect={vi.fn()} />);
    expect(segment('cards').className).toContain('on');
    expect(segment('matrix').className).not.toContain('on');
  });

  it('calls onSelect with the clicked segment’s mode', () => {
    const onSelect = vi.fn();
    render(<SlateViewToggle mode="cards" onSelect={onSelect} />);
    fireEvent.click(segment('matrix'));
    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect).toHaveBeenCalledWith('matrix');
  });

  it('clicking the active segment re-selects the same mode (no flip)', () => {
    const onSelect = vi.fn();
    render(<SlateViewToggle mode="cards" onSelect={onSelect} />);
    fireEvent.click(segment('cards'));
    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect).toHaveBeenCalledWith('cards');
  });

  it('gives each segment a distinct accessible label', () => {
    render(<SlateViewToggle mode="cards" onSelect={vi.fn()} />);
    expect(segment('matrix').getAttribute('aria-label')).toBe('Boss Matrix');
    expect(segment('cards').getAttribute('aria-label')).toBe('Boss Card View');
  });

  it('renders an icon glyph inside each segment', () => {
    render(<SlateViewToggle mode="cards" onSelect={vi.fn()} />);
    expect(segment('matrix').querySelector('svg')).toBeTruthy();
    expect(segment('cards').querySelector('svg')).toBeTruthy();
  });
});
