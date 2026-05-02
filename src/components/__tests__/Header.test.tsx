import { describe, expect, it, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, within, waitFor } from '@/test/test-utils';
import { Header } from '../Header';

// `<Header />` is mounted in isolation here, so the TanStack Router
// `<Link>` it wraps the logo with has no router context. Stub `Link` to a
// plain anchor — full routing is exercised in the app-level smoke tests.
vi.mock('@tanstack/react-router', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tanstack/react-router')>();
  return {
    ...actual,
    Link: ({
      to,
      children,
      ...rest
    }: {
      to: string;
      children: React.ReactNode;
    } & React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
      <a href={to} {...rest}>
        {children}
      </a>
    ),
  };
});

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

describe('Header WorldSelect integration', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove('dark');
    document.body.classList.remove('light');
  });

  it('renders the WorldSelect placeholder (Select world) when no world is selected', () => {
    render(<Header />, { defaultWorld: null });
    // The desktop chip trigger shows the placeholder text.
    const triggers = screen.getAllByText(/select world/i);
    expect(triggers.length).toBeGreaterThan(0);
  });

  it('renders the selected world label in the trigger when a world is pre-selected', () => {
    render(<Header />, { defaultWorld: 'heroic-kronos' });
    expect(screen.getByText('Kronos')).toBeTruthy();
  });

  it('renders the WorldSelect trigger with aria-label="Select world" at every viewport', () => {
    render(<Header />, { defaultWorld: null });
    const trigger = screen.getByLabelText('Select world');
    expect(trigger).toBeTruthy();
  });

  it('renders the WorldSelect before the theme toggle (countdown lives on the KpiCard now)', () => {
    render(<Header />, { defaultWorld: null });
    const themeToggle = screen.getByLabelText('Switch to light mode');
    const rightSide = themeToggle.parentElement!;
    const children = Array.from(rightSide.children);
    const worldSelectIdx = children.findIndex(
      (c) => c.getAttribute('aria-label') === 'Select world',
    );
    const themeIdx = children.indexOf(themeToggle);
    expect(worldSelectIdx).toBeGreaterThanOrEqual(0);
    expect(themeIdx).toBeGreaterThan(worldSelectIdx);
  });

  it('does not render the Reset Countdown in the header (it lives on the KpiCard)', () => {
    const { container } = render(<Header />, { defaultWorld: null });
    expect(container.textContent ?? '').not.toMatch(/RESET IN/i);
  });

  it('opens the panel with two groups (HEROIC and INTERACTIVE) when the trigger is clicked', async () => {
    render(<Header />, { defaultWorld: null });
    const trigger = screen.getByLabelText('Select world');
    fireEvent.click(trigger);

    await waitFor(() => {
      expect(screen.getByText('HEROIC')).toBeTruthy();
      expect(screen.getByText('INTERACTIVE')).toBeTruthy();
    });

    // HEROIC should come before INTERACTIVE in document order.
    const heroic = screen.getByText('HEROIC');
    const interactive = screen.getByText('INTERACTIVE');
    expect(heroic.compareDocumentPosition(interactive) & Node.DOCUMENT_POSITION_FOLLOWING).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    );
  });

  it('renders all six worlds grouped correctly when the panel is open', async () => {
    render(<Header />, { defaultWorld: null });
    fireEvent.click(screen.getByLabelText('Select world'));

    await waitFor(() => {
      expect(screen.getByRole('option', { name: 'Kronos' })).toBeTruthy();
    });

    expect(screen.getByRole('option', { name: 'Kronos' })).toBeTruthy();
    expect(screen.getByRole('option', { name: 'Hyperion' })).toBeTruthy();
    expect(screen.getByRole('option', { name: 'Solis' })).toBeTruthy();
    expect(screen.getByRole('option', { name: 'Scania' })).toBeTruthy();
    expect(screen.getByRole('option', { name: 'Bera' })).toBeTruthy();
    expect(screen.getByRole('option', { name: 'Luna' })).toBeTruthy();
  });

  it('selecting an option updates the trigger label', async () => {
    render(<Header />, { defaultWorld: null });
    fireEvent.click(screen.getByLabelText('Select world'));

    await waitFor(() => {
      expect(screen.getByRole('option', { name: 'Hyperion' })).toBeTruthy();
    });

    fireEvent.click(screen.getByRole('option', { name: 'Hyperion' }));

    await waitFor(() => {
      expect(screen.getByText('Hyperion')).toBeTruthy();
    });
  });

  it('persists the selection across renders when defaultWorld is supplied', () => {
    // This mirrors the "refresh persists" criterion — when WorldProvider
    // initializes from localStorage (simulated via defaultWorld), the trigger
    // renders the stored world's label without user interaction.
    render(<Header />, { defaultWorld: 'interactive-bera' });
    expect(screen.getByText('Bera')).toBeTruthy();
  });

  it('shows a check indicator next to the selected row when the panel reopens', async () => {
    render(<Header />, { defaultWorld: 'heroic-hyperion' });
    fireEvent.click(screen.getByLabelText('Select world'));

    await waitFor(() => {
      expect(screen.getByRole('option', { name: /Hyperion/ })).toBeTruthy();
    });

    const selectedOption = screen.getByRole('option', { name: /Hyperion/ });
    // Base UI's SelectItem exposes `data-selected` on the selected item.
    expect(selectedOption.getAttribute('data-selected')).not.toBeNull();
    // The ItemIndicator renders an svg (lucide Check) inside the selected row.
    expect(within(selectedOption).getByTestId('world-select-check')).toBeTruthy();
  });
});
