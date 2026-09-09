import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '../../../test/test-utils';
import { TrackerProfileLink } from '../TrackerProfileLink';

describe('TrackerProfileLink', () => {
  const LINK_NAME = /view .* on mapleranks/i;

  beforeEach(() => {
    localStorage.removeItem('trackerPreference');
  });

  it.each([
    ['heroic-kronos', 'https://mapleranks.com/u/Test'],
    ['heroic-hyperion', 'https://mapleranks.com/u/Test'],
    ['heroic-solis', 'https://mapleranks.com/u/eu/Test'],
    ['interactive-scania', 'https://mapleranks.com/u/Test'],
    ['interactive-bera', 'https://mapleranks.com/u/Test'],
    ['interactive-luna', 'https://mapleranks.com/u/eu/Test'],
  ] as const)('routes %s through its Region', (worldId, destination) => {
    render(<TrackerProfileLink name="Test" worldId={worldId} />);
    expect(screen.getByRole('link', { name: LINK_NAME }).getAttribute('href')).toBe(destination);
  });

  it.each([
    ['mapleranks', 'heroic-kronos', 'https://mapleranks.com/u/Test'],
    ['mapleranks', 'heroic-solis', 'https://mapleranks.com/u/eu/Test'],
    ['maplebot', 'interactive-scania', 'https://maplebot.io/character/Test?region=NA'],
    ['maplebot', 'interactive-luna', 'https://maplebot.io/character/Test?region=EU'],
    ['maplehub', 'heroic-hyperion', 'https://maplehub.app/roster/na/Test'],
    ['maplehub', 'interactive-luna', 'https://maplehub.app/roster/eu/Test'],
  ] as const)('%s builds its exact %s destination', (tracker, worldId, destination) => {
    localStorage.setItem('trackerPreference', tracker);
    render(<TrackerProfileLink name="Test" worldId={worldId} />);
    expect(screen.getByRole('link').getAttribute('href')).toBe(destination);
  });

  it('falls back to MapleRanks for an unrecognized saved preference', () => {
    localStorage.setItem('trackerPreference', 'unknown-site');
    render(<TrackerProfileLink name="Test" worldId="heroic-kronos" />);
    expect(screen.getByRole('link', { name: LINK_NAME }).getAttribute('href')).toBe(
      'https://mapleranks.com/u/Test',
    );
  });

  it('links to the trimmed, encoded name and announces native new-tab navigation', () => {
    render(<TrackerProfileLink name="  Súki/Den ?#  " worldId="heroic-kronos" />);

    const link = screen.getByRole('link', { name: LINK_NAME });
    expect(link.getAttribute('href')).toBe('https://mapleranks.com/u/S%C3%BAki%2FDen%20%3F%23');
    expect(link.getAttribute('aria-label')).toMatch(/new tab/i);
    expect(link.getAttribute('target')).toBe('_blank');
    expect(link.getAttribute('rel')?.split(/\s+/)).toEqual(
      expect.arrayContaining(['noopener', 'noreferrer']),
    );
    expect(link.getAttribute('draggable')).toBe('false');
  });

  it('follows saved name changes and disappears when the name becomes blank', () => {
    const { rerender } = render(<TrackerProfileLink name="sukiden" worldId="heroic-kronos" />);
    expect(screen.getByRole('link', { name: LINK_NAME }).getAttribute('href')).toBe(
      'https://mapleranks.com/u/sukiden',
    );

    rerender(<TrackerProfileLink name="NewName" worldId="heroic-kronos" />);
    expect(screen.getByRole('link', { name: LINK_NAME }).getAttribute('href')).toBe(
      'https://mapleranks.com/u/NewName',
    );

    rerender(<TrackerProfileLink name={' \n\t '} worldId="heroic-kronos" />);
    expect(screen.queryByRole('link', { name: LINK_NAME })).toBeNull();
    rerender(<TrackerProfileLink name="" worldId="heroic-kronos" />);
    expect(screen.queryByRole('link', { name: LINK_NAME })).toBeNull();
  });

  it('uses the Mule World Id for EU routing and shows the selected site on focus', async () => {
    render(<TrackerProfileLink name="  sukiden  " worldId="interactive-luna" />);
    expect(screen.getByRole('link', { name: LINK_NAME }).getAttribute('href')).toBe(
      'https://mapleranks.com/u/eu/sukiden',
    );
    fireEvent.focus(screen.getByRole('link', { name: LINK_NAME }));
    expect(await screen.findByText('View on MapleRanks')).toBeTruthy();
  });

  it('keeps mouse, keyboard, and touch activation away from the roster without cancelling defaults', () => {
    const onAncestorEvent = vi.fn();
    render(
      <div
        onClick={onAncestorEvent}
        onMouseDown={onAncestorEvent}
        onPointerDown={onAncestorEvent}
        onKeyDown={onAncestorEvent}
        onTouchStart={onAncestorEvent}
      >
        <TrackerProfileLink name="sukiden" worldId="heroic-kronos" />
      </div>,
    );

    const link = screen.getByRole('link', { name: LINK_NAME });
    // MouseSensor listens to mousedown separately from pointerdown.
    // fireEvent returns false if a handler cancels the native default action.
    expect(fireEvent.pointerDown(link, { cancelable: true })).toBe(true);
    expect(fireEvent.mouseDown(link, { button: 0, cancelable: true })).toBe(true);
    expect(fireEvent.keyDown(link, { key: 'Enter', cancelable: true })).toBe(true);
    expect(fireEvent.touchStart(link, { cancelable: true })).toBe(true);
    expect(fireEvent.click(link, { cancelable: true })).toBe(true);
    expect(onAncestorEvent).not.toHaveBeenCalled();
  });
});
