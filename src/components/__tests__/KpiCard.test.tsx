import { describe, expect, it } from 'vitest';
import { render, screen, within, fireEvent } from '@/test/test-utils';
import { KpiCard } from '../KpiCard';
import type { Mule } from '../../types';
import { bosses } from '../../data/bosses';

const HARD_LUCID = `${bosses.find((b) => b.family === 'lucid')!.id}:hard:weekly`;

const mule: Mule = {
  id: 'm1',
  name: 'A',
  level: 200,
  muleClass: 'Hero',
  selectedBosses: [],
  active: true,
};

function activeStatValue(): string {
  const card = screen.getByTestId('income-card') as HTMLElement;
  const label = within(card).getByText('ACTIVE');
  return label.parentElement!.querySelectorAll('div')[1]!.textContent ?? '';
}

function bignumText(): string {
  return screen.getByRole('button', { name: /toggle abbreviated meso format/i }).textContent ?? '';
}

describe('KpiCard', () => {
  it('uses a fixed padding independent of density', () => {
    render(<KpiCard mules={[mule]} />);
    const card = screen.getByTestId('income-card') as HTMLElement;
    expect(card.style.padding).toBe('24px');
  });

  it('counts mules with active: true regardless of boss selection', () => {
    const mules: Mule[] = [
      { ...mule, id: 'a', active: true, selectedBosses: [] },
      { ...mule, id: 'b', active: true, selectedBosses: [] },
    ];
    render(<KpiCard mules={mules} />);
    expect(activeStatValue()).toBe('2');
  });

  it('does not toggle format when total income is zero', () => {
    const nonzeroMule: Mule = { ...mule, selectedBosses: [HARD_LUCID] };
    const { rerender } = render(<KpiCard mules={[nonzeroMule]} />);
    // Abbreviated by default → "504M"
    expect(bignumText()).toBe('504M');
    // Click while zero — should no-op (canToggleFormat=false).
    rerender(<KpiCard mules={[{ ...mule, selectedBosses: [] }]} />);
    // Auto-fullformat-on-zero flipped us to full: "0" (not "0B").
    expect(bignumText()).toBe('0');
    fireEvent.click(screen.getByRole('button', { name: /toggle abbreviated meso format/i }));
    // Still "0" — the onClick guard stops the toggle when raw===0.
    expect(bignumText()).toBe('0');
  });

  it('auto-flips to full format when total income is zero from mount', () => {
    // Dead roster starts abbreviated; the Auto-Fullformat-On-Zero Rule flips
    // it to full so a zero renders as "0" instead of "0B".
    render(<KpiCard mules={[{ ...mule, selectedBosses: [] }]} />);
    expect(bignumText()).toBe('0');
  });

  it('auto-flips to full format when total income transitions to zero', () => {
    const nonzero: Mule[] = [{ ...mule, selectedBosses: [HARD_LUCID] }];
    const zero: Mule[] = [{ ...mule, selectedBosses: [] }];
    const { rerender } = render(<KpiCard mules={nonzero} />);
    // Abbreviated default → "504M".
    expect(bignumText()).toBe('504M');
    rerender(<KpiCard mules={zero} />);
    // Transition to zero triggers the hook → full format "0".
    expect(bignumText()).toBe('0');
  });

  it('does not count mules with active: false even if they have bosses selected', () => {
    const mules: Mule[] = [
      { ...mule, id: 'a', active: true, selectedBosses: [] },
      { ...mule, id: 'b', active: false, selectedBosses: ['x:hard:weekly'] },
    ];
    render(<KpiCard mules={mules} />);
    expect(activeStatValue()).toBe('1');
  });
});
