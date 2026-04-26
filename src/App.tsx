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
} from '@dnd-kit/sortable';
import { restrictToParentElement } from '@dnd-kit/modifiers';
import { useState, useCallback, useDeferredValue, useEffect, useMemo, useRef } from 'react';

import { ThemeProvider } from './context/ThemeProvider';
import { DensityProvider } from './context/DensityProvider';
import { WorldProvider, useWorld } from './context/WorldProvider';
import { lensMules } from './data/worlds';
import { IncomeProvider } from './modules/income';
import { useMuleActions } from './hooks/useMuleActions';
import { Toaster } from './components/ui/sonner';
import { useBulkDragPaint } from './hooks/useBulkDragPaint';
import { MuleCharacterCard } from './components/MuleCharacterCard';
import { MuleDetailDrawer } from './components/MuleDetailDrawer';
import { AddCard } from './components/AddCard';
import { Header } from './components/Header';
import { KpiCard } from './components/KpiCard';
import { PieChartCard } from './components/PieChartCard';
import { RosterHeader } from './components/RosterHeader';
import { WorldMissingBanner } from './components/WorldMissingBanner';

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

export function AppContent() {
  const { mules, addMule, updateMule, deleteMule, deleteMules, reorderMules } = useMuleActions();
  const { world } = useWorld();
  // Unfiltered `mules` is intentionally kept for drag-reorder index math and
  // the selected/active lookups, which must address the full array.
  const mulesInWorld = useMemo(() => lensMules(mules, world), [mules, world]);
  // KpiCard/PieChartCard defer to absorb boss-matrix burst updates. Roster stays
  // live — stale mules on drop causes FLIP to target the wrong layout.
  const deferredMulesInWorld = useDeferredValue(mulesInWorld);
  const [selectedMuleId, setSelectedMuleId] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [bulkMode, setBulkMode] = useState(false);
  const [toDelete, setToDelete] = useState<Set<string>>(() => new Set());
  const [showWorldNeededBanner, setShowWorldNeededBanner] = useState(false);

  const selectedMule = mules.find((m) => m.id === selectedMuleId) ?? null;

  // Stable ids array for SortableContext — `mulesInWorld` is already memoized
  // on `[mules, world]`, and `mules` identity only changes on add / delete /
  // reorder, so a single memo keyed on the filtered list keeps items stable
  // through drawer edits (which don't touch ids).
  const muleIds = useMemo(() => mulesInWorld.map((m) => m.id), [mulesInWorld]);

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

  const handleCloseDrawer = useCallback(() => {
    setSelectedMuleId(null);
  }, []);

  const enterBulk = useCallback(() => {
    setBulkMode(true);
    setToDelete(new Set());
  }, []);

  const exitBulk = useCallback(() => {
    setBulkMode(false);
    setToDelete(new Set());
  }, []);

  const toggleDelete = useCallback((id: string) => {
    setToDelete((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  // Exact-state setter used by the drag-paint hook. Returning `prev` when
  // the value already matches keeps React from scheduling a re-render on
  // every move frame that brushes an already-correct card.
  const setSelected = useCallback((id: string, shouldBeSelected: boolean) => {
    setToDelete((prev) => {
      if (prev.has(id) === shouldBeSelected) return prev;
      const next = new Set(prev);
      if (shouldBeSelected) next.add(id);
      else next.delete(id);
      return next;
    });
  }, []);

  // Live refs for the drag-paint hook: mule order feeds range math, and
  // `isSelected` drives the Original Snapshot. Routing through refs lets
  // the hook read current values across multi-frame gestures without
  // recreating its callbacks on every toggle.
  const orderRef = useRef<string[]>([]);
  useEffect(() => {
    orderRef.current = mulesInWorld.map((m) => m.id);
  }, [mulesInWorld]);

  const toDeleteRef = useRef(toDelete);
  useEffect(() => {
    toDeleteRef.current = toDelete;
  }, [toDelete]);

  const isSelected = useCallback((id: string) => toDeleteRef.current.has(id), []);

  const { handlers: dragPaintHandlers, isPaintEngaged } = useBulkDragPaint({
    enabled: bulkMode,
    orderRef,
    isSelected,
    setSelected,
  });

  const handleBulkDelete = useCallback(() => {
    if (toDelete.size === 0) return;
    deleteMules([...toDelete]);
    exitBulk();
  }, [toDelete, deleteMules, exitBulk]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />
      <main className="container mx-auto max-w-352 px-4 sm:px-6 py-8">
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
            onDelete={handleBulkDelete}
          />

          <DndContext
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            onDragCancel={handleDragCancel}
            sensors={sensors}
            modifiers={[restrictToParentElement]}
          >
            <SortableContext items={muleIds} strategy={rectSortingStrategy} disabled={bulkMode}>
              <div
                style={isDragging ? dragBoundaryActiveStyle : dragBoundaryBaseStyle}
                className="transition-[border-color] duration-200"
                data-drag-boundary
                data-bulk-mode={bulkMode ? 'true' : 'false'}
                {...dragPaintHandlers}
              >
                <div
                  className="grid"
                  style={{
                    gridTemplateColumns: 'repeat(var(--roster-cols, 6), minmax(0, 1fr))',
                    gap: 'var(--roster-gap, 16px)',
                  }}
                >
                  {mulesInWorld.map((mule) => (
                    <MuleCharacterCard
                      key={mule.id}
                      mule={mule}
                      onClick={handleCardClick}
                      onDelete={deleteMule}
                      bulkMode={bulkMode}
                      selected={toDelete.has(mule.id)}
                      onToggleSelect={toggleDelete}
                      isPaintEngaged={isPaintEngaged}
                    />
                  ))}
                  {!bulkMode && <AddCard onClick={handleAddMule} />}
                </div>
              </div>
            </SortableContext>
          </DndContext>
        </section>
      </main>

      <MuleDetailDrawer
        mule={selectedMule}
        open={selectedMule !== null}
        onClose={handleCloseDrawer}
        onUpdate={updateMule}
        onDelete={deleteMule}
      />
    </div>
  );
}

function App() {
  return (
    <ThemeProvider defaultTheme="dark">
      <DensityProvider>
        <WorldProvider>
          <IncomeProvider>
            <AppContent />
          </IncomeProvider>
        </WorldProvider>
      </DensityProvider>
      <Toaster />
    </ThemeProvider>
  );
}

export default App;
