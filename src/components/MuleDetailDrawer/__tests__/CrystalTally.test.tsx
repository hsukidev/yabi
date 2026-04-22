import { describe, expect, it } from 'vitest';
import { render, screen } from '@/test/test-utils';

import { CrystalTally } from '../CrystalTally';

describe('CrystalTally', () => {
  it('renders the weekly readout as "{n}/14"', () => {
    render(<CrystalTally weeklyCount={5} dailyCount={0} />);
    const weekly = screen.getByLabelText(/weekly boss selections/i);
    expect(weekly.textContent).toBe('5/14');
  });

  it('renders the daily readout as a bare count (no cap segment)', () => {
    render(<CrystalTally weeklyCount={0} dailyCount={7} />);
    const daily = screen.getByLabelText(/daily boss selections/i);
    expect(daily.textContent).toBe('7');
    expect(daily.querySelector('.crystal-tally__cap')).toBeNull();
  });

  it('shows "0/14" and "0" when both counts are zero', () => {
    render(<CrystalTally weeklyCount={0} dailyCount={0} />);
    expect(screen.getByLabelText(/weekly boss selections/i).textContent).toBe('0/14');
    expect(screen.getByLabelText(/daily boss selections/i).textContent).toBe('0');
  });

  it('does not clamp values greater than 14 on the weekly side', () => {
    render(<CrystalTally weeklyCount={17} dailyCount={40} />);
    expect(screen.getByLabelText(/weekly boss selections/i).textContent).toBe('17/14');
    expect(screen.getByLabelText(/daily boss selections/i).textContent).toBe('40');
  });

  it('marks an empty row with the is-empty class and a filled row with is-filled', () => {
    const { container } = render(<CrystalTally weeklyCount={3} dailyCount={0} />);
    const weeklyRow = container.querySelector('[data-kind="weekly"]');
    const dailyRow = container.querySelector('[data-kind="daily"]');
    expect(weeklyRow?.classList.contains('is-filled')).toBe(true);
    expect(dailyRow?.classList.contains('is-empty')).toBe(true);
  });

  it('renders both the weekly and daily crystal PNGs', () => {
    const { container } = render(<CrystalTally weeklyCount={1} dailyCount={1} />);
    expect(container.querySelector('.crystal-tally__crystal.is-weekly')).toBeTruthy();
    expect(container.querySelector('.crystal-tally__crystal.is-daily')).toBeTruthy();
  });

  it('exposes a labelled group wrapper so screen readers announce the tally together', () => {
    render(<CrystalTally weeklyCount={1} dailyCount={1} />);
    expect(screen.getByRole('group', { name: /crystal tally/i })).toBeTruthy();
  });

  it('uses font-mono-nums for the counts (tabular numerals)', () => {
    render(<CrystalTally weeklyCount={2} dailyCount={3} />);
    expect(
      screen.getByLabelText(/weekly boss selections/i).classList.contains('font-mono-nums'),
    ).toBe(true);
    expect(
      screen.getByLabelText(/daily boss selections/i).classList.contains('font-mono-nums'),
    ).toBe(true);
  });
});
