import { useState } from 'react';
import { ROSTER_CARD_ASPECT, ROSTER_CARD_MIN_HEIGHT } from './rosterCardContract';

interface AddCardProps {
  onClick: () => void;
}

export function AddCard({ onClick }: AddCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  return (
    <div
      data-add-card
      role="button"
      tabIndex={0}
      aria-label="Add mule"
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        padding: 'var(--card-pad, 16px)',
        borderRadius: 'var(--radius, 14px)',
        border: '2px dashed',
        borderColor: isHovered ? 'var(--accent-raw, var(--accent))' : 'var(--border)',
        background: isHovered ? 'var(--accent-soft)' : 'transparent',
        cursor: 'pointer',
        display: 'grid',
        placeItems: 'center',
        transition: 'border-color 150ms, background 150ms',
        minHeight: ROSTER_CARD_MIN_HEIGHT,
        aspectRatio: ROSTER_CARD_ASPECT,
      }}
    >
      <div style={{ display: 'grid', placeItems: 'center', gap: 10 }}>
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: '50%',
            background: isHovered ? 'var(--accent-soft)' : 'var(--surface)',
            border: '1px solid var(--border)',
            display: 'grid',
            placeItems: 'center',
            color: isHovered
              ? 'var(--accent-raw, var(--accent))'
              : 'var(--muted-raw, var(--muted-foreground))',
            fontSize: 24,
            lineHeight: 1,
            transition: 'background 150ms, color 150ms',
          }}
        >
          +
        </div>
        <span
          style={{
            color: 'var(--muted-raw, var(--muted-foreground))',
            fontSize: 13,
            fontWeight: 500,
          }}
        >
          Add Mule
        </span>
      </div>
    </div>
  );
}
