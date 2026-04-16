import { ActionIcon, Group, Text, useMantineColorScheme } from '@mantine/core';
import { IconSun, IconMoon } from '@tabler/icons-react';

interface HeaderProps {
  totalWeeklyIncome: string;
  muleCount: number;
}

export function Header({ totalWeeklyIncome, muleCount }: HeaderProps) {
  const { colorScheme, toggleColorScheme } = useMantineColorScheme();
  const dark = colorScheme === 'dark';

  return (
    <Group justify="space-between" py="md" px="lg">
      <div>
        <Text size="xl" fw={700}>Mule Crystal Tracker</Text>
        <Text size="sm" c="dimmed">{muleCount} mule{muleCount !== 1 ? 's' : ''}</Text>
      </div>
      <Group>
        <Text size="lg" fw={600}>Weekly: {totalWeeklyIncome} mesos</Text>
        <ActionIcon
          variant="outline"
          onClick={toggleColorScheme}
          aria-label="Toggle color scheme"
          size="lg"
        >
          {dark ? <IconSun size={18} /> : <IconMoon size={18} />}
        </ActionIcon>
      </Group>
    </Group>
  );
}