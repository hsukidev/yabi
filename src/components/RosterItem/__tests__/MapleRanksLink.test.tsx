import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '../../../test/test-utils';
import { MapleRanksLink } from '../MapleRanksLink';

describe('MapleRanksLink', () => {
  const LINK_NAME = /view .* on mapleranks/i;

  it.each([
    ['heroic-kronos', 'https://mapleranks.com/u/Test'],
    ['heroic-hyperion', 'https://mapleranks.com/u/Test'],
    ['heroic-solis', 'https://mapleranks.com/u/eu/Test'],
    ['interactive-scania', 'https://mapleranks.com/u/Test'],
    ['interactive-bera', 'https://mapleranks.com/u/Test'],
    ['interactive-luna', 'https://mapleranks.com/u/eu/Test'],
  ] as const)('routes %s through its Region', (worldId, destination) => {
    render(<MapleRanksLink name="Test" worldId={worldId} />);
    expect(screen.getByRole('link', { name: LINK_NAME }).getAttribute('href')).toBe(destination);
  });

  it('links to the trimmed, encoded name and announces native new-tab navigation', () => {
    render(<MapleRanksLink name="  Súki/Den ?#  " worldId="heroic-kronos" />);

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
    const { rerender } = render(<MapleRanksLink name="sukiden" worldId="heroic-kronos" />);
    expect(screen.getByRole('link', { name: LINK_NAME }).getAttribute('href')).toBe(
      'https://mapleranks.com/u/sukiden',
    );

    rerender(<MapleRanksLink name="NewName" worldId="heroic-kronos" />);
    expect(screen.getByRole('link', { name: LINK_NAME }).getAttribute('href')).toBe(
      'https://mapleranks.com/u/NewName',
    );

    rerender(<MapleRanksLink name={' \n\t '} worldId="heroic-kronos" />);
    expect(screen.queryByRole('link', { name: LINK_NAME })).toBeNull();
    rerender(<MapleRanksLink name="" worldId="heroic-kronos" />);
    expect(screen.queryByRole('link', { name: LINK_NAME })).toBeNull();
  });

  it('uses the Mule World Id for EU routing and shows the selected site on focus', async () => {
    render(<MapleRanksLink name="  sukiden  " worldId="interactive-luna" />);
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
        <MapleRanksLink name="sukiden" worldId="heroic-kronos" />
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
