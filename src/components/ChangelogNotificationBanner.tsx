import { Sparkles, X } from 'lucide-react';
import { Link } from '@tanstack/react-router';
import { useChangelogNotification } from '../hooks/useChangelogNotification';

const accent = 'var(--accent-secondary)';
const accentAlpha = (pct: number) =>
  `color-mix(in oklab, var(--accent-secondary) ${pct}%, transparent)`;

export function ChangelogNotificationBanner() {
  const { visible, markSeen } = useChangelogNotification();
  if (!visible) return null;
  return (
    <div
      role="status"
      aria-label="What's new"
      className="mb-6 flex items-center gap-3 animate-in fade-in slide-in-from-bottom-4 duration-500 fill-mode-both"
      style={{
        padding: '10px 14px',
        borderRadius: 10,
        border: `1px solid ${accentAlpha(35)}`,
        background: accentAlpha(10),
      }}
    >
      <Sparkles size={16} style={{ color: accent, flexShrink: 0 }} aria-hidden />
      <span
        style={{ color: accent, fontWeight: 500, fontSize: 14, letterSpacing: '-0.01em', flex: 1 }}
      >
        Check out{' '}
        <Link
          to="/changelog"
          style={{ color: accent, textDecoration: 'underline', fontWeight: 600 }}
        >
          what's new
        </Link>
        !
      </span>
      <button
        type="button"
        onClick={markSeen}
        aria-label="Dismiss what's new"
        className="flex size-7 items-center justify-center rounded-md transition-colors cursor-pointer"
        style={{ color: accent, background: 'transparent', border: 'none' }}
      >
        <X size={16} />
      </button>
    </div>
  );
}
