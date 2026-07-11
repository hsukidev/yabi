import {
  DndContext,
  closestCenter,
  type DragEndEvent,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  rectSortingStrategy,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { restrictToParentElement } from '@dnd-kit/modifiers';
import { useState, useCallback, useDeferredValue, useMemo } from 'react';

import { useDisplay } from '../context/DisplayProvider';
import { useWorld } from '../context/WorldProvider';
import { lensMules } from '../data/worlds';
import { useMuleActions } from '../hooks/useMuleActions';
import { useBulkSelection } from '../hooks/useBulkSelection';
import { useWorldIncome } from '../modules/worldIncome';
import { rosterRowMetrics, type RosterRowMetrics } from './rosterRowMetrics';
import { MuleCharacterCard } from './MuleCharacterCard';
import { MuleDetailDrawer } from './MuleDetailDrawer';
import { RosterListView } from './RosterListView';
import { AddCard } from './AddCard';
import { KpiCard } from './KpiCard';
import { PieChartCard } from './PieChartCard';
import { RosterHeader } from './RosterHeader';
import { WorldMissingBanner } from './WorldMissingBanner';
import { ChangelogNotificationBanner } from './ChangelogNotificationBanner';
// PROTOTYPE — KPI readout variants; remove with KpiReadoutPrototype.tsx
import { KpiReadoutPrototypeProvider } from './KpiReadoutPrototype';

const dragBoundaryBaseStyle: React.CSSProperties = {
  borderRadius: '1rem',
  borderStyle: 'dashed',
  borderWidth: '1.5px',
  borderColor: 'transparent',
  padding: '0.75rem',
  marginInline: 'calc(-0.75rem - 1.5px)',
};

const dragBoundaryActiveStyle: React.CSSProperties = {
  ...dragBoundaryBaseStyle,
  borderColor: 'color-mix(in hsl, var(--accent-primary) 45%, transparent)',
};

export function Dashboard() {
  const { mules, addMule, updateMule, deleteMule, deleteMules, reorderMules } = useMuleActions();
  const { world } = useWorld();
  const { display } = useDisplay();
  // Unfiltered `mules` is intentionally kept for drag-reorder index math and
  // the selected/active lookups, which must address the full array.
  const mulesInWorld = useMemo(() => lensMules(mules, world), [mules, world]);
  // KpiCard/PieChartCard defer to absorb boss-matrix burst updates. Roster stays
  // live — stale mules on drop causes FLIP to target the wrong layout.
  const deferredMulesInWorld = useDeferredValue(mulesInWorld);
  const [selectedMuleId, setSelectedMuleId] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [showWorldNeededBanner, setShowWorldNeededBanner] = useState(false);

  const selectedMule = mules.find((m) => m.id === selectedMuleId) ?? null;

  // Stable ids array for SortableContext — `mulesInWorld` is already memoized
  // on `[mules, world]`, and `mules` identity only changes on add / delete /
  // reorder, so a single memo keyed on the filtered list keeps items stable
  // through drawer edits (which don't touch ids).
  const muleIds = useMemo(() => mulesInWorld.map((m) => m.id), [mulesInWorld]);

  // World Cap Cut applied at the live (non-deferred) `mulesInWorld` so per-mule
  // **Cap Drop Info Icons** track interaction in real time. KPI/Pie consume the
  // deferred list separately to absorb boss-matrix burst updates.
  const worldIncome = useWorldIncome(mulesInWorld);
  const capPerMule = worldIncome.perMule;

  // Per-mule metrics threaded into both Card and Row from a single source so
  // **Displayed Weekly Meso** amount and tone stay identical across modes.
  // Memoized on mules + worldIncome so each item's metrics object identity is
  // stable across drawer-edit / bulk-toggle re-renders, preserving the
  // MuleCharacterCard / MuleListRow memo barriers.
  const metricsByMule = useMemo(() => {
    const m = new Map<string, RosterRowMetrics>();
    for (const mule of mulesInWorld) {
      m.set(
        mule.id,
        rosterRowMetrics(mule, capPerMule.get(mule.id), worldIncome.totalContributedMeso),
      );
    }
    return m;
  }, [mulesInWorld, capPerMule, worldIncome.totalContributedMeso]);
  const selectedMuleMetrics = selectedMule ? (metricsByMule.get(selectedMule.id) ?? null) : null;

  // Split sensors so mouse stays instant (distance: 0) while touch gates
  // behind a 250ms long-press — a unified PointerSensor would delay desktop
  // too. KeyboardSensor opportunistically adds Space/arrow reorder for a11y.
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 0 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleDragStart = useCallback(() => {
    setIsDragging(true);
  }, []);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      setIsDragging(false);
      const { active, over } = event;
      if (over && active.id !== over.id) {
        const oldIndex = mules.findIndex((m) => m.id === active.id);
        const newIndex = mules.findIndex((m) => m.id === over.id);
        reorderMules(oldIndex, newIndex);
      }
    },
    [mules, reorderMules],
  );

  const handleDragCancel = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleAddMule = useCallback(() => {
    if (!world) {
      setShowWorldNeededBanner(true);
      return;
    }
    const id = addMule(world.id);
    setSelectedMuleId(id);
  }, [addMule, world]);

  const handleCardClick = useCallback((muleId: string) => {
    setSelectedMuleId(muleId);
  }, []);

  // Roster Active Switch — same Active Flag write as the Drawer's Active
  // Toggle. `updateMule` is identity-stable, so this never busts the
  // card/row memo barriers.
  const handleToggleActive = useCallback(
    (id: string, active: boolean) => {
      updateMule(id, { active });
    },
    [updateMule],
  );

  const handleCloseDrawer = useCallback(() => {
    setSelectedMuleId(null);
  }, []);

  // Bulk Delete Mode — selection state, exact-state setter, and the
  // drag-paint marshalling all live behind useBulkSelection; Dashboard
  // keeps only the confirm UI wiring (RosterHeader buttons).
  const {
    bulkMode,
    toDelete,
    enterBulk,
    exitBulk,
    toggleDelete,
    deleteSelected,
    dragPaintHandlers,
    isPaintEngaged,
  } = useBulkSelection(mulesInWorld, deleteMules);

  return (
    <KpiReadoutPrototypeProvider>
      <main className="container mx-auto max-w-352 px-4 sm:px-6 py-8">
        <ChangelogNotificationBanner />
        <section className="grid grid-cols-1 min-[1100px]:grid-cols-12 gap-6 mb-10">
          <div className="min-[1100px]:col-span-8 animate-in fade-in slide-in-from-bottom-4 duration-500 fill-mode-both">
            <KpiCard mules={deferredMulesInWorld} />
          </div>
          <div className="min-[1100px]:col-span-4 animate-in fade-in slide-in-from-bottom-4 duration-500 fill-mode-both">
            <PieChartCard mules={deferredMulesInWorld} onSliceClick={handleCardClick} />
          </div>
        </section>

        <section
          data-testid="roster-section"
          className="animate-in fade-in slide-in-from-bottom-4 duration-500 fill-mode-both"
        >
          {showWorldNeededBanner && !world && <WorldMissingBanner />}

          <RosterHeader
            muleCount={mulesInWorld.length}
            bulkMode={bulkMode}
            selectedCount={toDelete.size}
            onEnterBulk={enterBulk}
            onCancel={exitBulk}
            onDelete={deleteSelected}
          />

          <div className="mb-4 border-t border-border" aria-hidden />

          <DndContext
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            onDragCancel={handleDragCancel}
            sensors={sensors}
            modifiers={[restrictToParentElement]}
          >
            <SortableContext
              items={muleIds}
              strategy={display === 'list' ? verticalListSortingStrategy : rectSortingStrategy}
              disabled={bulkMode}
            >
              <div
                style={isDragging ? dragBoundaryActiveStyle : dragBoundaryBaseStyle}
                className="transition-[border-color] duration-200"
                data-drag-boundary
                data-bulk-mode={bulkMode ? 'true' : 'false'}
                {...dragPaintHandlers}
              >
                {display === 'list' ? (
                  <RosterListView
                    mules={mulesInWorld}
                    metricsByMule={metricsByMule}
                    onCardClick={handleCardClick}
                    onToggleActive={handleToggleActive}
                    bulkMode={bulkMode}
                    toDelete={toDelete}
                    onToggleSelect={toggleDelete}
                    onAddMule={handleAddMule}
                    isPaintEngaged={isPaintEngaged}
                  />
                ) : (
                  <div
                    className="grid"
                    style={{
                      gridTemplateColumns: 'repeat(var(--roster-cols, 6), minmax(0, 1fr))',
                      gap: 'var(--roster-gap, 16px)',
                    }}
                  >
                    {mulesInWorld.map((mule) => {
                      const metrics = metricsByMule.get(mule.id)!;
                      return (
                        <MuleCharacterCard
                          key={mule.id}
                          mule={mule}
                          onClick={handleCardClick}
                          onToggleActive={handleToggleActive}
                          bulkMode={bulkMode}
                          selected={toDelete.has(mule.id)}
                          onToggleSelect={toggleDelete}
                          isPaintEngaged={isPaintEngaged}
                          droppedKeys={metrics.droppedKeys}
                          metrics={metrics}
                        />
                      );
                    })}
                    {!bulkMode && <AddCard onClick={handleAddMule} />}
                  </div>
                )}
              </div>
            </SortableContext>
          </DndContext>
        </section>
      </main>

      <MuleDetailDrawer
        mule={selectedMule}
        metrics={selectedMuleMetrics}
        open={selectedMule !== null}
        onClose={handleCloseDrawer}
        onUpdate={updateMule}
        onDelete={deleteMule}
      />
    </KpiReadoutPrototypeProvider>
  );
}
