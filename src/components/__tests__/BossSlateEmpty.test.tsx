import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';

import { BossSlateEmpty } from '../BossSlateEmpty';

describe('BossSlateEmpty', () => {
  it('renders the muted "No bosses match" treatment', () => {
    render(<BossSlateEmpty />);
    const panel = screen.getByTestId('boss-slate-empty');
    expect(panel).toBeTruthy();
    expect(panel.textContent).toContain('No bosses match');
  });

  it('is announced to assistive tech as a status region', () => {
    render(<BossSlateEmpty />);
    expect(screen.getByTestId('boss-slate-empty').getAttribute('role')).toBe('status');
  });

  it('fuses to the search bar above it (squared top, dropped top border)', () => {
    render(<BossSlateEmpty />);
    const panel = screen.getByTestId('boss-slate-empty');
    expect(panel.className).toContain('rounded-t-none');
    expect(panel.className).toContain('border-t-0');
  });
});
