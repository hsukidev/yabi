import { DndContext, closestCenter, type DragEndEvent, PointerSensor, useSensor } from '@dnd-kit/core';
import { SortableContext, rectSortingStrategy } from '@dnd-kit/sortable';
import { restrictToParentElement } from '@dnd-kit/modifiers';
import { Plus } from 'lucide-react';
import { useState, useCallback, useEffect } from 'react';

import { ThemeProvider } from './context/ThemeProvider';
import { IncomeProvider } from './modules/IncomeProvider';
import { useTotalIncome, useFormatPreference } from './modules/income-hooks';
import { useMules } from './hooks/useMules';
import { MuleCharacterCard } from './components/MuleCharacterCard';
import { MuleDetailDrawer } from './components/MuleDetailDrawer';
import { Header } from './components/Header';
import { IncomePieChart } from './components/IncomePieChart';
import { Button } from './components/ui/button';

const dragBoundaryStyle: React.CSSProperties = {
  borderStyle: 'dotted',
  borderWidth: '2px',
  borderColor: 'hsl(var(--border))',
};

function AppContent() {
  const { mules, addMule, updateMule, deleteMule, reorderMules } = useMules();
  const { formatted: totalWeeklyIncome } = useTotalIncome(mules);
  const { toggle: toggleAbbreviated } = useFormatPreference();
  const [selectedMuleId, setSelectedMuleId] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    if (selectedMuleId && !mules.some((m) => m.id === selectedMuleId)) {
      setSelectedMuleId(null);
    }
  }, [mules, selectedMuleId]);

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

  const selectedMule = mules.find((m) => m.id === selectedMuleId) ?? null;

  return (
    <div className="min-h-screen bg-background">
      <Header totalWeeklyIncome={totalWeeklyIncome} muleCount={mules.length} />
      <div className="container mx-auto max-w-5xl py-4 px-4">
        <div className="flex flex-col gap-4">
          <div className="rounded-lg border bg-card p-4">
            <p className="text-sm text-muted-foreground">Total Weekly Income</p>
            <p
              className="text-xl font-bold cursor-pointer"
              onClick={toggleAbbreviated}
            >
              {totalWeeklyIncome} mesos
            </p>
            <IncomePieChart
              mules={mules}
              onSliceClick={handleSliceClick}
            />
          </div>

          <div className="flex justify-end">
            <Button onClick={handleAddMule}>
              <Plus className="mr-1" size={16} />
              Add Mule
            </Button>
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
              <div style={isDragging ? dragBoundaryStyle : {}}>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2">
                  {mules.map((mule) => (
                    <MuleCharacterCard
                      key={mule.id}
                      mule={mule}
                      onClick={() => setSelectedMuleId(mule.id)}
                    />
                  ))}
                </div>
              </div>
            </SortableContext>
          </DndContext>
        </div>
      </div>

      <MuleDetailDrawer
        mule={selectedMule}
        open={selectedMuleId !== null}
        onClose={() => setSelectedMuleId(null)}
        onUpdate={updateMule}
        onDelete={deleteMule}
      />
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