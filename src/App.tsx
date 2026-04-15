import '@mantine/core/styles.css';
import '@mantine/charts/styles.css';

import {
  MantineProvider,
  createTheme,
  Container,
  Stack,
  Button,
  Paper,
  Group,
  Text,
  SimpleGrid,
} from '@mantine/core';
import { DndContext, closestCenter, type DragEndEvent, PointerSensor, useSensor } from '@dnd-kit/core';
import { SortableContext, rectSortingStrategy } from '@dnd-kit/sortable';
import { restrictToParentElement } from '@dnd-kit/modifiers';
import { IconPlus } from '@tabler/icons-react';
import { useState, useCallback, useRef } from 'react';
import { useMules } from './hooks/useMules';
import { calculatePotentialIncome } from './data/bosses';
import { formatMeso } from './utils/meso';
import { SortableMuleCharacterCard } from './components/SortableMuleCharacterCard';
import { MuleDetailDrawer } from './components/MuleDetailDrawer';
import { Header } from './components/Header';
import { IncomePieChart } from './components/IncomePieChart';

const theme = createTheme({
  colors: {
    dark: [
      '#C1C1C1',
      '#A6A6A6',
      '#8B8B8B',
      '#777777',
      '#5C5C5C',
      '#404040',
      '#303030',
      '#252525',
      '#1D1D1D',
      '#161616',
    ],
  },
});

function AppContent() {
  const { mules, addMule, updateMule, deleteMule, reorderMules } = useMules();
  const [abbreviated, setAbbreviated] = useState(true);
  const [selectedMuleId, setSelectedMuleId] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const gridRef = useRef<HTMLDivElement>(null);
  const sensors = [useSensor(PointerSensor, { activationConstraint: { distance: 5 } })];

  const totalWeeklyIncome = mules.reduce(
    (sum, m) => sum + calculatePotentialIncome(m.selectedBosses),
    0,
  );

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

  function handleAddMule() {
    const id = addMule();
    setSelectedMuleId(id);
  }

  function handleSliceClick(muleId: string) {
    setSelectedMuleId(muleId);
  }

  const selectedMule = mules.find((m) => m.id === selectedMuleId) ?? null;

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--mantine-color-body)' }}>
      <Header totalWeeklyIncome={totalWeeklyIncome} muleCount={mules.length} abbreviated={abbreviated} />
      <Container size="lg" py="md">
        <Stack gap="md">
          <Paper p="md" radius="md" withBorder>
            <Group justify="space-between" align="center">
              <div>
                <Text size="sm" c="dimmed">Total Weekly Income</Text>
                <Text
                  size="xl"
                  fw={700}
                  style={{ cursor: 'pointer' }}
                  onClick={() => setAbbreviated(!abbreviated)}
                >
                  {formatMeso(totalWeeklyIncome, abbreviated)} mesos
                </Text>
              </div>
            </Group>
            <IncomePieChart
              mules={mules}
              abbreviated={abbreviated}
              onSliceClick={handleSliceClick}
            />
          </Paper>

          <Group justify="flex-end">
            <Button leftSection={<IconPlus size={16} />} onClick={handleAddMule}>
              Add Mule
            </Button>
          </Group>

          <div
            ref={gridRef}
            style={{
              border: isDragging ? '1px dotted var(--mantine-color-dimmed)' : '1px dotted transparent',
              borderRadius: 'var(--mantine-radius-sm)',
              padding: isDragging ? 'var(--mantine-spacing-xs)' : undefined,
              transition: 'border-color 200ms ease',
            }}
          >
            <DndContext
              collisionDetection={closestCenter}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
              sensors={sensors}
              modifiers={[restrictToParentElement]}
            >
              <SortableContext items={mules.map((m) => m.id)} strategy={rectSortingStrategy}>
                <SimpleGrid
                  cols={{ xl: 4, lg: 3, md: 2, sm: 1 }}
                  spacing="sm"
                >
                  {mules.map((mule) => (
                    <SortableMuleCharacterCard
                      key={mule.id}
                      mule={mule}
                      onClick={() => setSelectedMuleId(mule.id)}
                    />
                  ))}
                </SimpleGrid>
              </SortableContext>
            </DndContext>
          </div>
        </Stack>
      </Container>

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
    <MantineProvider theme={theme} defaultColorScheme="dark">
      <AppContent />
    </MantineProvider>
  );
}

export default App;