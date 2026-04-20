import {
  DndContext,
  DragOverlay,
  closestCenter,
  defaultDropAnimationSideEffects,
  type DragEndEvent,
  type DragStartEvent,
  type DropAnimation,
  PointerSensor,
  useSensor,
} from '@dnd-kit/core';
import { SortableContext, rectSortingStrategy } from '@dnd-kit/sortable';
import { restrictToParentElement } from '@dnd-kit/modifiers';
import { useState, useCallback, useDeferredValue, useMemo } from 'react';
import { createPortal } from 'react-dom';

import { ThemeProvider } from './context/ThemeProvider';
import { DensityProvider } from './context/DensityProvider';
import { IncomeProvider } from './modules/IncomeProvider';
import { useFormatPreference } from './modules/income-hooks';
import { useMules } from './hooks/useMules';
import { MuleCharacterCard, MuleCharacterCardOverlay } from './components/MuleCharacterCard';
import { MuleDetailDrawer } from './components/MuleDetailDrawer';
import { AddCard } from './components/AddCard';
import { Header } from './components/Header';
import { KpiCard } from './components/KpiCard';
import { SplitCard } from './components/SplitCard';
import { RosterHeader } from './components/RosterHeader';

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

const dropAnimation: DropAnimation = {
  duration: 220,
  easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
  sideEffects: defaultDropAnimationSideEffects({
    styles: { active: { opacity: '0' } },
  }),
};

function AppContent() {
  const { mules, addMule, updateMule, deleteMule, deleteMules, reorderMules } = useMules();
  // KpiCard/SplitCard defer to absorb boss-matrix burst updates. Roster stays
  // live — stale mules on drop causes FLIP to target the wrong layout.
  const deferredMules = useDeferredValue(mules);
  const { toggle: toggleAbbreviated } = useFormatPreference();
  const [selectedMuleId, setSelectedMuleId] = useState<string | null>(null);
  const [activeMuleId, setActiveMuleId] = useState<string | null>(null);
  const [bulkMode, setBulkMode] = useState(false);
  const [toDelete, setToDelete] = useState<Set<string>>(() => new Set());

  const selectedMule = mules.find((m) => m.id === selectedMuleId) ?? null;
  const activeMule = activeMuleId ? (mules.find((m) => m.id === activeMuleId) ?? null) : null;
  const isDragging = activeMuleId !== null;

  // Stabilize SortableContext items by value — updateMule rebuilds the array
  // on every edit, but ids only change on add/delete/reorder. Without this,
  // SortableContext rebroadcasts per edit and all cards re-render O(N).
  const muleIdsKey = mules.map((m) => m.id).join('\u0000');
  const muleIds = useMemo(
    () => mules.map((m) => m.id),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [muleIdsKey],
  );

  const sensors = [useSensor(PointerSensor, { activationConstraint: { distance: 0 } })];

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveMuleId(String(event.active.id));
  }, []);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      setActiveMuleId(null);
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
    setActiveMuleId(null);
  }, []);

  const handleAddMule = useCallback(() => {
    const id = addMule();
    setSelectedMuleId(id);
  }, [addMule]);

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

  const handleBulkDelete = useCallback(() => {
    if (toDelete.size === 0) return;
    deleteMules([...toDelete]);
    exitBulk();
  }, [toDelete, deleteMules, exitBulk]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />
      <main className="container mx-auto max-w-[88rem] px-4 sm:px-6 py-8">
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-10">
          <div className="lg:col-span-8 animate-in fade-in slide-in-from-bottom-4 duration-500 fill-mode-both">
            <KpiCard mules={deferredMules} onToggleFormat={toggleAbbreviated} />
          </div>
          <div className="lg:col-span-4 animate-in fade-in slide-in-from-bottom-4 duration-500 fill-mode-both">
            <SplitCard mules={deferredMules} onSliceClick={handleCardClick} />
          </div>
        </section>

        <section data-testid="roster-section" className="animate-in fade-in slide-in-from-bottom-4 duration-500 fill-mode-both">
          <RosterHeader
            muleCount={mules.length}
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
              <div style={isDragging ? dragBoundaryActiveStyle : dragBoundaryBaseStyle} className="transition-[border-color] duration-200" data-drag-boundary>
                <div
                  className="grid gap-4"
                  style={{
                    gridTemplateColumns: 'repeat(var(--roster-cols, 6), minmax(0, 1fr))',
                    // Prevents a lone AddCard row from collapsing below the mule-card floor.
                    gridAutoRows: 'minmax(var(--roster-card-min-height, 260px), auto)',
                  }}
                >
                  {mules.map((mule) => (
                    <MuleCharacterCard
                      key={mule.id}
                      mule={mule}
                      onClick={handleCardClick}
                      onDelete={deleteMule}
                      bulkMode={bulkMode}
                      selected={toDelete.has(mule.id)}
                      onToggleSelect={toggleDelete}
                    />
                  ))}
                  {!bulkMode && <AddCard onClick={handleAddMule} />}
                </div>
              </div>
            </SortableContext>
            {createPortal(
              <DragOverlay dropAnimation={dropAnimation}>
                {activeMule ? <MuleCharacterCardOverlay mule={activeMule} /> : null}
              </DragOverlay>,
              document.body,
            )}
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
        <IncomeProvider>
          <AppContent />
        </IncomeProvider>
      </DensityProvider>
    </ThemeProvider>
  );
}

export default App;
