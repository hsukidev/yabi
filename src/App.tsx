import '@mantine/core/styles.css';

import {
  MantineProvider,
  createTheme,
  useMantineColorScheme,
  ActionIcon,
  Container,
  Title,
  Text,
  Code,
  Button,
  Stack,
  Group,
} from '@mantine/core';
import { IconSun, IconMoon } from '@tabler/icons-react';
import { useState } from 'react';

const theme = createTheme({});

function ColorSchemeToggle() {
  const { colorScheme, toggleColorScheme } = useMantineColorScheme();
  const dark = colorScheme === 'dark';

  return (
    <ActionIcon
      variant="outline"
      onClick={toggleColorScheme}
      aria-label="Toggle color scheme"
      size="lg"
    >
      {dark ? <IconSun size={18} /> : <IconMoon size={18} />}
    </ActionIcon>
  );
}

function App() {
  const [count, setCount] = useState(0);

  return (
    <MantineProvider theme={theme} defaultColorScheme="dark">
      <Container size="sm" py="xl">
        <Group justify="flex-end">
          <ColorSchemeToggle />
        </Group>

        <Stack align="center" mt="xl" gap="md">
          <Title>Vite + React + Mantine</Title>
          <Text>
            Edit <Code>src/App.tsx</Code> and save to test HMR
          </Text>
          <Button onClick={() => setCount((c) => c + 1)}>
            Count is {count}
          </Button>
        </Stack>
      </Container>
    </MantineProvider>
  );
}

export default App;