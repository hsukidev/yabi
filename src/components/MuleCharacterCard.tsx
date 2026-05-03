import { memo, useEffect, useState } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Check, Info, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import type { Mule } from '../types';
import { useIncome } from '../modules/income';
import { useMatchMedia } from '../hooks/useMatchMedia';
import { formatDroppedSlots, type SlateKey } from '../data/muleBossSlate';
import { CharacterAvatar } from './CharacterAvatar';
import { ROSTER_CARD_ASPECT, ROSTER_CARD_MIN_HEIGHT } from './rosterCardContract';

interface MuleCharacterCardProps {
  mule: Mule;
  onClick: (id: string) => void;
  onDelete: (id: string) => void;
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

const MuleCardInner = memo(function MuleCardInner({
  mule,
  hideLevelBadge = false,
  droppedKeys,
}: {
  mule: Mule;
  hideLevelBadge?: boolean;
  droppedKeys?: ReadonlyMap<SlateKey, number>;
}) {
  // Omit `active` so the Active-Flag Filter doesn't zero the card when its
  // roster toggle is off — the card shows potential income regardless of
  // active state. `partySizes` is threaded so the Computed Value matches
  // the drawer and KPI total for party-adjusted weeklies.
  const { formatted: potentialIncome } = useIncome({
    selectedBosses: mule.selectedBosses,
    partySizes: mule.partySizes,
    worldId: mule.worldId,
  });
  const [tooltipOpen, setTooltipOpen] = useState(false);
  const hasBosses = mule.selectedBosses.length > 0;
  const incomeColor =
    mule.active && hasBosses
      ? 'var(--accent-raw, var(--accent))'
      : 'var(--dim, var(--surface-dim))';
  const droppedLines =
    !hideLevelBadge && droppedKeys && droppedKeys.size > 0 ? formatDroppedSlots(droppedKeys) : [];

  const stopBubble = (e: React.SyntheticEvent) => e.stopPropagation();

  return (
    <>
      {!hideLevelBadge && mule.level > 0 && (
        <div
          style={{
            position: 'absolute',
            top: 8,
            left: 8,
            fontFamily: 'JetBrains Mono, monospace',
            fontSize: 10,
            letterSpacing: '0.1em',
            color: 'var(--muted-raw, var(--muted-foreground))',
            padding: '2px 6px',
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
        <div
          style={{
            color: 'var(--muted-raw, var(--muted-foreground))',
            fontFamily: 'JetBrains Mono, monospace',
            fontSize: 10,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            marginTop: 2,
          }}
        >
          {mule.muleClass || 'No class'}
        </div>
      </div>

      <div
        className="flex flex-row items-center justify-between gap-2"
        style={{ marginTop: 10, paddingTop: 8, borderTop: '1px solid var(--border)' }}
      >
        <span
          style={{
            color: 'var(--muted-raw, var(--muted-foreground))',
            fontFamily: 'JetBrains Mono, monospace',
            fontSize: 10,
            letterSpacing: '0.12em',
          }}
        >
          INCOME
        </span>
        <div className="flex flex-row items-center gap-1.5 min-w-0">
          <span
            style={{
              color: incomeColor,
              fontFamily: 'JetBrains Mono, monospace',
              fontSize: 13,
              fontWeight: 600,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              minWidth: 0,
            }}
          >
            {potentialIncome}
          </span>
          {droppedLines.length > 0 && (
            <Tooltip open={tooltipOpen} onOpenChange={setTooltipOpen}>
              <TooltipTrigger
                aria-label="Show bosses dropped to cap"
                closeOnClick={false}
                delay={0}
                onClick={(e) => {
                  stopBubble(e);
                  setTooltipOpen(true);
                }}
                onPointerDown={stopBubble}
                onTouchStart={stopBubble}
                className="inline-flex shrink-0 items-center justify-center bg-transparent p-0 border-0 cursor-pointer text-muted-foreground/70 hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <Info className="size-3" aria-hidden />
              </TooltipTrigger>
              <TooltipContent
                side="top"
                className="flex-col items-start gap-1 normal-case text-[11px] tracking-normal"
              >
                {droppedLines.map((line) => (
                  <div key={line}>{line}</div>
                ))}
              </TooltipContent>
            </Tooltip>
          )}
        </div>
      </div>
    </>
  );
});

export const MuleCharacterCard = memo(function MuleCharacterCard({
  mule,
  onClick,
  onDelete,
  bulkMode = false,
  selected = false,
  onToggleSelect,
  isPaintEngaged = false,
  droppedKeys,
}: MuleCharacterCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: mule.id,
    disabled: bulkMode,
  });
  const [isHovered, setIsHovered] = useState(false);
  const [isPressed, setIsPressed] = useState(false);
  const [popoverOpen, setPopoverOpen] = useState(false);
  const isTouch = useMatchMedia('(pointer: coarse)');

  useEffect(() => {
    if (isPaintEngaged) setIsPressed(false);
  }, [isPaintEngaged]);

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: mule.active ? 1 : 0.55,
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
  function stopPropagation(e: React.SyntheticEvent) {
    e.stopPropagation();
  }
  function handleDeleteConfirm() {
    onDelete(mule.id);
    setPopoverOpen(false);
  }
  function handleDeleteCancel() {
    setPopoverOpen(false);
  }

  // In bulk mode we suppress hover-lift on unselected cards AND the selected
  // visual treatment overrides any hover shadow. Single delete path is
  // untouched — `isHovered` still drives the normal hover state outside bulk.
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
        <MuleCardInner mule={mule} hideLevelBadge={bulkMode} droppedKeys={droppedKeys} />

        {bulkMode && (
          <div
            aria-hidden
            data-selection-indicator
            style={{
              position: 'absolute',
              top: 10,
              left: 10,
              width: 22,
              height: 22,
              borderRadius: 6,
              border: `1.5px solid ${selected ? DESTRUCTIVE : destructiveAlpha(50)}`,
              background: selected ? DESTRUCTIVE : 'transparent',
              color: selected ? 'white' : 'transparent',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'background 140ms, border-color 140ms',
            }}
          >
            {selected && <Check style={{ width: 14, height: 14, strokeWidth: 3 }} />}
          </div>
        )}

        {!bulkMode && !isTouch && (
          <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
            <PopoverTrigger
              render={
                <button
                  aria-label="Delete mule"
                  style={{
                    position: 'absolute',
                    top: 8,
                    right: 8,
                    padding: '4px 6px',
                    borderRadius: 4,
                    background: 'var(--surface-2, var(--surface-raised))',
                    border: '1px solid var(--border)',
                    color: 'var(--muted-raw, var(--muted-foreground))',
                    opacity: isHovered || popoverOpen ? 1 : 0,
                    transition: 'opacity 140ms, color 140ms, border-color 140ms, background 140ms',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = DESTRUCTIVE;
                    e.currentTarget.style.borderColor = destructiveAlpha(40);
                    e.currentTarget.style.background = destructiveAlpha(10);
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = 'var(--muted-raw, var(--muted-foreground))';
                    e.currentTarget.style.borderColor = 'var(--border)';
                    e.currentTarget.style.background = 'var(--surface-2, var(--surface-raised))';
                  }}
                  onClick={stopPropagation}
                  onPointerDown={stopPropagation}
                />
              }
            >
              <Trash2 style={{ width: 14, height: 14 }} />
            </PopoverTrigger>
            <PopoverContent
              className="w-auto p-3"
              side="bottom"
              align="end"
              onClick={stopPropagation}
              onPointerDown={stopPropagation}
            >
              <div className="flex items-center gap-2">
                <span className="text-sm">Delete?</span>
                <Button size="sm" variant="destructive" onClick={handleDeleteConfirm}>
                  Yes
                </Button>
                <Button size="sm" variant="outline" onClick={handleDeleteCancel}>
                  Cancel
                </Button>
              </div>
            </PopoverContent>
          </Popover>
        )}
      </div>
    </div>
  );
});
