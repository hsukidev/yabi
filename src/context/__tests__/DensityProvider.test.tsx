import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { DensityProvider, useDensity } from '../DensityProvider';

function TestComponent() {
  const { density, toggleDensity } = useDensity();
  return (
    <div>
      <span data-testid="density">{density}</span>
      <button onClick={toggleDensity}>toggle</button>
    </div>
  );
}

describe('DensityProvider', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute('data-density');
  });

  it('defaults to comfy', () => {
    render(
      <DensityProvider>
        <TestComponent />
      </DensityProvider>,
    );
    expect(screen.getByTestId('density').textContent).toBe('comfy');
  });

  it('applies data-density attribute to html element', () => {
    render(
      <DensityProvider>
        <TestComponent />
      </DensityProvider>,
    );
    expect(document.documentElement.getAttribute('data-density')).toBe('comfy');
  });

  it('toggles to compact', () => {
    render(
      <DensityProvider>
        <TestComponent />
      </DensityProvider>,
    );
    fireEvent.click(screen.getByText('toggle'));
    expect(screen.getByTestId('density').textContent).toBe('compact');
    expect(document.documentElement.getAttribute('data-density')).toBe('compact');
  });

  it('persists density to localStorage', () => {
    render(
      <DensityProvider>
        <TestComponent />
      </DensityProvider>,
    );
    fireEvent.click(screen.getByText('toggle'));
    expect(localStorage.getItem('density')).toBe('compact');
  });

  it('reads initial density from localStorage', () => {
    localStorage.setItem('density', 'compact');
    render(
      <DensityProvider>
        <TestComponent />
      </DensityProvider>,
    );
    expect(screen.getByTestId('density').textContent).toBe('compact');
  });
});
