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
import { IconPlus } from '@tabler/icons-react';
import { useState, useCallback } from 'react';
import { useMules } from './hooks/useMules';
import { calculatePotentialIncome } from './data/bosses';
import { formatMeso } from './utils/meso';
import { SortableMuleCharacterCard } from './components/SortableMuleCharacterCard';
import { MuleDetailDrawer } from './components/MuleDetailDrawer';
import { Header } from './components/Header';
import { IncomePieChart } from './components/IncomePieChart';

const theme = createTheme({});

function AppContent() {
  const { mules, addMule, updateMule, deleteMule, reorderMules } = useMules();
  const [abbreviated, setAbbreviated] = useState(true);
  const [selectedMuleId, setSelectedMuleId] = useState<string | null>(null);
  const sensors = [useSensor(PointerSensor, { activationConstraint: { distance: 5 } })];

  const totalWeeklyIncome = mules.reduce(
    (sum, m) => sum + calculatePotentialIncome(m.selectedBosses),
    0,
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
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

          <DndContext
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
            sensors={sensors}
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