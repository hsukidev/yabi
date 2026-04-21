import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ThemeProvider, useTheme } from '../ThemeProvider';

function ThemeConsumer() {
  const { theme, setTheme, toggleTheme } = useTheme();
  return (
    <div>
      <span data-testid="theme-value">{theme}</span>
      <button data-testid="toggle" onClick={toggleTheme}>
        Toggle
      </button>
      <button data-testid="set-light" onClick={() => setTheme('light')}>
        Set Light
      </button>
      <button data-testid="set-dark" onClick={() => setTheme('dark')}>
        Set Dark
      </button>
    </div>
  );
}

describe('ThemeProvider', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove('dark');
    document.body.classList.remove('light');
  });

  it('provides default dark theme when no localStorage and no preference', () => {
    render(
      <ThemeProvider defaultTheme="dark">
        <ThemeConsumer />
      </ThemeProvider>,
    );
    expect(screen.getByTestId('theme-value').textContent).toBe('dark');
  });

  it('reads initial theme from localStorage', () => {
    localStorage.setItem('theme', 'light');
    render(
      <ThemeProvider defaultTheme="dark">
        <ThemeConsumer />
      </ThemeProvider>,
    );
    expect(screen.getByTestId('theme-value').textContent).toBe('light');
  });

  it('toggles from dark to light', () => {
    render(
      <ThemeProvider defaultTheme="dark">
        <ThemeConsumer />
      </ThemeProvider>,
    );
    fireEvent.click(screen.getByTestId('toggle'));
    expect(screen.getByTestId('theme-value').textContent).toBe('light');
  });

  it('toggles from light to dark', () => {
    render(
      <ThemeProvider defaultTheme="light">
        <ThemeConsumer />
      </ThemeProvider>,
    );
    fireEvent.click(screen.getByTestId('toggle'));
    expect(screen.getByTestId('theme-value').textContent).toBe('dark');
  });

  it('adds dark class to html element when theme is dark', () => {
    render(
      <ThemeProvider defaultTheme="dark">
        <ThemeConsumer />
      </ThemeProvider>,
    );
    expect(document.documentElement.classList.contains('dark')).toBe(true);
  });

  it('removes dark class from html element when theme is light', () => {
    render(
      <ThemeProvider defaultTheme="light">
        <ThemeConsumer />
      </ThemeProvider>,
    );
    expect(document.documentElement.classList.contains('dark')).toBe(false);
  });

  it('updates dark class when toggling', () => {
    render(
      <ThemeProvider defaultTheme="dark">
        <ThemeConsumer />
      </ThemeProvider>,
    );
    fireEvent.click(screen.getByTestId('toggle'));
    expect(document.documentElement.classList.contains('dark')).toBe(false);
  });

  it('persists theme to localStorage on change', () => {
    render(
      <ThemeProvider defaultTheme="dark">
        <ThemeConsumer />
      </ThemeProvider>,
    );
    fireEvent.click(screen.getByTestId('toggle'));
    expect(localStorage.getItem('theme')).toBe('light');
  });

  it('setTheme sets the theme directly', () => {
    render(
      <ThemeProvider defaultTheme="dark">
        <ThemeConsumer />
      </ThemeProvider>,
    );
    fireEvent.click(screen.getByTestId('set-light'));
    expect(screen.getByTestId('theme-value').textContent).toBe('light');
    expect(document.documentElement.classList.contains('dark')).toBe(false);
  });

  it('adds body.light class when theme is light', () => {
    render(
      <ThemeProvider defaultTheme="light">
        <ThemeConsumer />
      </ThemeProvider>,
    );
    expect(document.body.classList.contains('light')).toBe(true);
  });

  it('does not have body.light class when theme is dark', () => {
    render(
      <ThemeProvider defaultTheme="dark">
        <ThemeConsumer />
      </ThemeProvider>,
    );
    expect(document.body.classList.contains('light')).toBe(false);
  });

  it('removes body.light class when switching back to dark', () => {
    render(
      <ThemeProvider defaultTheme="light">
        <ThemeConsumer />
      </ThemeProvider>,
    );
    expect(document.body.classList.contains('light')).toBe(true);
    fireEvent.click(screen.getByTestId('set-dark'));
    expect(document.body.classList.contains('light')).toBe(false);
  });

  it('throws if useTheme is used outside ThemeProvider', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => render(<ThemeConsumer />)).toThrow();
    spy.mockRestore();
  });
});
