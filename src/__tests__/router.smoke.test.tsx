import { describe, expect, it, beforeEach } from 'vitest';
import { fireEvent, renderApp, screen, waitFor } from '@/test/test-utils';

// The header may render multiple "changelog"-named links in the future
// (e.g. footer link), so match on the href to pick the nav link specifically.
async function findChangelogNavLink() {
  return await waitFor(() => {
    const link = screen
      .getAllByRole('link', { name: /changelog/i })
      .find((el) => el.getAttribute('href') === '/changelog');
    if (!link) throw new Error('Changelog nav link not found');
    return link;
  });
}

describe('Router smoke', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove('dark');
    localStorage.setItem('world', 'heroic-kronos');
  });

  it('mounts the dashboard at "/" with the Add Card visible', async () => {
    await renderApp({ initialPath: '/' });
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /add mule/i })).toBeTruthy();
    });
  });

  it('renders the Header with the YABI wordmark linking to "/"', async () => {
    await renderApp({ initialPath: '/' });
    await waitFor(() => {
      const wordmark = screen.getByText('YABI');
      const link = wordmark.closest('a');
      expect(link).not.toBeNull();
      // TanStack Router renders absolute hrefs starting with `/`.
      expect(link!.getAttribute('href')).toBe('/');
    });
  });

  it('mounts the changelog page at "/changelog"', async () => {
    await renderApp({ initialPath: '/changelog' });
    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 1, name: /changelog/i })).toBeTruthy();
    });
  });

  it('navigates from "/" to "/changelog" when the Header Changelog link is clicked', async () => {
    await renderApp({ initialPath: '/' });
    fireEvent.click(await findChangelogNavLink());
    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 1, name: /changelog/i })).toBeTruthy();
    });
  });

  it('navigates from "/changelog" back to "/" when the logo is clicked', async () => {
    await renderApp({ initialPath: '/changelog' });
    const wordmark = await waitFor(() => screen.getByText('YABI'));
    const logoLink = wordmark.closest('a')!;
    fireEvent.click(logoLink);
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /add mule/i })).toBeTruthy();
    });
  });

  it('marks the Header Changelog link as active when on "/changelog"', async () => {
    await renderApp({ initialPath: '/changelog' });
    expect((await findChangelogNavLink()).getAttribute('data-active')).toBe('true');
  });

  it('does not mark the Header Changelog link as active when on "/"', async () => {
    await renderApp({ initialPath: '/' });
    expect((await findChangelogNavLink()).getAttribute('data-active')).toBe('false');
  });
});
