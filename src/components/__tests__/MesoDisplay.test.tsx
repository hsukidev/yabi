import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TooltipProvider } from '@/components/ui/tooltip';
import { MesoMetric, MesoValue } from '../MesoDisplay';

/**
 * Contract suite for the **Meso Display** module — the single owner of the
 * convention: abbreviated inline, full-precision tooltip only when the
 * value is non-zero, plain `0` with no tooltip otherwise. Surface tests
 * (roster, KPI, matrix) only need to verify they pass the right value in.
 */

function renderWithProvider(ui: React.ReactElement) {
  return render(<TooltipProvider>{ui}</TooltipProvider>);
}

describe('MesoMetric', () => {
  it('renders a zero as plain text with no tooltip trigger', () => {
    renderWithProvider(<MesoMetric value={0} label="Weekly meso" data-testid="meso" />);
    expect(screen.getByTestId('meso').textContent).toBe('0');
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('renders a non-zero abbreviated inside a labelled tooltip trigger', () => {
    renderWithProvider(<MesoMetric value={5_310_000_000} label="Weekly meso" data-testid="meso" />);
    expect(screen.getByTestId('meso').textContent).toBe('5.31B');
    expect(screen.getByRole('button', { name: 'Weekly meso 5,310,000,000' })).toBeTruthy();
  });

  it('applies className/style and span attributes to the value span', () => {
    renderWithProvider(
      <MesoMetric
        value={1_000_000}
        label="Weekly meso"
        data-testid="meso"
        className="custom"
        style={{ color: 'red' }}
      />,
    );
    const span = screen.getByTestId('meso');
    expect(span.className).toBe('custom');
    expect(span.style.color).toBe('red');
  });

  it('narrow mode drops decimals in the rendered value', () => {
    renderWithProvider(
      <MesoMetric value={504_320_000} narrow label="Expected weekly income" data-testid="meso" />,
    );
    expect(screen.getByTestId('meso').textContent).toBe('504M');
  });

  describe('chip mode (children)', () => {
    it('wraps children in a labelled trigger when non-zero', () => {
      renderWithProvider(
        <MesoMetric value={1_000_000} label="Weekly meso" className="chip">
          <span>Weekly</span>
          <span>1M</span>
        </MesoMetric>,
      );
      const trigger = screen.getByRole('button', { name: 'Weekly meso 1,000,000' });
      expect(trigger.className).toBe('chip');
      expect(trigger.textContent).toBe('Weekly1M');
    });

    it('keeps the aria-label on a plain wrapper when zero (no trigger)', () => {
      renderWithProvider(
        <MesoMetric value={0} label="Weekly meso" className="chip" data-testid="chip">
          <span>Weekly</span>
          <span>0</span>
        </MesoMetric>,
      );
      expect(screen.queryByRole('button')).toBeNull();
      const wrapper = screen.getByTestId('chip');
      expect(wrapper.getAttribute('aria-label')).toBe('Weekly meso 0');
      expect(wrapper.className).toBe('chip');
    });
  });
});

describe('MesoValue', () => {
  it('renders a zero as a plain span with no tooltip', () => {
    render(<MesoValue value={0} data-testid="meso" />);
    const span = screen.getByTestId('meso');
    expect(span.textContent).toBe('0');
    // Hover-only span adapter: never a button, zero never gets a trigger.
    expect(screen.queryByRole('button')).toBeNull();
    expect(span.getAttribute('data-popup-open')).toBeNull();
  });

  it('renders a non-zero abbreviated in a span (not a nested button)', () => {
    render(<MesoValue value={5_310_000_000} data-testid="meso" />);
    const span = screen.getByTestId('meso');
    expect(span.tagName).toBe('SPAN');
    expect(span.textContent).toBe('5.31B');
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('renders trailing children inside the trigger', () => {
    render(
      <MesoValue value={1_000_000} data-testid="meso">
        <span> x 7</span>
      </MesoValue>,
    );
    expect(screen.getByTestId('meso').textContent).toBe('1M x 7');
  });
});
