import { describe, expect, it, beforeEach } from 'vitest';
import { renderApp, screen, waitFor } from '@/test/test-utils';

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
});
