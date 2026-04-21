import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@/test/test-utils';
import { BossSearch } from '../BossSearch';

describe('BossSearch', () => {
  it('renders an input with the default "Search bosses…" placeholder', () => {
    render(<BossSearch value="" onChange={vi.fn()} />);
    expect(screen.getByPlaceholderText('Search bosses\u2026')).toBeTruthy();
  });

  it('honours a custom placeholder when provided', () => {
    render(<BossSearch value="" onChange={vi.fn()} placeholder="Find a boss" />);
    expect(screen.getByPlaceholderText('Find a boss')).toBeTruthy();
  });

  it('reflects the controlled value in the input', () => {
    render(<BossSearch value="vell" onChange={vi.fn()} />);
    const input = screen.getByPlaceholderText('Search bosses\u2026') as HTMLInputElement;
    expect(input.value).toBe('vell');
  });

  it('calls onChange with the raw string when the user types', () => {
    const onChange = vi.fn();
    render(<BossSearch value="" onChange={onChange} />);
    const input = screen.getByPlaceholderText('Search bosses\u2026');
    fireEvent.change(input, { target: { value: 'lucid' } });
    expect(onChange).toHaveBeenCalledWith('lucid');
  });

  it('renders a search icon (SVG) inside the input row', () => {
    const { container } = render(<BossSearch value="" onChange={vi.fn()} />);
    const svg = container.querySelector('svg');
    expect(svg).toBeTruthy();
  });

  it('applies only .d-search by default', () => {
    const { container } = render(<BossSearch value="" onChange={vi.fn()} />);
    const wrapper = container.querySelector('.d-search') as HTMLElement;
    expect(wrapper).toBeTruthy();
    expect(wrapper.classList.contains('d-search-fused')).toBe(false);
  });

  it('adds .d-search-fused when fused is true', () => {
    const { container } = render(<BossSearch value="" onChange={vi.fn()} fused />);
    const wrapper = container.querySelector('.d-search') as HTMLElement;
    expect(wrapper.classList.contains('d-search-fused')).toBe(true);
  });

  it('omits .d-search-fused when fused is explicitly false', () => {
    const { container } = render(<BossSearch value="" onChange={vi.fn()} fused={false} />);
    const wrapper = container.querySelector('.d-search') as HTMLElement;
    expect(wrapper.classList.contains('d-search-fused')).toBe(false);
  });
});
