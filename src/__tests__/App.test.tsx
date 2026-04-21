import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@/test/test-utils';
import App from '../App';
import type { Mule } from '../types';

const STORAGE_KEY = 'maplestory-mule-tracker';

const testMules: Mule[] = [
  { id: 'mule-a', name: 'Alpha', level: 200, muleClass: 'Hero', selectedBosses: [], active: true },
  {
    id: 'mule-b',
    name: 'Beta',
    level: 180,
    muleClass: 'Paladin',
    selectedBosses: [],
    active: true,
  },
  {
    id: 'mule-c',
    name: 'Gamma',
    level: 160,
    muleClass: 'Dark Knight',
    selectedBosses: [],
    active: true,
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
  fireEvent.pointerDown(startEl, {
    pointerId: 1,
    clientX: startX,
    clientY: startY,
    button: 0,
    isPrimary: true,
    bubbles: true,
  });

  fireEvent.pointerMove(document, {
    pointerId: 1,
    clientX: startX + 10,
    clientY: startY,
    isPrimary: true,
    bubbles: true,
  });

  fireEvent.pointerMove(document, {
    pointerId: 1,
    clientX: endX,
    clientY: endY,
    isPrimary: true,
    bubbles: true,
  });

  fireEvent.pointerUp(document, {
    pointerId: 1,
    clientX: endX,
    clientY: endY,
    isPrimary: true,
    bubbles: true,
  });
}

describe('App', () => {
  beforeEach(() => {
    resetTestEnvironment();
  });

  it('renders Add Card in the grid with "Add Mule" text', () => {
    render(<App />);
    expect(screen.getByRole('button', { name: /add mule/i })).toBeTruthy();
  });

  it('renders weekly income section', () => {
    render(<App />);
    expect(screen.getByText(/WEEKLY INCOME/i)).toBeTruthy();
  });

  it('renders mule card grid', () => {
    seedMules(testMules);
    const { container } = render(<App />);
    const cards = container.querySelectorAll('[data-mule-card]');
    expect(cards.length).toBe(3);
  });

  it('Add Card appears as the last item in the grid', () => {
    seedMules(testMules);
    const { container } = render(<App />);
    const grid = container.querySelector('[data-drag-boundary] .grid') as HTMLElement;
    const lastChild = grid.lastElementChild as HTMLElement;
    expect(lastChild.hasAttribute('data-add-card')).toBe(true);
  });

  it('clicking Add Card creates a new mule and opens the detail drawer', async () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: /add mule/i }));
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Unnamed Mule' })).toBeTruthy();
    });
  });

  it('toggles income display format on click', () => {
    render(<App />);
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
        },
      ];
      localStorage.setItem('maplestory-mule-tracker', JSON.stringify(persistedRoot(mules)));
      render(<App />);

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
        },
        {
          id: 'mule-b',
          name: 'DeleteMe',
          level: 150,
          muleClass: 'Paladin',
          selectedBosses: [],
          active: true,
        },
      ];
      localStorage.setItem('maplestory-mule-tracker', JSON.stringify(persistedRoot(mules)));
      render(<App />);

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

  it('renders the Bulk Trash Icon in the roster header', () => {
    seedMules(testMules);
    render(<App />);
    expect(screen.getByRole('button', { name: /bulk.*delete|bulk.*trash/i })).toBeTruthy();
  });

  it('clicking the Bulk Trash Icon swaps the header to the Bulk Action Bar', () => {
    seedMules(testMules);
    render(<App />);
    enterBulk();
    expect(screen.getByText(/select or drag mules to delete/i)).toBeTruthy();
    expect(screen.getByText(/0\s*SELECTED/i)).toBeTruthy();
  });

  it('hides the Add Card in bulk mode', () => {
    seedMules(testMules);
    const { container } = render(<App />);
    expect(container.querySelector('[data-add-card]')).toBeTruthy();
    enterBulk();
    expect(container.querySelector('[data-add-card]')).toBeNull();
  });

  it('clicking a Character Card toggles selection (does NOT open the drawer)', async () => {
    seedMules(testMules);
    const { container } = render(<App />);
    enterBulk();

    const panelA = container.querySelector('[data-mule-card="mule-a"] .panel') as HTMLElement;
    fireEvent.click(panelA);

    expect(screen.getByText(/1\s*SELECTED/i)).toBeTruthy();
    // Drawer heading should not appear
    expect(screen.queryByRole('heading', { name: 'Alpha' })).toBeNull();
  });

  it('Bulk Confirm updates its label to "Delete N" and is enabled when N > 0', () => {
    seedMules(testMules);
    const { container } = render(<App />);
    enterBulk();

    // Initially disabled at 0
    expect((screen.getByRole('button', { name: /^delete$/i }) as HTMLButtonElement).disabled).toBe(
      true,
    );

    const panelA = container.querySelector('[data-mule-card="mule-a"] .panel') as HTMLElement;
    const panelB = container.querySelector('[data-mule-card="mule-b"] .panel') as HTMLElement;
    fireEvent.click(panelA);
    fireEvent.click(panelB);

    const confirm = screen.getByRole('button', { name: /delete\s*2/i }) as HTMLButtonElement;
    expect(confirm.disabled).toBe(false);
  });

  it('Bulk Confirm removes marked mules from the Roster and exits bulk mode', async () => {
    seedMules(testMules);
    const { container } = render(<App />);
    enterBulk();

    fireEvent.click(container.querySelector('[data-mule-card="mule-a"] .panel') as HTMLElement);
    fireEvent.click(container.querySelector('[data-mule-card="mule-b"] .panel') as HTMLElement);
    fireEvent.click(screen.getByRole('button', { name: /delete\s*2/i }));

    await waitFor(() => {
      expect(container.querySelector('[data-mule-card="mule-a"]')).toBeNull();
      expect(container.querySelector('[data-mule-card="mule-b"]')).toBeNull();
      expect(container.querySelector('[data-mule-card="mule-c"]')).toBeTruthy();
    });

    // Mode exited — header returns to default
    expect(screen.queryByText(/select or drag mules to delete/i)).toBeNull();
  });

  it('persists bulk deletion to localStorage', async () => {
    seedMules(testMules);
    const { container, unmount } = render(<App />);
    enterBulk();

    fireEvent.click(container.querySelector('[data-mule-card="mule-a"] .panel') as HTMLElement);
    fireEvent.click(screen.getByRole('button', { name: /delete\s*1/i }));

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
    const { container } = render(<App />);
    enterBulk();

    fireEvent.click(container.querySelector('[data-mule-card="mule-a"] .panel') as HTMLElement);
    expect(screen.getByText(/1\s*SELECTED/i)).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: /^cancel$/i }));

    await waitFor(() => {
      expect(screen.queryByText(/select or drag mules to delete/i)).toBeNull();
    });

    // All three mules still in DOM
    expect(container.querySelectorAll('[data-mule-card]')).toHaveLength(3);
  });

  it('hides the level badge on every card while in bulk mode', () => {
    seedMules(testMules);
    render(<App />);
    expect(screen.getAllByText(/Lv\./).length).toBeGreaterThan(0);

    enterBulk();
    expect(screen.queryByText(/Lv\./)).toBeNull();
  });

  it('hides the hover-trash popover on every card while in bulk mode', () => {
    seedMules(testMules);
    const { container } = render(<App />);
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
      const { container } = render(<App />);
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

  it('Drag Boundary exposes data-bulk-mode reflecting Bulk Delete Mode state', () => {
    seedMules(testMules);
    const { container } = render(<App />);
    const boundary = container.querySelector('[data-drag-boundary]') as HTMLElement;
    expect(boundary.getAttribute('data-bulk-mode')).toBe('false');

    enterBulk();
    expect(boundary.getAttribute('data-bulk-mode')).toBe('true');

    fireEvent.click(screen.getByRole('button', { name: /^cancel$/i }));
    expect(boundary.getAttribute('data-bulk-mode')).toBe('false');
  });
});

describe('section entrance animations', () => {
  it('Header renders with sticky positioning', () => {
    render(<App />);
    const header = screen.getByRole('banner');
    expect(header.className).toContain('sticky');
    expect(header.className).toContain('top-0');
  });

  it('income card has slide-up fade-in animation classes', () => {
    const { container } = render(<App />);
    const incomeCard = container.querySelector('[data-testid="income-card"]');
    expect(incomeCard).toBeTruthy();
    const wrapper = incomeCard!.parentElement!;
    expect(wrapper.className).toContain('animate-in');
    expect(wrapper.className).toContain('fade-in');
    expect(wrapper.className).toContain('slide-in-from-bottom-4');
    expect(wrapper.className).toContain('duration-500');
    expect(wrapper.className).toContain('fill-mode-both');
  });

  it('income chart has slide-up fade-in animation classes', () => {
    const { container } = render(<App />);
    const incomeChart = container.querySelector('[data-testid="income-chart"]');
    expect(incomeChart).toBeTruthy();
    const wrapper = incomeChart!.parentElement!;
    expect(wrapper.className).toContain('animate-in');
    expect(wrapper.className).toContain('fade-in');
    expect(wrapper.className).toContain('slide-in-from-bottom-4');
    expect(wrapper.className).toContain('duration-500');
    expect(wrapper.className).toContain('fill-mode-both');
  });

  it('roster section has slide-up fade-in animation classes', () => {
    const { container } = render(<App />);
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

  it('renders mule cards in grid order', () => {
    const { container } = render(<App />);
    const cards = container.querySelectorAll('[data-mule-card]');
    expect(cards).toHaveLength(3);
    expect(cards[0].getAttribute('data-mule-card')).toBe('mule-a');
    expect(cards[1].getAttribute('data-mule-card')).toBe('mule-b');
    expect(cards[2].getAttribute('data-mule-card')).toBe('mule-c');
  });

  it('calls reorderMules with correct indices on drag end', async () => {
    const { container } = render(<App />);

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
    const { container } = render(<App />);
    const cardA = container.querySelector('[data-mule-card="mule-a"]') as HTMLElement;
    const cardB = container.querySelector('[data-mule-card="mule-b"]') as HTMLElement;

    fireEvent.pointerDown(cardA, {
      pointerId: 1,
      clientX: 100,
      clientY: 150,
      button: 0,
      isPrimary: true,
      bubbles: true,
    });
    fireEvent.pointerMove(document, {
      pointerId: 1,
      clientX: 110,
      clientY: 150,
      isPrimary: true,
      bubbles: true,
    });

    await waitFor(() => {
      expect(cardA.style.transition).not.toMatch(/transform\s+\d/);
    });

    const transitionB = cardB.style.transition;
    const transformParts = transitionB
      .split(',')
      .filter((p: string) => p.trim().startsWith('transform'));
    expect(transformParts.length).toBeGreaterThan(0);

    fireEvent.pointerUp(document, {
      pointerId: 1,
      clientX: 110,
      clientY: 150,
      isPrimary: true,
      bubbles: true,
    });
  });

  it('dragged card has no transform transition during active drag', async () => {
    const { container } = render(<App />);
    const cardA = container.querySelector('[data-mule-card="mule-a"]') as HTMLElement;

    fireEvent.pointerDown(cardA, {
      pointerId: 1,
      clientX: 100,
      clientY: 150,
      button: 0,
      isPrimary: true,
      bubbles: true,
    });
    fireEvent.pointerMove(document, {
      pointerId: 1,
      clientX: 110,
      clientY: 150,
      isPrimary: true,
      bubbles: true,
    });

    await waitFor(() => {
      const transition = cardA.style.transition;
      const transformParts = transition
        .split(',')
        .filter((p: string) => p.trim().startsWith('transform'));
      expect(transformParts.length).toBe(0);
    });

    fireEvent.pointerUp(document, {
      pointerId: 1,
      clientX: 110,
      clientY: 150,
      isPrimary: true,
      bubbles: true,
    });
  });

  it('hides the original card during drag and restores on drag end', async () => {
    const { container } = render(<App />);
    const cardA = container.querySelector('[data-mule-card="mule-a"]') as HTMLElement;

    fireEvent.mouseEnter(cardA);
    expect(cardA.style.opacity).toBe('1');

    fireEvent.pointerDown(cardA, {
      pointerId: 1,
      clientX: 100,
      clientY: 150,
      button: 0,
      isPrimary: true,
      bubbles: true,
    });
    fireEvent.pointerMove(document, {
      pointerId: 1,
      clientX: 110,
      clientY: 150,
      isPrimary: true,
      bubbles: true,
    });

    await waitFor(() => {
      expect(cardA.style.opacity).toBe('0');
    });

    fireEvent.pointerUp(document, {
      pointerId: 1,
      clientX: 110,
      clientY: 150,
      isPrimary: true,
      bubbles: true,
    });

    await waitFor(() => {
      expect(cardA.style.opacity).toBe('1');
    });
  });

  it('resets isDragging state on drag cancel, removing dotted border', async () => {
    const { container } = render(<App />);

    const cardA = container.querySelector('[data-mule-card="mule-a"]') as HTMLElement;
    expect(cardA).toBeTruthy();

    const gridWrapper = container.querySelector('[data-drag-boundary]') as HTMLElement;
    expect(gridWrapper).toBeTruthy();

    expect(gridWrapper!.style.borderColor).toBe('transparent');

    fireEvent.pointerDown(cardA, {
      pointerId: 1,
      clientX: 100,
      clientY: 150,
      button: 0,
      isPrimary: true,
      bubbles: true,
    });

    fireEvent.pointerMove(document, {
      pointerId: 1,
      clientX: 110,
      clientY: 150,
      isPrimary: true,
      bubbles: true,
    });

    fireEvent.keyDown(document, { key: 'Escape', code: 'Escape' });

    await waitFor(() => {
      expect(gridWrapper!.style.borderColor).toBe('transparent');
    });
  });

  it('grid wrapper has rounded corners before any drag (no sharp-to-rounded transition)', () => {
    const { container } = render(<App />);
    const boundary = container.querySelector('[data-drag-boundary]') as HTMLElement;
    expect(boundary.style.borderRadius).toBe('1rem');
  });

  it('grid wrapper has dashed border-style before any drag (no solid-to-dashed flicker)', () => {
    const { container } = render(<App />);
    const boundary = container.querySelector('[data-drag-boundary]') as HTMLElement;
    expect(boundary.style.borderStyle).toBe('dashed');
  });

  it('grid wrapper transition does not include border-radius (radius is always 1rem)', () => {
    const { container } = render(<App />);
    const boundary = container.querySelector('[data-drag-boundary]') as HTMLElement;
    const parts = boundary.className.split(/\s+/);
    const transitionClass = parts.find((p: string) => p.startsWith('transition-['));
    expect(transitionClass).toBeTruthy();
    const props = transitionClass!.replace('transition-[', '').replace(']', '').split(',');
    expect(props).not.toContain('border-radius');
  });

  it('grid wrapper transition does not include border-style (style is always dashed)', () => {
    const { container } = render(<App />);
    const boundary = container.querySelector('[data-drag-boundary]') as HTMLElement;
    const parts = boundary.className.split(/\s+/);
    const transitionClass = parts.find((p: string) => p.startsWith('transition-['));
    expect(transitionClass).toBeTruthy();
    const props = transitionClass!.replace('transition-[', '').replace(']', '').split(',');
    expect(props).not.toContain('border-style');
  });

  it('grid wrapper transition does not include padding or all', async () => {
    const { container } = render(<App />);
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
    const { container } = render(<App />);
    const boundary = container.querySelector('[data-drag-boundary]') as HTMLElement;
    const beforePadding = boundary.style.padding;
    expect(beforePadding).toBeTruthy();

    const cardA = container.querySelector('[data-mule-card="mule-a"]') as HTMLElement;
    fireEvent.pointerDown(cardA, {
      pointerId: 1,
      clientX: 100,
      clientY: 150,
      button: 0,
      isPrimary: true,
      bubbles: true,
    });
    fireEvent.pointerMove(document, {
      pointerId: 1,
      clientX: 110,
      clientY: 150,
      isPrimary: true,
      bubbles: true,
    });

    await waitFor(() => {
      // Drag is now active — padding must be identical to before.
      expect(boundary.style.padding).toBe(beforePadding);
    });

    fireEvent.pointerUp(document, {
      pointerId: 1,
      clientX: 110,
      clientY: 150,
      isPrimary: true,
      bubbles: true,
    });

    await waitFor(() => {
      expect(boundary.style.padding).toBe(beforePadding);
    });
  });

  it('Add Card is not included in DnD sortable items', () => {
    const { container } = render(<App />);
    const addCard = container.querySelector('[data-add-card]') as HTMLElement;
    expect(addCard).toBeTruthy();
    // Add Card should not have dnd-kit sortable attributes
    expect(addCard.closest('[data-mule-card]')).toBeNull();
  });

  it('dragging cards does not change Add Card position (stays last)', async () => {
    const { container } = render(<App />);

    const cardA = container.querySelector('[data-mule-card="mule-a"]') as HTMLElement;
    simulatePointerDrag(cardA, 100, 150, 320, 150);

    await waitFor(() => {
      const grid = container.querySelector('[data-drag-boundary] .grid') as HTMLElement;
      const lastChild = grid.lastElementChild as HTMLElement;
      expect(lastChild.hasAttribute('data-add-card')).toBe(true);
    });
  });
});
