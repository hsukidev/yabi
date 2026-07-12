import { fireEvent, screen } from '@/test/test-utils';
import type { Mule } from '@/types';

const STORAGE_KEY = 'maplestory-mule-tracker';

function persistedRoot(mules: Mule[]) {
  return { schemaVersion: 2, mules };
}

export function seedMules(mules: Mule[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(persistedRoot(mules)));
}

interface ResetOpts {
  display?: 'cards' | 'list';
}

export function resetBulkPaintEnvironment({ display }: ResetOpts = {}) {
  localStorage.clear();
  document.documentElement.classList.remove('dark');
  // Seed a Kronos lens so testMules fixtures stamped `worldId='heroic-kronos'`
  // are visible under the World Lens filter.
  localStorage.setItem('world', 'heroic-kronos');
  if (display) localStorage.setItem('display', display);
}

export function enterBulk() {
  fireEvent.click(screen.getByRole('button', { name: /bulk select mode/i }));
}

type PointerKind = 'mouse' | 'touch' | 'pen';

export function pointerDown(el: Element, x: number, y: number, pointerType: PointerKind = 'mouse') {
  fireEvent.pointerDown(el, {
    pointerId: 1,
    clientX: x,
    clientY: y,
    button: 0,
    isPrimary: true,
    bubbles: true,
    pointerType,
  });
}

export function pointerMove(
  el: Element | Document,
  x: number,
  y: number,
  pointerType: PointerKind = 'mouse',
) {
  fireEvent.pointerMove(el, {
    pointerId: 1,
    clientX: x,
    clientY: y,
    isPrimary: true,
    bubbles: true,
    pointerType,
  });
}

export function pointerUp(
  el: Element | Document,
  x: number,
  y: number,
  pointerType: PointerKind = 'mouse',
) {
  fireEvent.pointerUp(el, {
    pointerId: 1,
    clientX: x,
    clientY: y,
    isPrimary: true,
    bubbles: true,
    pointerType,
  });
}

export function pointerCancel(
  el: Element | Document,
  x: number,
  y: number,
  pointerType: PointerKind = 'mouse',
) {
  fireEvent.pointerCancel(el, {
    pointerId: 1,
    clientX: x,
    clientY: y,
    isPrimary: true,
    bubbles: true,
    pointerType,
  });
}

interface SlotConfig {
  axis: 'x' | 'y';
  stride: number;
  span: number;
}

// JSDOM lacks layout, so the hook's `document.elementFromPoint` calls return
// nothing — install a deterministic hit-test that maps a coordinate (X for
// the card grid, Y for the list view) to its `[data-paint-target]` element.
export function mockElementFromPointSlots(
  container: HTMLElement,
  mules: Mule[],
  { axis, stride, span }: SlotConfig,
) {
  const orig = document.elementFromPoint;
  document.elementFromPoint = ((x: number, y: number) => {
    const coord = axis === 'x' ? x : y;
    for (let i = 0; i < mules.length; i += 1) {
      const lo = i * stride;
      const hi = lo + span;
      if (coord >= lo && coord < hi) {
        return container.querySelector(
          `[data-paint-target="${mules[i].id}"]`,
        ) as HTMLElement | null;
      }
    }
    return document.body;
  }) as typeof document.elementFromPoint;
  return () => {
    document.elementFromPoint = orig;
  };
}
