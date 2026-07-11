import { memo, useState } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';
import { useMatchMedia } from '../hooks/useMatchMedia';
import type { SlateKey } from '../data/muleBossSlate';
import type { Mule } from '../types';
import type { RosterRowMetrics } from './rosterRowMetrics';
import { CharacterAvatar } from './CharacterAvatar';
import { MesoMetric } from './MesoDisplay';
import { NotesTooltipTrigger } from './RosterItem/NotesTooltipTrigger';
import { CapDropTooltipTrigger } from './RosterItem/CapDropTooltipTrigger';
import { SelectionIndicator } from './RosterItem/SelectionIndicator';
import { RosterActiveSwitch } from './RosterItem/RosterActiveSwitch';
import { InactiveDimOverlay } from './RosterItem/InactiveDimOverlay';
// PROTOTYPE — marking affordances; remove with MarkingSurfacesPrototype.tsx
import { RowMarkingControls, useMarkingVariant } from './RosterItem/MarkingSurfacesPrototype';
import weeklyCrystalPng from '../assets/weekly-crystal.png';
import dailyCrystalPng from '../assets/daily-crystal.png';
import monthlyCrystalPng from '../assets/monthly-crystal.png';

interface MuleListRowProps {
  mule: Mule;
  metrics: RosterRowMetrics;
  onClick: (id: string) => void;
  onToggleActive: (id: string, active: boolean) => void;
  bulkMode?: boolean;
  selected?: boolean;
  onToggleSelect?: (id: string) => void;
  isPaintEngaged?: boolean;
}

export const MONO = 'Geist Mono, monospace';
const DESTRUCTIVE = 'var(--destructive)';
const destructiveAlpha = (pct: number) =>
  `color-mix(in oklab, var(--destructive) ${pct}%, transparent)`;

const EMPTY_DROPPED: ReadonlyMap<SlateKey, number> = new Map();

const HANDLE_STRETCH_STYLE: React.CSSProperties = { width: '100%', height: '100%' };
const HANDLE_ICON_STYLE: React.CSSProperties = {
  width: 'var(--row-handle-icon, 18px)',
  height: 'var(--row-handle-icon, 18px)',
};

const METRIC_ICON_STYLE: React.CSSProperties = {
  width: 'var(--row-metric-icon, 18px)',
  height: 'var(--row-metric-icon, 18px)',
  objectFit: 'contain',
  display: 'inline-block',
  flexShrink: 0,
};

const METRIC_VALUE_STYLE: React.CSSProperties = {
  fontFamily: MONO,
  fontSize: 'var(--row-eyebrow-value-size, 16px)',
  fontWeight: 700,
  marginLeft: 6,
};

const LEVEL_PILL_STYLE: React.CSSProperties = {
  fontFamily: MONO,
  fontSize: 'var(--row-level-size, 11px)',
  letterSpacing: '0.1em',
  color: 'var(--muted-raw, var(--muted-foreground))',
  padding: '2px 6px',
  borderRadius: 4,
  border: '1px solid var(--border)',
  background: 'var(--surface-2, var(--surface-raised))',
  whiteSpace: 'nowrap',
};

export const MuleListRow = memo(function MuleListRow({
  mule,
  metrics,
  onClick,
  onToggleActive,
  bulkMode = false,
  selected = false,
  onToggleSelect,
  isPaintEngaged = false,
}: MuleListRowProps) {
  const [isPressed, setIsPressed] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const isTouch = useMatchMedia('(pointer: coarse)');
  // PROTOTYPE — non-null only in dev with MarkingSurfacesPrototype mounted
  const markingVariant = useMarkingVariant();
  const handlePressStart = () => setIsPressed(true);
  const handlePressEnd = () => setIsPressed(false);

  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: mule.id,
    disabled: bulkMode,
  });
  const displayedWeeklyMeso = metrics.displayedWeeklyMeso;

  function handleActivate() {
    if (bulkMode) onToggleSelect?.(mule.id);
    else onClick(mule.id);
  }

  function stopBubble(e: React.SyntheticEvent) {
    e.stopPropagation();
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleActivate();
    }
  }

  const notes = bulkMode ? '' : (mule.notes ?? '');
  const droppedKeys: ReadonlyMap<SlateKey, number> = bulkMode ? EMPTY_DROPPED : metrics.droppedKeys;
  const isBulkSelected = bulkMode && selected;
  // Tint instead of MuleCharacterCard's 4% scale because a row is wide and
  // short — scaling warps the cell layout.
  const showPressTint = bulkMode && isPressed && !isPaintEngaged && !isBulkSelected;
  const rowStyle: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition: transition
      ? `${transition}, background 200ms ease-out, border-color 200ms ease-out`
      : 'background 200ms ease-out, border-color 200ms ease-out',
    zIndex: isDragging ? 1 : undefined,
    // Positioned so the InactiveDimOverlay can cover the row.
    position: 'relative',
    display: 'grid',
    gridTemplateColumns: 'var(--row-handle, 24px) var(--row-avatar, 64px) auto minmax(0, 1fr)',
    alignItems: 'center',
    gap: 'var(--row-gap, 10px)',
    padding: 'var(--row-pad, 14px 18px)',
    border: '1px solid',
    borderColor: isBulkSelected
      ? DESTRUCTIVE
      : showPressTint
        ? destructiveAlpha(40)
        : 'var(--border)',
    background: isBulkSelected
      ? destructiveAlpha(10)
      : showPressTint
        ? destructiveAlpha(6)
        : 'var(--surface)',
    borderRadius: 10,
    cursor: 'pointer',
    WebkitTouchCallout: 'none',
    userSelect: 'none',
  };

  const incomeColor = displayedWeeklyMeso.muted
    ? 'var(--dim, var(--surface-dim))'
    : 'var(--accent-raw, var(--accent))';

  return (
    <div
      ref={setNodeRef}
      style={rowStyle}
      data-mule-row={mule.id}
      data-paint-target={mule.id}
      data-testid={`mule-row-${mule.id}`}
      role="button"
      tabIndex={0}
      onClick={handleActivate}
      onKeyDown={handleKeyDown}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onTouchStart={handlePressStart}
      onTouchEnd={handlePressEnd}
      onTouchCancel={handlePressEnd}
    >
      {bulkMode ? (
        <SelectionIndicator selected={selected} />
      ) : (
        <button
          ref={setActivatorNodeRef}
          type="button"
          aria-label="Drag to reorder"
          {...attributes}
          {...listeners}
          onClick={stopBubble}
          className="inline-flex items-center justify-center bg-transparent border-0 p-0 cursor-grab touch-none rounded-md transition-colors text-muted-foreground/70 hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          style={HANDLE_STRETCH_STYLE}
        >
          <GripVertical strokeWidth={2} style={HANDLE_ICON_STYLE} />
        </button>
      )}

      <CharacterAvatar
        avatarUrl={mule.avatarUrl}
        size={'var(--row-avatar, 64px)'}
        alt=""
        data-testid="card-avatar"
      />

      <div
        style={{
          minWidth: 0,
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--row-identity-gap, 6px)',
        }}
      >
        <div className="flex flex-row items-center gap-2">
          <span
            style={{
              color: mule.name
                ? 'var(--text, var(--foreground))'
                : 'var(--muted-raw, var(--muted-foreground))',
              fontWeight: 600,
              fontSize: 'var(--row-name-size, 17px)',
              fontStyle: mule.name ? 'normal' : 'italic',
              whiteSpace: 'nowrap',
            }}
          >
            {mule.name || 'Unnamed'}
          </span>
          <span
            data-row-class
            style={{
              color: 'var(--muted-raw, var(--muted-foreground))',
              fontFamily: MONO,
              fontSize: 'var(--row-class-size, 11px)',
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              whiteSpace: 'nowrap',
            }}
          >
            {mule.muleClass || 'No class'}
          </span>
          {mule.level > 0 && (
            <span data-row-level style={LEVEL_PILL_STYLE}>
              Lv.{mule.level}
            </span>
          )}
          {!bulkMode && !isTouch && (
            <>
              {/* PROTOTYPE — variants a/c replace the switch with the kebab;
                  variant b keeps the switch and adds chips */}
              {(markingVariant === null || markingVariant === 'b') && (
                <RosterActiveSwitch
                  muleId={mule.id}
                  active={mule.active}
                  revealed={isHovered}
                  onToggleActive={onToggleActive}
                />
              )}
              {markingVariant !== null && (
                <RowMarkingControls
                  mule={mule}
                  isHovered={isHovered}
                  onToggleActive={onToggleActive}
                  dailyCount={metrics.dailyCount}
                  monthlyCount={metrics.monthlyCount}
                />
              )}
            </>
          )}
          <NotesTooltipTrigger notes={notes} iconSize="md" />
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--row-metric-row-gap, 14px)',
            minWidth: 0,
          }}
        >
          <span aria-label="Weekly count" style={{ display: 'inline-flex', alignItems: 'center' }}>
            <img
              src={weeklyCrystalPng}
              alt=""
              draggable={false}
              data-row-eyebrow
              style={METRIC_ICON_STYLE}
            />
            <span style={METRIC_VALUE_STYLE}>
              <span style={{ color: 'var(--accent-raw, var(--accent))' }}>
                {metrics.weeklyCount}
              </span>
              <span
                data-row-weekly-cap
                style={{ color: 'var(--muted-raw, var(--muted-foreground))' }}
              >
                /14
              </span>
            </span>
          </span>

          <span aria-label="Daily count" style={{ display: 'inline-flex', alignItems: 'center' }}>
            <img
              src={dailyCrystalPng}
              alt=""
              draggable={false}
              data-row-eyebrow
              style={METRIC_ICON_STYLE}
            />
            <span style={{ ...METRIC_VALUE_STYLE, color: 'var(--accent-raw, var(--accent))' }}>
              {metrics.dailyCount}
            </span>
          </span>

          <span aria-label="Monthly count" style={{ display: 'inline-flex', alignItems: 'center' }}>
            <img
              src={monthlyCrystalPng}
              alt=""
              draggable={false}
              data-row-eyebrow
              style={METRIC_ICON_STYLE}
            />
            <span style={{ ...METRIC_VALUE_STYLE, color: 'var(--accent-raw, var(--accent))' }}>
              {metrics.monthlyCount}
            </span>
          </span>
        </div>
      </div>

      <div style={{ textAlign: 'right', minWidth: 0 }}>
        <div className="flex flex-row items-center justify-end gap-1.5" style={{ minWidth: 0 }}>
          <MesoMetric
            value={displayedWeeklyMeso.meso}
            label="Weekly meso"
            data-row-income-value
            style={{
              fontFamily: MONO,
              fontSize: 'var(--row-income-size, 22px)',
              fontWeight: 600,
              color: incomeColor,
              lineHeight: 1.1,
              whiteSpace: 'nowrap',
            }}
          />
          <CapDropTooltipTrigger droppedKeys={droppedKeys} />
        </div>
        <div
          data-row-share
          style={{
            fontFamily: MONO,
            fontSize: 'calc(var(--row-eyebrow-size, 11px) + 1px)',
            color: 'var(--muted-raw, var(--muted-foreground))',
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            marginTop: 2,
          }}
        >
          <span>{(metrics.sharePct * 100).toFixed(1)}%</span>
          <span data-row-eyebrow style={{ marginLeft: 4 }}>
            SHARE
          </span>
        </div>
      </div>

      {!mule.active && <InactiveDimOverlay />}
    </div>
  );
});
