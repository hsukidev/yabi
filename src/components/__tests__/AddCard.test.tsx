import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '../../test/test-utils';
import { AddCard } from '../AddCard';

describe('AddCard', () => {
  it('renders with "Add Mule" text', () => {
    render(<AddCard onClick={vi.fn()} />);
    expect(screen.getByText('Add Mule')).toBeTruthy();
  });

  it('calls onClick when clicked', () => {
    const onClick = vi.fn();
    render(<AddCard onClick={onClick} />);
    fireEvent.click(screen.getByText('Add Mule'));
    expect(onClick).toHaveBeenCalledOnce();
  });
});
