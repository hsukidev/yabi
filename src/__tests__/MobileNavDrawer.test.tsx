import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@/test/test-utils';
import { MobileNavDrawer } from '../components/MobileNavDrawer';
import { navItems } from '../constants/navItems';

// `<MobileNavDrawer />` is mounted in isolation, so the TanStack Router
// `<Link>` it renders inside the drawer has no router context. Stub `Link`
// to a plain anchor — full link routing is exercised in the app-level
// smoke tests.
vi.mock('@tanstack/react-router', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tanstack/react-router')>();
  return {
    ...actual,
    Link: ({
      to,
      children,
      onClick,
      ...rest
    }: {
      to: string;
      children: React.ReactNode;
    } & React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
      <a
        href={to}
        onClick={(e) => {
          e.preventDefault();
          onClick?.(e);
        }}
        {...rest}
      >
        {children}
      </a>
    ),
  };
});

function queryDrawer() {
  return document.querySelector('[data-mobile-nav-drawer]');
}

function openDrawer() {
  fireEvent.click(screen.getByLabelText(/open navigation menu/i));
}

async function waitForOpenDrawer() {
  return await waitFor(() => {
    const el = queryDrawer();
    if (!el) throw new Error('drawer not open yet');
    return el;
  });
}

describe('MobileNavDrawer', () => {
  it('does not render drawer content initially', () => {
    render(<MobileNavDrawer />);
    expect(queryDrawer()).toBeNull();
  });

  it('opens the drawer when the hamburger button is clicked', async () => {
    render(<MobileNavDrawer />);
    openDrawer();
    await waitForOpenDrawer();
  });

  it("drawer's nav items match the shared navItems constant", async () => {
    render(<MobileNavDrawer />);
    openDrawer();
    const drawer = await waitForOpenDrawer();

    expect(navItems.length).toBeGreaterThan(0);
    const renderedLinks = Array.from(drawer.querySelectorAll('a'));
    expect(renderedLinks).toHaveLength(navItems.length);

    for (const item of navItems) {
      const link = drawer.querySelector(`a[href="${item.to}"]`);
      expect(link).toBeTruthy();
      expect(link!.textContent).toContain(item.label);
    }
  });

  it('closes when an internal link is clicked', async () => {
    render(<MobileNavDrawer />);
    openDrawer();
    const drawer = await waitForOpenDrawer();

    const link = drawer.querySelector(`a[href="${navItems[0].to}"]`) as HTMLAnchorElement;
    fireEvent.click(link);

    await waitFor(() => {
      expect(queryDrawer()).toBeNull();
    });
  });

  it('closes when the overlay is clicked', async () => {
    render(<MobileNavDrawer />);
    openDrawer();
    await waitForOpenDrawer();

    const overlay = document.querySelector('[data-slot="sheet-overlay"]') as HTMLElement;
    expect(overlay).toBeTruthy();
    fireEvent.click(overlay);

    await waitFor(() => {
      expect(queryDrawer()).toBeNull();
    });
  });

  it('closes when Escape is pressed', async () => {
    render(<MobileNavDrawer />);
    openDrawer();
    const drawer = await waitForOpenDrawer();

    fireEvent.keyDown(drawer, { key: 'Escape', code: 'Escape' });

    await waitFor(() => {
      expect(queryDrawer()).toBeNull();
    });
  });
});
