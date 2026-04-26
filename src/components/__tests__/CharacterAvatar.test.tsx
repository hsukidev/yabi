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

  it('does not apply a scale transform when rendering the placeholder', () => {
    render(<CharacterAvatar avatarUrl={null} size={112} data-testid="avatar" />);
    const img = screen.getByTestId('avatar') as HTMLImageElement;
    expect(img.style.transform || '').not.toMatch(/scale\(/);
  });

  it('removes the scale transform after an image load error falls back to the placeholder', () => {
    render(<CharacterAvatar avatarUrl={REAL_URL} size={112} data-testid="avatar" />);
    const img = screen.getByTestId('avatar') as HTMLImageElement;
    expect(img.style.transform).toMatch(/scale\(/);
    fireEvent.error(img);
    expect(img.style.transform || '').not.toMatch(/scale\(/);
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
});
