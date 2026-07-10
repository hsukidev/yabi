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
    render(<SlateViewToggle mode="matrix" onToggle={vi.fn()} />);
    const group = screen.getByRole('group', { name: /slate display mode/i });
    expect(group).toBeTruthy();
  });

  it('renders two segment buttons (matrix + cards)', () => {
    render(<SlateViewToggle mode="matrix" onToggle={vi.fn()} />);
    expect(segment('matrix')).toBeTruthy();
    expect(segment('cards')).toBeTruthy();
  });

  it('uses the shared d-c-toggle styling to match the cadence toggle', () => {
    render(<SlateViewToggle mode="matrix" onToggle={vi.fn()} />);
    expect(screen.getByTestId('slate-view-toggle').className).toContain('d-c-toggle');
  });

  it('marks the matrix segment pressed by default (matrix mode)', () => {
    render(<SlateViewToggle mode="matrix" onToggle={vi.fn()} />);
    expect(segment('matrix').getAttribute('aria-pressed')).toBe('true');
    expect(segment('cards').getAttribute('aria-pressed')).toBe('false');
  });

  it('marks the cards segment pressed in cards mode', () => {
    render(<SlateViewToggle mode="cards" onToggle={vi.fn()} />);
    expect(segment('cards').getAttribute('aria-pressed')).toBe('true');
    expect(segment('matrix').getAttribute('aria-pressed')).toBe('false');
  });

  it('applies the .on class to the active segment only', () => {
    render(<SlateViewToggle mode="cards" onToggle={vi.fn()} />);
    expect(segment('cards').className).toContain('on');
    expect(segment('matrix').className).not.toContain('on');
  });

  it('calls onToggle when the inactive segment is clicked', () => {
    const onToggle = vi.fn();
    render(<SlateViewToggle mode="matrix" onToggle={onToggle} />);
    fireEvent.click(segment('cards'));
    expect(onToggle).toHaveBeenCalledTimes(1);
  });

  it('calls onToggle when the active segment is clicked', () => {
    const onToggle = vi.fn();
    render(<SlateViewToggle mode="matrix" onToggle={onToggle} />);
    fireEvent.click(segment('matrix'));
    expect(onToggle).toHaveBeenCalledTimes(1);
  });

  it('gives each segment a distinct accessible label', () => {
    render(<SlateViewToggle mode="matrix" onToggle={vi.fn()} />);
    expect(segment('matrix').getAttribute('aria-label')).toBe('Boss Matrix');
    expect(segment('cards').getAttribute('aria-label')).toBe('Boss Card View');
  });

  it('renders an icon glyph inside each segment', () => {
    render(<SlateViewToggle mode="matrix" onToggle={vi.fn()} />);
    expect(segment('matrix').querySelector('svg')).toBeTruthy();
    expect(segment('cards').querySelector('svg')).toBeTruthy();
  });
});
