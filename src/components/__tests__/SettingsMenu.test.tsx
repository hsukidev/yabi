import { beforeEach, describe, expect, it } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@/test/test-utils';

import { SettingsMenu } from '../SettingsMenu';
import { TrackerProfileLink } from '../RosterItem/TrackerProfileLink';

describe('SettingsMenu', () => {
  beforeEach(() => {
    localStorage.removeItem('trackerPreference');
  });

  it('renders a gear button labelled "Settings"', () => {
    render(<SettingsMenu />);
    expect(screen.getByRole('button', { name: 'Settings' })).toBeTruthy();
  });

  it('keeps the menu unmounted while closed', () => {
    render(<SettingsMenu />);
    expect(screen.queryByRole('menu')).toBeNull();
  });

  it('opens with Data Management followed by Tracker Preference', async () => {
    render(<SettingsMenu />);
    fireEvent.click(screen.getByRole('button', { name: 'Settings' }));
    await waitFor(() => {
      expect(screen.getByRole('menu')).toBeTruthy();
    });
    const items = screen.getAllByRole('menuitem');
    expect(items.length).toBe(2);
    expect(items[0].textContent).toContain('Data Management');
    expect(items[1].textContent).toContain('Tracker Preference');
  });

  it('chooses and remembers one External Tracker without closing the dialog', async () => {
    render(
      <>
        <SettingsMenu />
        <TrackerProfileLink name="Súki/Den" worldId="heroic-solis" />
      </>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Settings' }));
    fireEvent.click(await screen.findByRole('menuitem', { name: /Tracker Preference/ }));

    const dialog = await screen.findByRole('dialog', { name: 'Tracker Preference' });
    const radios = screen.getAllByRole('radio');
    expect(radios.map((radio) => radio.getAttribute('aria-checked'))).toEqual([
      'true',
      'false',
      'false',
    ]);
    expect(dialog.textContent).toMatch(/MapleRanks.*mapleranks\.com/);
    expect(dialog.textContent).toMatch(/MapleBot.*maplebot\.io/);
    expect(dialog.textContent).toMatch(/MapleHub.*maplehub\.app/);

    fireEvent.click(screen.getByRole('radio', { name: /MapleBot/ }));
    expect(screen.getByRole('dialog', { name: 'Tracker Preference' })).toBeTruthy();
    expect(screen.getByRole('radio', { name: /MapleBot/ }).getAttribute('aria-checked')).toBe(
      'true',
    );
    expect(localStorage.getItem('trackerPreference')).toBe('maplebot');

    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(
      screen.getByRole('link', { name: /View Súki\/Den on MapleBot/ }).getAttribute('href'),
    ).toBe('https://maplebot.io/character/S%C3%BAki%2FDen?region=EU');

    fireEvent.click(screen.getByRole('button', { name: 'Settings' }));
    fireEvent.click(await screen.findByRole('menuitem', { name: /Tracker Preference/ }));
    expect(
      (await screen.findByRole('radio', { name: /MapleBot/ })).getAttribute('aria-checked'),
    ).toBe('true');
  });

  it('moves and selects within the radio group with arrow keys', async () => {
    render(<SettingsMenu />);
    fireEvent.click(screen.getByRole('button', { name: 'Settings' }));
    fireEvent.click(await screen.findByRole('menuitem', { name: /Tracker Preference/ }));

    const mapleRanks = await screen.findByRole('radio', { name: /MapleRanks/ });
    mapleRanks.focus();
    fireEvent.keyDown(mapleRanks, { key: 'ArrowDown' });

    const mapleBot = screen.getByRole('radio', { name: /MapleBot/ });
    expect(mapleBot.getAttribute('aria-checked')).toBe('true');
    expect(document.activeElement).toBe(mapleBot);
  });

  it('activating "Data Management" opens the dialog with chooser screen', async () => {
    render(<SettingsMenu />);
    fireEvent.click(screen.getByRole('button', { name: 'Settings' }));
    await waitFor(() => {
      expect(screen.getByRole('menu')).toBeTruthy();
    });
    fireEvent.click(screen.getByRole('menuitem', { name: /Data Management/ }));
    await waitFor(() => {
      expect(screen.getByText('Export Data')).toBeTruthy();
    });
    expect(screen.getByText('Import Data')).toBeTruthy();
  });
});
