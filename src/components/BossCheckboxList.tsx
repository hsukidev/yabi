import { useState } from 'react';
import { Checkbox, Stack, Group, Text, TextInput } from '@mantine/core';
import { IconSearch } from '@tabler/icons-react';
import { toggleBoss, getFamilies } from '../data/bossSelection';

interface BossCheckboxListProps {
  selectedBosses: string[];
  onChange: (selectedBosses: string[]) => void;
}

export function BossCheckboxList({ selectedBosses, onChange }: BossCheckboxListProps) {
  const [search, setSearch] = useState('');

  const families = getFamilies(selectedBosses, search || undefined);

  return (
    <Stack gap="sm">
      <TextInput
        placeholder="Search bosses..."
        leftSection={<IconSearch size={16} />}
        value={search}
        onChange={(e) => setSearch(e.currentTarget.value)}
      />
      {families.map((family) => (
        <div
          key={family.family}
          style={{
            border: '1px solid var(--mantine-color-default-border)',
            borderRadius: 'var(--mantine-radius-sm)',
            padding: 'var(--mantine-spacing-xs) var(--mantine-spacing-sm)',
          }}
        >
          <Text size="sm" fw={600} mb={4}>
            {family.displayName}
          </Text>
          <Group gap="xs" wrap="wrap">
            {family.bosses.map((boss) => (
              <Checkbox
                key={boss.id}
                label={`${boss.name} (${boss.formattedValue})`}
                size="sm"
                checked={boss.selected}
                onChange={() => onChange(toggleBoss(selectedBosses, boss.id))}
              />
            ))}
          </Group>
        </div>
      ))}
      {families.length === 0 && (
        <Text c="dimmed" ta="center">No bosses found</Text>
      )}
    </Stack>
  );
}