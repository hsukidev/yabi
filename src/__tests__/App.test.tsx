import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { render, renderApp, screen, fireEvent, waitFor, within, act } from '@/test/test-utils';
import { Dashboard as AppContent } from '../components/Dashboard';
import type { Mule } from '../types';
import { useWorld } from '../context/WorldProvider';
import type { WorldId } from '../data/worlds';

const STORAGE_KEY = 'maplestory-mule-tracker';

const testMules: Mule[] = [
  {
    id: 'mule-a',
    name: 'Alpha',
    level: 200,
    muleClass: 'Hero',
    selectedBosses: [],
    active: true,
    worldId: 'heroic-kronos',
  },
  {
    id: 'mule-b',
    name: 'Beta',
    level: 180,
    muleClass: 'Paladin',
    selectedBosses: [],
    active: true,
    worldId: 'heroic-kronos',
  },
  {
    id: 'mule-c',
    name: 'Gamma',
    level: 160,
    muleClass: 'Dark Knight',
    selectedBosses: [],
    active: true,
    worldId: 'heroic-kronos',
  },
];

// Persisted root since slice 1B: { schemaVersion, mules }.
function persistedRoot(mules: Mule[]) {
  return { schemaVersion: 2, mules };
}

const DEFAULT_RECT = {
  x: 0,
  y: 0,
  width: 800,
  height: 600,
  top: 0,
  right: 800,
  bottom: 600,
  left: 0,
  toJSON: () => ({}),
};

function seedMules(mules: Mule[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(persistedRoot(mules)));
}

function resetTestEnvironment() {
  localStorage.clear();
  document.documentElement.classList.remove('dark');
  // Seed a Kronos lens so legacy fixtures (mule-a, mule-b, mule-c — all
  // stamped with worldId='heroic-kronos') are visible by default. Tests
  // that care about the no-world state override by calling
  // localStorage.removeItem('world') before render.
  localStorage.setItem('world', 'heroic-kronos');
}

function mockGetBoundingClientRect() {
  const orig = Element.prototype.getBoundingClientRect;
  Element.prototype.getBoundingClientRect = function () {
    const el = this as HTMLElement;
    const cardId = el.getAttribute('data-mule-card');
    if (cardId) {
      const i = testMules.findIndex((m) => m.id === cardId);
      if (i < 0) return { ...DEFAULT_RECT };
      return {
        x: i * 220,
        y: 0,
        width: 200,
        height: 300,
        top: 0,
        right: i * 220 + 200,
        bottom: 300,
        left: i * 220,
        toJSON: () => ({}),
      };
    }
    return { ...DEFAULT_RECT };
  };
  return () => {
    Element.prototype.getBoundingClientRect = orig;
  };
}

function simulatePointerDrag(
  startEl: HTMLElement,
  startX: number,
  startY: number,
  endX: number,
  endY: number,
) {
  // Fire both pointer and mouse events: MouseSensor listens for mouse*;
  // the bulk-paint hook listens for pointer*. Firing both keeps a single
  // helper working for both the reorder and bulk-paint test paths.
  fireEvent.pointerDown(startEl, {
    pointerId: 1,
    clientX: startX,
    clientY: startY,
    button: 0,
    isPrimary: true,
    bubbles: true,
  });
  fireEvent.mouseDown(startEl, { clientX: startX, clientY: startY, button: 0, bubbles: true });

  fireEvent.pointerMove(document, {
    pointerId: 1,
    clientX: startX + 10,
    clientY: startY,
    isPrimary: true,
    bubbles: true,
  });
  fireEvent.mouseMove(document, { clientX: startX + 10, clientY: startY, bubbles: true });

  fireEvent.pointerMove(document, {
    pointerId: 1,
    clientX: endX,
    clientY: endY,
    isPrimary: true,
    bubbles: true,
  });
  fireEvent.mouseMove(document, { clientX: endX, clientY: endY, bubbles: true });

  fireEvent.pointerUp(document, {
    pointerId: 1,
    clientX: endX,
    clientY: endY,
    isPrimary: true,
    bubbles: true,
  });
  fireEvent.mouseUp(document, { clientX: endX, clientY: endY, bubbles: true });
}

describe('App', () => {
  beforeEach(() => {
    resetTestEnvironment();
  });

  it('renders Add Card in the grid with "Add Mule" text', async () => {
    await renderApp();
    expect(screen.getByRole('button', { name: /add mule/i })).toBeTruthy();
  });

  it('renders weekly income section', async () => {
    await renderApp();
    expect(screen.getByText(/WEEKLY INCOME/i)).toBeTruthy();
  });

  it('renders mule card grid', async () => {
    seedMules(testMules);
    const { container } = await renderApp();
    const cards = container.querySelectorAll('[data-mule-card]');
    expect(cards.length).toBe(3);
  });

  it('Add Card appears as the last item in the grid', async () => {
    seedMules(testMules);
    const { container } = await renderApp();
    const grid = container.querySelector('[data-drag-boundary] .grid') as HTMLElement;
    const lastChild = grid.lastElementChild as HTMLElement;
    expect(lastChild.hasAttribute('data-add-card')).toBe(true);
  });

  it('clicking Add Card creates a new mule and opens the detail drawer', async () => {
    localStorage.setItem('world', 'heroic-kronos');
    await renderApp();
    fireEvent.click(screen.getByRole('button', { name: /add mule/i }));
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Unnamed Mule' })).toBeTruthy();
    });
  });

  describe('World Lens — Add Mule gating', () => {
    beforeEach(() => {
      // resetTestEnvironment defaults to a Kronos lens for legacy fixtures.
      // Gating tests exercise the "no world yet" state explicitly.
      localStorage.removeItem('world');
    });

    it('shows the WorldMissingBanner and creates no mule when no world is selected', async () => {
      const { container } = await renderApp();
      expect(container.querySelector('[data-world-missing-banner]')).toBeNull();

      fireEvent.click(screen.getByRole('button', { name: /add mule/i }));

      expect(container.querySelector('[data-world-missing-banner]')).toBeTruthy();
      expect(screen.getByText(/please select a world first/i)).toBeTruthy();
      expect(container.querySelectorAll('[data-mule-card]')).toHaveLength(0);
      expect(screen.queryByRole('heading', { name: 'Unnamed Mule' })).toBeNull();
    });

    it('stamps the currently-selected worldId onto the new mule', async () => {
      localStorage.setItem('world', 'heroic-hyperion');
      const { unmount } = await renderApp();
      fireEvent.click(screen.getByRole('button', { name: /add mule/i }));
      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'Unnamed Mule' })).toBeTruthy();
      });
      unmount();
      const raw = localStorage.getItem(STORAGE_KEY);
      const parsed = JSON.parse(raw!) as { mules: Mule[] };
      expect(parsed.mules).toHaveLength(1);
      expect(parsed.mules[0].worldId).toBe('heroic-hyperion');
    });

    it('unmounts the banner when the user picks a world', async () => {
      const { container } = await renderApp();
      fireEvent.click(screen.getByRole('button', { name: /add mule/i }));
      expect(container.querySelector('[data-world-missing-banner]')).toBeTruthy();

      fireEvent.click(screen.getByLabelText('Select world'));
      await waitFor(() => {
        expect(screen.getByRole('option', { name: 'Kronos' })).toBeTruthy();
      });
      fireEvent.click(screen.getByRole('option', { name: 'Kronos' }));

      await waitFor(() => {
        expect(container.querySelector('[data-world-missing-banner]')).toBeNull();
      });
    });
  });

  describe('World Lens — roster filtering', () => {
    const crossWorldMules: Mule[] = [
      {
        id: 'k1',
        name: 'Kronos-1',
        level: 200,
        muleClass: 'Hero',
        selectedBosses: [],
        active: true,
        worldId: 'heroic-kronos',
      },
      {
        id: 'k2',
        name: 'Kronos-2',
        level: 180,
        muleClass: 'Paladin',
        selectedBosses: [],
        active: true,
        worldId: 'heroic-kronos',
      },
      {
        id: 'h1',
        name: 'Hyperion-1',
        level: 220,
        muleClass: 'Bishop',
        selectedBosses: [],
        active: true,
        worldId: 'heroic-hyperion',
      },
      {
        id: 'h2',
        name: 'Hyperion-2',
        level: 210,
        muleClass: 'Shadower',
        selectedBosses: [],
        active: true,
        worldId: 'heroic-hyperion',
      },
      {
        id: 'h3',
        name: 'Hyperion-3',
        level: 150,
        muleClass: 'Night Lord',
        selectedBosses: [],
        active: true,
        worldId: 'heroic-hyperion',
      },
    ];

    function mulesStatValue(): string {
      const card = screen.getByTestId('income-card') as HTMLElement;
      const label = within(card).getByText('MULES');
      return label.parentElement!.querySelectorAll('div')[1]!.textContent ?? '';
    }

    it('renders only Kronos cards and Kronos counts when Kronos is the lens', async () => {
      localStorage.setItem('world', 'heroic-kronos');
      seedMules(crossWorldMules);
      const { container } = await renderApp();

      const ids = Array.from(container.querySelectorAll('[data-mule-card]')).map((c) =>
        c.getAttribute('data-mule-card'),
      );
      expect(ids).toEqual(['k1', 'k2']);
      expect(mulesStatValue()).toBe('2');
    });

    it('swaps which cards render when the user changes the lens', async () => {
      // TestLensDriver exposes setWorld as a regular button so the test drives
      // the lens switch through the public `useWorld()` contract. Base UI's
      // Select reliably sends the first `onValueChange` but skips subsequent
      // clicks in jsdom, which would turn this into a test of the select
      // widget rather than the roster filter we care about.
      function TestLensDriver({ worldId }: { worldId: WorldId }) {
        const { setWorld } = useWorld();
        return (
          <button data-testid="lens-set" onClick={() => setWorld(worldId)}>
            set
          </button>
        );
      }

      seedMules(crossWorldMules);
      const { container, rerender } = render(
        <>
          <TestLensDriver worldId="heroic-kronos" />
          <AppContent />
        </>,
        { defaultWorld: 'heroic-kronos' },
      );

      const kronosIds = Array.from(container.querySelectorAll('[data-mule-card]')).map((c) =>
        c.getAttribute('data-mule-card'),
      );
      expect(kronosIds).toEqual(['k1', 'k2']);
      expect(mulesStatValue()).toBe('2');

      rerender(
        <>
          <TestLensDriver worldId="heroic-hyperion" />
          <AppContent />
        </>,
      );
      fireEvent.click(screen.getByTestId('lens-set'));

      await waitFor(() => {
        const ids = Array.from(container.querySelectorAll('[data-mule-card]')).map((c) =>
          c.getAttribute('data-mule-card'),
        );
        expect(ids).toEqual(['h1', 'h2', 'h3']);
      });
      expect(mulesStatValue()).toBe('3');
    });
  });

  it('toggles income display format on click', async () => {
    await renderApp();
    const clickable = screen.getByRole('button', { name: /toggle abbreviated meso format/i });
    expect(clickable).toBeTruthy();
    fireEvent.click(clickable);
  });

  describe('selectedMuleId self-healing', () => {
    it('clears selectedMuleId when the selected mule is deleted', async () => {
      const mules: Mule[] = [
        {
          id: 'mule-a',
          name: 'DeleteMe',
          level: 200,
          muleClass: 'Hero',
          selectedBosses: [],
          active: true,
          worldId: 'heroic-kronos',
        },
      ];
      localStorage.setItem('maplestory-mule-tracker', JSON.stringify(persistedRoot(mules)));
      await renderApp();

      fireEvent.click(screen.getByText('DeleteMe'));
      expect(screen.getByRole('heading', { name: 'DeleteMe' })).toBeTruthy();

      fireEvent.click(screen.getByRole('button', { name: /delete/i }));
      fireEvent.click(screen.getByRole('button', { name: /yes/i }));

      await waitFor(() => {
        expect(screen.queryByRole('heading', { name: 'DeleteMe' })).toBeNull();
      });
    });

    it('keeps selectedMuleId when a different mule is deleted', async () => {
      const mules: Mule[] = [
        {
          id: 'mule-a',
          name: 'KeepMe',
          level: 200,
          muleClass: 'Hero',
          selectedBosses: [],
          active: true,
          worldId: 'heroic-kronos',
        },
        {
          id: 'mule-b',
          name: 'DeleteMe',
          level: 150,
          muleClass: 'Paladin',
          selectedBosses: [],
          active: true,
          worldId: 'heroic-kronos',
        },
      ];
      localStorage.setItem('maplestory-mule-tracker', JSON.stringify(persistedRoot(mules)));
      await renderApp();

      fireEvent.click(screen.getByText('KeepMe'));
      expect(screen.getByRole('heading', { name: 'KeepMe' })).toBeTruthy();

      const overlay = document.querySelector('[data-slot="sheet-overlay"]')!;
      fireEvent.click(overlay);
      await waitFor(() => {
        expect(screen.queryByRole('heading', { name: 'KeepMe' })).toBeNull();
      });

      fireEvent.click(screen.getByText('DeleteMe'));
      expect(screen.getByRole('heading', { name: 'DeleteMe' })).toBeTruthy();

      fireEvent.click(screen.getByRole('button', { name: /delete/i }));
      fireEvent.click(screen.getByRole('button', { name: /yes/i }));

      await waitFor(() => {
        expect(screen.queryByRole('heading', { name: 'DeleteMe' })).toBeNull();
      });

      fireEvent.click(screen.getByText('KeepMe'));
      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'KeepMe' })).toBeTruthy();
      });
    });
  });
});

describe('Bulk Delete Mode', () => {
  beforeEach(() => {
    resetTestEnvironment();
  });

  function enterBulk() {
    const btn = screen.getByRole('button', { name: /bulk.*delete|bulk.*trash/i });
    fireEvent.click(btn);
  }

  it('renders the Bulk Trash Icon in the roster header', async () => {
    seedMules(testMules);
    await renderApp();
    expect(screen.getByRole('button', { name: /bulk.*delete|bulk.*trash/i })).toBeTruthy();
  });

  it('clicking the Bulk Trash Icon swaps the header to the Bulk Action Bar', async () => {
    seedMules(testMules);
    await renderApp();
    enterBulk();
    expect(screen.getByText(/select or drag to delete/i)).toBeTruthy();
    expect(screen.getByText(/0\s*SELECTED/i)).toBeTruthy();
  });

  it('hides the Add Card in bulk mode', async () => {
    seedMules(testMules);
    const { container } = await renderApp();
    expect(container.querySelector('[data-add-card]')).toBeTruthy();
    enterBulk();
    expect(container.querySelector('[data-add-card]')).toBeNull();
  });

  it('clicking a Character Card toggles selection (does NOT open the drawer)', async () => {
    seedMules(testMules);
    const { container } = await renderApp();
    enterBulk();

    const panelA = container.querySelector('[data-mule-card="mule-a"] .panel') as HTMLElement;
    fireEvent.click(panelA);

    expect(screen.getByText(/1\s*SELECTED/i)).toBeTruthy();
    // Drawer heading should not appear
    expect(screen.queryByRole('heading', { name: 'Alpha' })).toBeNull();
  });

  it('surfaces the selected count in the pill and enables Delete when N > 0', async () => {
    seedMules(testMules);
    const { container } = await renderApp();
    enterBulk();

    // Initially disabled at 0
    expect((screen.getByRole('button', { name: /^delete$/i }) as HTMLButtonElement).disabled).toBe(
      true,
    );
    expect(screen.getByText(/0\s*SELECTED/i)).toBeTruthy();

    const panelA = container.querySelector('[data-mule-card="mule-a"] .panel') as HTMLElement;
    const panelB = container.querySelector('[data-mule-card="mule-b"] .panel') as HTMLElement;
    fireEvent.click(panelA);
    fireEvent.click(panelB);

    expect(screen.getByText(/2\s*SELECTED/i)).toBeTruthy();
    const confirm = screen.getByRole('button', { name: /^delete$/i }) as HTMLButtonElement;
    expect(confirm.disabled).toBe(false);
  });

  it('Bulk Confirm removes marked mules from the Roster and exits bulk mode', async () => {
    seedMules(testMules);
    const { container } = await renderApp();
    enterBulk();

    fireEvent.click(container.querySelector('[data-mule-card="mule-a"] .panel') as HTMLElement);
    fireEvent.click(container.querySelector('[data-mule-card="mule-b"] .panel') as HTMLElement);
    fireEvent.click(screen.getByRole('button', { name: /^delete$/i }));

    await waitFor(() => {
      expect(container.querySelector('[data-mule-card="mule-a"]')).toBeNull();
      expect(container.querySelector('[data-mule-card="mule-b"]')).toBeNull();
      expect(container.querySelector('[data-mule-card="mule-c"]')).toBeTruthy();
    });

    // Mode exited — header returns to default
    expect(screen.queryByText(/select or drag to delete/i)).toBeNull();
  });

  it('persists bulk deletion to localStorage', async () => {
    seedMules(testMules);
    const { container, unmount } = await renderApp();
    enterBulk();

    fireEvent.click(container.querySelector('[data-mule-card="mule-a"] .panel') as HTMLElement);
    fireEvent.click(screen.getByRole('button', { name: /^delete$/i }));

    await waitFor(() => {
      expect(container.querySelector('[data-mule-card="mule-a"]')).toBeNull();
    });

    // Force persistence flush by unmounting; cleanup effect flushes pending writes
    unmount();

    const raw = localStorage.getItem(STORAGE_KEY);
    expect(raw).toBeTruthy();
    const parsed = JSON.parse(raw!) as { mules: Mule[] };
    expect(parsed.mules.some((m) => m.id === 'mule-a')).toBe(false);
    expect(parsed.mules.some((m) => m.id === 'mule-b')).toBe(true);
    expect(parsed.mules.some((m) => m.id === 'mule-c')).toBe(true);
  });

  it('Bulk Cancel exits without removing any mule', async () => {
    seedMules(testMules);
    const { container } = await renderApp();
    enterBulk();

    fireEvent.click(container.querySelector('[data-mule-card="mule-a"] .panel') as HTMLElement);
    expect(screen.getByText(/1\s*SELECTED/i)).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: /^cancel$/i }));

    await waitFor(() => {
      expect(screen.queryByText(/select or drag to delete/i)).toBeNull();
    });

    // All three mules still in DOM
    expect(container.querySelectorAll('[data-mule-card]')).toHaveLength(3);
  });

  it('hides the level badge on every card while in bulk mode', async () => {
    seedMules(testMules);
    await renderApp();
    expect(screen.getAllByText(/Lv\./).length).toBeGreaterThan(0);

    enterBulk();
    expect(screen.queryByText(/Lv\./)).toBeNull();
  });

  it('hides the hover-trash popover on every card while in bulk mode', async () => {
    seedMules(testMules);
    const { container } = await renderApp();
    expect(container.querySelectorAll('button[aria-label="Delete mule"]').length).toBeGreaterThan(
      0,
    );
    enterBulk();
    expect(container.querySelectorAll('button[aria-label="Delete mule"]')).toHaveLength(0);
  });

  it('drag-to-reorder does not trigger in bulk mode (dnd sensors suspended)', async () => {
    seedMules(testMules);
    const restoreRect = mockGetBoundingClientRect();
    try {
      const { container } = await renderApp();
      enterBulk();

      const cardA = container.querySelector('[data-mule-card="mule-a"]') as HTMLElement;
      simulatePointerDrag(cardA, 100, 150, 320, 150);

      const order = Array.from(container.querySelectorAll('[data-mule-card]')).map((c) =>
        c.getAttribute('data-mule-card'),
      );
      expect(order).toEqual(['mule-a', 'mule-b', 'mule-c']);
    } finally {
      restoreRect();
    }
  });

  it('Drag Boundary exposes data-bulk-mode reflecting Bulk Delete Mode state', async () => {
    seedMules(testMules);
    const { container } = await renderApp();
    const boundary = container.querySelector('[data-drag-boundary]') as HTMLElement;
    expect(boundary.getAttribute('data-bulk-mode')).toBe('false');

    enterBulk();
    expect(boundary.getAttribute('data-bulk-mode')).toBe('true');

    fireEvent.click(screen.getByRole('button', { name: /^cancel$/i }));
    expect(boundary.getAttribute('data-bulk-mode')).toBe('false');
  });
});

describe('section entrance animations', () => {
  it('Header renders with sticky positioning', async () => {
    await renderApp();
    const header = screen.getByRole('banner');
    expect(header.className).toContain('sticky');
    expect(header.className).toContain('top-0');
  });

  it('income card has slide-up fade-in animation classes', async () => {
    const { container } = await renderApp();
    const incomeCard = container.querySelector('[data-testid="income-card"]');
    expect(incomeCard).toBeTruthy();
    const wrapper = incomeCard!.parentElement!;
    expect(wrapper.className).toContain('animate-in');
    expect(wrapper.className).toContain('fade-in');
    expect(wrapper.className).toContain('slide-in-from-bottom-4');
    expect(wrapper.className).toContain('duration-500');
    expect(wrapper.className).toContain('fill-mode-both');
  });

  it('income chart has slide-up fade-in animation classes', async () => {
    const { container } = await renderApp();
    const incomeChart = container.querySelector('[data-testid="income-chart"]');
    expect(incomeChart).toBeTruthy();
    const wrapper = incomeChart!.parentElement!;
    expect(wrapper.className).toContain('animate-in');
    expect(wrapper.className).toContain('fade-in');
    expect(wrapper.className).toContain('slide-in-from-bottom-4');
    expect(wrapper.className).toContain('duration-500');
    expect(wrapper.className).toContain('fill-mode-both');
  });

  it('roster section has slide-up fade-in animation classes', async () => {
    const { container } = await renderApp();
    const rosterSection = container.querySelector('[data-testid="roster-section"]');
    expect(rosterSection).toBeTruthy();
    expect(rosterSection!.className).toContain('animate-in');
    expect(rosterSection!.className).toContain('fade-in');
    expect(rosterSection!.className).toContain('slide-in-from-bottom-4');
    expect(rosterSection!.className).toContain('duration-500');
    expect(rosterSection!.className).toContain('fill-mode-both');
  });
});

describe('App DnD interactions', () => {
  let restoreRect: () => void;

  beforeEach(() => {
    resetTestEnvironment();
    seedMules(testMules);
    restoreRect = mockGetBoundingClientRect();
  });

  afterEach(() => {
    restoreRect();
  });

  it('renders mule cards in grid order', async () => {
    const { container } = await renderApp();
    const cards = container.querySelectorAll('[data-mule-card]');
    expect(cards).toHaveLength(3);
    expect(cards[0].getAttribute('data-mule-card')).toBe('mule-a');
    expect(cards[1].getAttribute('data-mule-card')).toBe('mule-b');
    expect(cards[2].getAttribute('data-mule-card')).toBe('mule-c');
  });

  it('calls reorderMules with correct indices on drag end', async () => {
    const { container } = await renderApp();

    const cardA = container.querySelector('[data-mule-card="mule-a"]') as HTMLElement;
    expect(cardA).toBeTruthy();

    simulatePointerDrag(cardA, 100, 150, 320, 150);

    await waitFor(() => {
      const cardsAfter = container.querySelectorAll('[data-mule-card]');
      const order = Array.from(cardsAfter).map((c) => c.getAttribute('data-mule-card'));
      expect(order).toEqual(['mule-b', 'mule-a', 'mule-c']);
    });
  });

  it('non-dragged cards retain transform transition during active drag', async () => {
    const { container } = await renderApp();
    const cardA = container.querySelector('[data-mule-card="mule-a"]') as HTMLElement;
    const cardB = container.querySelector('[data-mule-card="mule-b"]') as HTMLElement;

    fireEvent.mouseDown(cardA, { clientX: 100, clientY: 150, button: 0, bubbles: true });
    fireEvent.mouseMove(document, { clientX: 110, clientY: 150, bubbles: true });

    await waitFor(() => {
      expect(cardA.style.transition).not.toMatch(/transform\s+\d/);
    });

    const transitionB = cardB.style.transition;
    const transformParts = transitionB
      .split(',')
      .filter((p: string) => p.trim().startsWith('transform'));
    expect(transformParts.length).toBeGreaterThan(0);

    // Flush dnd-kit's drop animation state updates inside act so they don't
    // leak past the test boundary and warn about un-act'd AnimationManager updates.
    await act(async () => {
      fireEvent.mouseUp(document, { clientX: 110, clientY: 150, bubbles: true });
    });
  });

  it('dragged card has no transform transition during active drag', async () => {
    const { container } = await renderApp();
    const cardA = container.querySelector('[data-mule-card="mule-a"]') as HTMLElement;

    fireEvent.mouseDown(cardA, { clientX: 100, clientY: 150, button: 0, bubbles: true });
    fireEvent.mouseMove(document, { clientX: 110, clientY: 150, bubbles: true });

    await waitFor(() => {
      const transition = cardA.style.transition;
      const transformParts = transition
        .split(',')
        .filter((p: string) => p.trim().startsWith('transform'));
      expect(transformParts.length).toBe(0);
    });

    // Flush dnd-kit's drop animation state updates inside act so they don't
    // leak past the test boundary and warn about un-act'd AnimationManager updates.
    await act(async () => {
      fireEvent.mouseUp(document, { clientX: 110, clientY: 150, bubbles: true });
    });
  });

  it('keeps the dragged card visible and lifts its z-index above siblings during drag', async () => {
    // With the DragOverlay removed, the pressed card IS the drag visual — it
    // must stay opacity:1 and sit above its siblings via z-index so it renders
    // over other cards it's being dragged across.
    const { container } = await renderApp();
    const cardA = container.querySelector('[data-mule-card="mule-a"]') as HTMLElement;

    fireEvent.mouseEnter(cardA);
    expect(cardA.style.opacity).toBe('1');
    expect(cardA.style.zIndex).toBe('');

    fireEvent.mouseDown(cardA, { clientX: 100, clientY: 150, button: 0, bubbles: true });
    fireEvent.mouseMove(document, { clientX: 110, clientY: 150, bubbles: true });

    await waitFor(() => {
      expect(cardA.style.zIndex).toBe('1');
    });
    expect(cardA.style.opacity).toBe('1');

    fireEvent.mouseUp(document, { clientX: 110, clientY: 150, bubbles: true });

    await waitFor(() => {
      expect(cardA.style.zIndex).toBe('');
    });
    expect(cardA.style.opacity).toBe('1');
  });

  it('resets isDragging state on drag cancel, removing dotted border', async () => {
    const { container } = await renderApp();

    const cardA = container.querySelector('[data-mule-card="mule-a"]') as HTMLElement;
    expect(cardA).toBeTruthy();

    const gridWrapper = container.querySelector('[data-drag-boundary]') as HTMLElement;
    expect(gridWrapper).toBeTruthy();

    expect(gridWrapper!.style.borderColor).toBe('transparent');

    fireEvent.mouseDown(cardA, { clientX: 100, clientY: 150, button: 0, bubbles: true });
    fireEvent.mouseMove(document, { clientX: 110, clientY: 150, bubbles: true });

    fireEvent.keyDown(document, { key: 'Escape', code: 'Escape' });

    await waitFor(() => {
      expect(gridWrapper!.style.borderColor).toBe('transparent');
    });
  });

  it('grid wrapper has rounded corners before any drag (no sharp-to-rounded transition)', async () => {
    const { container } = await renderApp();
    const boundary = container.querySelector('[data-drag-boundary]') as HTMLElement;
    expect(boundary.style.borderRadius).toBe('1rem');
  });

  it('grid wrapper has dashed border-style before any drag (no solid-to-dashed flicker)', async () => {
    const { container } = await renderApp();
    const boundary = container.querySelector('[data-drag-boundary]') as HTMLElement;
    expect(boundary.style.borderStyle).toBe('dashed');
  });

  it('grid wrapper transition does not include border-radius (radius is always 1rem)', async () => {
    const { container } = await renderApp();
    const boundary = container.querySelector('[data-drag-boundary]') as HTMLElement;
    const parts = boundary.className.split(/\s+/);
    const transitionClass = parts.find((p: string) => p.startsWith('transition-['));
    expect(transitionClass).toBeTruthy();
    const props = transitionClass!.replace('transition-[', '').replace(']', '').split(',');
    expect(props).not.toContain('border-radius');
  });

  it('grid wrapper transition does not include border-style (style is always dashed)', async () => {
    const { container } = await renderApp();
    const boundary = container.querySelector('[data-drag-boundary]') as HTMLElement;
    const parts = boundary.className.split(/\s+/);
    const transitionClass = parts.find((p: string) => p.startsWith('transition-['));
    expect(transitionClass).toBeTruthy();
    const props = transitionClass!.replace('transition-[', '').replace(']', '').split(',');
    expect(props).not.toContain('border-style');
  });

  it('grid wrapper transition does not include padding or all', async () => {
    const { container } = await renderApp();
    const boundary = container.querySelector('[data-drag-boundary]') as HTMLElement;

    expect(boundary.className).not.toContain('transition-all');

    const parts = boundary.className.split(/\s+/);
    const transitionClass = parts.find((p: string) => p.startsWith('transition-['));
    expect(transitionClass).toBeTruthy();
    const props = transitionClass!.replace('transition-[', '').replace(']', '').split(',');
    expect(props).not.toContain('padding');
    expect(props).not.toContain('all');
  });

  it('grid wrapper padding is stable across the drag cycle (no drop jitter)', async () => {
    const { container } = await renderApp();
    const boundary = container.querySelector('[data-drag-boundary]') as HTMLElement;
    const beforePadding = boundary.style.padding;
    expect(beforePadding).toBeTruthy();

    const cardA = container.querySelector('[data-mule-card="mule-a"]') as HTMLElement;
    fireEvent.mouseDown(cardA, { clientX: 100, clientY: 150, button: 0, bubbles: true });
    fireEvent.mouseMove(document, { clientX: 110, clientY: 150, bubbles: true });

    await waitFor(() => {
      // Drag is now active — padding must be identical to before.
      expect(boundary.style.padding).toBe(beforePadding);
    });

    fireEvent.mouseUp(document, { clientX: 110, clientY: 150, bubbles: true });

    await waitFor(() => {
      expect(boundary.style.padding).toBe(beforePadding);
    });
  });

  it('Add Card is not included in DnD sortable items', async () => {
    const { container } = await renderApp();
    const addCard = container.querySelector('[data-add-card]') as HTMLElement;
    expect(addCard).toBeTruthy();
    // Add Card should not have dnd-kit sortable attributes
    expect(addCard.closest('[data-mule-card]')).toBeNull();
  });

  it('dragging cards does not change Add Card position (stays last)', async () => {
    const { container } = await renderApp();

    const cardA = container.querySelector('[data-mule-card="mule-a"]') as HTMLElement;
    simulatePointerDrag(cardA, 100, 150, 320, 150);

    await waitFor(() => {
      const grid = container.querySelector('[data-drag-boundary] .grid') as HTMLElement;
      const lastChild = grid.lastElementChild as HTMLElement;
      expect(lastChild.hasAttribute('data-add-card')).toBe(true);
    });
  });
});
