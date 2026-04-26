import { useState, type CSSProperties } from 'react';
import blankCharacterPng from '../assets/blank-character.png';

// Nexon character avatar PNGs include significant transparent padding around
// the figure, so with `object-fit: contain` the character occupies only a
// fraction of the box. The placeholder PNG is tightly cropped to the figure,
// so it fills the box. We compensate with a CSS scale on real-avatar art only;
// the placeholder renders un-scaled. Tune by eye if a class of avatars clips.
const REAL_AVATAR_SCALE = 1.45;

interface CharacterAvatarProps {
  avatarUrl: string | null | undefined;
  size: number;
  alt?: string;
  'data-testid'?: string;
}

export function CharacterAvatar({
  avatarUrl,
  size,
  alt = '',
  'data-testid': testId,
}: CharacterAvatarProps) {
  const initialSrc = avatarUrl || blankCharacterPng;
  const [displayedSrc, setDisplayedSrc] = useState(initialSrc);
  const isPlaceholder = displayedSrc === blankCharacterPng;
  const decorative = alt === '';

  const wrapperStyle: CSSProperties = {
    width: size,
    height: size,
    overflow: 'hidden',
    flexShrink: 0,
  };

  const imgStyle: CSSProperties = {
    width: size,
    height: size,
    objectFit: 'contain',
    transform: isPlaceholder ? undefined : `scale(${REAL_AVATAR_SCALE})`,
    transformOrigin: 'center',
    WebkitUserDrag: 'none',
    userDrag: 'none',
  } as CSSProperties;

  return (
    <div style={wrapperStyle}>
      <img
        src={displayedSrc}
        alt={alt}
        aria-hidden={decorative ? true : undefined}
        draggable={false}
        data-testid={testId}
        onError={() => {
          // Stored avatarUrl 404? Drop to the blank PNG so we don't render a
          // broken-image glyph. Source-equality is what removes the scale, so
          // the fallback isn't over-scaled.
          setDisplayedSrc(blankCharacterPng);
        }}
        style={imgStyle}
      />
    </div>
  );
}
