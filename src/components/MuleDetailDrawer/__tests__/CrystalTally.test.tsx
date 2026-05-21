import { describe, expect, it } from 'vitest';
import { render, screen } from '@/test/test-utils';

import { CrystalTally } from '../CrystalTally';

describe('CrystalTally', () => {
  it('renders the weekly readout as "{n}/14"', () => {
    render(<CrystalTally weeklyCount={5} dailyCount={0} monthlyCount={0} />);
    const weekly = screen.getByLabelText(/weekly boss selections/i);
    expect(weekly.textContent).toBe('5/14');
  });

  it('renders the daily readout as a bare count (no cap segment)', () => {
    render(<CrystalTally weeklyCount={0} dailyCount={7} monthlyCount={0} />);
    const daily = screen.getByLabelText(/daily boss selections/i);
    expect(daily.textContent).toBe('7');
    expect(daily.querySelector('.crystal-tally__cap')).toBeNull();
  });

  it('renders the monthly readout as a bare count (no cap segment)', () => {
    render(<CrystalTally weeklyCount={0} dailyCount={0} monthlyCount={1} />);
    const monthly = screen.getByLabelText(/monthly boss selections/i);
    expect(monthly.textContent).toBe('1');
    expect(monthly.querySelector('.crystal-tally__cap')).toBeNull();
  });

  it('shows "0/14", "0", and "0" when all counts are zero', () => {
    render(<CrystalTally weeklyCount={0} dailyCount={0} monthlyCount={0} />);
    expect(screen.getByLabelText(/weekly boss selections/i).textContent).toBe('0/14');
    expect(screen.getByLabelText(/daily boss selections/i).textContent).toBe('0');
    expect(screen.getByLabelText(/monthly boss selections/i).textContent).toBe('0');
  });

  it('does not clamp values greater than the weekly cap', () => {
    render(<CrystalTally weeklyCount={17} dailyCount={40} monthlyCount={2} />);
    expect(screen.getByLabelText(/weekly boss selections/i).textContent).toBe('17/14');
    expect(screen.getByLabelText(/daily boss selections/i).textContent).toBe('40');
  });

  it('marks empty cells with is-empty and filled cells with is-filled', () => {
    const { container } = render(<CrystalTally weeklyCount={3} dailyCount={0} monthlyCount={1} />);
    const weeklyCell = container.querySelector('[data-kind="weekly"]');
    const dailyCell = container.querySelector('[data-kind="daily"]');
    expect(weeklyCell?.classList.contains('is-filled')).toBe(true);
    expect(dailyCell?.classList.contains('is-empty')).toBe(true);
  });

  it('renders weekly, daily, and monthly crystal PNGs', () => {
    const { container } = render(<CrystalTally weeklyCount={1} dailyCount={1} monthlyCount={1} />);
    expect(container.querySelector('.crystal-tally__crystal.is-weekly')).toBeTruthy();
    expect(container.querySelector('.crystal-tally__crystal.is-daily')).toBeTruthy();
    const monthly = container.querySelector('.crystal-tally__crystal.is-monthly');
    expect(monthly).toBeTruthy();
    expect(monthly?.getAttribute('src')).toContain('monthly-crystal.png');
  });

  it('orders the cells Weekly, Daily, Monthly top-to-bottom', () => {
    const { container } = render(<CrystalTally weeklyCount={1} dailyCount={1} monthlyCount={1} />);
    const cells = Array.from(container.querySelectorAll('[data-kind]'));
    expect(cells.map((c) => c.getAttribute('data-kind'))).toEqual(['weekly', 'daily', 'monthly']);
  });

  it('places a horizontal divider between cells', () => {
    const { container } = render(<CrystalTally weeklyCount={1} dailyCount={1} monthlyCount={1} />);
    expect(container.querySelectorAll('.crystal-tally__divider')).toHaveLength(2);
  });

  it('exposes a labelled group wrapper so screen readers announce the tally together', () => {
    render(<CrystalTally weeklyCount={1} dailyCount={1} monthlyCount={1} />);
    expect(screen.getByRole('group', { name: /crystal tally/i })).toBeTruthy();
  });

  it('uses font-mono-nums for the counts (tabular numerals)', () => {
    render(<CrystalTally weeklyCount={2} dailyCount={3} monthlyCount={1} />);
    expect(
      screen.getByLabelText(/weekly boss selections/i).classList.contains('font-mono-nums'),
    ).toBe(true);
    expect(
      screen.getByLabelText(/daily boss selections/i).classList.contains('font-mono-nums'),
    ).toBe(true);
    expect(
      screen.getByLabelText(/monthly boss selections/i).classList.contains('font-mono-nums'),
    ).toBe(true);
  });
});
