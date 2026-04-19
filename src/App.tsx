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
import { useState, useCallback, useDeferredValue } from 'react';
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
import { DensityToggle } from './components/DensityToggle';

const dragBoundaryBaseStyle: React.CSSProperties = {
  borderRadius: '1rem',
  borderStyle: 'dashed',
  borderWidth: '1.5px',
  borderColor: 'transparent',
  padding: '0.75rem',
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
  const { mules, addMule, updateMule, deleteMule, reorderMules } = useMules();
  // During rapid keystrokes in the drawer, non-drawer surfaces (KpiCard,
  // SplitCard/recharts PieChart, the roster cards) can lag on the deferred
  // snapshot. React skips their memo'd renders until typing pauses, so the
  // input stays responsive even when the roster is dense.
  const deferredMules = useDeferredValue(mules);
  const { toggle: toggleAbbreviated } = useFormatPreference();
  const [selectedMuleId, setSelectedMuleId] = useState<string | null>(null);
  const [activeMuleId, setActiveMuleId] = useState<string | null>(null);

  // Drawer reads from the live `mules` so the edited Input reflects every
  // keystroke immediately; KpiCard/SplitCard/roster read from `deferredMules`.
  const selectedMule = mules.find((m) => m.id === selectedMuleId) ?? null;
  const activeMule = activeMuleId ? (deferredMules.find((m) => m.id === activeMuleId) ?? null) : null;
  const isDragging = activeMuleId !== null;

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
          <div className="flex items-end justify-between mb-4">
            <div className="flex items-center gap-3">
              <span
                aria-hidden
                className="h-px w-8"
                style={{ background: 'linear-gradient(90deg, transparent, var(--accent-raw, var(--accent)))' }}
              />
              <h2 className="font-display text-2xl font-bold tracking-tight">Roster</h2>
              <span className="eyebrow-plain">
                {mules.length} {mules.length === 1 ? 'MULE' : 'MULES'}
              </span>
              <DensityToggle />
            </div>
            {mules.length > 1 && (
              <p className="eyebrow-plain hidden sm:block" style={{ opacity: 0.6 }}>drag to reorder</p>
            )}
          </div>

          <DndContext
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            onDragCancel={handleDragCancel}
            sensors={sensors}
            modifiers={[restrictToParentElement]}
          >
            <SortableContext items={deferredMules.map((m) => m.id)} strategy={rectSortingStrategy}>
              <div style={isDragging ? dragBoundaryActiveStyle : dragBoundaryBaseStyle} className="transition-[border-color] duration-200" data-drag-boundary>
                <div
                  className="grid gap-4"
                  style={{
                    gridTemplateColumns: 'repeat(var(--roster-cols, 6), minmax(0, 1fr))',
                    // Prevents a lone AddCard row from collapsing below the mule-card floor.
                    gridAutoRows: 'minmax(var(--roster-card-min-height, 260px), auto)',
                  }}
                >
                  {deferredMules.map((mule) => (
                    <MuleCharacterCard
                      key={mule.id}
                      mule={mule}
                      onClick={handleCardClick}
                      onDelete={deleteMule}
                    />
                  ))}
                  <AddCard onClick={handleAddMule} />
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
