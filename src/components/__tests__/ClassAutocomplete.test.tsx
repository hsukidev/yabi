import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '../../test/test-utils';
import { ClassAutocomplete } from '../ClassAutocomplete';
import { GMS_CLASSES } from '../../constants/classes';

describe('ClassAutocomplete', () => {
  it('updates the rendered input when the value prop changes', () => {
    // Regression: a successful character lookup writes the new class via the
    // parent's `onUpdate`, which re-renders this component with a new `value`.
    // The input must reflect that change instead of holding stale internal
    // draft state.
    const { rerender } = render(
      <ClassAutocomplete value="Hero" options={GMS_CLASSES} onSelect={vi.fn()} />,
    );
    const input = screen.getByRole('combobox') as HTMLInputElement;
    expect(input.value).toBe('Hero');

    rerender(<ClassAutocomplete value="Bishop" options={GMS_CLASSES} onSelect={vi.fn()} />);
    expect(input.value).toBe('Bishop');
  });
});
