import { Card, Text, Badge, Group } from '@mantine/core';
import type { Mule } from '../types';
import { calculatePotentialIncome } from '../data/bosses';
import { formatMeso } from '../utils/meso';
import placeholderPng from '../assets/placeholder.png';

interface MuleCharacterCardProps {
  mule: Mule;
  onClick: () => void;
}

export function MuleCharacterCard({ mule, onClick }: MuleCharacterCardProps) {
  const potentialIncome = calculatePotentialIncome(mule.selectedBosses);

  return (
    <Card
      shadow="sm"
      radius="md"
      withBorder
      style={{ width: 200, height: 300, cursor: 'pointer', padding: 0, overflow: 'hidden' }}
      onClick={onClick}
    >
      <div style={{ height: '60%', overflow: 'hidden' }}>
        <img
          src={placeholderPng}
          alt={mule.name || 'Mule avatar'}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
      </div>
      <div style={{ padding: 'var(--mantine-spacing-sm)', display: 'flex', flexDirection: 'column', gap: 'var(--mantine-spacing-xs)', height: '40%' }}>
        <Text fw={600} size="sm" truncate>
          {mule.name || 'Unnamed Mule'}
        </Text>
        <Group gap="xs" wrap="nowrap">
          {mule.level > 0 && (
            <Badge variant="outline" size="sm">Lv. {mule.level}</Badge>
          )}
          {mule.muleClass && (
            <Badge variant="light" size="sm">{mule.muleClass}</Badge>
          )}
        </Group>
        <Text size="sm" fw={700} c="yellow">
          {formatMeso(potentialIncome)}/week
        </Text>
      </div>
    </Card>
  );
}