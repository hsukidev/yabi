import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { DensityProvider } from '../../context/DensityProvider';
import { DensityToggle } from '../DensityToggle';

describe('DensityToggle', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute('data-density');
  });

  it('renders two labels: COMFY and COMPACT', () => {
    render(
      <DensityProvider>
        <DensityToggle />
      </DensityProvider>,
    );
    expect(screen.getByText('COMFY')).toBeTruthy();
    expect(screen.getByText('COMPACT')).toBeTruthy();
  });

  it('marks the current density on the toggle container', () => {
    render(
      <DensityProvider>
        <DensityToggle />
      </DensityProvider>,
    );
    const toggle = screen.getByTestId('density-toggle');
    expect(toggle.getAttribute('data-density')).toBe('comfy');
  });

  it('flips density when the currently-active label is clicked', () => {
    render(
      <DensityProvider>
        <DensityToggle />
      </DensityProvider>,
    );
    // Starts on comfy; clicking COMFY should flip to compact.
    fireEvent.click(screen.getByText('COMFY'));
    expect(document.documentElement.getAttribute('data-density')).toBe('compact');
  });

  it('flips density when the inactive label is clicked', () => {
    render(
      <DensityProvider>
        <DensityToggle />
      </DensityProvider>,
    );
    fireEvent.click(screen.getByText('COMPACT'));
    expect(document.documentElement.getAttribute('data-density')).toBe('compact');
  });

  it('flips back on a second click', () => {
    render(
      <DensityProvider>
        <DensityToggle />
      </DensityProvider>,
    );
    fireEvent.click(screen.getByText('COMPACT'));
    fireEvent.click(screen.getByText('COMPACT'));
    expect(document.documentElement.getAttribute('data-density')).toBe('comfy');
  });
});
