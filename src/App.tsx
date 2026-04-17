import { DndContext, closestCenter, type DragEndEvent, PointerSensor, useSensor } from '@dnd-kit/core';
import { SortableContext, rectSortingStrategy } from '@dnd-kit/sortable';
import { restrictToParentElement } from '@dnd-kit/modifiers';
import { useState, useCallback } from 'react';

import { ThemeProvider } from './context/ThemeProvider';
import { IncomeProvider } from './modules/IncomeProvider';
import { useTotalIncome, useFormatPreference } from './modules/income-hooks';
import { useMules } from './hooks/useMules';
import { MuleCharacterCard } from './components/MuleCharacterCard';
import { MuleDetailDrawer } from './components/MuleDetailDrawer';
import { AddCard } from './components/AddCard';
import { Header } from './components/Header';
import { IncomePieChart } from './components/IncomePieChart';

const dragBoundaryStyle: React.CSSProperties = {
  borderStyle: 'dashed',
  borderWidth: '1.5px',
  borderColor: 'color-mix(in oklch, var(--accent-primary) 45%, transparent)',
  borderRadius: '1rem',
  padding: '0.75rem',
};

function AppContent() {
  const { mules, addMule, updateMule, deleteMule, reorderMules } = useMules();
  const { formatted: totalWeeklyIncome } = useTotalIncome(mules);
  const { toggle: toggleAbbreviated } = useFormatPreference();
  const [selectedMuleId, setSelectedMuleId] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const selectedMule = mules.find((m) => m.id === selectedMuleId) ?? null;
  const activeMuleCount = mules.filter((m) => m.selectedBosses.length > 0).length;

  const sensors = [useSensor(PointerSensor, { activationConstraint: { distance: 5 } })];

  const handleDragStart = useCallback(() => {
    setIsDragging(true);
  }, []);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      setIsDragging(false);
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

  function handleAddMule() {
    const id = addMule();
    setSelectedMuleId(id);
  }

  function handleSliceClick(muleId: string) {
    setSelectedMuleId(muleId);
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header totalWeeklyIncome={totalWeeklyIncome} muleCount={mules.length} />

      <main className="container mx-auto max-w-7xl px-4 sm:px-6 py-8">
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-10">
          <div className="lg:col-span-8 relative overflow-hidden rounded-2xl border border-border bg-card/80 backdrop-blur-sm p-8 shadow-[0_0_80px_-28px_var(--accent-primary)]">
            <div
              aria-hidden
              className="absolute -top-24 -right-24 h-64 w-64 rounded-full blur-3xl opacity-40 pointer-events-none"
              style={{ background: 'radial-gradient(closest-side, var(--accent-primary), transparent)' }}
            />
            <div
              aria-hidden
              className="absolute -bottom-32 -left-20 h-72 w-72 rounded-full blur-3xl opacity-25 pointer-events-none"
              style={{ background: 'radial-gradient(closest-side, var(--accent-secondary), transparent)' }}
            />
            <div className="relative flex flex-col gap-4">
              <div className="flex items-center gap-3">
                <span
                  aria-hidden
                  className="h-1.5 w-10 rounded-full"
                  style={{ background: 'linear-gradient(90deg, var(--accent-primary), var(--accent-numeric))' }}
                />
                <p className="font-sans text-[11px] uppercase tracking-[0.28em] text-muted-foreground">
                  Total Weekly Income
                </p>
              </div>
              <button
                type="button"
                onClick={toggleAbbreviated}
                className="group flex items-baseline gap-3 text-left cursor-pointer"
                aria-label="Toggle abbreviated meso format"
              >
                <span className="font-mono-nums text-5xl sm:text-6xl font-medium text-[var(--accent-numeric)] leading-none group-hover:drop-shadow-[0_0_12px_var(--accent-primary)] transition-[filter] duration-200">
                  {totalWeeklyIncome}
                </span>
                <span className="font-display italic text-2xl text-muted-foreground group-hover:text-foreground/80 transition-colors">
                  mesos
                </span>
              </button>
              <div className="flex flex-wrap gap-6 pt-2 border-t border-border/40 mt-2">
                <Stat label="Mules" value={String(mules.length)} />
                <Stat label="Active" value={String(activeMuleCount)} accent="secondary" />
                <Stat
                  label="Avg / Mule"
                  value={activeMuleCount > 0 ? 'see chart' : '\u2014'}
                  muted
                />
              </div>
            </div>
          </div>

          <div className="lg:col-span-4 relative rounded-2xl border border-border bg-card/60 backdrop-blur-sm p-4 overflow-hidden">
            <div className="flex items-center justify-between px-2 pb-2">
              <p className="font-display italic text-lg text-foreground/90">
                Income Split
              </p>
              <span className="font-sans text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                by mule
              </span>
            </div>
            <IncomePieChart
              mules={mules}
              onSliceClick={handleSliceClick}
            />
          </div>
        </section>

        <section>
          <div className="flex items-end justify-between mb-4">
            <div className="flex items-center gap-3">
              <span
                aria-hidden
                className="h-px w-8"
                style={{ background: 'linear-gradient(90deg, transparent, var(--accent-secondary))' }}
              />
              <h2 className="font-display text-2xl font-bold tracking-tight">
                Roster
              </h2>
              <span className="font-sans text-[11px] uppercase tracking-[0.24em] text-muted-foreground">
                {mules.length} {mules.length === 1 ? 'mule' : 'mules'}
              </span>
            </div>
            {mules.length > 1 && (
              <p className="font-sans text-[10px] uppercase tracking-[0.22em] text-muted-foreground/70 hidden sm:block">
                drag to reorder
              </p>
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
            <SortableContext items={mules.map((m) => m.id)} strategy={rectSortingStrategy}>
              <div style={isDragging ? dragBoundaryStyle : {}} className="transition-all duration-200">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
                  {mules.map((mule) => (
                    <MuleCharacterCard
                      key={mule.id}
                      mule={mule}
                      onClick={() => setSelectedMuleId(mule.id)}
                      onDelete={deleteMule}
                    />
                  ))}
                  <AddCard onClick={handleAddMule} />
                </div>
              </div>
            </SortableContext>
          </DndContext>
        </section>
      </main>

      <MuleDetailDrawer
        mule={selectedMule}
        open={selectedMule !== null}
        onClose={() => setSelectedMuleId(null)}
        onUpdate={updateMule}
        onDelete={deleteMule}
      />
    </div>
  );
}

interface StatProps {
  label: string;
  value: string;
  accent?: 'primary' | 'secondary';
  muted?: boolean;
}

function Stat({ label, value, accent, muted }: StatProps) {
  const accentColor = accent === 'secondary' ? 'var(--accent-secondary)' : 'var(--accent-primary)';
  return (
    <div className="flex flex-col gap-1">
      <span className="font-sans text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
        {label}
      </span>
      <span
        className="font-mono-nums text-xl"
        style={{ color: muted ? undefined : accentColor }}
      >
        {value}
      </span>
    </div>
  );
}

function App() {
  return (
    <ThemeProvider defaultTheme="dark">
      <IncomeProvider>
        <AppContent />
      </IncomeProvider>
    </ThemeProvider>
  );
}

export default App;
