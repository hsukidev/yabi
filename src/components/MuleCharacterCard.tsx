import { memo, useEffect, useState } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { Mule } from '../types';
import { useDensity } from '../context/DensityProvider';
import { useCurrentCycle } from '../hooks/useCurrentCycle';
import { isMarkEligible, isMarkValid } from '../utils/clearMark';
import { MuleBossSlate, type SlateKey } from '../data/muleBossSlate';
import { resolveWorldGroup } from '../data/worlds';
import { CharacterAvatar } from './CharacterAvatar';
import { MesoMetric } from './MesoDisplay';
import { ROSTER_CARD_ASPECT, ROSTER_CARD_MIN_HEIGHT } from './rosterCardContract';
import { NotesTooltipTrigger } from './RosterItem/NotesTooltipTrigger';
import { CardCpMetric } from './RosterItem/CardCpMetric';
import { CapDropTooltipTrigger } from './RosterItem/CapDropTooltipTrigger';
import { SelectionIndicator } from './RosterItem/SelectionIndicator';
import { InactiveDimOverlay } from './RosterItem/InactiveDimOverlay';
import { MuleActionsMenu } from './RosterItem/MuleActionsMenu';
import { CompletionChecks } from './RosterItem/CompletionChecks';
import type { RosterRowMetrics } from './rosterRowMetrics';

interface MuleCharacterCardProps {
  mule: Mule;
  onClick: (id: string) => void;
  // Identity-stable Clear Mark / Active Flag writer, threaded to the Mule
  // Actions Menu which builds its own patches. Must be referentially stable
  // (memoize at the Dashboard level) to preserve the outer memo barrier.
  updateMule: (id: string, patch: Partial<Mule>) => void;
  // Deletes this mule (fires the undo toast). Identity-stable; the card wraps
  // it as `() => onDelete(mule.id)` for the menu's `onDelete`.
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
  dailyValid,
  weeklyValid,
  bmValid,
}: {
  mule: Mule;
  hideLevelBadge?: boolean;
  droppedKeys?: ReadonlyMap<SlateKey, number>;
  metrics: RosterRowMetrics;
  // Completion Checks rendered inside the Lv pill; each is a valid Clear Mark
  // for the current cycle. Passed as primitives so the memo barrier only trips
  // at a cycle boundary or a mark change on this mule.
  dailyValid: boolean;
  weeklyValid: boolean;
  bmValid: boolean;
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

  // Compact cards trade the level for check room: the pill drops its "Lv.X"
  // text, renders as a checks-only badge, and unmounts with zero valid marks.
  const compact = density === 'compact';
  const anyCheckValid = dailyValid || weeklyValid || bmValid;
  const showLevelPill = compact ? anyCheckValid : mule.level > 0;

  // Combat Power on the class row: shown only when set (0 ≡ unset) and never
  // in Compact density. Accent applies whenever CP > 0; the card-wide inactive
  // dim overlay is what dims it, so no active state is threaded here.
  const cp = mule.combatPower ?? 0;
  const showCp = !compact && cp > 0;

  return (
    <>
      {!hideLevelBadge && showLevelPill && (
        <div
          data-card-level
          style={{
            position: 'absolute',
            top: 12,
            left: 12,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 5,
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
          {!compact && <span>Lv.{mule.level}</span>}
          <CompletionChecks daily={dailyValid} weekly={weeklyValid} bm={bmValid} />
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
          className="flex flex-row items-baseline justify-between gap-2"
          style={{ marginTop: 2 }}
        >
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
          {/* Right cluster — CP (nowrap) immediately before the Notes icon.
              `shrink-0` makes the class name give way first. */}
          <div className="flex flex-row shrink-0 items-center gap-2">
            {showCp && <CardCpMetric value={cp} />}
            <NotesTooltipTrigger notes={notes} iconSize="sm" />
          </div>
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
  updateMule,
  onDelete,
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

  // Cycle Clock — a Clear Mark's Completion Check shows iff its stamp is valid
  // for the current cycle, so checks expire live at the boundary with no
  // reload. `now` only changes at a boundary, so this doesn't churn the card.
  const now = useCurrentCycle();
  const dailyValid = isMarkValid(mule, 'daily', now);
  const weeklyValid = isMarkValid(mule, 'weekly', now);
  const bmValid = isMarkValid(mule, 'bm', now);

  // Canonical Mark-eligibility — each cadence row appears only when the mule
  // could hold that mark (same predicate as Mark Invalidation).
  const dailyEligible = isMarkEligible(metrics, 'daily');
  const weeklyEligible = isMarkEligible(metrics, 'weekly');
  const bmEligible = isMarkEligible(metrics, 'bm');

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
  // still drives the normal hover-lift state.
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
          dailyValid={dailyValid}
          weeklyValid={weeklyValid}
          bmValid={bmValid}
        />

        {bulkMode && (
          <span style={{ position: 'absolute', top: 10, left: 10 }}>
            <SelectionIndicator selected={selected} />
          </span>
        )}

        {!mule.active && <InactiveDimOverlay />}

        {!bulkMode && (
          // zIndex 2 lifts the menu above the InactiveDimOverlay (zIndex 1) so
          // an inactive (dimmed) mule keeps a fully operable menu.
          <span style={{ position: 'absolute', top: 10, right: 10, display: 'flex', zIndex: 2 }}>
            <MuleActionsMenu
              mule={mule}
              updateMule={updateMule}
              onDelete={() => onDelete(mule.id)}
              dailyValid={dailyValid}
              weeklyValid={weeklyValid}
              bmValid={bmValid}
              dailyEligible={dailyEligible}
              weeklyEligible={weeklyEligible}
              bmEligible={bmEligible}
            />
          </span>
        )}
      </div>
    </div>
  );
});
