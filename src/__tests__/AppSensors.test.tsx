import { describe, expect, it, vi, beforeEach } from 'vitest';
import { renderApp } from '@/test/test-utils';

// Spy on `useSensor` to assert the sensor array shape App registers with
// DndContext. Split mouse/touch/keyboard replaces the single PointerSensor
// to let desktop stay instant while touch gates behind a 250ms long-press.
vi.mock('@dnd-kit/core', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@dnd-kit/core')>();
  return {
    ...actual,
    useSensor: vi.fn((sensor: unknown, options?: unknown) => ({
      sensor,
      options: options ?? {},
    })),
  };
});

function resetTestEnvironment() {
  localStorage.clear();
  document.documentElement.classList.remove('dark');
}

describe('App sensor configuration', () => {
  beforeEach(() => {
    resetTestEnvironment();
    vi.clearAllMocks();
  });

  it('registers MouseSensor, TouchSensor, and KeyboardSensor with the expected constraints', async () => {
    const dndKit = await import('@dnd-kit/core');
    const sortable = await import('@dnd-kit/sortable');
    const useSensor = dndKit.useSensor as unknown as ReturnType<typeof vi.fn>;

    await renderApp();

    const calls = useSensor.mock.calls;
    const byName = new Map<string, unknown>();
    for (const [sensor, opts] of calls) {
      const name = (sensor as { name?: string })?.name;
      if (name) byName.set(name, opts);
    }

    expect(byName.has('MouseSensor')).toBe(true);
    expect(byName.has('TouchSensor')).toBe(true);
    expect(byName.has('KeyboardSensor')).toBe(true);

    expect(byName.get('MouseSensor')).toMatchObject({
      activationConstraint: { distance: 0 },
    });
    expect(byName.get('TouchSensor')).toMatchObject({
      activationConstraint: { delay: 250, tolerance: 5 },
    });
    expect(byName.get('KeyboardSensor')).toMatchObject({
      coordinateGetter: sortable.sortableKeyboardCoordinates,
    });
  });
});
