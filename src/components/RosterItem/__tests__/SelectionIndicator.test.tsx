import { describe, expect, it } from 'vitest';
import { render } from '../../../test/test-utils';
import { SelectionIndicator } from '../SelectionIndicator';

describe('SelectionIndicator', () => {
  it('renders the selection box (with data-selection-indicator) when unselected', () => {
    const { container } = render(<SelectionIndicator selected={false} />);
    const indicator = container.querySelector('[data-selection-indicator]') as HTMLElement;
    expect(indicator).toBeTruthy();
    expect(indicator.getAttribute('aria-hidden')).not.toBeNull();
  });

  it('renders no Check glyph when unselected', () => {
    const { container } = render(<SelectionIndicator selected={false} />);
    const indicator = container.querySelector('[data-selection-indicator]') as HTMLElement;
    expect(indicator.querySelector('svg')).toBeNull();
  });

  it('renders a Check glyph when selected', () => {
    const { container } = render(<SelectionIndicator selected={true} />);
    const indicator = container.querySelector('[data-selection-indicator]') as HTMLElement;
    expect(indicator.querySelector('svg')).toBeTruthy();
  });

  it('uses the accent color tokens for borders/background', () => {
    const { container } = render(<SelectionIndicator selected={true} />);
    const indicator = container.querySelector('[data-selection-indicator]') as HTMLElement;
    const compound = indicator.style.borderColor + indicator.style.background;
    expect(compound).toMatch(/--accent/);
    expect(compound).not.toMatch(/destructive/);
  });
});
