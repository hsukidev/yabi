import { Info } from 'lucide-react';

const info = 'var(--accent-secondary)';
const infoAlpha = (pct: number) =>
  `color-mix(in oklab, var(--accent-secondary) ${pct}%, transparent)`;

export function WorldMissingBanner() {
  return (
    <div
      data-world-missing-banner
      role="status"
      className="mb-4 flex items-center gap-3"
      style={{
        padding: '10px 14px',
        borderRadius: 10,
        border: `1px solid ${infoAlpha(35)}`,
        background: infoAlpha(10),
        animation: 'bulk-slide 0.22s ease-out',
      }}
    >
      <Info size={16} style={{ color: info, flexShrink: 0 }} aria-hidden />
      <span style={{ color: info, fontWeight: 500, fontSize: 14, letterSpacing: '-0.01em' }}>
        Please select a world first.
      </span>
    </div>
  );
}
