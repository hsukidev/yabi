import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useFormattedIncome } from '../useFormattedIncome';

describe('useFormattedIncome', () => {
  it('returns the abbreviated display string', () => {
    const { result } = renderHook(() => useFormattedIncome(504_000_000));
    expect(result.current.abbreviated).toBe('504M');
  });

  it('returns the full-precision string under .full for tooltip text', () => {
    const { result } = renderHook(() => useFormattedIncome(504_000_000));
    expect(result.current.full).toBe('504,000,000');
  });

  it('renders zero as plain 0 in the abbreviated display string', () => {
    const { result } = renderHook(() => useFormattedIncome(0));
    expect(result.current.abbreviated).toBe('0');
    expect(result.current.full).toBe('0');
  });

  it('always abbreviates non-zero display strings', () => {
    const { result } = renderHook(() => useFormattedIncome(18_000_000_000));
    expect(result.current.abbreviated).toBe('18B');
    expect(result.current.full).toBe('18,000,000,000');
  });

  it('does not depend on provider state', () => {
    const { result } = renderHook(() => useFormattedIncome(504_000_000));
    expect(result.current.abbreviated).toBe('504M');
    expect(result.current.full).toBe('504,000,000');
  });
});
