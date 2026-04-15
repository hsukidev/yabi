import { useState } from 'react';
import { Checkbox, Stack, Group, Text, TextInput } from '@mantine/core';
import { IconSearch } from '@tabler/icons-react';
import { bossFamilies } from '../data/bosses';
import { formatMeso } from '../utils/meso';
import { selectBoss } from '../utils/selectBoss';

interface BossCheckboxListProps {
  selectedBosses: string[];
  onChange: (selectedBosses: string[]) => void;
}

export function BossCheckboxList({ selectedBosses, onChange }: BossCheckboxListProps) {
  const [search, setSearch] = useState('');

  const filteredFamilies = bossFamilies.filter((family) =>
    family.family.toLowerCase().includes(search.toLowerCase()) ||
    family.bosses.some((b) => b.name.toLowerCase().includes(search.toLowerCase())),
  );

  function handleCheckboxChange(bossId: string, family: string, checked: boolean) {
    if (checked) {
      onChange(selectBoss(selectedBosses, bossId, family));
    } else {
      onChange(selectedBosses.filter((id) => id !== bossId));
    }
  }

  return (
    <Stack gap="sm">
      <TextInput
        placeholder="Search bosses..."
        leftSection={<IconSearch size={16} />}
        value={search}
        onChange={(e) => setSearch(e.currentTarget.value)}
      />
      {filteredFamilies.map((family) => {
        const displayName = family.bosses[0].name.replace(/^(Extreme|Chaos|Hard|Normal|Easy) /, '');

        return (
          <div
            key={family.family}
            style={{
              border: '1px solid var(--mantine-color-default-border)',
              borderRadius: 'var(--mantine-radius-sm)',
              padding: 'var(--mantine-spacing-xs) var(--mantine-spacing-sm)',
            }}
          >
            <Text size="sm" fw={600} mb={4}>
              {displayName}
            </Text>
            <Group gap="xs" wrap="wrap">
              {family.bosses.map((boss) => (
                <Checkbox
                  key={boss.id}
                  label={`${boss.name} (${formatMeso(boss.crystalValue)})`}
                  size="sm"
                  checked={selectedBosses.includes(boss.id)}
                  onChange={(e) =>
                    handleCheckboxChange(boss.id, family.family, e.currentTarget.checked)
                  }
                />
              ))}
            </Group>
          </div>
        );
      })}
      {filteredFamilies.length === 0 && (
        <Text c="dimmed" ta="center">No bosses found</Text>
      )}
    </Stack>
  );
}