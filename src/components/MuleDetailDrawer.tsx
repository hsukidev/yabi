import { useState } from 'react';
import {
  Drawer,
  TextInput,
  NumberInput,
  Button,
  Alert,
  Group,
  Stack,
  Text,
  Group as GroupMantine,
} from '@mantine/core';
import { IconTrash } from '@tabler/icons-react';
import type { Mule } from '../types';
import { calculatePotentialIncome } from '../data/bosses';
import { formatMeso } from '../utils/meso';
import { BossCheckboxList } from './BossCheckboxList';
import placeholderPng from '../assets/placeholder.png';

interface MuleDetailDrawerProps {
  mule: Mule | null;
  open: boolean;
  onClose: () => void;
  onUpdate: (id: string, updates: Partial<Omit<Mule, 'id'>>) => void;
  onDelete: (id: string) => void;
}

export function MuleDetailDrawer({ mule, open, onClose, onUpdate, onDelete }: MuleDetailDrawerProps) {
  const [confirmDelete, setConfirmDelete] = useState(false);

  function handleDelete(id: string) {
    onDelete(id);
    setConfirmDelete(false);
    onClose();
  }

  if (!mule) return null;

  const potentialIncome = calculatePotentialIncome(mule.selectedBosses);

  return (
    <Drawer
      opened={open}
      onClose={() => {
        setConfirmDelete(false);
        onClose();
      }}
      position="right"
      size={550}
      overlayProps={{ backgroundOpacity: 0.5, blur: 2 }}
      transitionProps={{ duration: 350, timingFunction: 'ease-out' }}
      title={null}
    >
      <Stack gap="md">
        <GroupMantine align="flex-start" gap="sm">
          <img
            src={placeholderPng}
            alt={mule.name || 'Mule avatar'}
            style={{ width: 80, height: 120, objectFit: 'cover', borderRadius: 'var(--mantine-radius-sm)' }}
          />
          <div style={{ minWidth: 0 }}>
            <Text fw={700} size="lg" truncate>
              {mule.name || 'Unnamed Mule'}
            </Text>
            {mule.level > 0 && <Text size="sm">Lv. {mule.level}</Text>}
            {mule.muleClass && <Text size="sm">{mule.muleClass}</Text>}
            <Text size="sm" fw={700} c="yellow">
              {formatMeso(potentialIncome)}/week
            </Text>
          </div>
        </GroupMantine>

        <Stack gap="sm">
          <TextInput
            label="Character Name"
            placeholder="Enter name"
            value={mule.name}
            onChange={(e) => onUpdate(mule.id, { name: e.currentTarget.value })}
          />
          <NumberInput
            label="Level"
            placeholder="Level"
            value={mule.level || undefined}
            onChange={(val) => onUpdate(mule.id, { level: typeof val === 'number' ? val : 0 })}
            min={0}
          />
          <TextInput
            label="Class"
            placeholder="Enter class"
            value={mule.muleClass}
            onChange={(e) => onUpdate(mule.id, { muleClass: e.currentTarget.value })}
          />
        </Stack>

        <BossCheckboxList
          selectedBosses={mule.selectedBosses}
          onChange={(selectedBosses) => onUpdate(mule.id, { selectedBosses })}
        />

        {confirmDelete ? (
          <Alert color="red">
            <Group justify="space-between">
              <Text size="sm">Delete this mule?</Text>
              <Group gap="xs">
                <Button size="xs" color="red" onClick={() => handleDelete(mule.id)}>
                  Yes
                </Button>
                <Button size="xs" variant="outline" onClick={() => setConfirmDelete(false)}>
                  Cancel
                </Button>
              </Group>
            </Group>
          </Alert>
        ) : (
          <Group justify="flex-end">
            <Button
              size="xs"
              color="red"
              variant="subtle"
              leftSection={<IconTrash size={14} />}
              onClick={() => setConfirmDelete(true)}
            >
              Delete
            </Button>
          </Group>
        )}
      </Stack>
    </Drawer>
  );
}