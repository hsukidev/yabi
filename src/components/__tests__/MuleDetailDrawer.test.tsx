import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@/test/test-utils';

import { MuleDetailDrawer } from '../MuleDetailDrawer';
import type { Mule } from '../../types';
import { bosses } from '../../data/bosses';

const LUCID_BOSS = bosses.find((b) => b.family === 'lucid')!;
const HARD_LUCID = `${LUCID_BOSS.id}:hard:weekly`;

const baseMule: Mule = {
  id: 'test-mule-1',
  name: 'TestMule',
  level: 200,
  muleClass: 'Hero',
  selectedBosses: [],
  active: true,
};

function renderDrawer(overrides: Partial<Parameters<typeof MuleDetailDrawer>[0]> = {}) {
  const props = {
    mule: baseMule,
    open: true,
    onClose: vi.fn(),
    onUpdate: vi.fn(),
    onDelete: vi.fn(),
    ...overrides,
  };
  return {
    ...render(<MuleDetailDrawer {...props} />),
    props,
  };
}

/**
 * Thin smoke test — detailed behavior lives in the per-hook test files:
 *   - MuleDetailDrawer/hooks/__tests__/useBossMatrixView.test.tsx
 *   - MuleDetailDrawer/hooks/__tests__/useDeleteConfirm.test.tsx
 *   - MuleDetailDrawer/hooks/__tests__/useMuleIdentityDraft.test.tsx
 *
 * This file only asserts the drawer renders and wires those hooks into the
 * JSX correctly: name draft bound to the input, matrix toolbar + reset, boss
 * matrix toggle, delete-confirm two-step flow, close button.
 */
describe('MuleDetailDrawer (smoke)', () => {
  it('renders content when open with a mule', () => {
    renderDrawer();
    expect(screen.getByRole('heading', { name: 'TestMule' })).toBeTruthy();
  });

  it('renders a Sheet even when mule is null so Base-UI can animate out', () => {
    renderDrawer({ mule: null });
    expect(document.querySelector('[data-slot="sheet-content"]')).toBeTruthy();
    expect(screen.queryByRole('heading', { name: 'TestMule' })).toBeNull();
  });

  it('wires the Close button to onClose', () => {
    const { props } = renderDrawer();
    fireEvent.click(screen.getByRole('button', { name: /^close$/i }));
    expect(props.onClose).toHaveBeenCalled();
  });

  it('wires the name input to the identity draft hook (commit on blur)', () => {
    const { props } = renderDrawer();
    const input = screen.getByLabelText('Character Name') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'NewName' } });
    fireEvent.blur(input);
    expect(props.onUpdate).toHaveBeenCalledWith(baseMule.id, { name: 'NewName' });
  });

  // The drawer header reflects the live identity draft so users see typed
  // changes immediately, before the blur-driven commit lands.
  it('header heading reflects the live Name draft as the user types', () => {
    renderDrawer();
    const input = screen.getByLabelText('Character Name') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'TypingDraft' } });
    expect(input.value).toBe('TypingDraft');
    expect(screen.getByRole('heading', { name: 'TypingDraft' })).toBeTruthy();
    expect(screen.queryByRole('heading', { name: 'TestMule' })).toBeNull();
  });

  it('header level chip reflects the live Level draft as the user types', () => {
    renderDrawer();
    const input = screen.getByLabelText('Level') as HTMLInputElement;
    fireEvent.change(input, { target: { value: '150' } });
    expect(input.value).toBe('150');
    expect(screen.getByText('Lv.150')).toBeTruthy();
    expect(screen.queryByText('Lv.200')).toBeNull();
  });

  it('wires the matrix Reset button to resetBosses (wipes selections and party sizes)', () => {
    const { props } = renderDrawer({
      mule: { ...baseMule, selectedBosses: [HARD_LUCID] },
    });
    fireEvent.click(screen.getByRole('button', { name: /^reset$/i }));
    expect(props.onUpdate).toHaveBeenCalledWith(baseMule.id, {
      selectedBosses: [],
      partySizes: {},
    });
  });

  it('wires matrix cells to toggleKey (dispatches onUpdate with slate.toggle(key).keys)', () => {
    const { props } = renderDrawer();
    fireEvent.click(screen.getByTestId(`matrix-cell-${LUCID_BOSS.id}-hard`));
    expect(props.onUpdate).toHaveBeenCalledWith(baseMule.id, {
      selectedBosses: [HARD_LUCID],
    });
  });

  it('wires the delete button through the two-step confirm flow (delete + close)', () => {
    const onDelete = vi.fn();
    const onClose = vi.fn();
    renderDrawer({ onDelete, onClose });

    fireEvent.click(screen.getByRole('button', { name: /delete/i }));
    expect(screen.getByText('Delete?')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Yes' }));
    expect(onDelete).toHaveBeenCalledWith(baseMule.id);
    expect(onClose).toHaveBeenCalled();
  });

  it('Cancel hides the confirm prompt without calling onDelete', () => {
    const { props } = renderDrawer();
    fireEvent.click(screen.getByRole('button', { name: /delete/i }));
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(screen.queryByText('Delete?')).toBeNull();
    expect(props.onDelete).not.toHaveBeenCalled();
  });
});
