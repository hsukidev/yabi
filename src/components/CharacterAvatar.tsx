import { useState, type CSSProperties } from 'react';
import blankCharacterPng from '../assets/blank-character.png';

// Nexon character avatar PNGs are square (e.g. 96×96) with the figure padded
// inside. The placeholder PNG ships tall (43×68). To keep both renderings
// aligned we pin the wrapper to a 1:1 box in fluid mode — the placeholder then
// letterboxes inside the same square frame a real avatar fills, so both share
// identical bounding-box dimensions in the layout (e.g. 179.5×179.5 in cards).
// The placeholder figure is tightly cropped, so we scale it down to roughly
// match the relative figure size of a real avatar (which has its own padding).
const REAL_AVATAR_SCALE = 0.9;
const PLACEHOLDER_SCALE = 0.7;

interface CharacterAvatarProps {
  avatarUrl: string | null | undefined;
  // Number → px. String → CSS value (e.g. `"100%"` to fill the parent box).
  size: number | string;
  alt?: string;
  'data-testid'?: string;
}

export function CharacterAvatar({
  avatarUrl,
  size,
  alt = '',
  'data-testid': testId,
}: CharacterAvatarProps) {
  // Track the specific URL that failed to load, not the rendered src — so
  // when `avatarUrl` changes (e.g. after a successful character lookup) the
  // new URL is attempted automatically. Keying error state by URL also
  // means a re-applied known-bad URL stays on the placeholder without a
  // retry storm.
  const [erroredSrc, setErroredSrc] = useState<string | null>(null);
  const displayedSrc = !avatarUrl || erroredSrc === avatarUrl ? blankCharacterPng : avatarUrl;
  const isPlaceholder = displayedSrc === blankCharacterPng;

  const isFluid = typeof size === 'string';

  const wrapperStyle: CSSProperties = isFluid
    ? {
        width: size,
        maxWidth: '100%',
        maxHeight: '100%',
        aspectRatio: '1',
        overflow: 'hidden',
        flexShrink: 0,
      }
    : {
        width: size,
        height: size,
        overflow: 'hidden',
        flexShrink: 0,
      };

  const imgStyle = {
    width: '100%',
    height: '100%',
    objectFit: 'contain',
    transform: isPlaceholder
      ? `translateY(5%) scale(${PLACEHOLDER_SCALE})`
      : `scale(${REAL_AVATAR_SCALE})`,
    transformOrigin: 'center',
    WebkitUserDrag: 'none',
    userDrag: 'none',
  } as CSSProperties;

  return (
    <div style={wrapperStyle}>
      <img
        src={displayedSrc}
        alt={alt}
        aria-hidden={alt === '' ? true : undefined}
        draggable={false}
        data-testid={testId}
        onError={() => {
          // Stored avatarUrl 404? Record the failed URL so render falls
          // back to the placeholder. A later prop update to a different
          // URL bypasses this gate and is attempted fresh.
          setErroredSrc(avatarUrl ?? null);
        }}
        style={imgStyle}
      />
    </div>
  );
}
