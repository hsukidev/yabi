import { describe, expect, it } from 'vitest';
import { render, screen, fireEvent } from '../../test/test-utils';
import { CharacterAvatar } from '../CharacterAvatar';

const REAL_URL = 'https://msavatar1.nexon.net/Character/test.png';

describe('CharacterAvatar', () => {
  it('renders the avatar URL when provided', () => {
    render(<CharacterAvatar avatarUrl={REAL_URL} size={112} data-testid="avatar" />);
    const img = screen.getByTestId('avatar') as HTMLImageElement;
    expect(img.src).toBe(REAL_URL);
  });

  it('renders the placeholder when avatarUrl is null', () => {
    render(<CharacterAvatar avatarUrl={null} size={112} data-testid="avatar" />);
    const img = screen.getByTestId('avatar') as HTMLImageElement;
    expect(img.src).toMatch(/blank-character/);
  });

  it('renders the placeholder when avatarUrl is undefined', () => {
    render(<CharacterAvatar avatarUrl={undefined} size={112} data-testid="avatar" />);
    const img = screen.getByTestId('avatar') as HTMLImageElement;
    expect(img.src).toMatch(/blank-character/);
  });

  it('switches the rendered source to the placeholder on image error', () => {
    render(<CharacterAvatar avatarUrl={REAL_URL} size={112} data-testid="avatar" />);
    const img = screen.getByTestId('avatar') as HTMLImageElement;
    expect(img.src).toBe(REAL_URL);
    fireEvent.error(img);
    expect(img.src).toMatch(/blank-character/);
  });

  it('applies a scale transform when rendering a real avatar URL', () => {
    render(<CharacterAvatar avatarUrl={REAL_URL} size={112} data-testid="avatar" />);
    const img = screen.getByTestId('avatar') as HTMLImageElement;
    expect(img.style.transform).toMatch(/scale\(/);
  });

  it('applies a scale transform when rendering the placeholder (sized down to match real-avatar figure)', () => {
    render(<CharacterAvatar avatarUrl={null} size={112} data-testid="avatar" />);
    const img = screen.getByTestId('avatar') as HTMLImageElement;
    expect(img.style.transform).toMatch(/scale\(/);
  });

  it('keeps a scale transform after an image load error falls back to the placeholder', () => {
    render(<CharacterAvatar avatarUrl={REAL_URL} size={112} data-testid="avatar" />);
    const img = screen.getByTestId('avatar') as HTMLImageElement;
    expect(img.style.transform).toMatch(/scale\(/);
    fireEvent.error(img);
    expect(img.style.transform).toMatch(/scale\(/);
  });

  it('marks the image aria-hidden when alt is empty (default)', () => {
    render(<CharacterAvatar avatarUrl={REAL_URL} size={112} data-testid="avatar" />);
    const img = screen.getByTestId('avatar');
    expect(img.getAttribute('aria-hidden')).not.toBeNull();
    expect(img.getAttribute('alt')).toBe('');
  });

  it('does not mark the image aria-hidden when alt is non-empty', () => {
    render(<CharacterAvatar avatarUrl={REAL_URL} size={132} alt="HeroOne" data-testid="avatar" />);
    const img = screen.getByTestId('avatar');
    expect(img.getAttribute('aria-hidden')).toBeNull();
    expect(img.getAttribute('alt')).toBe('HeroOne');
  });

  it('updates the rendered src when avatarUrl changes from undefined to a URL', () => {
    // Regression: the drawer/card avatar must refresh when a successful
    // character lookup populates `mule.avatarUrl` after mount.
    const { rerender } = render(
      <CharacterAvatar avatarUrl={undefined} size={112} data-testid="avatar" />,
    );
    const img = screen.getByTestId('avatar') as HTMLImageElement;
    expect(img.src).toMatch(/blank-character/);
    rerender(<CharacterAvatar avatarUrl={REAL_URL} size={112} data-testid="avatar" />);
    expect(img.src).toBe(REAL_URL);
  });

  it('attempts a new avatarUrl after a prior URL failed to load', () => {
    const NEXT_URL = 'https://msavatar1.nexon.net/Character/next.png';
    const { rerender } = render(
      <CharacterAvatar avatarUrl={REAL_URL} size={112} data-testid="avatar" />,
    );
    const img = screen.getByTestId('avatar') as HTMLImageElement;
    fireEvent.error(img);
    expect(img.src).toMatch(/blank-character/);
    rerender(<CharacterAvatar avatarUrl={NEXT_URL} size={112} data-testid="avatar" />);
    expect(img.src).toBe(NEXT_URL);
  });

  it('keeps the placeholder when the same failed avatarUrl is re-applied', () => {
    const { rerender } = render(
      <CharacterAvatar avatarUrl={REAL_URL} size={112} data-testid="avatar" />,
    );
    const img = screen.getByTestId('avatar') as HTMLImageElement;
    fireEvent.error(img);
    expect(img.src).toMatch(/blank-character/);
    rerender(<CharacterAvatar avatarUrl={REAL_URL} size={112} data-testid="avatar" />);
    expect(img.src).toMatch(/blank-character/);
  });
});
