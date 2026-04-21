import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@/test/test-utils';
import { PieChartCard } from '../PieChartCard';

describe('PieChartCard', () => {
  it('uses a fixed padding independent of density', () => {
    render(<PieChartCard mules={[]} onSliceClick={vi.fn()} />);
    const card = screen.getByTestId('income-chart') as HTMLElement;
    expect(card.style.padding).toBe('16px');
  });
});
