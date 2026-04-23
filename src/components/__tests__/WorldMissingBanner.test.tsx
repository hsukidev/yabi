import { describe, expect, it } from 'vitest';
import { render, screen } from '@/test/test-utils';
import { WorldMissingBanner } from '../WorldMissingBanner';

describe('WorldMissingBanner', () => {
  it('renders the prompt text inside a role=status banner', () => {
    render(<WorldMissingBanner />);
    const banner = screen.getByRole('status');
    expect(banner.hasAttribute('data-world-missing-banner')).toBe(true);
    expect(banner.textContent).toMatch(/please select a world first\./i);
  });

  it('uses the info-blue accent token for the border, background, and text', () => {
    const { container } = render(<WorldMissingBanner />);
    const banner = container.querySelector('[data-world-missing-banner]') as HTMLElement;
    // Reuse of `--accent-secondary` is the whole point of the banner style —
    // pin it so nobody accidentally swaps in a destructive or raw-hex color.
    expect(banner.style.border).toContain('var(--accent-secondary)');
    expect(banner.style.background).toContain('var(--accent-secondary)');

    const text = banner.querySelector('span') as HTMLElement;
    expect(text.style.color).toContain('var(--accent-secondary)');
  });

  it('shares the bulk-slide entrance animation with the bulk action bar', () => {
    const { container } = render(<WorldMissingBanner />);
    const banner = container.querySelector('[data-world-missing-banner]') as HTMLElement;
    expect(banner.style.animation).toContain('bulk-slide');
  });
});
