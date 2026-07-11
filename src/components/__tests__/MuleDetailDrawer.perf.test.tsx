import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@/test/test-utils';

import type { Mule } from '../../types';

/**
 * Perf regression guard for the CLAUDE.md drawer keystroke invariant: typing in
 * a drawer input re-renders `MuleDetailDrawer` (its lifted identity draft) but
 * must NOT re-render the memoized Slate Display Mode children — the Boss Card
 * View grid or the MatrixToolbar. Both barriers depend on the drawer threading
 * only referentially-stable values (rule 2); if a fresh hook-return object ever
 * leaks into their props, the memo bails and these counters climb.
 *
 * Each child is replaced by a `memo`'d stand-in that bumps a render counter, so
 * a re-render is directly observable. Wrapping in `memo` reproduces the real
 * barrier: the stand-in re-renders only when the props the drawer passes change
 * identity — exactly what we are guarding.
 */
const counters = vi.hoisted(() => ({ card: 0, toolbar: 0, matrix: 0 }));

vi.mock('../BossCardView', async () => {
  const { memo } = await import('react');
  return {
    BossCardView: memo(function BossCardViewStub() {
      counters.card++;
      return <div data-testid="card-grid-stub" />;
    }),
  };
});

vi.mock('../BossMatrix', async () => {
  const { memo } = await import('react');
  return {
    BossMatrix: memo(function BossMatrixStub() {
      counters.matrix++;
      return <div data-testid="matrix-stub" />;
    }),
  };
});

vi.mock('../MatrixToolbar', async () => {
  const { memo } = await import('react');
  return {
    MatrixToolbar: memo(function MatrixToolbarStub() {
      counters.toolbar++;
      return <div data-testid="toolbar-stub" />;
    }),
  };
});

import { MuleDetailDrawer } from '../MuleDetailDrawer';

const baseMule: Mule = {
  id: 'm1',
  name: 'TestMule',
  level: 200,
  muleClass: 'Hero',
  selectedBosses: [],
  active: true,
};

function renderDrawer() {
  return render(
    <MuleDetailDrawer
      mule={baseMule}
      metrics={null}
      open
      onClose={vi.fn()}
      onDelete={vi.fn()}
      onUpdate={vi.fn()}
    />,
  );
}

beforeEach(() => {
  counters.card = 0;
  counters.toolbar = 0;
  counters.matrix = 0;
  // Mount the Boss Card View so the card-grid barrier is exercised.
  localStorage.clear();
  localStorage.setItem('slate-display-mode', 'cards');
});

describe('MuleDetailDrawer keystroke perf (memo barrier)', () => {
  it('typing in the Name field re-renders neither the card grid nor the toolbar', () => {
    renderDrawer();
    const cardBase = counters.card;
    const toolbarBase = counters.toolbar;

    const name = screen.getByLabelText('Character Name') as HTMLInputElement;
    fireEvent.change(name, { target: { value: 'Zephyr' } });
    fireEvent.change(name, { target: { value: 'Zephyros' } });

    // The drawer itself DID re-render — its live header reflects the draft…
    expect(screen.getByRole('heading', { name: 'Zephyros' })).toBeTruthy();
    // …but the memoized Slate Display Mode children stayed behind their barrier.
    expect(counters.card).toBe(cardBase);
    expect(counters.toolbar).toBe(toolbarBase);
  });

  it('typing in the Notes field re-renders neither the card grid nor the toolbar', () => {
    renderDrawer();
    const cardBase = counters.card;
    const toolbarBase = counters.toolbar;

    const notes = screen.getByLabelText('Notes') as HTMLTextAreaElement;
    fireEvent.change(notes, { target: { value: 'grinding legion' } });

    expect(counters.card).toBe(cardBase);
    expect(counters.toolbar).toBe(toolbarBase);
  });

  it('mounts the card-grid stand-in (guard is actually exercising the barrier)', () => {
    renderDrawer();
    expect(screen.getByTestId('card-grid-stub')).toBeTruthy();
    expect(counters.card).toBeGreaterThan(0);
  });

  it('typing in the Name field does not re-render the Boss Matrix (matrix mode)', () => {
    localStorage.setItem('slate-display-mode', 'matrix');
    renderDrawer();
    expect(screen.getByTestId('matrix-stub')).toBeTruthy();
    const matrixBase = counters.matrix;
    const toolbarBase = counters.toolbar;

    const name = screen.getByLabelText('Character Name') as HTMLInputElement;
    fireEvent.change(name, { target: { value: 'Zephyr' } });
    fireEvent.change(name, { target: { value: 'Zephyros' } });

    expect(screen.getByRole('heading', { name: 'Zephyros' })).toBeTruthy();
    expect(counters.matrix).toBe(matrixBase);
    expect(counters.toolbar).toBe(toolbarBase);
  });
});
