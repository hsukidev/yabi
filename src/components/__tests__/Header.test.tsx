import { describe, expect, it, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@/test/test-utils';
import { Header } from '../Header';

describe('Header (shadcn/ThemeProvider)', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove('dark');
    document.body.classList.remove('light');
  });

  it('renders theme toggle button', () => {
    render(<Header />, { defaultTheme: 'dark' });
    const toggleBtn = screen.getByLabelText('Switch to light mode');
    expect(toggleBtn).toBeTruthy();
  });

  it('theme toggle button has pointer cursor on hover', () => {
    render(<Header />, { defaultTheme: 'dark' });
    const toggleBtn = screen.getByLabelText('Switch to light mode');
    expect(toggleBtn.className).toContain('cursor-pointer');
  });

  it('shows correct aria-label for dark mode (Switch to light mode)', () => {
    render(<Header />, { defaultTheme: 'dark' });
    expect(screen.getByLabelText('Switch to light mode')).toBeTruthy();
  });

  it('shows correct aria-label for light mode (Switch to dark mode)', () => {
    render(<Header />, { defaultTheme: 'light' });
    expect(screen.getByLabelText('Switch to dark mode')).toBeTruthy();
  });

  it('toggles theme on button click', () => {
    render(<Header />, { defaultTheme: 'dark' });
    expect(document.documentElement.classList.contains('dark')).toBe(true);
    fireEvent.click(screen.getByLabelText('Switch to light mode'));
    expect(document.documentElement.classList.contains('dark')).toBe(false);
  });
});
