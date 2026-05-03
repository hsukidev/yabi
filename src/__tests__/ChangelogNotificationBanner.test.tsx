import { describe, expect, it, beforeEach } from 'vitest';
import { fireEvent, renderApp, screen, waitFor } from '@/test/test-utils';
import { releases } from '@/data/changelog';
import { SEEN_KEY } from '@/hooks/useChangelogNotification';
import { STORAGE_KEY as MULE_KEY } from '@/persistence/muleStorage';

const PRE_EXISTING_PAYLOAD = '{"schemaVersion":4,"mules":[]}';

describe('Changelog Notification Banner', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('does not render for a first-time user and silently catches them up to the latest release', async () => {
    await renderApp({ initialPath: '/' });
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /add mule/i })).toBeTruthy();
    });
    expect(screen.queryByRole('status', { name: /what's new/i })).toBeNull();
    expect(localStorage.getItem(SEEN_KEY)).toBe(releases[0]?.version);
  });

  it('renders for a pre-existing user (mule storage key present, no lastSeenChangelog)', async () => {
    localStorage.setItem(MULE_KEY, PRE_EXISTING_PAYLOAD);
    await renderApp({ initialPath: '/' });
    expect(await screen.findByRole('status', { name: /what's new/i })).toBeTruthy();
    expect(localStorage.getItem(SEEN_KEY)).toBeNull();
  });

  it('does not render for a caught-up user (lastSeenChangelog matches latest)', async () => {
    localStorage.setItem(MULE_KEY, PRE_EXISTING_PAYLOAD);
    localStorage.setItem(SEEN_KEY, releases[0]!.version);
    await renderApp({ initialPath: '/' });
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /add mule/i })).toBeTruthy();
    });
    expect(screen.queryByRole('status', { name: /what's new/i })).toBeNull();
  });

  it('renders the "Check out what\'s new!" copy for an out-of-date user', async () => {
    localStorage.setItem(MULE_KEY, PRE_EXISTING_PAYLOAD);
    localStorage.setItem(SEEN_KEY, '0.0.0');
    await renderApp({ initialPath: '/' });
    const banner = await screen.findByRole('status', { name: /what's new/i });
    expect(banner.textContent).toMatch(/check out/i);
    expect(banner.textContent).toMatch(/what's new/i);
  });

  it('hides the banner and persists lastSeenChangelog when the dismiss button is clicked', async () => {
    localStorage.setItem(MULE_KEY, PRE_EXISTING_PAYLOAD);
    localStorage.setItem(SEEN_KEY, '0.0.0');
    await renderApp({ initialPath: '/' });
    await screen.findByRole('status', { name: /what's new/i });
    fireEvent.click(screen.getByRole('button', { name: /dismiss what's new/i }));
    await waitFor(() => {
      expect(screen.queryByRole('status', { name: /what's new/i })).toBeNull();
    });
    expect(localStorage.getItem(SEEN_KEY)).toBe(releases[0]!.version);
  });

  it('marks the latest release as seen when the user visits /changelog', async () => {
    localStorage.setItem(MULE_KEY, PRE_EXISTING_PAYLOAD);
    localStorage.setItem(SEEN_KEY, '0.0.0');
    await renderApp({ initialPath: '/changelog' });
    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 1, name: /changelog/i })).toBeTruthy();
    });
    await waitFor(() => {
      expect(localStorage.getItem(SEEN_KEY)).toBe(releases[0]!.version);
    });
  });

  it('navigates to /changelog when the inline "what\'s new" link is clicked', async () => {
    localStorage.setItem(MULE_KEY, PRE_EXISTING_PAYLOAD);
    localStorage.setItem(SEEN_KEY, '0.0.0');
    await renderApp({ initialPath: '/' });
    const banner = await screen.findByRole('status', { name: /what's new/i });
    const link = banner.querySelector('a[href="/changelog"]');
    if (!link) throw new Error("what's new link not found in banner");
    fireEvent.click(link);
    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 1, name: /changelog/i })).toBeTruthy();
    });
  });
});
