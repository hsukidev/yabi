// Dims a roster item whose **Active Flag** is off. Painting the page
// background at 45% over the item is visually equivalent to the old
// `opacity: 0.55` on the item container, but — unlike container opacity,
// which no descendant can escape — it lets the **Roster Active Switch**
// (zIndex 2 on its guard span) render above the dim at full strength.
// Render as the item container's last child; the container must be
// positioned (`.panel` already is; the row sets `position: relative`).
export function InactiveDimOverlay() {
  return (
    <div
      aria-hidden
      data-inactive-dim
      style={{
        position: 'absolute',
        // -1 so the container's 1px border dims too, as it did under opacity.
        inset: -1,
        borderRadius: 'inherit',
        background: 'color-mix(in oklab, var(--background) 45%, transparent)',
        pointerEvents: 'none',
        zIndex: 1,
      }}
    />
  );
}
