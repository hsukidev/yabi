import { memo, useEffect, useState } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { Mule } from '../types';
import { useDensity } from '../context/DensityProvider';
import { useMatchMedia } from '../hooks/useMatchMedia';
import { MuleBossSlate, type SlateKey } from '../data/muleBossSlate';
import { resolveWorldGroup } from '../data/worlds';
import { CharacterAvatar } from './CharacterAvatar';
import { MesoMetric } from './MesoDisplay';
import { ROSTER_CARD_ASPECT, ROSTER_CARD_MIN_HEIGHT } from './rosterCardContract';
import { NotesTooltipTrigger } from './RosterItem/NotesTooltipTrigger';
import { CapDropTooltipTrigger } from './RosterItem/CapDropTooltipTrigger';
import { SelectionIndicator } from './RosterItem/SelectionIndicator';
import { RosterActiveSwitch } from './RosterItem/RosterActiveSwitch';
import { InactiveDimOverlay } from './RosterItem/InactiveDimOverlay';
import type { RosterRowMetrics } from './rosterRowMetrics';

interface MuleCharacterCardProps {
  mule: Mule;
  onClick: (id: string) => void;
  onToggleActive: (id: string, active: boolean) => void;
  bulkMode?: boolean;
  selected?: boolean;
  onToggleSelect?: (id: string) => void;
  // Clears press-scale on engagement — the finger doesn't lift during a
  // paint drag, so `onTouchEnd` can't release `isPressed` on its own.
  isPaintEngaged?: boolean;
  // Per-mule slate keys whose slots didn't survive the World Cap Cut, keyed
  // on slate key with the dropped slot count as value. Threaded from
  // `useWorldIncome(...).perMule` at the Dashboard level. The Cap Drop Info
  // Icon renders only when this map has at least one entry.
  droppedKeys?: ReadonlyMap<SlateKey, number>;
  // Full per-mule roster metrics threaded from the Dashboard the same way
  // MuleListRow already receives them. Carries the shared **Displayed Weekly
  // Meso** contract so Card and Row stay in sync by construction. Object
  // identity must be stable across renders (memoize at the Dashboard level)
  // to preserve the outer memo barrier.
  metrics: RosterRowMetrics;
}

// `--destructive` is stored as `hsl(...)`, not a raw triplet — blend via
// `color-mix` to get alpha variants without introducing #e05040 literals.
const DESTRUCTIVE = 'var(--destructive)';

// Lift applied to the inner `.panel` on touch-hold. Keeping the scale on the
// inner element (not the outer `setNodeRef` div) means the sortable node's
// rect stays layout-accurate for `useSortable`'s drag-delta math — no second
// DOM node / overlay is needed; the in-place card is the drag visual itself.
const PRESS_SCALE = 'scale(1.04)';
const DEFAULT_PANEL_SHADOW = '0 0 0 1px var(--border)';
const destructiveAlpha = (pct: number) =>
  `color-mix(in oklab, var(--destructive) ${pct}%, transparent)`;

const EMPTY_DROPPED: ReadonlyMap<SlateKey, number> = new Map();

const MuleCardInner = memo(function MuleCardInner({
  mule,
  hideLevelBadge = false,
  droppedKeys,
  metrics,
}: {
  mule: Mule;
  hideLevelBadge?: boolean;
  droppedKeys?: ReadonlyMap<SlateKey, number>;
  metrics: RosterRowMetrics;
}) {
  const { density } = useDensity();
  const displayedWeeklyMeso = metrics.displayedWeeklyMeso;
  const weeklyIncomeRaw = displayedWeeklyMeso.meso;
  const bmIncomeRaw = MuleBossSlate.from(
    mule.selectedBosses,
    resolveWorldGroup(mule.worldId),
  ).monthlyCrystalValue(mule.partySizes);
  const incomeColor = displayedWeeklyMeso.muted
    ? 'var(--dim, var(--surface-dim))'
    : 'var(--accent-raw, var(--accent))';
  const bmIncomeColor =
    mule.active !== false && bmIncomeRaw > 0
      ? 'var(--accent-raw, var(--accent))'
      : 'var(--dim, var(--surface-dim))';
  const notes = hideLevelBadge ? '' : (mule.notes ?? '');
  const dropped: ReadonlyMap<SlateKey, number> = hideLevelBadge
    ? EMPTY_DROPPED
    : (droppedKeys ?? EMPTY_DROPPED);

  return (
    <>
      {!hideLevelBadge && mule.level > 0 && (
        <div
          style={{
            position: 'absolute',
            top: 12,
            left: 12,
            fontFamily: 'Geist Mono, monospace',
            fontSize: 'var(--mule-level-size, 11px)',
            letterSpacing: '0.1em',
            color: 'var(--muted-raw, var(--muted-foreground))',
            padding: '3px 8px',
            borderRadius: 4,
            border: '1px solid var(--border)',
            background: 'var(--surface-2, var(--surface-raised))',
          }}
        >
          Lv.{mule.level}
        </div>
      )}

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '16px 0 8px',
          flex: 1,
          minHeight: 0,
        }}
      >
        <CharacterAvatar
          key={mule.id}
          avatarUrl={mule.avatarUrl}
          size="100%"
          alt=""
          data-testid="card-avatar"
        />
      </div>

      <div style={{ marginTop: 4 }}>
        <div
          style={{
            color: mule.name
              ? 'var(--text, var(--foreground))'
              : 'var(--muted-raw, var(--muted-foreground))',
            fontWeight: 600,
            fontSize: 'var(--mule-name-size, 14px)',
            fontStyle: mule.name ? 'normal' : 'italic',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {mule.name || 'Unnamed'}
        </div>
        <div className="flex flex-row items-center justify-between gap-2" style={{ marginTop: 2 }}>
          <span
            style={{
              color: 'var(--muted-raw, var(--muted-foreground))',
              fontFamily: 'Geist Mono, monospace',
              fontSize: 11,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              minWidth: 0,
            }}
          >
            {mule.muleClass || 'No class'}
          </span>
          <NotesTooltipTrigger notes={notes} iconSize="sm" />
        </div>
      </div>

      <div style={{ marginTop: 6, paddingTop: 8, borderTop: '1px solid var(--border)' }}>
        <IncomeLine label="INCOME" value={weeklyIncomeRaw} color={incomeColor}>
          <CapDropTooltipTrigger droppedKeys={dropped} />
        </IncomeLine>
        {density !== 'compact' && (
          <IncomeLine label="BM INCOME" value={bmIncomeRaw} color={bmIncomeColor} />
        )}
      </div>
    </>
  );
});

function IncomeLine({
  label,
  value,
  color,
  children,
}: {
  label: string;
  value: number;
  color: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex flex-row items-center justify-between gap-2 min-w-0">
      <span
        style={{
          color: 'var(--muted-raw, var(--muted-foreground))',
          fontFamily: 'Geist Mono, monospace',
          fontSize: 11,
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          minWidth: 0,
        }}
      >
        {label}
      </span>
      <div className="flex flex-row items-center gap-1.5 min-w-0">
        <MesoMetric
          value={value}
          label={`${label} meso`}
          data-card-income-value
          style={{
            color,
            fontFamily: 'Geist Mono, monospace',
            fontSize: 13,
            fontWeight: 600,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            minWidth: 0,
          }}
        />
        {children}
      </div>
    </div>
  );
}

export const MuleCharacterCard = memo(function MuleCharacterCard({
  mule,
  onClick,
  onToggleActive,
  bulkMode = false,
  selected = false,
  onToggleSelect,
  isPaintEngaged = false,
  droppedKeys,
  metrics,
}: MuleCharacterCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: mule.id,
    disabled: bulkMode,
  });
  const [isHovered, setIsHovered] = useState(false);
  const [isPressed, setIsPressed] = useState(false);
  const isTouch = useMatchMedia('(pointer: coarse)');

  useEffect(() => {
    if (isPaintEngaged) setIsPressed(false);
  }, [isPaintEngaged]);

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 1 : undefined,
  };

  function handleActivate() {
    if (bulkMode) {
      onToggleSelect?.(mule.id);
    } else {
      onClick(mule.id);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleActivate();
    }
  }
  // In bulk mode we suppress hover-lift on unselected cards AND the selected
  // visual treatment overrides any hover shadow. Outside bulk, `isHovered`
  // still drives the normal hover state (and the Roster Active Switch reveal).
  const hoverActive = !bulkMode && isHovered;
  const panelBoxShadow =
    bulkMode && selected
      ? 'none'
      : hoverActive
        ? '0 8px 32px -8px var(--accent-glow)'
        : DEFAULT_PANEL_SHADOW;

  // Press-and-hold wins over hover-lift: touch start scales the card to 1.04
  // for 200ms, finishing just before the 250ms TouchSensor engages drag.
  const panelTransform = isPressed ? PRESS_SCALE : hoverActive ? 'translateY(-2px)' : undefined;

  const handlePressStart = () => setIsPressed(true);
  const handlePressEnd = () => setIsPressed(false);

  return (
    <div
      ref={setNodeRef}
      style={style}
      data-mule-card={mule.id}
      data-paint-target={mule.id}
      className="group relative"
      {...attributes}
      {...listeners}
    >
      <div
        onClick={handleActivate}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onTouchStart={handlePressStart}
        onTouchEnd={handlePressEnd}
        onTouchCancel={handlePressEnd}
        className="panel cursor-pointer"
        style={{
          padding: 'var(--card-pad, 16px)',
          paddingBottom: 8,
          minHeight: ROSTER_CARD_MIN_HEIGHT,
          aspectRatio: ROSTER_CARD_ASPECT,
          display: 'flex',
          flexDirection: 'column',
          transform: panelTransform,
          boxShadow: panelBoxShadow,
          borderColor: bulkMode && selected ? DESTRUCTIVE : undefined,
          background: bulkMode && selected ? destructiveAlpha(10) : undefined,
          transition: 'transform 200ms ease-out, box-shadow 200ms ease-out, border-color 150ms',
          WebkitTouchCallout: 'none',
          userSelect: 'none',
        }}
        role="button"
        tabIndex={0}
        aria-pressed={bulkMode ? selected : undefined}
        onKeyDown={handleKeyDown}
      >
        <MuleCardInner
          mule={mule}
          hideLevelBadge={bulkMode}
          droppedKeys={droppedKeys}
          metrics={metrics}
        />

        {bulkMode && (
          <span style={{ position: 'absolute', top: 10, left: 10 }}>
            <SelectionIndicator selected={selected} />
          </span>
        )}

        {!mule.active && <InactiveDimOverlay />}

        {!bulkMode && !isTouch && (
          <span style={{ position: 'absolute', top: 10, right: 10, display: 'flex' }}>
            <RosterActiveSwitch
              muleId={mule.id}
              active={mule.active}
              revealed={isHovered}
              onToggleActive={onToggleActive}
            />
          </span>
        )}
      </div>
    </div>
  );
});
